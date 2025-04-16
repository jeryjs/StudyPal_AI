import React, { createContext, useState, useMemo, useContext, ReactNode, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, ThemeOptions, Theme, alpha } from '@mui/material/styles';
import { Box, PaletteMode } from '@mui/material';
import { getThemeSetting, setThemeSetting } from '../store/settings';

// --- Base Theme Options ---
const baseThemeOptions: ThemeOptions = {
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        h4: { fontWeight: 600, fontSize: '1.75rem' },
        h5: { fontWeight: 600, fontSize: '1.25rem' },
        h6: { fontWeight: 600, fontSize: '1.1rem' },
        body1: { fontSize: '0.9rem' },
        body2: { fontSize: '0.8rem' },
        button: { textTransform: 'none', fontWeight: 600 },
        caption: { fontSize: '0.75rem' },
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
                    // Apply glass effect: semi-transparent background + blur
                    backgroundColor: alpha(theme.palette.background.paper, 0.6), // Adjust transparency
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)', // For Safari
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`, // Subtle border
                }),
            }
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    // Inherit Paper styles for consistency or define specific Card styles
                    backgroundColor: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    borderRadius: theme.shape.borderRadius,
                    backgroundImage: 'none',
                }),
            }
        },
        MuiButton: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 8,
                    padding: theme.spacing(0.75, 2.5),
                    boxShadow: 'none',
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
                    '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.08),
                        borderColor: theme.palette.primary.main,
                    },
                }),
                textPrimary: ({ theme }) => ({
                    color: theme.palette.primary.main,
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
                    // Apply glass effect, potentially with different transparency
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    backgroundImage: 'none',
                })
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: ({ theme }) => ({ // Apply glass effect to AppBar
                    boxShadow: 'none',
                    backgroundImage: 'none',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7), // Match drawer or use specific value
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, // Subtle border
                    color: theme.palette.text.primary,
                })
            }
        },
        MuiListItemButton: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 8,
                    margin: theme.spacing(0.5, 1.5),
                    padding: theme.spacing(0.8, 1.5),
                    width: 'auto',
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.1),
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'transparent',
                        // Use a visual indicator like a left border or stronger text/icon color
                        // Example: borderLeft: `3px solid ${theme.palette.primary.main}`, paddingLeft: `calc(${theme.spacing(1.5)} - 3px)`,
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
                }),
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 8,
                    // Use a semi-transparent background for inputs too
                    backgroundColor: alpha(theme.palette.background.default, 0.7),
                    backdropFilter: 'blur(5px)', // Subtle blur for inputs
                    WebkitBackdropFilter: 'blur(5px)',
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
                    // Remove inner shadow on focus if it exists
                    '&.Mui-focused': {
                        boxShadow: 'none',
                    }
                }),
                input: ({ theme }) => ({
                    padding: theme.spacing(1.25, 1.5),
                    fontSize: '0.9rem',
                    color: theme.palette.text.primary,
                }),
            }
        },
        MuiInputBase: {
            styleOverrides: {
                input: ({ theme }) => ({
                    '&::placeholder': {
                        color: theme.palette.text.secondary,
                        opacity: 0.6,
                    },
                }),
            }
        },
        MuiGrid: {
            defaultProps: {
                spacing: 13 // Example: Set default spacing
            }
        }
    }
};

// --- Theme Definitions ---
interface AppTheme {
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
    { name: 'Wellness Light', palette: { mode: 'light', primary: '#4a90e2', secondary: '#e53e3e', backgroundDefault: '#F7FAFC', paperBackground: '#FFFFFF', sidebarBackground: '#FFFFFF', contrastText: '#ffffff', divider: 'rgba(0, 0, 0, 0.1)', textPrimary: '#2D3748', textSecondary: '#718096', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(74, 144, 226, 0.1)' } } },
    { name: 'Bluish Night', palette: { mode: 'dark', primary: '#8ab4f8', secondary: '#80cbc4', backgroundDefault: '#1f2023', paperBackground: '#2a2b2f', sidebarBackground: '#2a2b2f', contrastText: '#1f2023', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#e1e1e1', textSecondary: '#a0a0a0', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(138, 180, 248, 0.15)' } } },
    { name: 'Forest Green', palette: { mode: 'dark', primary: '#81c784', secondary: '#a5d6a7', backgroundDefault: '#1b2e1f', paperBackground: '#2a3c2c', sidebarBackground: '#2a3c2c', contrastText: '#1b2e1f', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#e1e1e1', textSecondary: '#a0a0a0', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(129, 199, 132, 0.15)' } } },
    { name: 'Rose Quartz', palette: { mode: 'light', primary: '#e91e63', secondary: '#f06292', backgroundDefault: '#fdf6f8', paperBackground: '#ffffff', sidebarBackground: '#ffffff', contrastText: '#ffffff', divider: 'rgba(0, 0, 0, 0.08)', textPrimary: '#212121', textSecondary: '#757575', action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(233, 30, 99, 0.15)' } } },
    { name: 'Amethyst', palette: { mode: 'dark', primary: '#ba68c8', secondary: '#ce93d8', backgroundDefault: '#2c1f31', paperBackground: '#3a2d40', sidebarBackground: '#3a2d40', contrastText: '#ffffff', divider: 'rgba(255, 255, 255, 0.1)', textPrimary: '#e1e1e1', textSecondary: '#a0a0a0', action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(186, 104, 200, 0.15)' } } }
];

// --- Theme Context ---
interface ThemeContextProps {
    theme: Theme;
    setThemeByName: (name: string) => void;
    currentThemeName: string;
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
    const [currentThemeName, setCurrentThemeName] = useState<string>(wellnessDark.name);
    const [isLoading, setIsLoading] = useState(true);

    // Ensure isLoading state correctly uses the default background
    const initialBgColor = (availableThemes.find(async t => t.name === await getThemeSetting()) || wellnessDark).palette.backgroundDefault;

    useEffect(() => {
        let isMounted = true;
        getThemeSetting().then(async (savedThemeName) => {
            if (isMounted) {
                // Ensure the saved theme exists in our current list
                const themeExists = availableThemes.find(t => t.name === savedThemeName);
                if (savedThemeName && themeExists) {
                    setCurrentThemeName(savedThemeName);
                } else if (!themeExists && savedThemeName) {
                    // If saved theme is invalid, default to Wellness Dark and save it
                    console.warn(`Saved theme "${savedThemeName}" not found. Defaulting to ${wellnessDark.name}.`);
                    setCurrentThemeName(wellnessDark.name);
                    setThemeSetting(wellnessDark.name);
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

    const setThemeByName = (name: string) => {
        const themeExists = availableThemes.find(t => t.name === name);
        if (themeExists) {
            setCurrentThemeName(name);
            setThemeSetting(name).catch(error => {
                console.error("Error saving theme setting:", error);
            });
        } else {
            console.warn(`Theme "${name}" not found.`);
        }
    };

    const theme = useMemo(() => {
        const currentAppTheme = availableThemes.find(t => t.name === currentThemeName) || wellnessDark; // Fallback to wellnessDark
        return generateMuiTheme(currentAppTheme);
    }, [currentThemeName]);

    if (isLoading) {
        // Use the determined initial background color
        return <Box sx={{ height: '100vh', width: '100vw', backgroundColor: initialBgColor }} />;
    }

    return (
        <ThemeContext.Provider value={{ theme, setThemeByName, currentThemeName }}>
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