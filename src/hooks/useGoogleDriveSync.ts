import { exportDbToJson, getDb, importDbFromJson, StoreNames } from '@db';
import { Material, MaterialType, SyncStatus } from '@type/db.types';
import { blobToBase64 } from '@utils/utils';
import { gapi } from 'gapi-script';
import { useCallback, useEffect, useState } from 'react';

// --- Constants --- 
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const STUDYPAL_DB_FILE = 'studypal.db.json';
const DB_BACKUP_MIME_TYPE = 'application/json';
const STUDYPAL_FOLDER_NAME = 'StudyPalData';

// Type for auth state
type AuthState = {
  isAuthenticated: boolean;
};

// Type for event callbacks from SyncContext
export type DriveEventCallbacks = {
  onSyncStatusChange: (status: SyncStatus) => void;
  onError: (error: Error | null) => void;
  onConflictDetected: (details: {
    driveModified: number;
    localModified: number;
    driveSize?: number;
  } | null) => void;
  onSyncComplete: (timestamp: number) => void;
};

/**
 * Hook for Google Drive synchronization using AppData folder via gapi.
 */
export function useGoogleDriveSync(callbacks: DriveEventCallbacks) {
  // Internal state for API operations only
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });

  const {
    onSyncStatusChange,
    onError,
    onConflictDetected,
    onSyncComplete
  } = callbacks;

  // --- GAPI Initialization --- 
  useEffect(() => {
    const initGapiClient = async () => {
      // Basic check for placeholder credentials
      if (API_KEY.includes('PLACEHOLDER') || CLIENT_ID.includes('PLACEHOLDER')) {
        console.warn('Google API Key or Client ID is a placeholder. Sync will not work.');
        onError(new Error('Google API credentials not configured.'));
        return;
      }

      try {
        await new Promise<void>((resolve, reject) => {
          gapi.load('client:auth2', {
            callback: resolve,
            onerror: reject,
            timeout: 10000,
            ontimeout: reject
          });
        });

        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        });

        setIsGapiLoaded(true);
        console.log('GAPI client initialized.');

        const googleAuth = gapi.auth2.getAuthInstance();
        const currentAuthStatus = googleAuth.isSignedIn.get();
        setAuthState({ isAuthenticated: currentAuthStatus });

        // Auth state listener only updates local state
        googleAuth.isSignedIn.listen((isSignedIn) => {
          setAuthState({ isAuthenticated: isSignedIn });
          if (!isSignedIn) {
            onSyncStatusChange(SyncStatus.IDLE);
            onError(null);
            onConflictDetected(null);
          }
        });
      } catch (err: any) {
        console.error('Error initializing GAPI client:', err);
        let message = 'Failed to initialize Google API Client. Sync unavailable.';
        if (err.details) message += ` Details: ${err.details}`;
        onError(new Error(message));
        onSyncStatusChange(SyncStatus.ERROR);
      }
    };

    initGapiClient();
  }, []); // Keep dependencies minimal

  // --- Auth Functions (signIn, signOut, isAuthenticated) ---

  /**
   * Initiate Google Sign-In
   */
  const signIn = useCallback(async () => {
    if (!isGapiLoaded) {
      onError(new Error('Google API client not loaded yet.'));
      return;
    }
    try {
      onError(null);
      onSyncStatusChange(SyncStatus.IDLE);
      await gapi.auth2.getAuthInstance().signIn();
      // Auth state listener will handle the state update
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.error === 'popup_closed_by_user') {
        onError(new Error('Sign-in cancelled.'));
      } else if (err.error === 'access_denied') {
        onError(new Error('Access denied. Please grant permission to Google Drive AppData.'));
      } else {
        onError(err instanceof Error ? err : new Error('Failed to sign in with Google.'));
        onSyncStatusChange(SyncStatus.ERROR);
      }
    }
  }, [isGapiLoaded, onError, onSyncStatusChange]);

  /**
   * Initiate Google Sign-Out
   */
  const signOut = useCallback(async () => {
    if (!isGapiLoaded || !gapi.auth2?.getAuthInstance()) return;
    try {
      await gapi.auth2.getAuthInstance().signOut();
      // Auth state listener will handle state reset
    } catch (err) {
      console.error('Google Sign-Out error:', err);
      onError(err instanceof Error ? err : new Error('Failed to sign out.'));
      onSyncStatusChange(SyncStatus.ERROR);
    }
  }, [isGapiLoaded, onError, onSyncStatusChange]);

  /**
   * Check if authenticated (uses gapi state)
   */
  const isAuthenticated = useCallback(() => {
    // Check if the auth instance itself is loaded
    return isGapiLoaded && !!gapi.auth2?.getAuthInstance() && authState.isAuthenticated;
  }, [isGapiLoaded, authState.isAuthenticated]);

  // --- Drive API Helpers ---

  /**
   * Helper to perform Drive API actions with error handling using gapi
   */
  const driveApiAction = useCallback(async <T = any>(
    action: () => Promise<gapi.client.Response<T>>
  ): Promise<gapi.client.Response<T>> => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated with Google');
    }

    try {
      const response = await action();

      // Check if response exists AND status is a number before comparing
      if (response && typeof response.status === 'number' && response.status >= 400) {
        console.error('Google Drive API Error Response:', response.result);
        const errorResult = response.result as any;
        const errorMsg = errorResult?.error?.message || `Google Drive API request failed with status ${response.status}`;
        if (response.status === 401) {
          signOut();
          throw new Error('Authentication expired or invalid. Please sign in again.');
        }
        throw new Error(errorMsg);
      }
      if (!response) {
        throw new Error('No response received from Google Drive API.');
      }
      return response;
    } catch (err: any) {
      console.error('Google Drive API Action Failed:', err);
      // Check for specific gapi error structures or status codes
      const statusCode = err?.status ?? err?.result?.error?.code;
      if (statusCode === 401 || err?.message?.includes('Unauthorized') || err?.message?.includes('Invalid Credentials')) {
        signOut();
        throw new Error('Authentication failed. Please sign in again.');
      }
      throw err instanceof Error ? err : new Error(err?.message || 'Google Drive API request failed');
    }
  }, [isAuthenticated, signOut]);

  /**
   * Finds or creates a folder in Google Drive AppData folder by name.
   * Returns the folder ID.
   */
  const findOrCreateFolder = useCallback(async (folderName: string, parentFolderId: string = 'appDataFolder'): Promise<string> => {
    try {
      // Check if folder exists
      const listResponse = await driveApiAction(() =>
        gapi.client.drive.files.list({
          spaces: 'appDataFolder',
          q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
          fields: 'files(id)',
        })
      );

      if (listResponse.result.files && listResponse.result.files.length > 0) {
        console.log(`Found folder '${folderName}' with ID: ${listResponse.result.files[0].id}`);
        return listResponse.result.files[0].id!;
      }

      // Create folder if it doesn't exist
      console.log(`Creating folder '${folderName}' in parent ${parentFolderId}...`);
      const createResponse = await driveApiAction(() =>
        gapi.client.drive.files.create({
          resource: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
          },
          fields: 'id',
        })
      );
      console.log(`Created folder '${folderName}' with ID: ${createResponse.result.id}`);
      return createResponse.result.id!;
    } catch (err) {
      console.error(`Error finding or creating folder '${folderName}':`, err);
      throw new Error(`Failed to find or create folder '${folderName}'.`);
    }
  }, [driveApiAction]);

  /**
   * Finds or creates a nested folder structure (e.g., subjectId/chapterId) in AppData.
   * Returns the ID of the innermost folder.
   */
  const findOrCreateFolderByPath = useCallback(async (pathSegments: string[]): Promise<string> => {
    let currentParentId = 'appDataFolder';
    for (const segment of pathSegments) {
      currentParentId = await findOrCreateFolder(segment, currentParentId);
    }
    return currentParentId;
  }, [findOrCreateFolder]);


  /**
   * Uploads a file (Blob) to a specific folder in Google Drive AppData.
   * Returns the Google Drive file ID.
   */
  const uploadFileToFolder = useCallback(async (
    fileBlob: Blob, // Accepts Blob directly
    fileName: string, // Usually the material ID
    parentFolderId: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<string> => {
    console.log(`Uploading file '${fileName}' (Type: ${mimeType}, Size: ${fileBlob.size}) to folder ${parentFolderId}...`);
    try {
      // Check if file already exists
      const listResponse = await driveApiAction(() =>
        gapi.client.drive.files.list({
          spaces: 'appDataFolder',
          q: `name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`,
          fields: 'files(id)',
        })
      );

      const existingFileId = listResponse.result.files?.[0]?.id;

      const metadata = {
        name: fileName,
        mimeType: mimeType,
        ...(!existingFileId && { parents: [parentFolderId] }) // Only add parents if creating a new file
      };

      const base64Data = await blobToBase64(fileBlob);

      const path = existingFileId
        ? `/upload/drive/v3/files/${existingFileId}`
        : '/upload/drive/v3/files';
      // Use PATCH for update, POST for create
      const method = existingFileId ? 'PATCH' : 'POST';

      // Use simple upload for content update (PATCH) or create (POST)
      // Metadata is sent as query params or inferred for PATCH
      // NOTE: Simple upload might have size limits (e.g., 5MB). For larger files,
      // resumable upload is recommended, but more complex.
      // Let's stick to simple/multipart for now, assuming files aren't huge.

      // Using multipart upload is generally more robust for including metadata reliably
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      // Construct the multipart body directly from the Blob
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        base64Data +
        close_delim

      const response = await driveApiAction(() =>
        gapi.client.request({
          path: path,
          method: method,
          params: { uploadType: 'multipart', fields: 'id' },
          headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
          body: multipartRequestBody
        })
      );

      console.log(`File '${fileName}' uploaded successfully. ID: ${response.result.id}`);
      return response.result.id!;

    } catch (err) {
      console.error(`Error uploading file '${fileName}':`, err);
      throw new Error(`Failed to upload file '${fileName}'.`);
    }
  }, [driveApiAction]);

  /**
   * Get file content (as Blob) from Google Drive using file ID.
   */
  const getDriveFileContent = useCallback(async (fileId: string): Promise<Blob> => {
    console.log(`getDriveFileContent: Fetching content for file ID: ${fileId}`);
    const response = await driveApiAction(() =>
      gapi.client.request({
        path: `/drive/v3/files/${fileId}`,
        method: 'GET',
        params: { alt: 'media' },
      })
    );

    const contentType = response.headers?.['Content-Type'] || 'application/octet-stream';
    let contentData = response.body;

    if (contentType.startsWith('image/') || contentType.startsWith('video/')) {
      return fetch(contentData).then(res => res.blob());
    }

    console.log(`getDriveFileContent: Successfully fetched content for file ID: ${fileId}, Type: ${contentType}`);
    return new Blob([contentData], { type: contentType });
  }, [driveApiAction]);


  /**
   * Delete a file from Google Drive using its ID.
   */
  const deleteFileItem = useCallback(async (fileId?: string) => {
    if (!fileId) return
    console.log(`deleteFileItem: Deleting file with ID: ${fileId}`);
    try {
      await driveApiAction(() => gapi.client.drive.files.delete({ fileId }));
      console.log(`deleteFileItem: Successfully deleted file with ID: ${fileId}`);
    } catch (err) {
      console.error(`deleteFileItem: Error deleting file with ID: ${fileId}`, err);
      throw new Error(`Failed to delete file with ID: ${fileId}`);
    }
  }, [driveApiAction]);

  /**
   * List files/folders in Google Drive App Data folder using gapi
   */
  const listDriveItems = useCallback(async (parentDriveId: string = 'appDataFolder'): Promise<gapi.client.drive.File[]> => {
    const response = await driveApiAction(() =>
      gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        q: `'${parentDriveId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime, createdTime, parents)',
        orderBy: 'name',
      })
    );
    return response.result.files || [];
  }, [driveApiAction]);

  /**
   * Finds the studypal.db.json file metadata in the AppData folder.
   */
  const findDbBackupFile = useCallback(async (): Promise<gapi.client.drive.File | null> => {
    try {
      const response = await driveApiAction(() =>
        gapi.client.drive.files.list({
          spaces: 'appDataFolder',
          q: `name = '${STUDYPAL_DB_FILE}' and trashed = false`,
          fields: 'files(id, name, modifiedTime)',
        })
      );
      return response.result.files && response.result.files.length > 0
        ? response.result.files[0]
        : null;
    } catch (err) {
      console.error('Error finding DB backup file:', err);
      return null;
    }
  }, [driveApiAction]);

  /**
   * Uploads materials marked as PENDING to Google Drive.
   * Separates reading from network/writing to avoid TransactionInactiveError.
   */
  const syncPendingMaterials = useCallback(async () => {
    if (!isAuthenticated()) {
      console.warn("syncPendingMaterials: Not authenticated.");
      // Return counts for backupDatabaseToDrive to assess status
      return { successCount: 0, errorCount: 0, skippedCount: 0 };
    }
    console.log("syncPendingMaterials: Checking for pending materials...");
    onSyncStatusChange(SyncStatus.SYNCING_UP); // Indicate activity

    const db = await getDb();
    let skippedItemsIds: string[] = []; // Track skipped items for making them UP_TO_DATE
    let pendingItemsData: { material: Material; subjectId: string }[] = [];
    let readError: Error | null = null;

    // --- Phase 1: Read pending items data (Readonly Transaction) ---
    try {
      console.debug("syncPendingMaterials: Starting Phase 1 - Reading pending items...");
      const readTx = db.transaction([StoreNames.MATERIALS, StoreNames.CHAPTERS], 'readonly');
      const materialsStore = readTx.objectStore(StoreNames.MATERIALS);
      const chaptersStore = readTx.objectStore(StoreNames.CHAPTERS);
      const index = materialsStore.index('by-syncStatus');
      let cursor = await index.openCursor(IDBKeyRange.only(SyncStatus.PENDING));
      let count = 0;

      while (cursor) {
        count++;
        const material: Material = cursor.value;

        // Skip text/link types or items without Blob content
        if ([MaterialType.LINK, MaterialType.TEXT].includes(material.type) || !(material.content?.data instanceof Blob)) {
          console.debug(`syncPendingMaterials: [Read Phase] Skipping ${material.id} (type: ${material.type}, content type: ${typeof material.content?.data})`);
          skippedItemsIds.push(material.id);
          cursor = await cursor.continue();
          continue;
        }

        // Get parent chapter to find subjectId
        const chapter = await chaptersStore.get(material.chapterId);
        if (!chapter) {
          console.warn(`syncPendingMaterials: [Read Phase] Parent chapter ${material.chapterId} not found for material ${material.id}. Skipping.`);
          cursor = await cursor.continue();
          continue;
        }

        // Store necessary data for upload
        pendingItemsData.push({ material, subjectId: chapter.subjectId });
        console.debug(`syncPendingMaterials: [Read Phase] Added ${material.id} to processing list.`);
        cursor = await cursor.continue();
      }
      await readTx.done;
      console.debug(`syncPendingMaterials: Phase 1 Complete. Found ${pendingItemsData.length} binary items (out of ${count} pending) to upload.`);
    } catch (err: any) {
      console.error("syncPendingMaterials: Phase 1 Error - Reading pending items:", err);
      readError = err instanceof Error ? err : new Error('Failed to read pending items');
    }

    // Handle read error before proceeding
    if (readError) {
      onError(new Error(`Failed to read pending items from database: ${readError.message}`));
      onSyncStatusChange(SyncStatus.ERROR);
      return { successCount: 0, errorCount: pendingItemsData.length, skippedCount: skippedItemsIds.length }; // Assume all read attempts failed if error occurred
    }

    if (pendingItemsData.length === 0) {
      console.log("syncPendingMaterials: No binary items require upload.");
      // Don't change status yet, main backup will set UP_TO_DATE if needed
      return { successCount: 0, errorCount: 0, skippedCount: 0 };
    }

    // --- Phase 1.5: Update skipped items to UP_TO_DATE (Outside Transaction) ---
    console.log(`syncPendingMaterials: Updating skipped items to UP_TO_DATE...`);
    const skippedTx = db.transaction(StoreNames.MATERIALS, 'readwrite');
    const skippedStore = skippedTx.objectStore(StoreNames.MATERIALS);
    for (const id of skippedItemsIds) {
      const skippedMaterial = await skippedStore.get(id);
      if (skippedMaterial) {
        skippedMaterial.syncStatus = SyncStatus.UP_TO_DATE;
        await skippedStore.put(skippedMaterial);
      }
    }

    // --- Phase 2: Process uploads (Outside Transaction) ---
    console.log("syncPendingMaterials: Starting Phase 2 - Processing uploads...");
    let uploadCount = 0;
    let errorCount = 0;

    for (const itemData of pendingItemsData) {
      const { material, subjectId } = itemData;
      try {
        console.log(`syncPendingMaterials: [Upload Phase] Processing ${material.id}`);
        // 1. Determine Drive folder path
        const driveFolderPath = [subjectId, material.chapterId]; // Use IDs
        const parentFolderId = await findOrCreateFolderByPath(driveFolderPath);

        // 2. Create Blob from Blob (content is guaranteed to be Blob here)
        const mimeType = material.content!.mimeType || 'application/octet-stream'; // Use stored mimeType, assert non-null
        const fileBlob = new Blob([material.content!.data], { type: mimeType }); // Assert non-null

        // 3. Upload Blob
        const driveId = await uploadFileToFolder(fileBlob, material.id, parentFolderId, mimeType);

        // 4. Update Material in IndexedDB (New Write Transaction per item)
        console.log(`syncPendingMaterials: [Update Phase] Updating DB for ${material.id}`);
        const updateTx = db.transaction(StoreNames.MATERIALS, 'readwrite');
        const store = updateTx.objectStore(StoreNames.MATERIALS);
        // Get a fresh copy within the new transaction
        const existingMaterial = await store.get(material.id);

        if (existingMaterial) {
          existingMaterial.driveId = driveId;
          existingMaterial.syncStatus = SyncStatus.UP_TO_DATE; // Use UP_TO_DATE after successful sync
          existingMaterial.lastModified = Date.now();
          // delete existingMaterial.content?.data; // Remove Blob content
          await store.put(existingMaterial); // Use put to update
          await updateTx.done; // Commit this specific update
          uploadCount++;
          console.log(`syncPendingMaterials: [Update Phase] Successfully updated ${material.id}.`);
        } else {
          // Should not happen if read transaction worked, but handle defensively
          await updateTx.abort(); // Abort if material vanished
          throw new Error(`Material ${material.id} disappeared before update.`);
        }

      } catch (err: any) {
        console.error(`syncPendingMaterials: Failed to process material ${material.id}:`, err);
        errorCount++;
        // Optionally: Update status to ERROR in a separate transaction?
        // For now, just count errors. The overall status will be set in backupDatabaseToDrive.
        // try {
        //     const errorTx = db.transaction(StoreNames.MATERIALS, 'readwrite');
        //     const errorStore = errorTx.objectStore(StoreNames.MATERIALS);
        //     const matToUpdate = await errorStore.get(material.id);
        //     if (matToUpdate) {
        //         matToUpdate.syncStatus = SyncStatus.ERROR;
        //         await errorStore.put(matToUpdate);
        //     }
        //     await errorTx.done;
        // } catch (updateErr) {
        //     console.error(`Failed to mark material ${material.id} as ERROR:`, updateErr);
        // }
      }
    }

    console.log(`syncPendingMaterials: Phase 2 Finished. Uploaded: ${uploadCount}, Errors: ${errorCount}`);

    // Report cumulative errors if any occurred during processing
    if (errorCount > 0) {
      onError(new Error(`${errorCount} material(s) failed to upload or update.`));
    }

    // Don't change overall status here; let backupDatabaseToDrive handle it based on results.
    return { successCount: uploadCount, errorCount };

  }, [isAuthenticated, getDb, findOrCreateFolderByPath, uploadFileToFolder, onSyncStatusChange, onError]); // Dependencies updated


  /**
   * Back up database METADATA to Google Drive.
   * Ensures pending file uploads are attempted first.
   */
  const backupDatabaseToDrive = useCallback(async () => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    onSyncStatusChange(SyncStatus.SYNCING_UP);
    onError(null);
    let pendingSyncResult = { successCount: 0, errorCount: 0 };

    try {
      // ***** SYNC PENDING FILES FIRST *****
      console.log("backupDatabaseToDrive: Initiating syncPendingMaterials...");
      pendingSyncResult = await syncPendingMaterials();
      console.log("backupDatabaseToDrive: syncPendingMaterials finished.", pendingSyncResult);
      // *************************************

      // Proceed to metadata backup regardless of pending sync errors for now
      // but the final status will reflect if errors occurred.

      console.log('backupDatabaseToDrive: Starting database metadata backup to Drive...');
      // exportDbToJson now strips content automatically
      const dbJson = await exportDbToJson();
      const existingBackup = await findDbBackupFile();

      // Use gapi.client.request for upload
      const path = existingBackup?.id
        ? `/upload/drive/v3/files/${existingBackup.id}`
        : '/upload/drive/v3/files';
      const method = existingBackup?.id ? 'PATCH' : 'POST';

      const metadata = {
        name: STUDYPAL_DB_FILE,
        mimeType: DB_BACKUP_MIME_TYPE,
        ...(!existingBackup && { parents: ['appDataFolder'] })
      };
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const metadataStr = JSON.stringify(metadata);

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        metadataStr +
        delimiter +
        'Content-Type: ' + DB_BACKUP_MIME_TYPE + '\r\n\r\n' +
        dbJson +
        close_delim;

      const response = await driveApiAction(() =>
        gapi.client.request({
          path: path,
          method: method,
          params: { uploadType: 'multipart', fields: 'id, name, modifiedTime' },
          headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
          body: multipartRequestBody
        })
      );

      const backupTime = new Date(response.result.modifiedTime || Date.now()).getTime();

      // Signal completion to context
      onSyncComplete(backupTime);
      // Set final status based on pending sync results
      const finalStatus = pendingSyncResult.errorCount > 0 ? SyncStatus.ERROR : SyncStatus.UP_TO_DATE;
      onSyncStatusChange(finalStatus);
      onConflictDetected(null); // Clear any previous conflict
      console.log(`backupDatabaseToDrive: Metadata backup successful! Final status: ${finalStatus}`);

    } catch (err: any) {
      console.error('backupDatabaseToDrive: Backup process failed:', err);
      // Append pending sync errors if any
      const finalError = pendingSyncResult.errorCount > 0
        ? new Error(`Metadata backup failed after ${pendingSyncResult.errorCount} file upload errors. Last error: ${err.message}`)
        : new Error(`Database backup failed: ${err.message}`);
      onError(finalError);
      onSyncStatusChange(SyncStatus.ERROR);
    }
  }, [isAuthenticated, syncPendingMaterials, findDbBackupFile, driveApiAction, exportDbToJson, onSyncStatusChange, onError, onConflictDetected, onSyncComplete]); // Added exportDbToJson dependency


  /**
   * Restore database METADATA from Google Drive.
   * File content will be downloaded on demand later.
   */
  const restoreDatabaseFromDrive = useCallback(async () => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    onSyncStatusChange(SyncStatus.SYNCING_DOWN);
    onError(null);

    try {
      console.log('Attempting to restore database metadata from Drive...');
      const backupFile = await findDbBackupFile();
      if (!backupFile || !backupFile.id) {
        // If no backup, maybe initialize local DB or signal 'no backup found' state?
        // For now, treat as error or specific state.
        console.warn('No database backup file found on Google Drive.');
        onSyncStatusChange(SyncStatus.IDLE); // Or a new state like 'no_backup'
        onError(new Error('No database backup found to restore.'));
        return; // Stop restoration
      }

      console.log(`Found backup file: ${backupFile.id}, modified: ${backupFile.modifiedTime}`);
      // getDriveFileContent fetches the Blob
      const blob = await getDriveFileContent(backupFile.id);
      const dbJson = await blob.text(); // Convert Blob to text

      // importDbFromJson handles clearing and importing
      await importDbFromJson(dbJson);

      const driveModifiedTime = new Date(backupFile.modifiedTime || Date.now()).getTime();

      // Signal completion to context
      onSyncComplete(driveModifiedTime);
      onSyncStatusChange(SyncStatus.UP_TO_DATE);
      onConflictDetected(null);
      console.log('Database metadata restore successful!');

    } catch (err: any) {
      console.error('Database restore failed:', err);
      onError(err instanceof Error ? err : new Error('Database restore failed.'));
      onSyncStatusChange(SyncStatus.ERROR);
    }
  }, [isAuthenticated, findDbBackupFile, getDriveFileContent, onSyncStatusChange, onError, onConflictDetected, onSyncComplete]);

  /**
   * Check backup file metadata without downloading content
   */
  const getBackupMetadata = useCallback(async (): Promise<gapi.client.drive.File | null> => { // Return type added
    if (!isAuthenticated()) return null;

    try {
      return await findDbBackupFile();
    } catch (err) {
      console.error('Error getting backup metadata:', err);
      // Don't change sync status here, just log/report
      // onError(err instanceof Error ? err : new Error('Failed to get backup metadata.'));
      return null;
    }
  }, [isAuthenticated, findDbBackupFile]);


  // Return API-related functionality including new file handlers
  return {
    isGapiLoaded,
    authState: { isAuthenticated: isAuthenticated() },
    signIn,
    signOut,
    getBackupMetadata,
    backupDatabaseToDrive,
    restoreDatabaseFromDrive,
    // Expose file content download function
    getDriveFileContent,
    deleteFileItem,
    // Expose pending sync trigger (optional, could be internal)
    syncPendingMaterials,
  };
}
