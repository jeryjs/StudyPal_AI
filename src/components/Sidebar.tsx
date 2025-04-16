import React from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Drawer, IconButton, useTheme, styled, Theme, CSSObject, Typography, Avatar } from '@mui/material';
import { Link, useLocation } from 'react-router';

// Import specific icons from image #1
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'; // Dashboard
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded'; // Appointments
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'; // Activity
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'; // Statistics
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'; // Messages
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'; // Settings
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'; // Log Out
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'; // Heart icon for logo

// --- Sidebar Props ---
interface SidebarProps {
  variant: 'permanent' | 'persistent' | 'temporary';
  open: boolean; // Controls temporary visibility and persistent state
  isCollapsed: boolean; // Only relevant for persistent variant visual state
  onClose?: () => void; // For temporary drawer
  onToggle: () => void; // For persistent drawer (if toggle exists)
  width: number;
  collapsedWidth: number;
}

// --- Mixins for Styled Drawer ---
const openedMixin = (theme: Theme, width: number): CSSObject => ({
  width: width,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  // Background is set directly on paper in ThemeContext
  borderRight: 'none', // Remove border
});

const closedMixin = (theme: Theme, collapsedWidth: number): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: collapsedWidth,
  borderRight: 'none', // Remove border
  // Background is set directly on paper in ThemeContext
  [theme.breakpoints.up('sm')]: { // Ensure collapsed width on larger screens if needed
    width: collapsedWidth,
  },
});

// --- Styled Drawer Component ---
interface StyledDrawerProps {
  open?: boolean;
  collapsedwidth: number;
  fullwidth: number;
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'collapsedwidth' && prop !== 'fullwidth'
})<StyledDrawerProps>(({ theme, open, collapsedwidth, fullwidth }) => ({
  width: fullwidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme, fullwidth),
    '& .MuiDrawer-paper': openedMixin(theme, fullwidth),
  }),
  ...(!open && {
    ...closedMixin(theme, collapsedwidth),
    '& .MuiDrawer-paper': closedMixin(theme, collapsedwidth),
  }),
}));

// --- Sidebar Header (Logo/Title) ---
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  // justifyContent: 'center', // Center logo/title
  padding: theme.spacing(2, 2.5), // Adjust padding
  minHeight: 70, // Match AppBar height (adjust if necessary)
  // Use theme toolbar mixin if AppBar is present and needs spacing
  // ...theme.mixins.toolbar,
}));

// --- Navigation Items ---
const mainNavItems = [
  { text: 'Dashboard', icon: <GridViewRoundedIcon />, path: '/' },
  { text: 'Subjects', icon: <CalendarTodayRoundedIcon />, path: '/subjects' },
  { text: 'Todo', icon: <TimelineRoundedIcon />, path: '/todo' },
  { text: 'Learn', icon: <BarChartRoundedIcon />, path: '/learn' },
];

const secondaryNavItems = [
  { text: 'Settings', icon: <SettingsRoundedIcon />, path: '/settings' },
  { text: 'Profile', icon: <MailOutlineRoundedIcon />, path: '/profile' },
];

// --- Sidebar Component ---
const Sidebar: React.FC<SidebarProps> = ({ variant, open, isCollapsed, onClose, onToggle, width, collapsedWidth }) => {
  const theme = useTheme();
  const location = useLocation();
  // Determine if the drawer should visually appear open (expanded)
  const isOpen = variant === 'temporary' ? open : !isCollapsed;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <DrawerHeader>
        {/* Simple Logo/Title - Replace with actual logo if available */}
        <Typography variant="h6" noWrap component="div" sx={{ color: theme.palette.primary.main, fontWeight: 700, display: isOpen ? 'block' : 'none' }}>
          StudyPal
        </Typography>
        {/* Placeholder for collapsed logo */}
        {!isOpen && (
          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32, fontSize: '1rem' }}>SP</Avatar>
        )}
        {/* NOTE: Removed toggle button based on image #1 */}
      </DrawerHeader>
      <Divider sx={{ borderColor: theme.palette.divider, opacity: 0.5, mx: 2, my: 1 }} />

      {/* Main Navigation */}
      <List sx={{ px: isOpen ? 1 : 0.5, flexGrow: 1 }}> {/* Allow list to grow */}
        {mainNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))} // Better path matching
              sx={{
                minHeight: 48,
                justifyContent: isOpen ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon sx={{
                minWidth: 0,
                mr: isOpen ? 2 : 'auto',
                justifyContent: 'center',
                ml: isOpen ? 0 : 0.5,
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} sx={{ opacity: isOpen ? 1 : 0, '& .MuiTypography-root': { fontSize: '0.9rem', fontWeight: 500 } }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* <Box sx={{ flexGrow: 1 }} /> Spacer - Removed as list now grows */}

      {/* Secondary Navigation (Settings, Logout) */}
      <Divider sx={{ borderColor: theme.palette.divider, mx: 2 }} />
      <List sx={{ px: isOpen ? 1 : 0.5, pb: 2 }}> {/* Padding bottom */}
        {secondaryNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                minHeight: 48,
                justifyContent: isOpen ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon sx={{
                minWidth: 0,
                mr: isOpen ? 2 : 'auto',
                justifyContent: 'center',
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} sx={{ opacity: isOpen ? 1 : 0, '& .MuiTypography-root': { fontSize: '0.9rem', fontWeight: 500 } }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // --- Render Logic ---
  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: width,
            // Background/border set by theme
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  } else {
    // Use the styled Drawer for persistent/permanent variants
    return (
      <StyledDrawer
        variant="permanent"
        open={isOpen} // Controls visual state via mixins
        collapsedwidth={collapsedWidth}
        fullwidth={width}
        sx={{ display: { xs: 'none', md: 'block' } }} // Hide on mobile
      >
        {drawerContent}
      </StyledDrawer>
    );
  }
};

export default Sidebar;