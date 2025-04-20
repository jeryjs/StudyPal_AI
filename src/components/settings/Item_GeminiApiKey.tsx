import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    IconButton,
    InputAdornment,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Key as KeyIcon,
    HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

import settingsStore from '@store/settingsStore';

const GEMINI_API_KEY_PATTERN = /^AIza[A-Za-z0-9_\-]{35,}$/;

const GeminiApiKey: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [status, setStatus] = useState<{ message: string | null; type: 'success' | 'error' | 'info' | null }>({ message: null, type: null });
    const [helpDialogOpen, setHelpDialogOpen] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    useEffect(() => {
        const loadApiKey = async () => {
            try {
                const keyFromStore = await settingsStore.geminiApiKey;
                setApiKey(keyFromStore || null);
                setInputValue(keyFromStore || '');
            } catch (error) {
                console.error('Failed to load API key:', error);
                setStatus({ message: 'Failed to load API key. Please try again.', type: 'error' });
            }
        };

        loadApiKey();
    }, []);

    const validateApiKey = async (key: string): Promise<{ isValid: boolean; message?: string }> => {
        if (!key) return { isValid: false, message: 'API key cannot be empty' };
        if (!GEMINI_API_KEY_PATTERN.test(key)) return { isValid: false, message: 'Invalid API key format' };

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

            if (response.status === 400) {
                return { isValid: false, message: 'API key is invalid or malformed' };
            } else if (response.status === 403) {
                return { isValid: false, message: 'API key lacks permissions or is restricted' };
            } else if (response.status === 429) {
                return { isValid: false, message: 'API quota exceeded. Try again later' };
            } else if (!response.ok) {
                return { isValid: false, message: `API validation failed (${response.status}): ${response.statusText}` };
            }

            return { isValid: true };
        } catch (err) {
            console.error("API Key validation network error:", err);
            return { isValid: false, message: 'Network error during validation. Check connection.' };
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
        setStatus({ message: null, type: null });
    };

    const handleSave = async () => {
        setIsProcessing(true);
        setStatus({ message: 'Validating API key...', type: 'info' });

        const validation = await validateApiKey(inputValue);
        if (!validation.isValid) {
            setStatus({ message: validation.message || 'Invalid API key', type: 'error' });
            setIsProcessing(false);
            return;
        }

        try {
            settingsStore.geminiApiKey = inputValue;
            setApiKey(inputValue);
            setStatus({ message: 'API key saved successfully!', type: 'success' });
            setTimeout(() => setStatus(s => s.type === 'success' ? { ...s, message: null } : s), 3000);
        } catch (err) {
            console.error('Failed to save API key:', err);
            setStatus({ message: 'Failed to save API key. Please try again.', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = async () => {
        setIsProcessing(true);
        setStatus({ message: 'Clearing API key...', type: 'info' });
        try {
            settingsStore.geminiApiKey = '';
            setApiKey(null);
            setInputValue('');
            setShowPassword(false);
            setStatus({ message: 'API key cleared successfully.', type: 'success' });
            setTimeout(() => setStatus(s => s.type === 'success' ? { ...s, message: null } : s), 3000);
        } catch (error) {
            console.error('Failed to clear API key:', error);
            setStatus({ message: 'Failed to clear API key.', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const hasSavedKey = typeof apiKey === 'string' && apiKey !== '';
    const maskedKey = hasSavedKey
        ? `${apiKey.substring(0, 4)}${'•'.repeat(Math.min(20, Math.max(0, apiKey.length - 8)))}${apiKey.substring(apiKey.length - 4)}`
        : '';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KeyIcon color={hasSavedKey ? "success" : "disabled"} />
                        <Typography variant="body1">
                            {hasSavedKey ? 'Gemini API Key is configured' : 'Gemini API Key is not configured'}
                        </Typography>
                    </Box>
                    {hasSavedKey && (
                        <Typography variant="caption" color="textSecondary" sx={{ wordBreak: 'break-all' }}>
                            {maskedKey}
                        </Typography>
                    )}
                </Box>
                <Tooltip title="How to get an API key">
                    <IconButton onClick={() => setHelpDialogOpen(true)} size="small">
                        <HelpOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {!hasSavedKey && (
                <TextField
                    label="Gemini API Key"
                    variant="outlined"
                    fullWidth
                    value={inputValue}
                    onChange={handleInputChange}
                    type={showPassword ? 'text' : 'password'}
                    disabled={isProcessing}
                    placeholder="Enter API Key"
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle api key visibility"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    error={status.type === 'error'}
                />
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                {hasSavedKey ? (
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleClear}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Clearing...' : 'Clear Key'}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        disabled={isProcessing || !inputValue}
                        startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isProcessing ? 'Validating...' : 'Save Key'}
                    </Button>
                )}
            </Box>

            {status.message && status.type !== 'info' && (
                <Alert severity={status.type || 'info'} onClose={() => setStatus(s => ({ ...s, message: null }))}>
                    {status.message}
                </Alert>
            )}

            <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)}>
                <DialogTitle>How to get a Gemini API key</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Follow these steps to obtain a Gemini API key:
                    </Typography>
                    <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                        <li>Sign in with your Google account</li>
                        <li>Create a new API key or use an existing one</li>
                        <li>Copy the key and paste it above</li>
                    </ol>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHelpDialogOpen(false)} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GeminiApiKey;
