import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { gapi, loadAuth2 } from 'gapi-script';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DB_NAME, StudyPalDB, exportDbToJson, importDbFromJson } from '../db'; 
import { 
  Subject, 
  Chapter, 
  Material, 
  SyncStatus, 
  StoreNames,
  SyncQueueItem,
  MaterialType
} from '../types/db.types';
import { IDBPDatabase } from 'idb';

// --- Constants --- 
// IMPORTANT: Replace with your actual credentials from Google Cloud Console
// Store these securely, ideally via environment variables during build time
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY 
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const STUDYPAL_DB_FILE = 'studypal.db.json';
const DB_BACKUP_MIME_TYPE = 'application/json';
const LAST_SYNC_TIMESTAMP_KEY = 'studyPalLastSyncTimestamp';
const DEBOUNCE_DELAY = 5000; // 5 seconds delay for auto-backup

// --- Enums for State --- 
// Export the type alias
export type SyncStatusState = 'idle' | 'checking' | 'syncing_up' | 'syncing_down' | 'up_to_date' | 'conflict' | 'error';
type ConflictResolution = 'local' | 'drive' | null;

// Type for auth state
type AuthState = {
  isAuthenticated: boolean;
};

// Type for sync result (Might be less relevant with full backup)
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
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{ driveModified: number; localModified: number } | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<number | null>(() => {
    // Initialize from localStorage
    const storedTime = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    return storedTime ? parseInt(storedTime, 10) : null;
  });

  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDbDirtyRef = useRef<boolean>(false); // Track if DB changed since last sync

  // --- GAPI Initialization & Initial Sync Check --- 
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

        // Perform initial check only if authenticated
        if (currentAuthStatus) {
          await checkInitialSyncState();
        }

        googleAuth.isSignedIn.listen(async (isSignedIn) => {
          setAuthState({ isAuthenticated: isSignedIn });
          if (isSignedIn) {
            setError(null);
            setSyncStatus('idle');
            await checkInitialSyncState(); // Check sync state on sign-in
          } else {
            // Reset state on sign out
            setSyncStatus('idle');
            setError(null);
            setConflictDetails(null);
            isDbDirtyRef.current = false;
            if (backupTimeoutRef.current) {
              clearTimeout(backupTimeoutRef.current);
              backupTimeoutRef.current = null;
            }
          }
        });

      } catch (err: any) {
        console.error('Error initializing GAPI client:', err);
        let message = 'Failed to initialize Google API Client. Sync unavailable.';
        if (err.details) message += ` Details: ${err.details}`;
        setError(new Error(message));
        setSyncStatus('error');
      }
    };

    initGapiClient();

  }, []);

  // --- Database Change Listener & Auto-Backup --- 
  useEffect(() => {
    const handleDbChange = () => {
      console.log('Detected DB change.');
      isDbDirtyRef.current = true; // Mark DB as dirty
      // Clear any existing backup timeout
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
      // Set a new timeout if authenticated and no conflict
      if (authState.isAuthenticated && !conflictDetails) {
        console.log(`Scheduling auto-backup in ${DEBOUNCE_DELAY}ms`);
        backupTimeoutRef.current = setTimeout(() => {
          console.log('Debounce timer expired, triggering auto-backup.');
          backupDatabaseToDrive(); // Trigger the backup
        }, DEBOUNCE_DELAY);
      }
    };

    window.addEventListener('studypal-db-changed', handleDbChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('studypal-db-changed', handleDbChange);
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
    };
  }, [authState.isAuthenticated, conflictDetails]); // Re-run if auth or conflict state changes

  // --- Auth Functions (signIn, signOut, isAuthenticated) ---

  /**
   * Initiate Google Sign-In
   */
  const signIn = useCallback(async () => {
    if (!isGapiLoaded) {
      setError(new Error('Google API client not loaded yet.'));
      return;
    }
    try {
      setError(null);
      setSyncStatus('idle');
      await gapi.auth2.getAuthInstance().signIn();
      // Listener will handle the rest
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.error === 'popup_closed_by_user') {
        setError(new Error('Sign-in cancelled.'));
      } else if (err.error === 'access_denied') {
         setError(new Error('Access denied. Please grant permission to Google Drive AppData.'));
      } else {
        setError(err instanceof Error ? err : new Error('Failed to sign in with Google.'));
        setSyncStatus('error');
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
      // Listener will handle state reset
    } catch (err) {
      console.error('Google Sign-Out error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out.'));
      setSyncStatus('error');
    }
  }, [isGapiLoaded]);

  /**
   * Check if authenticated (uses gapi state)
   */
  const isAuthenticated = useCallback(() => {
    // Also check if the auth instance itself is loaded
    return isGapiLoaded && !!gapi.auth2?.getAuthInstance() && authState.isAuthenticated;
  }, [isGapiLoaded, authState.isAuthenticated]);

  // --- Drive API Helpers (driveApiAction, createOrUpdateDriveItem, deleteDriveItem, getDriveFileContent, listDriveItems) ---

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

  // --- Database Backup/Restore Logic --- 

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
      // Don't throw here, allow backup/restore to handle not found
      return null; 
    }
  }, [driveApiAction]);

  /**
   * Backs up the entire IndexedDB to studypal.db.json on Google Drive.
   * Now updates sync status and timestamp.
   */
  const backupDatabaseToDrive = useCallback(async (isConflictResolution: boolean = false) => {
    if (!isAuthenticated()) throw new Error('Not authenticated');
    // Prevent backup if already syncing or in conflict (unless resolving conflict)
    if ((syncStatus === 'syncing_up' || syncStatus === 'syncing_down' || (syncStatus === 'conflict' && !isConflictResolution)) && !isConflictResolution) {
      console.warn('Backup skipped: Already syncing or in conflict.');
      return;
    }
    
    // Clear any pending backup timeout
    if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
        backupTimeoutRef.current = null;
    }

    setSyncStatus('syncing_up');
    setError(null);
    // Don't clear lastSuccessfulSync here, update on success

    try {
      console.log('Starting database backup to Drive...');
      const dbJson = await exportDbToJson();
      const existingBackup = await findDbBackupFile();
      
      const blob = new Blob([dbJson], { type: DB_BACKUP_MIME_TYPE });

      // Use gapi.client.request for upload
      const path = existingBackup?.id
        ? `/upload/drive/v3/files/${existingBackup.id}`
        : '/upload/drive/v3/files';
      const method = existingBackup?.id ? 'PATCH' : 'POST';
      
      const metadata = { 
          name: STUDYPAL_DB_FILE, 
          mimeType: DB_BACKUP_MIME_TYPE,
          ...( !existingBackup && { parents: ['appDataFolder'] }) // Add parent only on create
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
          dbJson + // Use the JSON string directly
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
      // Update local storage and state on successful backup
      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, backupTime.toString());
      setLastSuccessfulSync(backupTime);
      isDbDirtyRef.current = false; // Mark DB as clean after successful backup
      setSyncStatus('up_to_date');
      setConflictDetails(null); // Clear conflict on successful backup
      console.log('Database backup successful!', response.result);
      
    } catch (err: any) {
      console.error('Database backup failed:', err);
      setError(err instanceof Error ? err : new Error('Database backup failed.'));
      setSyncStatus('error');
      // Don't re-throw here, let UI react to error state
    }
  }, [isAuthenticated, exportDbToJson, findDbBackupFile, driveApiAction, syncStatus]); // Added syncStatus dependency

  /**
   * Restores the IndexedDB from studypal.db.json on Google Drive.
   * Now updates sync status and timestamp.
   */
  const restoreDatabaseFromDrive = useCallback(async (isConflictResolution: boolean = false) => {
    if (!isAuthenticated()) throw new Error('Not authenticated');
    // Prevent restore if already syncing (unless resolving conflict)
    if ((syncStatus === 'syncing_up' || syncStatus === 'syncing_down') && !isConflictResolution) {
      console.warn('Restore skipped: Already syncing.');
      return;
    }
    setSyncStatus('syncing_down');
    setError(null);

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
      // Update local storage and state on successful restore
      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, driveModifiedTime.toString());
      setLastSuccessfulSync(driveModifiedTime);
      isDbDirtyRef.current = false; // Mark DB as clean after successful restore
      setSyncStatus('up_to_date');
      setConflictDetails(null); // Clear conflict on successful restore
      console.log('Database restore successful!');
      // Consider prompting user to reload or using a state management library to refresh data
      window.location.reload(); 

    } catch (err: any) {
      console.error('Database restore failed:', err);
      setError(err instanceof Error ? err : new Error('Database restore failed.'));
      setSyncStatus('error');
      // Don't re-throw here
    }
  }, [isAuthenticated, findDbBackupFile, getDriveFileContent, importDbFromJson, syncStatus]); // Added syncStatus dependency

  // --- Initial Sync Check & Conflict Detection --- 
  const checkInitialSyncState = useCallback(async () => {
    // Set status immediately
    setSyncStatus('checking'); 

    if (!isAuthenticated()) {
        setSyncStatus('idle'); // Reset if not authenticated
        return;
    }

    // setError(null); // Error is reset within the try block if needed
    setConflictDetails(null);

    try {
      setError(null); // Reset error at the start of the check
      console.log('Checking initial sync state...');
      const driveFile = await findDbBackupFile();
      const localLastSync = lastSuccessfulSync;

      if (!driveFile) {
        // No backup on Drive
        if (isDbDirtyRef.current) {
          // Local changes exist, trigger initial backup
          console.log('No Drive backup found, local changes detected. Triggering initial backup.');
          await backupDatabaseToDrive(); // This will set status to syncing_up then up_to_date/error
        } else {
          // No Drive backup, no local changes
          console.log('No Drive backup found, no local changes.');
          setSyncStatus('up_to_date'); 
        }
        return;
      }

      // Backup exists on Drive
      const driveModifiedTime = new Date(driveFile.modifiedTime || 0).getTime();

      if (!localLastSync) {
        // Have Drive backup, but never synced before (or cleared local storage)
        console.log('Drive backup found, but no local sync history. Prompting user.');
        setConflictDetails({ driveModified: driveModifiedTime, localModified: Date.now() }); // Use current time as placeholder for local
        setSyncStatus('conflict');
      } else if (driveModifiedTime > localLastSync + 1000) { // Add buffer for clock skew
        // Drive file is newer than last sync
        if (isDbDirtyRef.current) {
          // Conflict: Both Drive and local have changed since last sync
          console.log('Conflict detected: Drive backup and local DB both changed since last sync.');
          setConflictDetails({ driveModified: driveModifiedTime, localModified: Date.now() }); // Use current time
          setSyncStatus('conflict');
        } else {
          // No local changes, Drive is newer -> Prompt user (safest default)
          console.log('Drive backup is newer than last sync, no local changes detected. Prompting user.');
          setConflictDetails({ driveModified: driveModifiedTime, localModified: localLastSync });
          setSyncStatus('conflict');
        }
      } else if (isDbDirtyRef.current && localLastSync >= driveModifiedTime) {
        // Drive is not newer, but local has changed -> Safe to backup
        console.log('Local DB changed since last sync, Drive backup is not newer. Triggering backup.');
        await backupDatabaseToDrive(); // This will set status to syncing_up then up_to_date/error
      } else {
        // Drive is not newer, local hasn't changed -> Up to date
        console.log('Local DB and Drive backup are in sync.');
        setSyncStatus('up_to_date');
      }

    } catch (err: any) {
      console.error('Error during initial sync check:', err);
      setError(err instanceof Error ? err : new Error('Failed to check sync status.'));
      setSyncStatus('error');
    }
  }, [isAuthenticated, findDbBackupFile, lastSuccessfulSync, backupDatabaseToDrive, restoreDatabaseFromDrive]); // Dependencies look correct

  // --- Conflict Resolution --- 
  const resolveConflict = useCallback(async (resolution: ConflictResolution) => {
    if (syncStatus !== 'conflict' || !resolution) return;

    console.log(`Attempting to resolve conflict using: ${resolution}`);
    setConflictDetails(null); // Clear conflict details while resolving

    if (resolution === 'drive') {
      await restoreDatabaseFromDrive(true); // Pass flag to bypass sync status check
    } else if (resolution === 'local') {
      await backupDatabaseToDrive(true); // Pass flag to bypass sync status check
    }
    // State (syncStatus, error) will be updated by the backup/restore functions
  }, [syncStatus, backupDatabaseToDrive, restoreDatabaseFromDrive]);

  // Return the hook's state and functions
  return {
    isGapiLoaded,
    authState,
    syncStatus, // Current sync status
    error,
    conflictDetails, // Details needed for conflict UI
    lastSuccessfulSync, // Timestamp of last successful operation
    isAuthenticated: isAuthenticated(),
    signIn,
    signOut,
    resolveConflict, // Function to call from conflict resolution UI
    // Expose backup/restore if needed for manual import/export triggers
    backupDatabaseToDrive, 
    restoreDatabaseFromDrive, 
    // Potentially remove isBackingUp, isRestoring if syncStatus covers it
  };
}
