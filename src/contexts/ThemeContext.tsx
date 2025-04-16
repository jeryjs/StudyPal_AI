import React, { createContext, useState, useMemo, useContext, ReactNode, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, ThemeOptions, Theme, alpha } from '@mui/material/styles';
import { Box, PaletteMode } from '@mui/material';
import { getThemeSetting, setThemeSetting } from '@store/settings';

// --- Base Theme Options ---
const baseThemeOptions: ThemeOptions = {
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        h4: { fontWeight: 600, fontSize: '2rem' },
        h5: { fontWeight: 600, fontSize: '1.5rem' },
        h6: { fontWeight: 600, fontSize: '1.25rem' },
        body1: { fontSize: '1rem' },
        body2: { fontSize: '0.9rem' },
        button: { textTransform: 'none', fontWeight: 600, fontSize: '1.1rem' },
        caption: { fontSize: '0.85rem' },
    },
    shape: {
        borderRadius: 6,
    },
    components: {
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    backgroundImage: 'none',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)', // For Safari
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`, // Subtle border
                    boxShadow: `0px 4px 12px ${alpha(theme.palette.divider, 0.1)}`, // Subtle shadow
                }),
            }
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    borderRadius: theme.shape.borderRadius,
                    backgroundImage: 'none',
                    boxShadow: `0px 4px 12px ${alpha(theme.palette.divider, 0.1)}`, // Subtle shadow
                }),
            }
        },
        MuiButton: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 12,
                    padding: theme.spacing(1.25, 3),
                    boxShadow: `0px 2px 6px ${alpha(theme.palette.divider, 0.1)}`, // Subtle shadow
                    fontSize: '1.1rem',
                }),
                containedPrimary: ({ theme }) => ({
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        boxShadow: 'none',
                    },
                }),
                outlinedPrimary: ({ theme }) => ({
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    color: theme.palette.primary.main,
                    fontSize: '1.1rem',
                    '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.08),
                        borderColor: theme.palette.primary.main,
                    },
                }),
                textPrimary: ({ theme }) => ({
                    color: theme.palette.primary.main,
                    fontSize: '1.1rem',
                    '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.08),
                    },
                }),
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: ({ theme }) => ({
                    borderRight: 'none',
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    backgroundImage: 'none',
                    boxShadow: `4px 0px 12px ${alpha(theme.palette.divider, 0.1)}`, // Subtle shadow
                })
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: ({ theme }) => ({
                    boxShadow: `0px 2px 8px ${alpha(theme.palette.divider, 0.1)}`, // Subtle shadow
                    backgroundImage: 'none',
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    color: theme.palette.text.primary,
                })
            }
        },
        MuiListItemButton: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 12,
                    margin: theme.spacing(0.75, 1.5),
                    padding: theme.spacing(1, 1.5),
                    width: 'auto',
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.1),
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'transparent',
                        color: theme.palette.primary.main,
                        '& .MuiListItemIcon-root': {
                            color: theme.palette.primary.main,
                        },
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.action.hover, 0.1),
                        }
                    },
                }),
            }
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: ({ theme }) => ({
                    minWidth: 'auto',
                    marginRight: theme.spacing(2),
                    color: theme.palette.text.secondary,
                    marginLeft: theme.spacing(0.5),
                    fontSize: '1.5rem',
                }),
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 12,
                    backgroundColor: alpha(theme.palette.background.default, 0.8),
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    '& fieldset': {
                        borderColor: alpha(theme.palette.divider, 0.3),
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(theme.palette.text.primary, 0.6),
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '1px',
                    },
                    '&.Mui-focused': {
                        boxShadow: 'none',
                    }
                }),
                input: ({ theme }) => ({
                    padding: theme.spacing(1.5, 2),
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                }),
            }
        },
        MuiInputBase: {
            styleOverrides: {
                input: ({ theme }) => ({
                    fontSize: '1rem',
                }),
            }
        },
        MuiGrid: {
            defaultProps: {
                spacing: 3
            }
        }
    }
};

// --- Theme Definitions ---
interface AppTheme {
    id: string;
    name: string;
    palette: {
        mode: PaletteMode;
        primary: string;
        primaryDark?: string; // Darker shade for hover/active states
        secondary: string; // Accent color (e.g., pink/red from image)
        backgroundDefault: string; // Outermost background
        paperBackground: string; // Base color for blurred elements
        sidebarBackground: string; // Can be same as paper or different
        contrastText?: string;
        divider: string;
        textPrimary: string;
        textSecondary: string;
        action?: {
            hover: string;
            selected: string;
        }
    };
}

// Define the target "Wellness Dark" theme based on image#1
const wellnessDark: AppTheme = {
    id: 'wellness-dark',
    name: 'Wellness Dark',
    palette: {
        mode: 'dark',
        primary: '#59A1F5', // Brighter blue accent from image
        primaryDark: '#3B82F6', // Darker blue for hover/active states
        secondary: '#F56565', // Example: Red/Pink accent for highlights like heart icon
        backgroundDefault: '#10121A', // Very dark blue/purple background
        paperBackground: '#24282F', // Base color for blurred panels (will be made transparent)
        sidebarBackground: '#24282F', // Base color for sidebar (will be made transparent)
        contrastText: '#FFFFFF',
        divider: 'rgba(255, 255, 255, 0.12)', // Standard divider opacity
        textPrimary: '#E5E7EB', // Light grey primary text
        textSecondary: '#9CA3AF', // Darker grey secondary text
        action: {
            hover: 'rgba(255, 255, 255, 0.08)', // White hover with low opacity
            selected: 'rgba(89, 161, 245, 0.15)' // Primary color selection with low opacity
        }
    }
};

// Other themes available (keep existing, they will inherit base overrides)
export const availableThemes: AppTheme[] = [
    wellnessDark,
    { id: 'wellness-light', name: 'Wellness Light', palette: { mode: 'light', primary: '#4a90e2', secondary: '#e53e3e', backgroundDefault: '#F7FAFC', paperBackground: '#FFFFFF', sidebarBackground: '#FFFFFF', contrastText: '#ffffff', divider: 'rgba(0, 0, 0, 0.1)', textPrimary: '#2D3748', textSecondary: '#718096', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(74, 144, 226, 0.1)' } } },
    { id: 'forest-green', name: 'Forest Green', palette: { mode: 'dark', primary: '#81c784', secondary: '#a5d6a7', backgroundDefault: '#1b2e1f', paperBackground: '#2a3c2c', sidebarBackground: '#2a3c2c', contrastText: '#1b2e1f', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#e1e1e1', textSecondary: '#a0a0a0', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(129, 199, 132, 0.15)' } } },
    { id: 'rose-quarz', name: 'Rose Quartz', palette: { mode: 'light', primary: '#e91e63', secondary: '#f06292', backgroundDefault: '#fdf6f8', paperBackground: '#ffffff', sidebarBackground: '#ffffff', contrastText: '#ffffff', divider: 'rgba(0, 0, 0, 0.08)', textPrimary: '#212121', textSecondary: '#757575', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(233, 30, 99, 0.15)' } } },
    { id: 'amethyst', name: 'Amethyst', palette: { mode: 'dark', primary: '#ba68c8', secondary: '#ce93d8', backgroundDefault: '#2c1f31', paperBackground: '#3a2d40', sidebarBackground: '#3a2d40', contrastText: '#ffffff', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#e1e1e1', textSecondary: '#a0a0a0', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(186, 104, 200, 0.15)' } } },
    { id: 'desert-mirage', name: 'Desert Mirage', palette: { mode: 'light', primary: '#C04000', secondary: '#A68DAD', backgroundDefault: '#FCF5E5', paperBackground: '#FFFFFF', sidebarBackground: '#FFFFFF', contrastText: '#ffffff', divider: 'rgba(0, 0, 0, 0.1)', textPrimary: '#6F4E37', textSecondary: '#A0522D', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(192, 64, 0, 0.15)' } } },
    { id: 'midnight-bloom', name: 'Midnight Bloom', palette: { mode: 'dark', primary: '#8e9aaf', secondary: '#c6a492', backgroundDefault: '#1e1e2f', paperBackground: '#2c2c3f', sidebarBackground: '#2c2c3f', contrastText: '#ffffff', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#e0e0e0', textSecondary: '#a0a0a0', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(142, 154, 175, 0.15)' } } },
    { id: 'solar-flare', name: 'Solar Flare', palette: { mode: 'light', primary: '#ff8f00', secondary: '#ffb300', backgroundDefault: '#fff3e0', paperBackground: '#ffffff', sidebarBackground: '#ffffff', contrastText: '#ffffff', divider: 'rgba(0, 0, 0, 0.1)', textPrimary: '#212121', textSecondary: '#757575', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(255, 143, 0, 0.15)' } } },
    { id: 'ocean-depths', name: 'Ocean Depths', palette: { mode: 'dark', primary: '#26A69A', secondary: '#80CBC4', backgroundDefault: '#001F3F', paperBackground: '#003366', sidebarBackground: '#003366', contrastText: '#ffffff', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#E0F7FA', textSecondary: '#B2DFDB', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(38, 166, 154, 0.15)' } } },
    { id: 'citrus-breeze', name: 'Citrus Breeze', palette: { mode: 'light', primary: '#FFCA28', secondary: '#FFA726', backgroundDefault: '#FFFDE7', paperBackground: '#FFFFFF', sidebarBackground: '#FFFFFF', contrastText: '#212121', divider: 'rgba(0, 0, 0, 0.1)', textPrimary: '#616161', textSecondary: '#9E9E9E', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(255, 202, 40, 0.15)' } } },
    { id: 'twilight-serenity', name: 'Twilight Serenity', palette: { mode: 'dark', primary: '#7986CB', secondary: '#9FA8DA', backgroundDefault: '#303030', paperBackground: '#424242', sidebarBackground: '#424242', contrastText: '#ffffff', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#E0E0E0', textSecondary: '#BDBDBD', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(121, 134, 203, 0.15)' } } },
    { id: 'teal-tranquility', name: 'Teal Tranquility', palette: { mode: 'light', primary: '#00897B', primaryDark: '#00695C', secondary: '#FF5722', backgroundDefault: '#E0F2F1', paperBackground: '#F5FCFB', sidebarBackground: '#EDF8F7', contrastText: '#FFFFFF', divider: 'rgba(0, 77, 64, 0.12)', textPrimary: '#004D40', textSecondary: '#00796B', action: { hover: 'rgba(0, 137, 123, 0.08)', selected: 'rgba(0, 137, 123, 0.16)' } } },
];

// --- Theme Context ---
interface ThemeContextProps {
    theme: Theme;
    setTheme: (id: string) => void;
    currentThemeID: string;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// Helper to generate MUI theme object
const generateMuiTheme = (appTheme: AppTheme): Theme => {
    const mode = appTheme.palette.mode;
    const dividerColor = appTheme.palette.divider;
    const textPrimaryColor = appTheme.palette.textPrimary;
    const textSecondaryColor = appTheme.palette.textSecondary;
    const actionColors = appTheme.palette.action || { hover: 'rgba(0,0,0,0.04)', selected: 'rgba(0,0,0,0.08)' };

    // Create the theme using the base options and specific palette
    const theme = createTheme({
        ...baseThemeOptions, // Start with base options (includes component overrides)
        palette: {
            mode: mode,
            primary: {
                main: appTheme.palette.primary,
                dark: appTheme.palette.primaryDark || appTheme.palette.primary, // Use darker shade if provided
                contrastText: appTheme.palette.contrastText || (mode === 'dark' ? '#fff' : '#000'),
            },
            secondary: {
                main: appTheme.palette.secondary,
            },
            background: {
                default: appTheme.palette.backgroundDefault,
                paper: appTheme.palette.paperBackground, // This is the BASE color before alpha is applied
            },
            text: {
                primary: textPrimaryColor,
                secondary: textSecondaryColor,
            },
            divider: dividerColor,
            action: actionColors,
        },
        // Override components AGAIN here if specific AppTheme needs unique styles
        // This allows theme-specific tweaks on top of the base overrides
        components: {
            ...baseThemeOptions.components, // Include base overrides
            MuiDrawer: { // Ensure Drawer background uses the specific theme's sidebar color
                styleOverrides: {
                    paper: {
                        // Base styles like blur/border are in baseThemeOptions
                        backgroundColor: alpha(appTheme.palette.sidebarBackground, 0.7), // Apply alpha transparency here
                        // backdropFilter: 'blur(16px)', // Already defined in baseThemeOptions
                        // WebkitBackdropFilter: 'blur(16px)', // Already defined in baseThemeOptions
                    }
                }
            },
            MuiAppBar: { // Ensure AppBar background uses the specific theme's paper color
                styleOverrides: {
                    root: {
                        // Base styles like blur/border are in baseThemeOptions
                        backgroundColor: alpha(appTheme.palette.paperBackground, 0.7), // Apply alpha transparency here
                        // backdropFilter: 'blur(16px)', // Already defined in baseThemeOptions
                        // WebkitBackdropFilter: 'blur(16px)', // Already defined in baseThemeOptions
                        color: textPrimaryColor, // Ensure text color matches theme
                        borderBottom: `1px solid ${alpha(dividerColor, 0.2)}`,
                    }
                }
            },
            // Re-apply overrides for Paper/Card if needed, ensuring alpha transparency
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: alpha(appTheme.palette.paperBackground, 0.6),
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid ${alpha(dividerColor, 0.2)}`,
                        borderRadius: baseThemeOptions.shape?.borderRadius || 12,
                        backgroundImage: 'none',
                    }
                }
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundColor: alpha(appTheme.palette.paperBackground, 0.6),
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid ${alpha(dividerColor, 0.2)}`,
                        borderRadius: baseThemeOptions.shape?.borderRadius || 12,
                        backgroundImage: 'none',
                    }
                }
            },
            // Re-apply input overrides to ensure they use the correct theme colors
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        backgroundColor: alpha(appTheme.palette.backgroundDefault, 0.7),
                        backdropFilter: 'blur(5px)',
                        WebkitBackdropFilter: 'blur(5px)',
                        '& fieldset': {
                            borderColor: alpha(dividerColor, 0.3),
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha(textPrimaryColor, 0.6),
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: appTheme.palette.primary,
                            borderWidth: '1px',
                        },
                        '&.Mui-focused': {
                            boxShadow: 'none',
                        }
                    },
                    input: {
                        padding: '10px 12px',
                        fontSize: '0.9rem',
                        color: textPrimaryColor, // Use theme's primary text color
                    },
                }
            },
            MuiInputBase: {
                styleOverrides: {
                    input: {
                        '&::placeholder': {
                            color: textSecondaryColor, // Use theme's secondary text color
                            opacity: 0.6,
                        },
                    },
                }
            },
        }
    });
    return theme;
};

// --- Context Provider ---
export const ThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Default to Wellness Dark
    const [currentThemeID, setCurrentThemeName] = useState<string>(wellnessDark.id);
    const [isLoading, setIsLoading] = useState(true);

    // Ensure isLoading state correctly uses the default background
    const initialBgColor = (availableThemes.find(async t => t.id === await getThemeSetting()) || wellnessDark).palette.backgroundDefault;

    useEffect(() => {
        let isMounted = true;
        getThemeSetting().then(async (savedThemeId) => {
            if (isMounted) {
                // Ensure the saved theme exists in our current list
                const themeExists = availableThemes.find(t => t.id === savedThemeId);
                if (savedThemeId && themeExists) {
                    setCurrentThemeName(savedThemeId);
                } else if (!themeExists && savedThemeId) {
                    // If saved theme is invalid, default to Wellness Dark and save it
                    console.warn(`Saved theme "${savedThemeId}" not found. Defaulting to ${wellnessDark.id}.`);
                    setCurrentThemeName(wellnessDark.id);
                    setThemeSetting(wellnessDark.id);
                }
                // If no saved theme, it already defaults to Wellness Dark
                setIsLoading(false);
            }
        }).catch(error => {
            console.error("Error loading theme setting:", error);
            if (isMounted) setIsLoading(false);
        });
        return () => { isMounted = false; };
    }, []);

    const setTheme = (id: string) => {
        const themeExists = availableThemes.find(t => t.id === id);
        if (themeExists) {
            setCurrentThemeName(id);
            setThemeSetting(id).catch(error => {
                console.error("Error saving theme setting:", error);
            });
        } else {
            console.warn(`Theme "${id}" not found.`);
        }
    };

    const theme = useMemo(() => {
        const currentAppTheme = availableThemes.find(t => t.id === currentThemeID) || wellnessDark; // Fallback to wellnessDark
        return generateMuiTheme(currentAppTheme);
    }, [currentThemeID]);

    if (isLoading) {
        // Use the determined initial background color
        return <Box sx={{ height: '100vh', width: '100vw', backgroundColor: initialBgColor }} />;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, currentThemeID }}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

// --- Custom Hook ---
export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeContextProvider');
    }
    return context;
};