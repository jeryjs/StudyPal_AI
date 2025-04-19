import { useState, useEffect, useCallback } from 'react';
import { gapi, loadAuth2 } from 'gapi-script';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { 
  Subject, 
  Chapter, 
  Material, 
  SyncStatus, 
  StoreNames,
  SyncQueueItem,
  MaterialType
} from '../types/db.types';

// --- Constants --- 
// IMPORTANT: Replace with your actual credentials from Google Cloud Console
// Store these securely, ideally via environment variables during build time
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY_PLACEHOLDER'; 
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_PLACEHOLDER';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

// Type for auth state
type AuthState = {
  isAuthenticated: boolean;
};

// Type for sync result
type SyncResult = {
  successful: number;
  failed: number;
  conflicts: number;
};

/**
 * Hook for Google Drive synchronization using AppData folder via gapi
 */
export function useGoogleDriveSync() {
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean;
    lastSyncTime?: number;
    lastSyncResult?: SyncResult;
  }>({ isSyncing: false });
  const [error, setError] = useState<Error | null>(null);

  // --- GAPI Initialization Effect ---
  useEffect(() => {
    const initGapiClient = async () => {
      // Basic check for placeholder credentials
      if (API_KEY.includes('PLACEHOLDER') || CLIENT_ID.includes('PLACEHOLDER')) {
        console.warn('Google API Key or Client ID is a placeholder. Sync will not work.');
        setError(new Error('Google API credentials not configured.'));
        return;
      }
      
      try {
        await new Promise<void>((resolve, reject) => {
          gapi.load('client:auth2', {
            callback: resolve,
            onerror: reject,
            timeout: 10000, // Increased timeout
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
        setAuthState({ isAuthenticated: googleAuth.isSignedIn.get() });

        googleAuth.isSignedIn.listen((isSignedIn) => {
          setAuthState({ isAuthenticated: isSignedIn });
          if (!isSignedIn) {
            setSyncState({ isSyncing: false });
            setError(null);
          }
        });

      } catch (err: any) {
        console.error('Error initializing GAPI client:', err);
        let message = 'Failed to initialize Google API Client. Sync unavailable.';
        if (err.details) message += ` Details: ${err.details}`;
        setError(new Error(message));
      }
    };

    initGapiClient();

  }, []); 

  /**
   * Initiate Google Sign-In
   */
  const signIn = useCallback(async () => {
    if (!isGapiLoaded) {
      setError(new Error('Google API client not loaded yet.'));
      return;
    }
    try {
      setError(null); // Clear previous errors
      await gapi.auth2.getAuthInstance().signIn();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.error === 'popup_closed_by_user') {
        setError(new Error('Sign-in cancelled.'));
      } else if (err.error === 'access_denied') {
         setError(new Error('Access denied. Please grant permission to Google Drive AppData.'));
      } else {
        setError(err instanceof Error ? err : new Error('Failed to sign in with Google.'));
      }
    }
  }, [isGapiLoaded]);

  /**
   * Initiate Google Sign-Out
   */
  const signOut = useCallback(async () => {
    if (!isGapiLoaded || !gapi.auth2?.getAuthInstance()) return;
    try {
      await gapi.auth2.getAuthInstance().signOut();
    } catch (err) {
      console.error('Google Sign-Out error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out.'));
    }
  }, [isGapiLoaded]);

  /**
   * Check if authenticated (uses gapi state)
   */
  const isAuthenticated = useCallback(() => {
    // Also check if the auth instance itself is loaded
    return isGapiLoaded && !!gapi.auth2?.getAuthInstance() && authState.isAuthenticated;
  }, [isGapiLoaded, authState.isAuthenticated]);

  /**
   * Helper to perform Drive API actions with error handling using gapi
   */
  const driveApiAction = useCallback(async <T = any>(
    // The action function now directly returns the Promise<gapi.client.Response<T>>
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
      // Use optional chaining and nullish coalescing for safer access
      const statusCode = err?.status ?? err?.result?.error?.code;
      if (statusCode === 401 || err?.message?.includes('Unauthorized') || err?.message?.includes('Invalid Credentials')) {
         signOut();
         throw new Error('Authentication failed. Please sign in again.');
      }
      throw err instanceof Error ? err : new Error(err?.message || 'Google Drive API request failed');
    }
  }, [isAuthenticated, signOut]); // Dependencies

  /**
   * Create or update a file/folder in Google Drive App Data folder using gapi
   */
  const createOrUpdateDriveItem = useCallback(async (
    item: { id: string; name: string; content?: string | Blob; mimeType: string; parentDriveId?: string; driveId?: string },
    typePrefix: 'subject' | 'chapter' | 'material'
  ): Promise<gapi.client.drive.File> => {
    const fileName = `${typePrefix}_${item.id}`;
    const parentId = item.parentDriveId || 'appDataFolder';

    const metadata: gapi.client.drive.File = {
      name: fileName,
      mimeType: item.mimeType,
      parents: [parentId],
    };

    if (item.driveId) {
      // --- UPDATE --- 
      let updatedFile: gapi.client.drive.File | undefined;

      // 1. Update metadata (name)
      try {
        const response = await driveApiAction(() => 
          gapi.client.drive.files.update({
            fileId: item.driveId!,
            resource: { name: fileName }, 
            fields: 'id, name, mimeType, modifiedTime, parents',
          })
        );
        updatedFile = response.result;
      } catch (metaErr) {
        console.error(`Failed to update metadata for ${item.driveId}:`, metaErr);
        throw metaErr; 
      }

      // 2. Update content (media) if it exists and it's not a folder
      if (item.content && item.mimeType !== 'application/vnd.google-apps.folder') {
        try {
          // Use gapi.client.request for direct upload
          const response = await driveApiAction(() => 
            gapi.client.request({
              path: `/upload/drive/v3/files/${item.driveId}`,
              method: 'PATCH',
              params: { uploadType: 'media', fields: 'id, name, mimeType, modifiedTime, parents' },
              body: item.content, 
            })
          );
          updatedFile = response.result as gapi.client.drive.File;
        } catch (mediaErr) {
          console.error(`Failed to update media for ${item.driveId}:`, mediaErr);
          throw mediaErr; 
        }
      }
      
      if (!updatedFile) throw new Error('Update failed, no response data.');
      return updatedFile;

    } else {
      // --- CREATE --- 
      if (item.content && item.mimeType !== 'application/vnd.google-apps.folder') {
        // Multipart Create
        const boundary = '-------314159265358979323846'; // Define boundary here
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const contentType = item.content instanceof Blob ? item.content.type : 'text/plain';
        const metadataStr = JSON.stringify(metadata); // Use defined metadata
        const contentStr = item.content instanceof Blob ? await item.content.text() : item.content;

        const multipartRequestBody = 
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            metadataStr +
            delimiter +
            'Content-Type: ' + contentType + '\r\n\r\n' +
            contentStr +
            close_delim;

        const response = await driveApiAction(() => 
          gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart', fields: 'id, name, mimeType, modifiedTime, parents' },
            headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            body: multipartRequestBody
          })
        );
        return response.result as gapi.client.drive.File;

      } else {
        // Simple Create (metadata only)
        const response = await driveApiAction(() => 
          gapi.client.drive.files.create({
            resource: metadata, // Use defined metadata
            fields: 'id, name, mimeType, modifiedTime, parents',
          })
        );
        return response.result;
      }
    }
  }, [driveApiAction]); // Dependency

  /**
   * Delete a file/folder from Google Drive using gapi
   */
  const deleteDriveItem = useCallback(async (driveId: string): Promise<void> => {
    await driveApiAction(() => 
      gapi.client.drive.files.delete({ fileId: driveId })
    );
    // No result needed
  }, [driveApiAction]);

  /**
   * Get file content from Google Drive using gapi
   */
  const getDriveFileContent = useCallback(async (fileId: string): Promise<Blob> => {
    const response = await driveApiAction(() => 
      gapi.client.request({
          path: `/drive/v3/files/${fileId}`,
          method: 'GET',
          params: { alt: 'media' },
      })
    );
    
    const body = response.body; 
    const contentType = response.headers?.['content-type'] || 'application/octet-stream';
    // Ensure body is not null/undefined before creating Blob
    return new Blob([body || ''], { type: contentType });

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

  // --- Sync Logic (Hooks using the gapi helpers) ---

  /**
   * Add an item to the sync queue
   */
  const addToSyncQueue = useCallback(async (
    storeType: StoreNames,
    itemId: string,
    action: 'create' | 'update' | 'delete'
  ): Promise<SyncQueueItem> => {
    try {
      const db = await getDb();
      const queueItem: SyncQueueItem = {
        id: uuidv4(),
        storeType,
        itemId,
        action,
        timestamp: Date.now(),
        retryCount: 0
      };
      await db.put(StoreNames.SYNC_QUEUE, queueItem);
      return queueItem;
    } catch (err) {
      console.error('Error adding to sync queue:', err);
      throw err instanceof Error ? err : new Error('Failed to add to sync queue');
    }
  }, []); // No external dependencies needed

  /**
   * Sync a single item (Subject, Chapter, Material) to Google Drive using gapi
   */
  const syncItemToDrive = useCallback(async (
    item: Subject | Chapter | Material,
    storeName: StoreNames,
    action: 'create' | 'update' | 'delete'
  ): Promise<void> => {
    const db = await getDb();

    if (action === 'delete') {
      if (item.driveId) {
        // Ensure item exists and has driveId before attempting delete
        await deleteDriveItem(item.driveId);
      }
      // If action is delete, we assume local deletion is handled elsewhere or confirmed after sync
      return;
    }

    // Ensure item exists for create/update
    if (!item) {
        console.warn(`SyncItemToDrive called for ${action} but item is missing.`);
        return;
    }

    let parentDriveId: string | undefined = undefined;
    let typePrefix: 'subject' | 'chapter' | 'material';
    let content: string | Blob | undefined;
    let mimeType: string;

    // Determine parent, type, content based on storeName (Same logic as before)
    if (storeName === StoreNames.SUBJECTS) {
      typePrefix = 'subject';
      mimeType = 'application/vnd.google-apps.folder';
      parentDriveId = 'appDataFolder';
    } else if (storeName === StoreNames.CHAPTERS) {
      const chapter = item as Chapter;
      const parentSubject = await db.get(StoreNames.SUBJECTS, chapter.subjectId);
      if (!parentSubject?.driveId) throw new Error(`Parent subject ${chapter.subjectId} not found or not synced.`);
      parentDriveId = parentSubject.driveId;
      typePrefix = 'chapter';
      mimeType = 'application/vnd.google-apps.folder';
    } else if (storeName === StoreNames.MATERIALS) {
      const material = item as Material;
      const parentChapter = await db.get(StoreNames.CHAPTERS, material.chapterId);
      if (!parentChapter?.driveId) throw new Error(`Parent chapter ${material.chapterId} not found or not synced.`);
      parentDriveId = parentChapter.driveId;
      typePrefix = 'material';
      
      // Handle material content and mimeType (Same logic)
      if (material.content instanceof Blob) {
        content = material.content;
        mimeType = material.content.type || 'application/octet-stream'; 
      } else if (typeof material.content === 'string') {
        content = material.content;
        switch(material.type) {
          case MaterialType.MARKDOWN: mimeType = 'text/markdown'; break;
          case MaterialType.LINK: mimeType = 'application/json'; 
                             content = JSON.stringify({ url: material.contentUrl || material.content }); break; 
          default: mimeType = 'text/plain';
        }
      } else if (material.contentUrl && material.type === MaterialType.LINK) {
         mimeType = 'application/json';
         content = JSON.stringify({ url: material.contentUrl });
      } else if (material.type === MaterialType.PDF || material.type === MaterialType.IMAGE || material.type === MaterialType.VIDEO) {
         mimeType = 'application/json'; 
         content = JSON.stringify({ name: material.name, type: material.type, localRef: 'placeholder' }); 
      }
       else {
        mimeType = 'application/json';
        content = JSON.stringify({ name: material.name, type: material.type });
      }
    } else {
      throw new Error(`Unsupported store name for sync: ${storeName}`);
    }

    // Perform the create/update operation using gapi helpers
    const driveFile = await createOrUpdateDriveItem({
      id: item.id,
      name: item.name, 
      content: content,
      mimeType: mimeType,
      parentDriveId: parentDriveId,
      driveId: item.driveId,
    }, typePrefix);

    // Update local item (Same logic)
    const updatedItem = {
      ...item,
      driveId: driveFile.id!,
      syncStatus: SyncStatus.SYNCED,
      lastModified: Date.now(), // Update local timestamp on successful sync
      ...(storeName === StoreNames.MATERIALS && { driveLastModified: new Date(driveFile.modifiedTime || '').getTime() }),
    };

    await db.put(storeName, updatedItem);

  }, [createOrUpdateDriveItem, deleteDriveItem]); // Dependencies

  /**
   * Process items in the sync queue (Push local changes)
   */
  const processSyncQueue = useCallback(async (): Promise<SyncResult> => {
    // Use the hook's isAuthenticated function
    if (!isAuthenticated()) throw new Error('Not authenticated');
    
    const db = await getDb();
    const queueItems = await db.getAllFromIndex(StoreNames.SYNC_QUEUE, 'by-timestamp');
    
    let successful = 0, failed = 0, conflicts = 0;

    for (const queueItem of queueItems) {
      try {
        const item = await db.get(queueItem.storeType, queueItem.itemId);
        
        // Handle item deletion before sync
        if (!item && queueItem.action !== 'delete') {
           console.warn(`Item ${queueItem.itemId} not found locally for sync action ${queueItem.action}. Removing from queue.`);
           await db.delete(StoreNames.SYNC_QUEUE, queueItem.id);
           continue; 
        }
        
        // For delete action, we need driveId. If item exists, use its driveId.
        // If item is already deleted locally, we can't get driveId easily. 
        // Consider storing driveId in the queue item itself for deletions.
        // For now, we proceed if item exists OR if it's a delete action (best effort)
        const itemToSync = item || { id: queueItem.itemId, driveId: undefined }; // Minimal object if local is gone
        
        // Call syncItemToDrive - it handles the delete case internally
        await syncItemToDrive(itemToSync as Subject | Chapter | Material, queueItem.storeType, queueItem.action);

        // Remove from queue on success
        await db.delete(StoreNames.SYNC_QUEUE, queueItem.id);
        successful++;
      } catch (err) {
        console.error(`Error processing sync queue item ${queueItem.id} (${queueItem.storeType}/${queueItem.itemId}):`, err);
        
        // Retry logic (Same)
        queueItem.retryCount += 1;
        if (queueItem.retryCount >= 3) {
          failed++;
          try {
            // Attempt to mark the original item as ERROR if it still exists
            const originalItem = await db.get(queueItem.storeType, queueItem.itemId);
            if (originalItem) {
              await db.put(queueItem.storeType, { ...originalItem, syncStatus: SyncStatus.ERROR });
            }
          } catch (updateErr) { console.error('Error marking item as ERROR:', updateErr); }
          // Remove from queue after max retries
          await db.delete(StoreNames.SYNC_QUEUE, queueItem.id);
        } else {
          // Update retry count in the queue
          await db.put(StoreNames.SYNC_QUEUE, queueItem);
        }
      }
    }
    return { successful, failed, conflicts };
  // Use the hook's syncItemToDrive and isAuthenticated
  }, [isAuthenticated, syncItemToDrive]); 

  /**
   * Parse Drive file name (No changes needed)
   */
  const parseDriveFileName = (fileName: string): { type: 'subject' | 'chapter' | 'material' | null, id: string | null } => {
    const match = fileName.match(/^(subject|chapter|material)_(.+)$/);
    if (match) {
      return { type: match[1] as 'subject' | 'chapter' | 'material', id: match[2] };
    }
    return { type: null, id: null };
  };

  /**
   * Helper to update or create a local item based on Drive data
   */
  const updateLocalItem = async (
    driveFile: gapi.client.drive.File,
    localItem: Subject | Chapter | Material | undefined,
    storeName: StoreNames,
    parsedInfo: { type: 'subject' | 'chapter' | 'material'; id: string }, // Ensure non-null
    parentItemId?: string
  ): Promise<{ status: 'updated' | 'created' | 'conflict' | 'skipped' }> => {
    const db = await getDb();
    const driveLastModified = new Date(driveFile.modifiedTime || '').getTime();
    const driveCreatedTime = new Date(driveFile.createdTime || '').getTime();

    if (localItem) {
      // Item exists locally (Conflict/Update logic - Same as before)
      if (localItem.syncStatus === SyncStatus.PENDING) {
        await db.put(storeName, { ...localItem, syncStatus: SyncStatus.CONFLICT });
        return { status: 'conflict' };
      }

      const localLastModifiedTime = (storeName === StoreNames.MATERIALS && (localItem as Material).driveLastModified)
                                    ? (localItem as Material).driveLastModified! 
                                    : localItem.lastModified;

      if (driveLastModified > localLastModifiedTime) {
         // Remote is newer (Update logic - Same, uses getDriveFileContent)
         let updatedLocalItem = { ...localItem };
         
         if (storeName === StoreNames.MATERIALS) {
            const material = localItem as Material;
            try {
               // Ensure driveFile.id is not null/undefined
               if (!driveFile.id) throw new Error('Drive file ID missing for content fetch');
               const blob = await getDriveFileContent(driveFile.id);
               
               // Parse content (Same logic)
               let parsedContent: string | Blob | undefined = blob;
               let parsedContentUrl: string | undefined;
               let parsedType: MaterialType = material.type;
               let parsedName = material.name;

               if (driveFile.mimeType === 'application/json') {
                 try {
                    const metadata = JSON.parse(await blob.text());
                    parsedName = metadata.name || parsedName;
                    parsedType = metadata.type || parsedType;
                    parsedContentUrl = metadata.url || metadata.contentUrl;
                    if(parsedContentUrl || metadata.localRef) parsedContent = undefined; 
                 } catch (e) { console.warn("Failed to parse material JSON metadata:", e); }
               } else if (driveFile.mimeType?.startsWith('text/')) {
                 parsedContent = await blob.text();
               } 

               updatedLocalItem = {
                  ...material,
                  name: parsedName,
                  type: parsedType,
                  content: parsedContent,
                  contentUrl: parsedContentUrl,
                  lastModified: driveLastModified,
                  driveId: driveFile.id!, // Ensure non-null
                  driveLastModified: driveLastModified,
                  syncStatus: SyncStatus.SYNCED,
               };
            } catch (fetchErr) {
               console.error(`Failed to fetch content for material ${driveFile.id}:`, fetchErr);
               return { status: 'skipped' };
            }
         } else {
            // Subjects/chapters (Same)
             updatedLocalItem = {
               ...localItem,
               lastModified: driveLastModified,
               driveId: driveFile.id!, // Ensure non-null
               syncStatus: SyncStatus.SYNCED,
             };
         }
         
         await db.put(storeName, updatedLocalItem);
         return { status: 'updated' };

      } else {
        // Local is up-to-date (Same)
        if (localItem.driveId !== driveFile.id) {
          await db.put(storeName, { ...localItem, driveId: driveFile.id! });
          return { status: 'updated' };
        }
        return { status: 'skipped' };
      }

    } else {
      // Item does not exist locally - Create it (Same logic, uses getDriveFileContent)
      let newItem: Subject | Chapter | Material;
      const baseProps = {
        id: parsedInfo.id,
        name: driveFile.name || `Sync-${parsedInfo.type}-${parsedInfo.id}`, // Use drive name if available
        createdAt: driveCreatedTime || Date.now(),
        lastModified: driveLastModified || Date.now(),
        driveId: driveFile.id!, // Ensure non-null
        syncStatus: SyncStatus.SYNCED,
        driveLastModified: driveLastModified,
      };

      try {
        if (storeName === StoreNames.SUBJECTS) {
          newItem = { ...baseProps, color: undefined } as Subject; 
        } else if (storeName === StoreNames.CHAPTERS) {
          if (!parentItemId) throw new Error('Parent subject ID missing for chapter creation');
          newItem = { ...baseProps, subjectId: parentItemId, order: undefined } as Chapter;
        } else if (storeName === StoreNames.MATERIALS) {
          if (!parentItemId) throw new Error('Parent chapter ID missing for material creation');
          if (!driveFile.id) throw new Error('Drive file ID missing for content fetch');
          const blob = await getDriveFileContent(driveFile.id);
          
          // Parse content (Same logic)
          let parsedContent: string | Blob | undefined = blob;
          let parsedContentUrl: string | undefined;
          let parsedType: MaterialType = MaterialType.MARKDOWN; 
          let parsedName = baseProps.name;

          if (driveFile.mimeType === 'application/json') {
             try {
                const metadata = JSON.parse(await blob.text());
                parsedName = metadata.name || parsedName;
                parsedType = metadata.type || parsedType;
                parsedContentUrl = metadata.url || metadata.contentUrl;
                if(parsedContentUrl || metadata.localRef) parsedContent = undefined; 
             } catch (e) { console.warn("Failed to parse material JSON metadata:", e); }
          } else if (driveFile.mimeType?.startsWith('text/')) {
             parsedContent = await blob.text();
             parsedType = MaterialType.MARKDOWN; 
          } else {
             if(driveFile.mimeType?.startsWith('image/')) parsedType = MaterialType.IMAGE;
             else if(driveFile.mimeType === 'application/pdf') parsedType = MaterialType.PDF;
             // Add more specific type handling based on mimeType if needed
          }

          newItem = {
            ...baseProps,
            name: parsedName,
            chapterId: parentItemId,
            type: parsedType,
            content: parsedContent,
            contentUrl: parsedContentUrl,
          } as Material;
        } else {
          throw new Error(`Unsupported store name: ${storeName}`);
        }

        await db.put(storeName, newItem);
        return { status: 'created' };
      } catch (createErr) {
        console.error(`Failed to create local item ${parsedInfo.id} from Drive:`, createErr);
        return { status: 'skipped' };
      }
    }
  };

  /**
   * Pull changes from Google Drive and update local database
   */
  const pullFromDrive = useCallback(async (): Promise<SyncResult> => {
    // Use hook's isAuthenticated
    if (!isAuthenticated()) throw new Error('Not authenticated');
    
    // Use hook's setSyncState
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    const db = await getDb();
    let successful = 0, failed = 0, conflicts = 0;

    try {
      const processDriveLevel = async (parentDriveId: string, parentLocalId?: string) => {
        const driveItems = await listDriveItems(parentDriveId);
        
        for (const driveItem of driveItems) {
          // Basic validation of driveItem
          if (!driveItem.id || !driveItem.name) continue;
          
          const parsedInfo = parseDriveFileName(driveItem.name);
          // Ensure type and id are valid
          if (!parsedInfo.type || !parsedInfo.id) continue;

          let storeName: StoreNames;
          let currentParentId: string | undefined;

          switch (parsedInfo.type) {
            case 'subject': storeName = StoreNames.SUBJECTS; break;
            case 'chapter': storeName = StoreNames.CHAPTERS; currentParentId = parentLocalId; break;
            case 'material': storeName = StoreNames.MATERIALS; currentParentId = parentLocalId; break;
            default: continue; 
          }

          try {
            const localItem = await db.get(storeName, parsedInfo.id);
            // Pass validated parsedInfo
            const result = await updateLocalItem(driveItem, localItem, storeName, parsedInfo as { type: 'subject' | 'chapter' | 'material'; id: string }, currentParentId);

            if (result.status === 'conflict') conflicts++;
            else if (result.status !== 'skipped') successful++;

            // Recurse if folder and no conflict
            if (driveItem.mimeType === 'application/vnd.google-apps.folder' && result.status !== 'conflict') {
              await processDriveLevel(driveItem.id, parsedInfo.id);
            }
          } catch (itemErr) {
            console.error(`Error processing ${parsedInfo.type} ${driveItem.name}:`, itemErr);
            failed++;
          }
        }
      };

      await processDriveLevel('appDataFolder');

      const syncResult = { successful, failed, conflicts };
      // Use hook's setSyncState
      setSyncState(prev => ({ ...prev, isSyncing: false, lastSyncTime: Date.now(), lastSyncResult: syncResult }));
      return syncResult;

    } catch (err) {
      console.error('Error pulling from Drive:', err);
      // Use hook's setSyncState and setError
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      setError(err instanceof Error ? err : new Error('Failed to pull from Drive'));
      throw err;
    }
  // Use hook's listDriveItems and getDriveFileContent
  }, [isAuthenticated, listDriveItems, getDriveFileContent]); 

  /**
   * Main sync function
   */
  const syncWithDrive = useCallback(async (): Promise<SyncResult> => {
    // Use hook's isAuthenticated
    if (!isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    // Use hook's setSyncState and setError
    setSyncState(prev => ({ ...prev, isSyncing: true, lastSyncResult: undefined, error: null }));
    
    try {
      console.log("Sync: Starting push...");
      // Use hook's processSyncQueue
      const pushResult = await processSyncQueue();
      console.log("Sync: Push finished.", pushResult);
      
      console.log("Sync: Starting pull...");
      // Use hook's pullFromDrive
      const pullResult = await pullFromDrive();
      console.log("Sync: Pull finished.", pullResult);
      
      const combinedResult: SyncResult = {
        successful: pushResult.successful + pullResult.successful,
        failed: pushResult.failed + pullResult.failed,
        conflicts: pushResult.conflicts + pullResult.conflicts 
      };
      
      console.log("Sync: Completed.", combinedResult);
      // Use hook's setSyncState
      setSyncState({
        isSyncing: false,
        lastSyncTime: Date.now(),
        lastSyncResult: combinedResult
      });
      
      if (combinedResult.conflicts > 0) {
         console.warn(`Sync finished with ${combinedResult.conflicts} conflicts.`);
         // Use hook's setError
         setError(new Error(`${combinedResult.conflicts} sync conflicts detected. Please resolve them.`));
      }
      
      return combinedResult;
    } catch (err) {
      console.error('Error syncing with Drive:', err);
      const syncError = err instanceof Error ? err : new Error('Failed to sync with Drive');
      // Use hook's setSyncState and setError
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      setError(syncError); 
      throw syncError; 
    }
  // Use hook's processSyncQueue and pullFromDrive
  }, [isAuthenticated, processSyncQueue, pullFromDrive]);

  /**
   * Resolve a sync conflict
   */
  const resolveConflict = useCallback(async (
    storeType: StoreNames,
    itemId: string,
    resolution: 'local' | 'remote'
  ): Promise<void> => {
    const db = await getDb();
    const item = await db.get(storeType, itemId);

    if (!item) throw new Error(`Item ${itemId} not found in ${storeType}`);
    if (item.syncStatus !== SyncStatus.CONFLICT) {
       console.warn(`Item ${itemId} is not in conflict state.`);
       return; 
    }

    try {
      if (resolution === 'local') {
        await db.put(storeType, { ...item, syncStatus: SyncStatus.PENDING, lastModified: Date.now() });
        // Use hook's addToSyncQueue
        await addToSyncQueue(storeType, itemId, item.driveId ? 'update' : 'create');
        console.log(`Conflict resolved for ${itemId}: Kept local version. Will sync on next cycle.`);
      } else {
        // Mark as SYNCED temporarily to avoid re-conflict during pull
        await db.put(storeType, { ...item, syncStatus: SyncStatus.SYNCED }); 
        console.log(`Conflict resolved for ${itemId}: Keeping remote version. Triggering pull...`);
        // Use hook's pullFromDrive
        await pullFromDrive(); 
         console.log(`Conflict resolved for ${itemId}: Pull finished.`);
      }
       // Use hook's error state
       if (error?.message.includes('sync conflicts detected')) {
          // Use hook's setError
          setError(null);
       }
    } catch (err) {
      console.error(`Error resolving conflict for ${itemId}:`, err);
      // Revert status on error
      await db.put(storeType, { ...item, syncStatus: SyncStatus.CONFLICT }); 
      throw err instanceof Error ? err : new Error('Failed to resolve conflict');
    }
  // Use hook's addToSyncQueue, pullFromDrive, and error state
  }, [addToSyncQueue, pullFromDrive, error]);

  // Return the hook's state and functions
  return {
    isGapiLoaded,
    authState,
    syncState,
    error,
    isAuthenticated: isAuthenticated(), // Use the hook's function
    signIn,
    signOut,
    
    syncWithDrive,
    pullFromDrive,
    processSyncQueue,
    resolveConflict,
    addToSyncQueue, // Expose if needed elsewhere
  };
}
