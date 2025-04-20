import { useState, useEffect, useCallback } from 'react';
import { gapi } from 'gapi-script';
import { exportDbToJson, importDbFromJson } from '@db';

// --- Constants --- 
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const STUDYPAL_DB_FILE = 'studypal.db.json';
const DB_BACKUP_MIME_TYPE = 'application/json';

// --- Types --- 
import { SyncStatusState } from '@contexts/SyncContext';

// Type for auth state
type AuthState = {
  isAuthenticated: boolean;
};

// Type for event callbacks from SyncContext
export type DriveEventCallbacks = {
  onSyncStatusChange: (status: SyncStatusState) => void;
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
 * Focuses solely on API interactions with Drive and exposes methods to be used by SyncContext.
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
            onSyncStatusChange('idle');
            onError(null);
            onConflictDetected(null);
          }
        });
      } catch (err: any) {
        console.error('Error initializing GAPI client:', err);
        let message = 'Failed to initialize Google API Client. Sync unavailable.';
        if (err.details) message += ` Details: ${err.details}`;
        onError(new Error(message));
        onSyncStatusChange('error');
      }
    };

    initGapiClient();
  }, []);

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
      onSyncStatusChange('idle');
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
        onSyncStatusChange('error');
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
      onSyncStatusChange('error');
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
   * Back up database to Google Drive
   */
  const backupDatabaseToDrive = useCallback(async () => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    onSyncStatusChange('syncing_up');
    onError(null);

    try {
      console.log('Starting database backup to Drive...');
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

      // Use multipart upload for creating or updating with metadata + media
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
      onSyncStatusChange('up_to_date');
      onConflictDetected(null);
      console.log('Database backup successful!', response.result);
      
    } catch (err: any) {
      console.error('Database backup failed:', err);
      onError(err instanceof Error ? err : new Error('Database backup failed.'));
      onSyncStatusChange('error');
    }
  }, [isAuthenticated, driveApiAction, findDbBackupFile, onSyncStatusChange, onError, onConflictDetected, onSyncComplete]);

  /**
   * Restore database from Google Drive
   */
  const restoreDatabaseFromDrive = useCallback(async () => {
    if (!isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    onSyncStatusChange('syncing_down');
    onError(null);

    try {
      console.log('Attempting to restore database from Drive...');
      const backupFile = await findDbBackupFile();
      if (!backupFile || !backupFile.id) {
        throw new Error('No database backup file found on Google Drive.');
      }

      console.log(`Found backup file: ${backupFile.id}, modified: ${backupFile.modifiedTime}`);
      const blob = await getDriveFileContent(backupFile.id);
      const dbJson = await blob.text();

      await importDbFromJson(dbJson);
      
      const driveModifiedTime = new Date(backupFile.modifiedTime || Date.now()).getTime();
      
      // Signal completion to context
      onSyncComplete(driveModifiedTime);
      onSyncStatusChange('up_to_date');
      onConflictDetected(null);
      console.log('Database restore successful!');
      
    } catch (err: any) {
      console.error('Database restore failed:', err);
      onError(err instanceof Error ? err : new Error('Database restore failed.'));
      onSyncStatusChange('error');
    }
  }, [isAuthenticated, findDbBackupFile, getDriveFileContent, onSyncStatusChange, onError, onConflictDetected, onSyncComplete]);

  /**
   * Check backup file metadata without downloading content
   */
  const getBackupMetadata = useCallback(async () => {
    if (!isAuthenticated()) return null;
    
    try {
      return await findDbBackupFile();
    } catch (err) {
      console.error('Error getting backup metadata:', err);
      return null;
    }
  }, [isAuthenticated, findDbBackupFile]);

  // Return only API-related functionality 
  return {
    isGapiLoaded,
    authState: { isAuthenticated: isAuthenticated() },
    signIn,
    signOut,
    getBackupMetadata,
    backupDatabaseToDrive,
    restoreDatabaseFromDrive,
  };
}
