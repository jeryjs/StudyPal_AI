import {
    CheckCircleOutline as CheckCircleIcon,
    CloudDone as CloudDoneIcon,
    CloudOff as CloudOffIcon,
    CloudSync as CloudSyncIcon,
    CloudDownload as DownloadIcon,
    ErrorOutline as ErrorIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
    SyncProblem as SyncProblemIcon,
    CloudUpload as UploadIcon
} from '@mui/icons-material';
import {
    Alert,
    alpha,
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
    Input,
    Typography
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { SyncStatusState, useGoogleDriveSync } from '@hooks/useGoogleDriveSync'; // Import SyncStatusState
// Import DB functions for manual import/export
import { exportDbToJson, importDbFromJson } from '../../db';

// Helper function to format timestamp
const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
};

// Map sync status to UI elements
const syncStatusMap: { [key in SyncStatusState]: { text: string; color: string; icon: React.ReactElement } } = {
    idle: { text: 'Idle', color: 'default', icon: <CloudSyncIcon fontSize="small" /> },
    checking: { text: 'Checking...', color: 'info', icon: <CircularProgress size={16} /> },
    syncing_up: { text: 'Syncing to Drive...', color: 'warning', icon: <CircularProgress size={16} /> },
    syncing_down: { text: 'Syncing from Drive...', color: 'warning', icon: <CircularProgress size={16} /> },
    up_to_date: { text: 'Up to date', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    conflict: { text: 'Conflict detected', color: 'error', icon: <SyncProblemIcon fontSize="small" /> },
    error: { text: 'Sync Error', color: 'error', icon: <ErrorIcon fontSize="small" /> },
};


const GoogleDriveSync: React.FC = () => {
    const {
        isGapiLoaded,
        authState,
        signIn,
        signOut,
        syncStatus, // Use this for status display
        error,
        conflictDetails, // Use this to show conflict info
        lastSuccessfulSync, // Display this
        isAuthenticated, // Use the boolean directly
        resolveConflict, // Function for conflict resolution
        // backupDatabaseToDrive, // Keep if manual backup trigger is desired
        // restoreDatabaseFromDrive, // Keep if manual restore trigger is desired
    } = useGoogleDriveSync();

    const [localError, setLocalError] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false); // Dialog state for import
    const [fileToImport, setFileToImport] = useState<File | null>(null); // Store file for import confirmation

    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

    const displayError = error?.message || localError;
    const currentSyncStatus = syncStatusMap[syncStatus] || syncStatusMap.idle;

    // --- Effects ---

    // Effect to open conflict dialog automatically
    useEffect(() => {
        if (syncStatus === 'conflict') {
            setIsConflictDialogOpen(true);
        } else {
            setIsConflictDialogOpen(false); // Close if status changes away from conflict
        }
    }, [syncStatus]);

    // Effect to auto-hide success message
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showSuccessMessage) {
            timer = setTimeout(() => {
                setShowSuccessMessage(null);
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [showSuccessMessage]);

    // --- Event Handlers ---

    // Clear errors/messages
    const clearMessages = () => {
        setLocalError(null);
        setShowSuccessMessage(null);
        // Hook error state is managed internally by the hook now
    };

    const handleSignIn = async () => {
        clearMessages();
        try {
            await signIn();
        } catch (err: any) { /* Error handled by hook */ }
    };

    const handleSignOut = async () => {
        clearMessages();
        try {
            await signOut();
        } catch (err) { /* Error handled by hook */ }
    };

    // Conflict Resolution Handlers
    const handleResolveConflict = async (resolution: 'local' | 'drive') => {
        setIsConflictDialogOpen(false);
        clearMessages();
        try {
            await resolveConflict(resolution);
            setShowSuccessMessage(`Conflict resolved using ${resolution} data. Syncing...`);
        } catch (err) {
            // Error should be set by the hook
            console.error("Conflict resolution UI catch:", err);
        }
    };

    // Manual Export Handler
    const handleExportData = async () => {
        clearMessages();
        try {
            const dbJson = await exportDbToJson();
            const blob = new Blob([dbJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'studypal.db.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setShowSuccessMessage('Database exported successfully.');
        } catch (err: any) {
            console.error("Export failed:", err);
            setLocalError(err.message || 'Failed to export database.');
        }
    };

    // Trigger hidden file input
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection for import
    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToImport(file);
            setIsImportConfirmOpen(true);
            // Clear the input value so the same file can be selected again
            event.target.value = '';
        }
    };

    // Confirm and perform import
    const handleConfirmImport = async () => {
        if (!fileToImport) return;
        setIsImportConfirmOpen(false);
        clearMessages();
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target?.result as string;
                if (!jsonString) {
                    throw new Error("File content is empty.");
                }
                await importDbFromJson(jsonString);
                setShowSuccessMessage('Database imported successfully! Reloading app...');
                // Force reload after import to ensure UI reflects changes
                setTimeout(() => window.location.reload(), 1500);
            } catch (err: any) {
                console.error("Import failed:", err);
                setLocalError(err.message || 'Failed to import database. Invalid file format?');
            } finally {
                setFileToImport(null);
            }
        };
        reader.onerror = () => {
            setLocalError('Failed to read the selected file.');
            setFileToImport(null);
        };
        reader.readAsText(fileToImport);
    };

    // Close import confirmation dialog
    const handleCloseImportConfirm = () => {
        setIsImportConfirmOpen(false);
        setFileToImport(null);
    };


    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
        }}>
            {/* Status Display */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!isGapiLoaded ? (
                        <CircularProgress size={20} />
                    ) : isAuthenticated ? (
                        <CloudDoneIcon color="success" />
                    ) : (
                        <CloudOffIcon color="disabled" />
                    )}
                    <Typography variant="body1">
                        {!isGapiLoaded
                            ? 'Initializing Sync...'
                            : isAuthenticated
                                ? 'Connected to Google Drive'
                                : 'Not connected to Google Drive'}
                    </Typography>
                </Box>

                <Box>
                    {isGapiLoaded ? (
                        isAuthenticated ? (
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={handleSignOut}
                                startIcon={<LogoutIcon />}
                            >
                                Disconnect
                            </Button>
                        ) : (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={handleSignIn}
                                startIcon={<LoginIcon />}
                            >
                                Connect to Google Drive
                            </Button>
                        )
                    ) : (
                        <Button variant="outlined" disabled>Loading...</Button>
                    )}
                </Box>
            </Box>

            {/* Sync Status & Actions Section */}
            {isGapiLoaded && isAuthenticated && (
                <Box sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Automatic Sync</Typography>

                    {/* Sync Status Chip */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                            icon={currentSyncStatus.icon}
                            label={currentSyncStatus.text}
                            color={currentSyncStatus.color as any} // Cast needed for MUI Chip color prop
                            size="small"
                            variant="outlined"
                        />
                        <Typography variant="body2" color="text.secondary">
                            Last successful sync: {formatTimestamp(lastSuccessfulSync)}
                        </Typography>
                    </Box>

                    {/* Manual Import/Export */}
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>Manual Data Management</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportData}
                            disabled={!isAuthenticated || syncStatus === 'syncing_up' || syncStatus === 'syncing_down'}
                        >
                            Export Data
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<UploadIcon />}
                            onClick={handleImportClick} // Trigger hidden input
                            disabled={!isAuthenticated || syncStatus === 'syncing_up' || syncStatus === 'syncing_down'}
                        >
                            Import Data
                        </Button>
                        {/* Hidden File Input */}
                        <Input
                            type="file"
                            inputRef={fileInputRef}
                            onChange={handleFileSelected}
                            sx={{ display: 'none' }}
                            inputProps={{ accept: '.json' }}
                        />
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                        Importing data will overwrite your current local data. Use with caution.
                    </Typography>
                </Box>
            )}

            {/* Error and Success Messages */}
            {displayError && (
                <Alert severity="error" onClose={clearMessages}>
                    {displayError}
                </Alert>
            )}

            {showSuccessMessage && !displayError && (
                <Alert severity="success" onClose={clearMessages}>
                    {showSuccessMessage}
                </Alert>
            )}

            {/* Conflict Resolution Dialog */}
            <Dialog
                open={isConflictDialogOpen}
                // onClose={() => setIsConflictDialogOpen(false)} // Prevent closing by clicking outside
                aria-labelledby="conflict-dialog-title"
                aria-describedby="conflict-dialog-description"
            >
                <DialogTitle id="conflict-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SyncProblemIcon color="error" /> Sync Conflict Detected
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="conflict-dialog-description" component="div">
                        <Typography gutterBottom>
                            Your local data and the data stored in Google Drive have both changed since the last successful sync.
                        </Typography>
                        {conflictDetails && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Drive data last modified: {formatTimestamp(conflictDetails.driveModified)}<br />
                                Local data last modified: {formatTimestamp(conflictDetails.localModified)} {/* Note: localModified might be Date.now() */}
                            </Typography>
                        )}
                        <Typography>
                            Please choose which version you want to keep. The other version will be overwritten.
                        </Typography>
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{gap:2, p: 2, flexDirection: 'column' }}>
                    <Button onClick={() => handleResolveConflict('drive')} fullWidth color="primary" variant="outlined">
                        Use Google Drive Data
                        <Typography variant="caption" display="block"> (Overwrites Local)</Typography>
                    </Button>
                    <Button onClick={() => handleResolveConflict('local')} fullWidth color="secondary" variant="contained">
                        Keep Local Data
                        <Typography variant="caption" display="block"> (Overwrites Drive)</Typography>
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Import Confirmation Dialog */}
            <Dialog
                open={isImportConfirmOpen}
                onClose={handleCloseImportConfirm}
                aria-labelledby="import-confirm-dialog-title"
                aria-describedby="import-confirm-dialog-description"
            >
                <DialogTitle id="import-confirm-dialog-title">Confirm Import</DialogTitle>
                <DialogContent>
                    <DialogContentText id="import-confirm-dialog-description">
                        Are you sure you want to import data from the selected file ({fileToImport?.name})?
                        This action will overwrite all your current local data (subjects, chapters, materials, settings).
                        This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseImportConfirm}>Cancel</Button>
                    <Button onClick={handleConfirmImport} color="warning" autoFocus>
                        Import Now
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default GoogleDriveSync;