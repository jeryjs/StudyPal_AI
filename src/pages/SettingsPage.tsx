import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardActionArea, CardContent, Button, alpha, Theme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { availableThemes, useThemeContext } from '@contexts/ThemeContext';

const Section = ({ title, subTitle, children, theme }: { title: string; subTitle: string; children: React.ReactNode; theme: Theme }) => {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary', mb: 3 }}>
        {subTitle}
      </Typography>
      {children}
    </Paper>
  );
};

const SettingsPage: React.FC = () => {
  const { theme, setTheme: setTheme, currentThemeID: currentThemeID } = useThemeContext(); // Get theme object

  const handleThemeSelect = (id: string) => {
    setTheme(id);
  };

  const handleCreateTheme = () => {
    // TODO: Implement custom theme creation UI
    alert('Theme creator coming soon!');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}> {/* Responsive padding */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
        Settings
      </Typography>

      {/* Appearance Section */}
      <Section title='Appearance' subTitle='Choose a theme that fits your style.' theme={theme}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {availableThemes.map((appTheme) => {
            const isSelected = currentThemeID === appTheme.name;
            return (
              // Use Grid's size prop correctly
              <Grid key={appTheme.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card sx={{
                    position: 'relative', // For positioning the check icon
                    border: `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                    boxShadow: isSelected ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                    transition: theme.transitions.create(['border-color', 'box-shadow']),
                    height: '100%', // Ensure cards have same height
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
                        backgroundColor: theme.palette.background.paper, // Ensure visibility over preview
                        borderRadius: '50%',
                    }}/>
                  )}
                  <CardActionArea onClick={() => handleThemeSelect(appTheme.id)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Theme Color Preview */}
                    <Box sx={{ height: 90, display: 'flex', width: '100%' }}>
                      {[appTheme.palette.primary, appTheme.palette.backgroundDefault, appTheme.palette.paperBackground].map((color, index) => (
                        <Box key={index} sx={{ flex: 1, backgroundColor: color, borderRight: index < 2 ? `1px solid ${alpha(color, 0.5)}` : 'none' }} />
                      ))}
                    </Box>
                    <CardContent sx={{ width: '100%', backgroundColor: alpha(theme.palette.background.default, 0.3) }}>
                      <Typography variant="body2" align="center" sx={{ fontWeight: 500 }}>{appTheme.name}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary', mb: 1 }}>
          Customize further?
        </Typography>
        <Button variant="outlined" onClick={handleCreateTheme}>
          Create Your Own Theme
        </Button>
      </Section>

      {/* TODO: Add other settings sections here (e.g., Account, Notifications) */}
      {/* Example:
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius }}>
         <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Account</Typography>
         ...
      </Paper>
      */}
    </Box>
  );
};

export default SettingsPage;