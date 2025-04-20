import { useState, useEffect, useCallback } from 'react';
import { gapi } from 'gapi-script';
// Import ArrayBuffer type if needed, though it's built-in
import { exportDbToJson, importDbFromJson, getDb, StoreNames } from '@db'; 
import { Material, MaterialType, SyncStatus, Chapter, Subject } from '@type/db.types'; 

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
        // Only add parents if creating a new file
        ...( !existingFileId && { parents: [parentFolderId] } )
      };

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

      const metadataStr = JSON.stringify(metadata);

      // Construct the multipart body directly from the Blob
      const multipartRequestBody = new Blob([
        delimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataStr,
        delimiter,
        `Content-Type: ${mimeType}\r\n\r\n`,
        fileBlob, // Append the actual Blob directly
        close_delim
      ], { type: `multipart/related; boundary="${boundary}"` });

      const response = await driveApiAction(() =>
        gapi.client.request({
          path: path,
          method: method,
          params: { uploadType: 'multipart', fields: 'id' }, // Use multipart
          headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
          body: multipartRequestBody // Send the constructed Blob
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

    let bodyData: ArrayBuffer | string | undefined;
    const responseBody: any = response.body;

    if (typeof responseBody === 'string') {
        bodyData = responseBody;
    } else if (responseBody instanceof ArrayBuffer) { // Check for ArrayBuffer
        bodyData = responseBody;
    } else if (typeof responseBody === 'object' && responseBody !== null) {
        // Handle potential JSON error object returned in body for media download errors
        console.warn("Received object instead of media content:", responseBody);
        bodyData = JSON.stringify(responseBody);
    } else {
        bodyData = '';
    }

    const contentType = response.headers?.['content-type'] || 'application/octet-stream';
    console.log(`getDriveFileContent: Successfully fetched content for file ID: ${fileId}, Type: ${contentType}`);
    return new Blob([bodyData || ''], { type: contentType });
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
   * Handles content stored as ArrayBuffer in IndexedDB.
   */
  const syncPendingMaterials = useCallback(async () => {
    if (!isAuthenticated()) {
        console.warn("syncPendingMaterials: Not authenticated.");
        return;
    }
    console.log("syncPendingMaterials: Checking for pending materials...");
    onSyncStatusChange(SyncStatus.SYNCING_UP); // Indicate activity

    const db = await getDb();
    const tx = db.transaction([StoreNames.MATERIALS, StoreNames.CHAPTERS, StoreNames.SUBJECTS], 'readwrite');
    const materialsStore = tx.objectStore(StoreNames.MATERIALS);
    const chaptersStore = tx.objectStore(StoreNames.CHAPTERS);
    const subjectsStore = tx.objectStore(StoreNames.SUBJECTS);
    const index = materialsStore.index('by-syncStatus'); 

    let cursor = await index.openCursor(IDBKeyRange.only(SyncStatus.PENDING));
    let uploadCount = 0;
    let errorCount = 0;

    while (cursor) {
        const material: Material = cursor.value;
        console.log(`syncPendingMaterials: Found pending material: ${material.name} (ID: ${material.id})`);

        // Skip TEXT and LINK as their content is in main backup
        if ([MaterialType.LINK, MaterialType.TEXT].includes(material.type)) {
          console.log(`syncPendingMaterials: Skipping ${material.type} type: ${material.name}`);
          cursor = await cursor.continue();
          continue;
        }

        // Check if content is an ArrayBuffer
        if (!(material.content instanceof ArrayBuffer)) { 
            console.warn(`syncPendingMaterials: Pending material ${material.id} content is not an ArrayBuffer. Skipping. Content type: ${typeof material.content}`);
            errorCount++;
            cursor = await cursor.continue();
            continue;
        }

        try {
            // 1. Get Parent IDs for path
            const chapter = await chaptersStore.get(material.chapterId);
            if (!chapter) throw new Error(`Parent chapter ${material.chapterId} not found.`);
            const subject = await subjectsStore.get(chapter.subjectId);
            if (!subject) throw new Error(`Parent subject ${chapter.subjectId} not found.`);

            // 2. Determine Drive folder path
            const driveFolderPath = [subject.id, chapter.id]; // Use IDs for folder names
            const parentFolderId = await findOrCreateFolderByPath(driveFolderPath);

            // 3. Create Blob from ArrayBuffer
            // TODO: Need a reliable way to get the original mimeType. Store it?
            // For now, use a generic type or infer based on MaterialType enum.
            let mimeType = 'application/octet-stream'; 
            // Basic inference (can be expanded)
            if (material.type === MaterialType.PDF) mimeType = 'application/pdf';
            else if (material.type === MaterialType.IMAGE) mimeType = 'image/*';
            else if (material.type === MaterialType.VIDEO) mimeType = 'video/*';
            else if (material.type === MaterialType.WORD) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            const fileBlob = new Blob([material.content], { type: mimeType });

            // 4. Upload Blob
            const driveId = await uploadFileToFolder(fileBlob, material.id, parentFolderId, mimeType);

            // 5. Update Material in IndexedDB
            material.driveId = driveId;
            material.syncStatus = SyncStatus.UP_TO_DATE;
            material.lastModified = Date.now();
            // delete material.content; // Remove ArrayBuffer content after successful upload

            await cursor.update(material);
            uploadCount++;
            console.log(`syncPendingMaterials: Successfully uploaded ${material.id}, updated status to UP_TO_DATE.`);

        } catch (err) {
            console.error(`syncPendingMaterials: Failed to upload material ${material.id}:`, err);
            // Optionally update status to ERROR
            // material.syncStatus = SyncStatus.ERROR;
            // await cursor.update(material);
            errorCount++;
            // Decide whether to stop or continue on error
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    console.log(`syncPendingMaterials: Finished. Uploaded: ${uploadCount}, Errors: ${errorCount}`);
    if (errorCount > 0) {
        onError(new Error(`${errorCount} material(s) failed to upload.`));
    }
    // Transition back to idle or checking after uploads are done
    // The main backup function will handle the final 'up_to_date' status
    onSyncStatusChange(SyncStatus.CHECKING);

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

    try {
        // ***** SYNC PENDING FILES FIRST *****
        await syncPendingMaterials();
        // *************************************

        console.log('Starting database metadata backup to Drive...');
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
        onSyncStatusChange(SyncStatus.UP_TO_DATE);
        onConflictDetected(null);
        console.log('Database metadata backup successful!', response.result);

    } catch (err: any) {
        console.error('Database backup failed:', err);
        onError(err instanceof Error ? err : new Error('Database backup failed.'));
        onSyncStatusChange(SyncStatus.ERROR);
    }
}, [isAuthenticated, syncPendingMaterials, findDbBackupFile, driveApiAction, onSyncStatusChange, onError, onConflictDetected, onSyncComplete]); // Added syncPendingMaterials dependency

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
    // Expose pending sync trigger (optional, could be internal)
    syncPendingMaterials,
  };
}
