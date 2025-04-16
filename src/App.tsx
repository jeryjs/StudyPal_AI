import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import { Box, CssBaseline, AppBar, Toolbar, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Import Layout Components
import Sidebar from '@components/Sidebar';
import Chatbar from '@components/Chatbar';

// Import Pages
import HomePage from '@pages/HomePage';
import SettingsPage from '@pages/SettingsPage';
import CopilotPage from '@pages/CopilotPage';

function App() {
  const location = useLocation();
  const theme = useTheme();
  const isCopilotRoute = location.pathname === '/copilot';

  // Sidebar State & Responsiveness
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const sidebarWidth = 260; // Slightly wider sidebar
  const collapsedSidebarWidth = 80; // Wider collapsed sidebar

  const sidebarVariant = isMobile ? 'temporary' : 'persistent';
  const isPersistentCollapsed = !isMobile && !isSidebarOpen;
  // Drawer open state: controls temporary visibility and persistent expansion
  const drawerOpenState = isMobile ? isSidebarOpen : !isPersistentCollapsed;

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>

        {/* AppBar for mobile */}
        {isMobile && !isCopilotRoute && (
          <AppBar position="fixed" sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            // Styling is handled by ThemeContext overrides
          }}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleSidebarToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                Study-Pal
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Sidebar */}
        {!isCopilotRoute && (
          <Sidebar
            variant={sidebarVariant}
            open={drawerOpenState} // Controls visibility/state
            isCollapsed={isPersistentCollapsed} // Pass collapsed state explicitly
            onClose={handleSidebarClose}
            onToggle={handleSidebarToggle}
            width={sidebarWidth}
            collapsedWidth={collapsedSidebarWidth}
          />
        )}

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto', // Enable scrolling for content
            position: 'relative', // Needed for potential absolute positioned elements inside
            // Add padding top to account for AppBar height on mobile
            pt: isMobile && !isCopilotRoute ? `calc(${theme.mixins.toolbar.minHeight || '56'}px + ${theme.spacing(1)})` : theme.spacing(2), // Add some base padding top
            pb: theme.spacing(3), // Padding bottom
            px: theme.spacing(1), // Minimal horizontal padding, pages handle their own main padding
            // Adjust left margin based on sidebar state and screen size
            // ml: isCopilotRoute || isMobile ? 0 : (isSidebarOpen ? `${sidebarWidth}px` : `${collapsedSidebarWidth}px`),
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            // Apply entering transition only when opening the persistent sidebar
            ...(!isPersistentCollapsed && !isMobile && !isCopilotRoute && {
              transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          }}
        >
          {/* Add Toolbar spacer only if AppBar is persistent and not mobile */}
          {/* {!isMobile && <Toolbar />} */}

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Add placeholder routes for sidebar items */}
            <Route path="/subjects" element={<Typography sx={{ p: 3 }}>Subjects Page (Placeholder)</Typography>} />
            <Route path="/learn" element={<Typography sx={{ p: 3 }}>Study Plan Page (Placeholder)</Typography>} />
            <Route path="/todo" element={<Typography sx={{ p: 3 }}>Todo Page (Placeholder)</Typography>} />
            <Route path="/profile" element={<Typography sx={{ p: 3 }}>Profile Page (Placeholder)</Typography>} />

            {/* CopilotPage content is rendered *within* the expanded Chatbar */}
            {/* The route still needs to exist for navigation */}
            {/* <Route path="/copilot" element={<CopilotPage />} /> */}
          </Routes>
        </Box>

        {/* Chatbar */}
        <Chatbar />
      </Box>
    </>
  );
}

export default App;