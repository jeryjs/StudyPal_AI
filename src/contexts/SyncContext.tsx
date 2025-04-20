import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useGoogleDriveSync, DriveEventCallbacks } from '@hooks/useGoogleDriveSync';
import { exportDbToJson } from '@db';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    Typography,
    CircularProgress,
    Box,
    Tooltip,
    Divider,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    Stack, // Keep Stack for buttons
    Grid // Use Grid for layout
} from '@mui/material';
import { 
    SyncProblem as SyncProblemIcon,
    Storage as StorageIcon,
    CloudQueue as CloudIcon,
    InfoOutlined as InfoIcon,
    ArrowDownward as DownloadIcon,
    ArrowUpward as UploadIcon
} from '@mui/icons-material';
import { SyncStatus } from '@type/db.types';

// --- Constants ---
const LAST_SYNC_TIMESTAMP_KEY = 'studyPalLastSyncTimestamp';
const DEBOUNCE_DELAY = 5000; // 5 seconds delay for auto-backup

// --- Context Types ---
export type SyncStatusState = 'idle' | 'checking' | 'syncing_up' | 'syncing_down' | 'up_to_date' | 'conflict' | 'error';

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
  conflictDetails: { driveModified: number; localModified: number; driveSize?: number } | null;
  resolveConflict: (resolution: 'local' | 'drive' | null) => Promise<void>;
  
  // Manual operations
  backupDatabaseToDrive: () => Promise<void>;
  restoreDatabaseFromDrive: () => Promise<void>;
  
  // Flag to track if initialization has completed
  isInitialized: boolean;
}

