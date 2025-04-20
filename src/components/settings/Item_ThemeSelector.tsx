import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardActionArea,
    CardContent,
    Button,
    alpha,
    Theme,
    Collapse,
    Divider,
    useTheme
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { availableThemes, useThemeContext } from '@contexts/ThemeContext';

const ThemeSelector: React.FC = () => {
    const { theme, setTheme, currentThemeID } = useThemeContext();
    const [isThemesExpanded, setIsThemesExpanded] = useState(false);

    const handleThemeSelect = (id: string) => {
        setTheme(id);
    };

    const handleCreateTheme = () => {
        // TODO: Implement custom theme creation UI
        alert('Theme creator coming soon!');
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

            {/* Create Theme Button - Adjust margin based on expand button */}
            <Box sx={{ mt: showExpandButton ? 3 : 4 }}>
                <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary', mb: 1 }}>
                    Customize further?
                </Typography>
                <Button variant="outlined" onClick={handleCreateTheme}>
                    Create Your Own Theme
                </Button>
            </Box>
        </Box>
    );
};

export default ThemeSelector;
