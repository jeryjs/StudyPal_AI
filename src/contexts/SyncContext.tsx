import { exportDbToJson, importDbFromJson } from '@db';
import useCloudStorage, { CloudProvider } from '@hooks/useCloudStorage';
import {
  CloudQueue as CloudIcon,
  ArrowDownward as DownloadIcon,
  InfoOutlined as InfoIcon,
  Storage as StorageIcon,
  SyncProblem as SyncProblemIcon,
  ArrowUpward as UploadIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { materialsStore } from '@store/materialsStore';
import { MaterialType, SyncStatus } from '@type/db.types';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

// --- Constants ---
const LAST_SYNC_TIMESTAMP_KEY = 'studyPalLastSyncTimestamp';
const DEBOUNCE_DELAY = 5000; // 5 seconds delay for auto-backup

export interface SyncContextType {
  // Auth state
  isAuthenticated: boolean;
  isGapiLoaded: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  // Sync state
  syncStatus: SyncStatus;
  error: Error | null;
  lastSuccessfulSync: number | null;

  // Conflict handling
  conflictDetails: { cloud: { modifiedTime?: number, size?: number }, local: { modifiedTime?: number, size?: number } } | null;
  resolveConflict: (resolution: 'local' | 'drive' | null) => Promise<void>;

  // Manual operations
  backupDatabaseToDrive: () => Promise<void>;
  restoreDatabaseFromDrive: () => Promise<void>;
  getDriveFileContent: (fileId: string) => Promise<Blob>; // todo: remove this once i modularise the drive sync code

  // Flag to track if initialization has completed
  isInitialized: boolean;
}

// Helper function to format timestamp for display
const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
};

// Helper to format file size
const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return 'Unknown size'; // Handle null/undefined
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Create the context with a default value
const SyncContext = createContext<SyncContextType | null>(null);

