import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Divider,
    alpha,
    IconButton,
    Tooltip,
    Chip
} from '@mui/material';
import {
    CloudSync as CloudSyncIcon,
    CloudOff as CloudOffIcon,
    CloudDone as CloudDoneIcon,
    ErrorOutline as ErrorIcon,
    Refresh as RefreshIcon,
    Login as LoginIcon,
    Logout as LogoutIcon
} from '@mui/icons-material';
import { useGoogleDriveSync } from '../../hooks/useGoogleDriveSync';

const GoogleDriveSync: React.FC = () => {
    const {
        isGapiLoaded,
        authState,
        signIn,
        signOut,
        syncState,
        error,
        syncWithDrive,
    } = useGoogleDriveSync();

    // Local state for UI-specific errors or messages
    const [localError, setLocalError] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [lastSyncData, setLastSyncData] = useState<{ lastSyncTime?: number; lastSyncResult?: any }>(() => {
        const storedData = localStorage.getItem('lastSyncData');
        return storedData ? JSON.parse(storedData) : {};
    });

    // Combine hook error and local error for display
    const displayError = error?.message || localError;

    // Effect to auto-hide success message
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showSuccessMessage) {
            timer = setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [showSuccessMessage]);

    useEffect(() => {
        if (syncState.lastSyncTime || syncState.lastSyncResult) {
            const newSyncData = {
                lastSyncTime: syncState.lastSyncTime,
                lastSyncResult: syncState.lastSyncResult,
            };
            localStorage.setItem('lastSyncData', JSON.stringify(newSyncData));
            setLastSyncData(newSyncData);
        }
    }, [syncState.lastSyncTime, syncState.lastSyncResult]);

    // Clear errors before initiating actions
    const clearErrors = () => {
        setLocalError(null);
        // We cannot directly call setError from the hook, 
        // but actions within the hook should clear the error state on success.
    };

    const handleSignIn = async () => {
        clearErrors();
        try {
            await signIn();
        } catch (err: any) {
            console.error("Sign in UI catch:", err);
            // Error is managed by the hook
        }
    };

    const handleSignOut = async () => {
        clearErrors();
        try {
            await signOut();
        } catch (err) {
            console.error("Sign out UI catch:", err);
            // Error is managed by the hook
        }
    };

    const handleSync = useCallback(async () => {
        clearErrors();
        setShowSuccessMessage(false);
        try {
            await syncWithDrive();
            // Check if the hook's error state is null after sync before showing success
            // This requires the hook to clear its error on successful sync
            setShowSuccessMessage(true);
        } catch (err) {
            console.error('Sync UI catch:', err);
            setShowSuccessMessage(false);
            // Error is managed by the hook
        }
    }, [syncWithDrive]); // Removed setError dependency

    const getLastSyncTime = () => {
        if (!lastSyncData.lastSyncTime) return 'Never';
        const date = new Date(lastSyncData.lastSyncTime);
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

                    {isGapiLoaded && isAuthenticated && (
                        <Chip
                            size="small"
                            label={syncState.isSyncing ? 'Syncing...' : (lastSyncData.lastSyncTime ? 'Synced' : 'Ready to Sync')}
                            color={syncState.isSyncing ? 'warning' : (error ? 'error' : 'success')} // Show error color if hook has error
                            variant="outlined"
                            sx={{ ml: 1 }}
                        />
                    )}
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

            {/* Last Sync Info */}
            {isGapiLoaded && isAuthenticated && (
                <Box sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">Last sync:</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {getLastSyncTime()}
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {lastSyncData.lastSyncResult && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Successful</Typography>
                                    <Typography variant="subtitle2" color="success.main">{lastSyncData.lastSyncResult.successful}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Failed</Typography>
                                    <Typography variant="subtitle2" color="error.main">{lastSyncData.lastSyncResult.failed}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Conflicts</Typography>
                                    <Typography variant="subtitle2" color="warning.main">{lastSyncData.lastSyncResult.conflicts}</Typography>
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', alignSelf: 'flex-end', marginLeft: 'auto' }}>
                            <Tooltip title="Sync now">
                                <IconButton
                                    color="primary"
                                    onClick={handleSync}
                                    disabled={syncState.isSyncing || !isGapiLoaded}
                                    size="small"
                                    sx={{ display: { xs: 'inline', sm: 'none' } }}
                                >
                                    {syncState.isSyncing ? <CircularProgress size={20} /> : <RefreshIcon />}
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<CloudSyncIcon />}
                                onClick={handleSync}
                                disabled={syncState.isSyncing || !isGapiLoaded}
                                sx={{ display: { xs: 'none', sm: 'flex' } }}
                            >
                                {syncState.isSyncing ? 'Syncing...' : 'Sync Now'}
                            </Button>
                        </Box>
                    </Box>

                </Box>
            )}

            {/* Error and Success Messages */}
            {displayError && (
                // Only allow clearing local errors via UI
                <Alert severity="error" onClose={() => setLocalError(null)}>
                    {displayError}
                </Alert>
            )}

            {/* Show success only if no error exists (hook or local) */}
            {showSuccessMessage && !displayError && syncState.lastSyncResult && (
                <Alert severity="success" onClose={() => setShowSuccessMessage(false)}>
                    Sync completed successfully!
                </Alert>
            )}
        </Box>
    );
};

export default GoogleDriveSync;