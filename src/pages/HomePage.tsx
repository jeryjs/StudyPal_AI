import React from 'react';
import { Box, Typography, Paper, Grid, useTheme, alpha, Avatar, IconButton, LinearProgress, List, ListItem, ListItemText, ListItemAvatar, Card, CardContent, Chip, Button } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CalendarSidebar from '../components/dashboard/CalendarSidebar';
import AddIcon from '@mui/icons-material/Add';

const HomePage: React.FC = () => {
  const theme = useTheme();

  // Placeholder data
  const dashboardItems = [
    { title: 'Progress', value: '2135 Kcal', icon: <BarChartIcon fontSize="large" color="primary" />, color: theme.palette.primary.main },
    { title: 'Status', value: '72 bpm', icon: <CalendarTodayIcon fontSize="large" sx={{ color: alpha(theme.palette.warning.main, 0.8) }} />, color: theme.palette.warning.main },
    { title: 'Running Challenge', value: '22 Days', icon: <DirectionsRunIcon fontSize="large" sx={{ color: alpha(theme.palette.success.main, 0.8) }} />, color: theme.palette.success.main },
  ];

  const messages = [
    { id: 1, sender: 'Darrell Steward', message: 'How are you?', unread: true },
    { id: 2, sender: 'Theresa Webb', message: 'ONWARDS 13', unread: false },
    { id: 3, sender: 'Jenny Wilson', message: 'What do you make of the plan?', unread: false },
  ];

  // Functions for widget actions
  const handleProgressClick = () => {
    console.log('Navigating to Progress Details...');
    // TODO: Implement navigation or logic for progress details
  };

  const handleStatusClick = () => {
    console.log('Viewing Health Status...');
    // TODO: Implement logic for viewing health status
  };

  const handleRunningChallengeClick = () => {
    console.log('Viewing Running Challenge...');
    // TODO: Implement logic for viewing running challenge
  };

  const handleViewSuggestions = () => {
    console.log('Viewing Suggestions...');
    // TODO: Implement logic for viewing suggestions
  };

  const handleMessageClick = (messageId: number) => {
    console.log(`Opening message ID: ${messageId}`);
    // TODO: Implement logic for opening a message
  };

  const handleQuickAction = (action: string) => {
    console.log(`Performing Quick Action: ${action}`);
    // TODO: Implement logic for quick actions
  };

  // Glassmorphism style for cards
  const glassCard = {
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
    borderRadius: '16px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: `0 12px 40px 0 ${alpha(theme.palette.common.black, 0.15)}`,
    }
  };

  // Pill button style
  const pillButton = {
    borderRadius: '20px',
    textTransform: 'none',
    px: 2.5,
    py: 1,
    fontWeight: 600,
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
  };

  return (
    <Box sx={{ m: { xs: 2, md: 4 }, display: 'flex' }}>
      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Dashboard
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={pillButton}
            onClick={() => console.log('Creating New Item...')} // Placeholder for create new action
          >
            Create New
          </Button>
        </Box>

        {/* Top Row Widgets */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {dashboardItems.map((item, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${item.color}`,
                  ...glassCard,
                  cursor: 'pointer',
                }}
                onClick={
                  index === 0
                    ? handleProgressClick
                    : index === 1
                    ? handleStatusClick
                    : handleRunningChallengeClick
                }
              >
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

        {/* Middle Row Widgets */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Suggestions Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Suggestions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Explore personalized suggestions and helpful resources.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  sx={pillButton}
                  onClick={handleViewSuggestions}
                >
                  View Suggestions
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Messages Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Messages</Typography>
                  <IconButton><MoreVertIcon /></IconButton>
                </Box>
                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {messages.map((message) => (
                    <ListItem
                      key={message.id}
                      sx={{
                        borderRadius: theme.shape.borderRadius,
                        mb: 1,
                        bgcolor: message.unread ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                      }}
                      onClick={() => handleMessageClick(message.id)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>{message.sender.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={message.sender}
                        secondary={message.message}
                        primaryTypographyProps={{ fontWeight: message.unread ? 600 : 400 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bottom Row Widgets */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* User Profile Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, p: 3, borderRadius: theme.shape.borderRadius }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Allan J.</Typography>
                  <Typography variant="body2" color="text.secondary">B+ Blood Type</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2">184 cm</Typography>
                  <Typography variant="body2" color="text.secondary">Height</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2">78 kg</Typography>
                  <Typography variant="body2" color="text.secondary">Weight</Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Quick Actions Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, p: 3, borderRadius: theme.shape.borderRadius }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ ...pillButton }}
                  onClick={() => handleQuickAction('Action 1')}
                >
                  Action 1
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ ...pillButton }}
                  onClick={() => handleQuickAction('Action 2')}
                >
                  Action 2
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Right Sidebar */}
      <Box
        component="aside"
        sx={{
          width: 340,
          ml: { md: 3 },
          flexShrink: 0,
          display: { xs: 'none', lg: 'block' },
        }}
      >
        <CalendarSidebar />
      </Box>
    </Box>
  );
};

export default HomePage;