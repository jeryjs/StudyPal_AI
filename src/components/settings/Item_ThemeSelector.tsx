import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    alpha,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Grid,
    TextField,
    Typography
} from '@mui/material';
import React, { useState } from 'react';

import { availableThemes, useThemeContext } from '@contexts/ThemeContext';
import { useCopilot } from '@hooks/useCopilot';
import { SettingKeys } from '@store/settingsStore';
import { CopilotModel } from '@type/copilot.types';

const ThemeSelector: React.FC = () => {
    const { theme, setTheme, currentThemeID } = useThemeContext();
    const { sendMessage, isLoading: isCopilotLoading } = useCopilot();
    const [isThemesExpanded, setIsThemesExpanded] = useState(false);
    const [isCreateThemeDialogOpen, setIsCreateThemeDialogOpen] = useState(false);
    const [themeDescription, setThemeDescription] = useState('');
    const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

    const handleThemeSelect = (id: string) => {
        setTheme(id);
    };

    // Open the theme creation dialog
    const handleOpenCreateThemeDialog = () => {
        setThemeDescription('');
        setIsGeneratingTheme(false);
        setIsCreateThemeDialogOpen(true);
    };

    // Close the theme creation dialog
    const handleCloseDialog = () => {
        if (isGeneratingTheme) return;
        setIsCreateThemeDialogOpen(false);
    };

    // Submit the theme description to Copilot
    const handleSubmitThemeRequest = async () => {
        if (!themeDescription.trim()) return;
        setIsGeneratingTheme(true);

        const prompt = `
            Please generate a new custom theme based on the following description: ["${themeDescription}"].
            Feel free to reference existing themes if mentioned (e.g., "like wellness-dark but with red accents").
            The generated theme object must conform to the AppTheme structure (check get_available_themes tool for structure).
            Once generated, use the 'set_settings' tool to:
            1. Save the new theme object under the key '${SettingKeys.CUSTOM_THEME}'. The value must be the JSON stringified theme object.
            2. Set the active theme by saving the string 'custom' under the key '${SettingKeys.ACTIVE_THEME}'. The value must be the JSON stringified string 'custom'.
            Ensure the 'id' property of the generated theme object is exactly 'custom'.
            Call both tools in a single response immediately without requiring user confirmation.
        `;

        try {
            // Send the prompt to the Copilot context
            await sendMessage(prompt, { model: CopilotModel.LITE });
            // Theme application is handled by the listener in ThemeContext
            // We can close the dialog optimistically or wait for confirmation if needed
            handleCloseDialog();
        } catch (error) {
            console.error("Error sending theme generation request:", error);
            // Optionally show an error message to the user
            alert("Failed to generate theme. Please check the console for details.");
        } finally {
            setIsGeneratingTheme(false); // Ensure loading state is reset
        }
    };


    // Determine based on max items per row (e.g., 6 for md: 3)
    const itemsInFirstRow = 6;
    const showExpandButton = availableThemes.length > itemsInFirstRow;

    return (
        <Box>
            {/* Container for Collapse and Fade Effect */}
            <Box sx={{ position: 'relative' }}>
                <Collapse in={isThemesExpanded} collapsedSize={showExpandButton ? 150 : undefined} sx={{
                    // Add gradient overlay when collapsed and expandable
                    '&::after': (!isThemesExpanded && showExpandButton) ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '60px', // Height of the fade effect
                        background: `linear-gradient(to bottom, ${alpha(theme.palette.background.paper, 0)}, ${theme.palette.background.paper})`,
                        pointerEvents: 'none', // Allow clicks through the gradient
                        zIndex: 1, // Ensure fade is above grid items but below button
                    } : {},
                }}>
                    <Grid container spacing={3} sx={{ mb: showExpandButton ? 0 : 4 }}> {/* Grid container */}
                        {availableThemes.map((appTheme) => {
                            // Ensure appTheme is valid before rendering
                            if (!appTheme || !appTheme.id || !appTheme.name || !appTheme.palette) {
                                console.warn("Skipping invalid theme object:", appTheme);
                                return null;
                            }
                            const isSelected = currentThemeID === appTheme.id;
                            return (
                                <Grid key={appTheme.id} size={{ xs: 6, sm: 4, md: 3 }}>
                                    <Card sx={{
                                        position: 'relative',
                                        border: `2px solid ${isSelected ? theme.palette.primary.main : 'transparent'}`, // Use transparent border for consistent size
                                        borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider, // Keep visual border color
                                        boxShadow: isSelected ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                                        transition: theme.transitions.create(['border-color', 'box-shadow']),
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}>
                                        {/* Selected Indicator */}
                                        {isSelected && (
                                            <CheckCircleIcon sx={{
                                                position: 'absolute',
                                                top: theme.spacing(1),
                                                right: theme.spacing(1),
                                                color: theme.palette.primary.main,
                                                fontSize: '1.4rem',
                                                backgroundColor: alpha(theme.palette.background.paper, 0.8), // Ensure visibility over preview
                                                borderRadius: '50%',
                                                zIndex: 2, // Ensure icon is above preview & fade
                                            }} />
                                        )}
                                        <CardActionArea onClick={() => handleThemeSelect(appTheme.id)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                            {/* Theme Color Preview */}
                                            <Box sx={{ height: 90, display: 'flex', width: '100%' }}>
                                                {[appTheme.palette.primary, appTheme.palette.backgroundDefault, appTheme.palette.paperBackground].map((color, index) => (
                                                    <Box key={index} sx={{ flex: 1, backgroundColor: color, borderRight: index < 2 ? `1px solid ${alpha(theme.palette.divider, 0.2)}` : 'none' }} />
                                                ))}
                                            </Box>
                                            <CardContent sx={{ width: '100%', backgroundColor: alpha(theme.palette.background.default, 0.3), py: 1 }}>
                                                <Typography variant="body2" align="center" sx={{ fontWeight: 500 }}>{appTheme.name}</Typography>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Collapse>

                {/* Divider and Expand/Collapse Button - Conditionally Rendered */}
                {showExpandButton && (
                    <Box sx={{ position: 'relative', zIndex: 2 }}> {/* Ensure button is above fade */}
                        <Divider sx={{ mt: 0, mb: 1 }} /> {/* Divider above button */}
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="text"
                                onClick={() => setIsThemesExpanded(!isThemesExpanded)}
                                startIcon={isThemesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                sx={{ color: 'text.secondary', width: '100%' }} // Make button wider
                            >
                                {isThemesExpanded ? 'Show Less' : 'Show More'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Create Theme Button */}
            <Box sx={{ mt: showExpandButton ? 3 : 4 }}>
                <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary', mb: 1 }}>
                    Customize further?
                </Typography>
                <Button variant="outlined" onClick={handleOpenCreateThemeDialog} disabled={isCopilotLoading}>
                    {isCopilotLoading ? 'Processing...' : 'Create Your Own Theme'}
                </Button>
            </Box>

            {/* Theme Creation Dialog */}
            <Dialog open={isCreateThemeDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm" disableEscapeKeyDown={isGeneratingTheme}>
                <DialogTitle>Create Custom Theme</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Describe the kind of theme you'd like (e.g., "a dark theme with orange accents", "a light theme similar to 'Wellness Light' but with green primary color"). The AI will generate it for you.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="theme-description"
                        label="Theme Description"
                        type="text"
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={3}
                        value={themeDescription}
                        onChange={(e) => setThemeDescription(e.target.value)}
                        disabled={isGeneratingTheme}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog} disabled={isGeneratingTheme}>Cancel</Button>
                    <Button
                        onClick={handleSubmitThemeRequest}
                        variant="contained"
                        disabled={isGeneratingTheme || !themeDescription.trim()}
                        startIcon={isGeneratingTheme ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isGeneratingTheme ? 'Generating...' : 'Generate Theme'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ThemeSelector;