// Helper function to format timestamp for display
const formatTimestamp = (timestamp: number | null): string => {
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
  const [error, setError] = useState<Error | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{ 
    driveModified: number; 
    localModified: number; 
    driveSize?: number; // Keep driveSize
  } | null>(null);
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
  const callbacks: DriveEventCallbacks = {
    onSyncStatusChange: setSyncStatus,
    onError: setError,
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
  
  // Use the Google Drive sync hook to handle API interactions
  const {
    isGapiLoaded,
    authState,
    signIn: driveSignIn,
    signOut: driveSignOut,
    getBackupMetadata,
    backupDatabaseToDrive: backupToGDrive,
    restoreDatabaseFromDrive: restoreFromGDrive,
  } = useGoogleDriveSync(callbacks);

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
      console.log('Detected DB change.');
      isDbDirtyRef.current = true; // Mark DB as dirty

      // Clear any existing backup timeout
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
        backupTimeoutRef.current = null;
      }

      // Only proceed if authenticated and no conflict
      if (authState.isAuthenticated && !conflictDetails) {
        // Special handling for first change: immediate backup
        if (isFirstChangeRef.current) {
          console.log('First change detected, triggering immediate backup.');
          isFirstChangeRef.current = false; // Reset first change flag
          backupDatabaseToDrive(); // Trigger the backup immediately
        } else {
          // Subsequent changes are debounced
          console.log(`Scheduling auto-backup in ${DEBOUNCE_DELAY}ms`);
          backupTimeoutRef.current = setTimeout(() => {
            console.log('Debounce timer expired, triggering auto-backup.');
            backupDatabaseToDrive(); // Trigger the backup after delay
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
  }, [authState.isAuthenticated, conflictDetails]); // Re-run if auth or conflict state changes

  // Initialize sync on app load, not just when settings page is opened
  useEffect(() => {
    if (isGapiLoaded && authState.isAuthenticated) {
      // Check initial sync state after GAPI is loaded and authenticated
      checkInitialSyncState().then(() => {
        setIsInitialized(true);
      });
    } else if (isGapiLoaded) {
      // Mark as initialized even if not authenticated
      setIsInitialized(true);
    }
  }, [isGapiLoaded, authState.isAuthenticated]);

  // --- Sync Logic ---

  /**
   * Check initial sync state and handle conflicts
   */
  const checkInitialSyncState = useCallback(async () => {
    // Set status immediately
    setSyncStatus((SyncStatus.CHECKING));

    if (!authState.isAuthenticated) {
      setSyncStatus(SyncStatus.IDLE); // Reset if not authenticated
      return;
    }

    // Reset state
    setError(null);
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
      const driveSize = driveFile.size ? parseInt(driveFile.size as string, 10) : undefined;
      
      if (!localLastSync) {
        // Have Drive backup, but never synced before (or cleared local storage)
        console.log('Drive backup found, but no local sync history. Prompting user.');
        setConflictDetails({ 
          driveModified: driveModifiedTime, 
          localModified: Date.now(),
          driveSize // Pass driveSize
        }); 
        setSyncStatus(SyncStatus.CONFLICT);
      } else if (driveModifiedTime > localLastSync + 1000) { // Add buffer for clock skew
        // Drive file is newer than last sync
        if (isDbDirtyRef.current) {
          // Conflict: Both Drive and local have changed since last sync
          console.log('Conflict detected: Drive backup and local DB both changed since last sync.');
          setConflictDetails({ 
            driveModified: driveModifiedTime, 
            localModified: Date.now(),
            driveSize // Pass driveSize
          });
          setSyncStatus(SyncStatus.CONFLICT);
        } else {
          // No local changes, Drive is newer -> Prompt user (safest default)
          console.log('Drive backup is newer than last sync, no local changes detected. Prompting user.');
          setConflictDetails({ 
            driveModified: driveModifiedTime, 
            localModified: localLastSync,
            driveSize // Pass driveSize
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
      setError(err instanceof Error ? err : new Error('Failed to check sync status.'));
      setSyncStatus(SyncStatus.ERROR);
    }
  }, [lastSuccessfulSync, authState.isAuthenticated, getBackupMetadata]); // Removed backupDatabaseToDrive from dependency array

  // --- Sync Operations ---

  /**
   * Sign in wrapper
   */
  const signIn = useCallback(async () => {
    await driveSignIn();
    // Authentication state change will trigger initial sync check via useEffect
  }, [driveSignIn]);

  /**
   * Sign out wrapper
   */
  const signOut = useCallback(async () => {
    await driveSignOut();
    // Reset states
    isFirstChangeRef.current = true;
  }, [driveSignOut]);

  /**
   * Backup database to Drive wrapper
   */
  const backupDatabaseToDrive = useCallback(async () => {
    try {
      await backupToGDrive();
      // State will be updated via the callbacks
    } catch (err) {
      console.error('Backup error in SyncContext:', err);
      // Error should be handled via callbacks
    }
  }, [backupToGDrive]);

  /**
   * Restore database from Drive wrapper
   */
  const restoreDatabaseFromDrive = useCallback(async () => {
    try {
      await restoreFromGDrive();
      // State will be updated via the callbacks

      // Consider prompting user to reload or using a state management library to refresh data
      window.location.reload();
    } catch (err) {
      console.error('Restore error in SyncContext:', err);
      // Error should be handled via callbacks
    }
  }, [restoreFromGDrive]);

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
    isAuthenticated: authState.isAuthenticated,
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
                        <Grid size={{xs:12, md:6}}> 
                            <Paper elevation={1} sx={{ p: 2, height: '100%' }}> {/* Ensure Paper fills Grid item height */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <CloudIcon color="primary" sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Google Drive Data
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <List dense>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Last Modified"
                                            secondary={formatTimestamp(conflictDetails.driveModified)}
                                        />
                                    </ListItem>
                                    {/* Display driveSize if available */}
                                    {(conflictDetails.driveSize !== undefined && conflictDetails.driveSize !== null) && (
                                    <ListItem>
                                        <ListItemText 
                                            primary="Backup Size"
                                            secondary={formatFileSize(conflictDetails.driveSize)}
                                        />
                                    </ListItem>
                                    )}
                                </List>
                                <Tooltip title="Choosing this will download from Drive and replace your local data">
                                    <Chip 
                                        icon={<DownloadIcon />} 
                                        label="Will download from Drive" 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                        sx={{ mt: 1 }}
                                    />
                                </Tooltip>
                            </Paper>
                        </Grid>
                        
                        {/* Local Data Card - Grid item */}
                        <Grid size={{xs:12, md:6}}> 
                            <Paper elevation={1} sx={{ p: 2, height: '100%' }}> {/* Ensure Paper fills Grid item height */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <StorageIcon color="secondary" sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Local Data
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <List dense>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Last Modified"
                                            secondary={formatTimestamp(conflictDetails.localModified)}
                                        />
                                    </ListItem>
                                    {/* Local metadata can be expanded in future */}
                                    <ListItem>
                                        <ListItemText 
                                            primary="Status"
                                            secondary="Contains your current working data"
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
                                        sx={{ mt: 1 }}
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
                    {loadingResolution === 'local' ? 'Uploading...' : 'Keep Local Data'}
                </Button>
            </Stack>
        </DialogActions>
      </Dialog>
    </SyncContext.Provider>
  );
};

// Custom hook to use the SyncContext
export const useSyncContext = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncContextProvider');
  }
  return context;
};
