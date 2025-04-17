import React from 'react';
import { Box, Typography, Paper, Grid, useTheme, alpha, Avatar, IconButton, List, ListItem, ListItemText, ListItemAvatar, Card, CardContent, Button } from '@mui/material';
// Import study-related icons
import SchoolIcon from '@mui/icons-material/School'; // For current subject/overall progress
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'; // For tasks/deadlines
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled'; // For study time/streak
import LightbulbIcon from '@mui/icons-material/Lightbulb'; // For suggestions/goals
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'; // Keep for messages/notifications
import CalendarSidebar from '../components/dashboard/CalendarSidebar'; // Assuming this is study-related
import AddIcon from '@mui/icons-material/Add';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'; // For starting session
import StyleIcon from '@mui/icons-material/Style'; // For flashcards/review
import Chatbar from '../components/shared/Chatbar'; // Import the Chatbar

const HomePage: React.FC = () => {
  const theme = useTheme();

  // Updated placeholder data for study widgets
  const dashboardItems = [
    { title: 'Current Focus', value: 'Physics - Ch. 4', icon: <SchoolIcon fontSize="large" color="primary" />, color: theme.palette.primary.main, handler: () => console.log('Viewing Current Subject...') },
    { title: 'Upcoming Tasks', value: '3 Due Soon', icon: <AssignmentTurnedInIcon fontSize="large" sx={{ color: alpha(theme.palette.warning.main, 0.8) }} />, color: theme.palette.warning.main, handler: () => console.log('Viewing Tasks...') },
    { title: 'Study Time Today', value: '1h 45m', icon: <AccessTimeFilledIcon fontSize="large" sx={{ color: alpha(theme.palette.success.main, 0.8) }} />, color: theme.palette.success.main, handler: () => console.log('Viewing Study Stats...') },
  ];

  // Keep messages or rename to notifications
  const notifications = [
    { id: 1, sender: 'AI Tutor', message: 'New practice problems available for Physics.', unread: true },
    { id: 2, sender: 'Study Group', message: 'Meeting scheduled for Friday at 3 PM.', unread: false },
    { id: 3, sender: 'System', message: 'Weekly progress report is ready.', unread: false },
  ];

  // Functions for widget actions (renamed/repurposed)
  const handleViewLearningGoals = () => {
    console.log('Viewing Learning Goals...');
    // TODO: Implement logic for viewing goals
  };

  const handleNotificationClick = (notificationId: number) => {
    console.log(`Opening notification ID: ${notificationId}`);
    // TODO: Implement logic for opening a notification
  };

  const handleQuickAction = (action: string) => {
    console.log(`Performing Quick Action: ${action}`);
    // TODO: Implement logic for quick actions like starting session, reviewing flashcards
  };

  // Glassmorphism style for cards (keep as is)
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

  // Pill button style (keep as is)
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
            Study Dashboard
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={pillButton}
            onClick={() => console.log('Creating New Study Item...')} // Placeholder for create new action
          >
            Add New Task
          </Button>
        </Box>

        {/* Top Row Widgets - Study Focused */}
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
                onClick={item.handler} // Use the handler from the data
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

        {/* Middle Row Widgets - Study Focused */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Learning Goals/Suggestions Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Learning Goals
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track your progress towards mastering new concepts.
                  </Typography>
                  {/* TODO: Add goal visualization or list here */}
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<LightbulbIcon />}
                  sx={pillButton}
                  onClick={handleViewLearningGoals}
                >
                  View Goals
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Notifications Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Notifications</Typography>
                  <IconButton><MoreVertIcon /></IconButton>
                </Box>
                <List sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 200 /* Limit height */ }}>
                  {notifications.map((notification) => (
                    <ListItem
                      key={notification.id}
                      sx={{
                        borderRadius: theme.shape.borderRadius,
                        mb: 1,
                        bgcolor: notification.unread ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) }
                      }}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <ListItemAvatar>
                        {/* Use a generic icon or sender-specific */}
                        <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                           {notification.sender === 'AI Tutor' ? <LightbulbIcon fontSize='small'/> : notification.sender === 'Study Group' ? <ChatBubbleIcon fontSize='small'/> : <SchoolIcon fontSize='small'/>}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={notification.sender}
                        secondary={notification.message}
                        primaryTypographyProps={{ fontWeight: notification.unread ? 600 : 400 }}
                        secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bottom Row Widgets - Study Focused */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Study Profile/Stats Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, p: 3, borderRadius: theme.shape.borderRadius }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Allan J.</Typography>
                  <Typography variant="body2" color="text.secondary">Student Profile</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2">Physics</Typography>
                  <Typography variant="body2" color="text.secondary">Top Subject</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2">85%</Typography>
                  <Typography variant="body2" color="text.secondary">Avg. Score</Typography>
                </Box>
              </Box>
              {/* TODO: Add more relevant stats like subjects completed, streak etc. */}
            </Card>
          </Grid>

          {/* Quick Study Actions Widget */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...glassCard, p: 3, borderRadius: theme.shape.borderRadius }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PlayCircleOutlineIcon />}
                  sx={{ ...pillButton }}
                  onClick={() => handleQuickAction('Start Session')}
                >
                  Start Session
                </Button>
                <Button
                  variant="outlined"
                  color="secondary" // Use secondary or another color
                  startIcon={<StyleIcon />}
                  sx={{ ...pillButton, borderColor: theme.palette.secondary.main, color: theme.palette.secondary.main }}
                  onClick={() => handleQuickAction('Review Flashcards')}
                >
                  Review Cards
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Chatbar Integration */}
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
            <Chatbar />
        </Box>

      </Box>

      {/* Right Sidebar (Assuming CalendarSidebar is relevant) */}
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