// Provider component
export const SyncContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Sync state managed by context
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [conflictDetails, setConflictDetails] = useState<SyncContextType['conflictDetails'] | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<number | null>(() => {
    // Initialize from localStorage
    const storedTime = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    return storedTime ? parseInt(storedTime, 10) : null;
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Conflict dialog state
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [loadingResolution, setLoadingResolution] = useState<'local' | 'drive' | null>(null);

  // Debouncing with special handling for first change
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDbDirtyRef = useRef<boolean>(false); // Track if DB changed since last sync
  const isFirstChangeRef = useRef<boolean>(true); // Track if this is the first change

  // Callbacks for the hook to notify context of events
  const callbacks = {
    onSyncStatusChange: setSyncStatus,
    onConflictDetected: (details) => {
      // Enhanced conflict details with metadata
      setConflictDetails(details);
    },
    onSyncComplete: (timestamp: number) => {
      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, timestamp.toString());
      setLastSuccessfulSync(timestamp);
      isDbDirtyRef.current = false;
      // Reset resolution loading state when sync completes
      setLoadingResolution(null);
    }
  };

  // Replace useGoogleDriveSync with useCloudStorage
  const cloudStorage = useCloudStorage(CloudProvider.GoogleDrive);

  // Replace isGapiLoaded, authState, signIn, signOut, getBackupMetadata, backupToGDrive, restoreFromGDrive, getDriveFileContent with cloudStorage equivalents
  const isGapiLoaded = cloudStorage.isLoaded;
  const isAuthenticated = cloudStorage.isAuthenticated;
  const signIn = cloudStorage.signIn;
  const signOut = cloudStorage.signOut;
  const error = cloudStorage.error;

  // Helper: find the backup file metadata
  const getBackupMetadata = useCallback(async () => {
    return await cloudStorage.findFile('studypal.db.json');
  }, [cloudStorage]);

  /**
   * Uploads materials marked as PENDING to cloud storage.
   * Separates reading from network/writing to avoid TransactionInactiveError.
   */
  const syncPendingMaterials = useCallback(async () => {
    const pendingMaterials = await materialsStore.getPendingMaterials();
    let uploadCount = 0;
    let errorCount = 0;
    for (const material of pendingMaterials) {
      try {
        // Only sync binary materials with Blob content
        if ([MaterialType.LINK].includes(material.type) || !(material.content?.data instanceof Blob)) {
          // Mark as up to date (no need to sync)
          await materialsStore.updateMaterial({ id: material.id, syncStatus: SyncStatus.UP_TO_DATE });
          continue;
        }

        // Set material to UPLOADING state
        await materialsStore.updateMaterial({ id: material.id, syncStatus: SyncStatus.SYNCING_UP });

        // Upload to cloud
        const fileId = await cloudStorage.uploadFile({
          file: material.content.data,
          name: material.id,
          folderPath: material.chapterId,
          mimeType: material.content.mimeType
        });

        // Update local material with driveId/cloudId and sync status
        await materialsStore.updateMaterial({ id: material.id, driveId: fileId, syncStatus: SyncStatus.UP_TO_DATE });
        uploadCount++;
      } catch (err) {
        console.error(`syncPendingMaterials: Failed to sync material ${material.id}:`, err);
        await materialsStore.updateMaterial({ id: material.id, syncStatus: SyncStatus.ERROR });
        errorCount++;
      }
    }
    return { uploadCount, errorCount };
  }, [cloudStorage]);

  // Backup database to cloud
  const backupDatabaseToDrive = useCallback(async () => {
    try {
      setSyncStatus(SyncStatus.SYNCING_UP);
      const syncResult = await syncPendingMaterials();
      const dbJson = await exportDbToJson();
      const file = new Blob([dbJson], { type: 'application/json' });
      await cloudStorage.uploadFile({ file, name: 'studypal.db.json', mimeType: 'application/json' });
      // Update sync state
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, now.toString());
      setLastSuccessfulSync(now);
      isDbDirtyRef.current = false;
      setSyncStatus(syncResult.errorCount > 0 ? SyncStatus.ERROR : SyncStatus.UP_TO_DATE);
    } catch (err) {
      setSyncStatus(SyncStatus.ERROR);
    }
  }, [cloudStorage, syncPendingMaterials]);

  // Restore database from cloud
  const restoreDatabaseFromDrive = useCallback(async () => {
    try {
      const fileMeta = await cloudStorage.findFile('studypal.db.json');
      if (!fileMeta || !fileMeta.id) throw new Error('No backup found in cloud storage.');
      const blob = await cloudStorage.downloadFile(fileMeta.id);
      const dbJson = await blob.text();
      await importDbFromJson((dbJson));
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, now.toString());
      setLastSuccessfulSync(now);
      setSyncStatus(SyncStatus.UP_TO_DATE);
      alert('Database restored from cloud. Reloading page...');
      location.reload();
    } catch (err) {
      setSyncStatus(SyncStatus.ERROR);
      console.error('Error restoring database from cloud:', err);
      alert('Failed to restore database from cloud.\n\n' + err);
    }
  }, [cloudStorage]);

  // Provide a stub for getDriveFileContent (for legacy compatibility, can be removed if not needed)
  const getDriveFileContent = cloudStorage.downloadFile;

  // Effect to show conflict dialog when in conflict state
  useEffect(() => {
    if (syncStatus === 'conflict' && conflictDetails) {
      setIsConflictDialogOpen(true);
    } else if (syncStatus !== 'conflict') {
      setIsConflictDialogOpen(false);
      // Reset loading state if we're no longer in conflict
      setLoadingResolution(null);
    }
  }, [syncStatus, conflictDetails]);

  // --- Database Change Listener & Auto-Backup with improved debounce logic --- 
  useEffect(() => {
    const handleDbChange = () => {
      // console.log('Detected DB change.');
      isDbDirtyRef.current = true; // Mark DB as dirty

      // Clear any existing backup timeout
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
        backupTimeoutRef.current = null;
      }

      // Only proceed if authenticated and no conflict
      if (isAuthenticated && !conflictDetails) {
        // Special handling for first change: immediate backup
        if (isFirstChangeRef.current) {
          console.log('First change detected, triggering immediate backup.');
          isFirstChangeRef.current = false; // Reset first change flag
          backupDatabaseToDrive(); // Trigger the backup immediately
        } else {
          // Subsequent changes are debounced
          // console.log(`Scheduling auto-backup in ${DEBOUNCE_DELAY}ms`);
          backupTimeoutRef.current = setTimeout(() => {
            console.log('Debounce timer expired, triggering auto-backup.');
            backupDatabaseToDrive(); // Trigger the backup after delay
            setTimeout(() => isFirstChangeRef.current = true, 10000); // Reset first change flag 10s after backup
          }, DEBOUNCE_DELAY);
        }
      }
    };

    window.addEventListener('studypal-db-changed', handleDbChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('studypal-db-changed', handleDbChange);
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
        backupTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, conflictDetails]); // Re-run if auth or conflict state changes

  // Initialize sync on app load, not just when settings page is opened
  useEffect(() => {
    if (isGapiLoaded && isAuthenticated) {
      // Check initial sync state after GAPI is loaded and authenticated
      checkInitialSyncState().then(() => {
        setIsInitialized(true);
      });
    } else if (isGapiLoaded) {
      // Mark as initialized even if not authenticated
      setIsInitialized(true);
    }
  }, [isGapiLoaded, isAuthenticated]);

  // --- Sync Logic ---

  /**
   * Check initial sync state and handle conflicts
   */
  const checkInitialSyncState = useCallback(async () => {
    // Set status immediately
    setSyncStatus((SyncStatus.CHECKING));

    if (!isAuthenticated) {
      setSyncStatus(SyncStatus.NOTAUTHENTICATED); // Reset if not authenticated
      return;
    }

    // Reset state
    setConflictDetails(null);

    try {
      console.log('Checking initial sync state...');
      const driveFile = await getBackupMetadata();
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
          setSyncStatus(SyncStatus.UP_TO_DATE);
        }
        return;
      }      // Backup exists on Drive
      const driveModifiedTime = new Date(driveFile.modifiedTime || 0).getTime();
      // Get file size if available
      const driveSize = typeof driveFile.size === 'string' ? parseInt(driveFile.size, 10) : driveFile.size;
      const localSize = await exportDbToJson().then((json) => (new Blob([json], { type: 'application/json' })).size);

      if (!localLastSync) {
        // Have Drive backup, but never synced before (or cleared local storage)
        console.log('Drive backup found, but no local sync history. Prompting user.');
        setConflictDetails({
          cloud: { modifiedTime: driveModifiedTime, size: driveSize },
          local: { modifiedTime: localLastSync!!, size: localSize }
        });
        setSyncStatus(SyncStatus.CONFLICT);
      } else if (driveModifiedTime > localLastSync + 1000) { // Add buffer for clock skew
        // Drive file is newer than last sync
        if (isDbDirtyRef.current) {
          // Conflict: Both Drive and local have changed since last sync
          console.log('Conflict detected: Drive backup and local DB both changed since last sync.');
          setConflictDetails({
            cloud: { modifiedTime: driveModifiedTime, size: driveSize },
            local: { modifiedTime: localLastSync, size: localSize }
          });
          setSyncStatus(SyncStatus.CONFLICT);
        } else {
          // No local changes, Drive is newer -> Prompt user (safest default)
          console.log('Drive backup is newer than last sync, no local changes detected. Prompting user.');
          setConflictDetails({
            cloud: { modifiedTime: driveModifiedTime, size: driveSize },
            local: { modifiedTime: localLastSync, size: localSize }
          });
          setSyncStatus(SyncStatus.CONFLICT);
        }
      } else if (isDbDirtyRef.current && localLastSync >= driveModifiedTime) {
        // Drive is not newer, but local has changed -> Safe to backup
        console.log('Local DB changed since last sync, Drive backup is not newer. Triggering backup.');
        await backupDatabaseToDrive(); // This will set status to syncing_up then up_to_date/error
      } else {
        // Drive is not newer, local hasn't changed -> Up to date
        console.log('Local DB and Drive backup are in sync.');
        setSyncStatus(SyncStatus.UP_TO_DATE);
      }
    } catch (err: any) {
      console.error('Error during initial sync check:', err);
      setSyncStatus(SyncStatus.ERROR);
    }
  }, [lastSuccessfulSync, isAuthenticated, getBackupMetadata]);

  // --- Sync Operations ---

  /**
   * Handle conflict resolution - called from conflict dialog
   */
  const handleResolveConflict = useCallback(async (resolution: 'local' | 'drive' | null) => {
    if (syncStatus !== 'conflict' || !resolution) return;

    console.log(`Attempting to resolve conflict using: ${resolution}`);
    // Set loading state for the selected resolution button
    setLoadingResolution(resolution);

    try {
      if (resolution === 'drive') {
        await restoreDatabaseFromDrive();
        // Note: page will reload after this via the restoreDatabaseFromDrive function
      } else if (resolution === 'local') {
        await backupDatabaseToDrive();
        // Clear loading state when complete
        setLoadingResolution(null);
        // Dialog will close through the syncStatus effect
      }
      // State will be updated by the operations via callbacks
    } catch (err) {
      console.error('Error resolving conflict:', err);
      // Reset loading state on error
      setLoadingResolution(null);
      // Error will be set via callbacks
    }
  }, [syncStatus, backupDatabaseToDrive, restoreDatabaseFromDrive]);

  // Context value
  const contextValue: SyncContextType = {
    isAuthenticated,
    isGapiLoaded,
    signIn,
    signOut,
    syncStatus,
    error,
    lastSuccessfulSync,
    conflictDetails,
    resolveConflict: handleResolveConflict,
    backupDatabaseToDrive,
    restoreDatabaseFromDrive,
    getDriveFileContent,
    isInitialized
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}

      {/* Enhanced Conflict Resolution Dialog */}
      <Dialog
        open={isConflictDialogOpen}
        // Cannot be closed by clicking outside - user must choose an option
        aria-labelledby="conflict-dialog-title"
        aria-describedby="conflict-dialog-description"
        maxWidth="md" // Adjusted maxWidth for better Grid layout
        fullWidth
      >
        <DialogTitle id="conflict-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncProblemIcon color="error" /> Sync Conflict Detected
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="conflict-dialog-description" component="div">
            <Typography gutterBottom>
              Your local data and the data stored in Google Drive have both changed since the last successful sync.
              You need to choose which version to keep.
            </Typography>

            {/* Enhanced metadata comparison - using Grid */}
            {conflictDetails && (
              <Box sx={{ mt: 2, mb: 2 }}>
                {/* Use Grid container */}
                <Grid container spacing={2} alignItems="stretch">
                  {/* Google Drive Data Card - Grid item */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={1} sx={{ p: 2, height: '100%' }}> {/* Ensure Paper fills Grid item height */}
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CloudIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Google Drive Data
                        </Typography>
                      </Box>
                      <Divider />
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Last Modified"
                            secondary={formatTimestamp(conflictDetails.cloud.modifiedTime)}
                          />
                        </ListItem>
                        {/* Display driveSize if available */}
                        <ListItem>
                          <ListItemText
                            primary="Backup Size"
                            secondary={formatFileSize(conflictDetails.cloud.size)}
                          />
                        </ListItem>
                      </List>
                      <Tooltip title="Choosing this will download from Drive and replace your local data">
                        <Chip
                          icon={<DownloadIcon />}
                          label="Will download from Drive"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Tooltip>
                    </Paper>
                  </Grid>

                  {/* Local Data Card - Grid item */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={1} sx={{ p: 2, height: '100%' }}> {/* Ensure Paper fills Grid item height */}
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <StorageIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Local Data
                        </Typography>
                      </Box>
                      <Divider />
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Last Modified"
                            secondary={formatTimestamp(conflictDetails.local.modifiedTime)}
                          />
                        </ListItem>
                        {/* Local metadata can be expanded in future */}
                        <ListItem>
                          <ListItemText
                            primary="Backup Size"
                            secondary={formatFileSize(conflictDetails.local.size)}
                          />
                        </ListItem>
                      </List>
                      <Tooltip title="Choosing this will upload to Drive and replace the backup">
                        <Chip
                          icon={<UploadIcon />}
                          label="Will upload to Drive"
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Tooltip>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <InfoIcon color="warning" sx={{ mr: 1 }} fontSize="small" />
              <Typography variant="body2" color="warning.main">
                Selecting a version will replace the other completely. This action cannot be undone.
              </Typography>
            </Box>
          </DialogContentText>
        </DialogContent>
        {/* Use Stack for responsive button layout */}
        <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            width="100%"
          >
            {/* Drive Button with loading indicator */}
            <Button
              onClick={() => handleResolveConflict('drive')}
              variant="outlined"
              color="primary"
              disabled={loadingResolution !== null}
              startIcon={loadingResolution === 'drive' ?
                <CircularProgress size={16} color="inherit" /> :
                <CloudIcon />
              }
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 200 } }} // Responsive width
            >
              {loadingResolution === 'drive' ? 'Downloading...' : 'Use Google Drive Data'}
            </Button>

            {/* Local Button with loading indicator */}
            <Button
              onClick={() => handleResolveConflict('local')}
              variant="outlined"
              color="secondary"
              disabled={loadingResolution !== null}
              startIcon={loadingResolution === 'local' ?
                <CircularProgress size={16} color="inherit" /> :
                <StorageIcon />
              }
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 200 } }} // Responsive width
            >
              {loadingResolution === 'local' ? 'Uploading...' : 'Use Local Data'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </SyncContext.Provider>
  );
};

// Custom hook to use the SyncContext
export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncContextProvider');
  }
  return context;
};
