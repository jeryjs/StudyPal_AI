import {
    Backup as BackupIcon,
    CloudDone as CloudDoneIcon,
    CloudOff as CloudOffIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
    Restore as RestoreIcon,
} from '@mui/icons-material';
import {
    Alert,
    alpha,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useGoogleDriveSync } from '@hooks/useGoogleDriveSync';

const GoogleDriveSync: React.FC = () => {
    const {
        isGapiLoaded,
        authState,
        signIn,
        signOut,
        syncState, // Keep for potential item sync status?
        error,
        // syncWithDrive, // Comment out or remove if fully switching to backup/restore
        // pullFromDrive, 
        // processSyncQueue,
        // resolveConflict,
        // addToSyncQueue,
        isBackingUp, // New state
        isRestoring, // New state
        lastBackupTime, // New state
        backupDatabaseToDrive, // New function
        restoreDatabaseFromDrive, // New function
        findDbBackupFile // To check if backup exists
    } = useGoogleDriveSync();

    const [localError, setLocalError] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null); // Store success message text
    const [backupExists, setBackupExists] = useState<boolean | null>(null); // Track if backup file exists
    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false); // Dialog state

    const displayError = error?.message || localError;

    // Effect to check for existing backup file on load/auth change
    useEffect(() => {
        const checkBackup = async () => {
            if (isGapiLoaded && authState.isAuthenticated) {
                setBackupExists(null); // Reset while checking
                try {
                    const file = await findDbBackupFile();
                    setBackupExists(!!file);
                } catch (err) {
                    console.error("Error checking for backup file:", err);
                    setBackupExists(false); // Assume no backup on error
                }
            }
        };
        checkBackup();
    }, [isGapiLoaded, authState.isAuthenticated, findDbBackupFile]);

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

    // Clear errors before initiating actions
    const clearMessages = () => {
        setLocalError(null);
        setShowSuccessMessage(null);
        // We cannot directly call setError from the hook,
        // but actions within the hook should clear the error state on success.
    };

    const handleSignIn = async () => {
        clearMessages();
        try {
            await signIn();
        } catch (err: any) { /* Error handled by hook */ }
    };

    const handleSignOut = async () => {
        clearMessages();
        setBackupExists(null); // Reset backup status on sign out
        try {
            await signOut();
        } catch (err) { /* Error handled by hook */ }
    };

    // Trigger Backup
    const handleBackup = useCallback(async () => {
        clearMessages();
        try {
            await backupDatabaseToDrive();
            setShowSuccessMessage('Database backed up successfully!');
            setBackupExists(true); // Assume backup exists after successful operation
        } catch (err) {
            // Error is managed by the hook
            console.error('Backup UI catch:', err);
            setShowSuccessMessage(null);
        }
    }, [backupDatabaseToDrive]);

    // Open Restore Confirmation Dialog
    const handleOpenRestoreConfirm = () => {
        setIsRestoreConfirmOpen(true);
    };

    // Close Restore Confirmation Dialog
    const handleCloseRestoreConfirm = () => {
        setIsRestoreConfirmOpen(false);
    };

    // Trigger Restore (after confirmation)
    const handleRestore = useCallback(async () => {
        handleCloseRestoreConfirm(); // Close dialog
        clearMessages();
        try {
            await restoreDatabaseFromDrive();
            setShowSuccessMessage('Database restored successfully! Consider reloading the app.');
            // Optionally force a reload after restore
            // setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            // Error is managed by the hook
            console.error('Restore UI catch:', err);
            setShowSuccessMessage(null);
        }
    }, [restoreDatabaseFromDrive]);

    // Get last backup time as readable string
    const getLastBackupTime = () => {
        if (!lastBackupTime) return 'Never';
        const date = new Date(lastBackupTime);
        return date.toLocaleString();
    };

    const isAuthenticated = authState.isAuthenticated;

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
                {/* ... (Connection Status - same as before) ... */}
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
                    {/* ... (Connect/Disconnect Buttons - same as before) ... */}
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

            {/* Backup & Restore Section */}
            {isGapiLoaded && isAuthenticated && (
                <Box sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Database Sync</Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2">Last backup:</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isBackingUp ? 'Checking...' : getLastBackupTime()}
                        </Typography>
                    </Box>

                    {backupExists === false && !isBackingUp && (
                        <Alert severity="info" sx={{ mb: 2 }}>No backup found on Google Drive.</Alert>
                    )}
                    {backupExists === null && !isBackingUp && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">Checking for existing backup...</Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={isRestoring ? <CircularProgress size={20} /> : <RestoreIcon />}
                            onClick={handleOpenRestoreConfirm} // Open confirmation dialog
                            disabled={isBackingUp || isRestoring || !isGapiLoaded || backupExists === false || backupExists === null}
                        >
                            {isRestoring ? 'Restoring...' : 'Restore from Drive'}
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={isBackingUp ? <CircularProgress size={20} /> : <BackupIcon />}
                            onClick={handleBackup} // Use handleBackup
                            disabled={isBackingUp || isRestoring || !isGapiLoaded}
                        >
                            {isBackingUp ? 'Backing up...' : 'Backup Now'}
                        </Button>
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                        Restoring will overwrite your current local data with the data from the Google Drive backup.
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

            {/* Restore Confirmation Dialog */}
            <Dialog
                open={isRestoreConfirmOpen}
                onClose={handleCloseRestoreConfirm}
                aria-labelledby="restore-confirm-dialog-title"
                aria-describedby="restore-confirm-dialog-description"
            >
                <DialogTitle id="restore-confirm-dialog-title">Confirm Restore</DialogTitle>
                <DialogContent>
                    <DialogContentText id="restore-confirm-dialog-description">
                        Are you sure you want to restore your database from Google Drive?
                        This action will overwrite all your current local data (subjects, chapters, materials, settings)
                        with the data from your last backup. This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRestoreConfirm}>Cancel</Button>
                    <Button onClick={handleRestore} color="warning" autoFocus>
                        Restore Now
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default GoogleDriveSync;