import React from 'react';
import { Box, Typography, Paper, Grid, useTheme, alpha } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart'; // Example icon
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // Example icon
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'; // Example icon

const HomePage: React.FC = () => {
  const theme = useTheme();

  // Placeholder data for dashboard cards
  const dashboardItems = [
    { title: 'Progress', value: '75%', icon: <BarChartIcon fontSize="large" color="primary" />, color: theme.palette.primary.main },
    { title: 'Upcoming', value: '3 Tasks', icon: <CalendarTodayIcon fontSize="large" sx={{ color: alpha(theme.palette.warning.main, 0.8) }} />, color: theme.palette.warning.main },
    { title: 'Activity', value: '2h 30m', icon: <DirectionsRunIcon fontSize="large" sx={{ color: alpha(theme.palette.success.main, 0.8) }} />, color: theme.palette.success.main },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
        Dashboard
      </Typography>

      {/* Grid for dashboard cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardItems.map((item, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.palette.background.paper,
              borderRadius: theme.shape.borderRadius,
              borderLeft: `4px solid ${item.color}`, // Accent border
            }}>
              <Box>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>{item.title}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{item.value}</Typography>
              </Box>
              <Box sx={{ opacity: 0.8 }}>
                {item.icon}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Placeholder for other sections */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius }}>
            <Typography sx={{ color: 'text.secondary' }}>Main Content Area / Chart Placeholder</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius }}>
            <Typography sx={{ color: 'text.secondary' }}>Side Content / Info Placeholder</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* TODO: Calendar Sidebar visible only on wide screens */}
      {/* Implement Calendar Sidebar component here when ready */}
    </Box>
  );
};

export default HomePage;