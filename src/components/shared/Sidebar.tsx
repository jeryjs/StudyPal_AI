import { Box, CSSObject, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, styled, Theme, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';
import { Link, useLocation } from 'react-router';

// Import Icons
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'; // Statistics
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded'; // Appointments
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'; // Dashboard
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'; // Messages
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'; // Settings
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'; // Activity

// --- Sidebar Props ---
interface SidebarProps {
  variant: 'permanent' | 'persistent' | 'temporary';
  open: boolean; // Controls temporary visibility and persistent state
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
  borderRight: 'none',
});

const closedMixin = (theme: Theme, collapsedWidth: number): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: collapsedWidth,
  borderRight: 'none',
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
  justifyContent: 'space-between', // Distribute space for toggle button
  paddingInline: theme.spacing(2), // Adjusted padding
  marginBlock: theme.spacing(2),
  ...theme.mixins.toolbar, // Ensure proper spacing with AppBar
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  paddingBlock: theme.spacing(1.5),
  width: '100%', // Full width
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
const Sidebar: React.FC<SidebarProps> = ({ variant, open, onToggle, width, collapsedWidth }) => {
  const theme = useTheme();
  const location = useLocation();
  // Determine if the drawer should visually appear open (expanded)
  const isOpen = variant === 'temporary' ? open : open;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', overflow: 'hidden' }}>
      <DrawerHeader>
        <LogoContainer>
          {/* Simple Logo/Title - Replace with actual logo if available */}
          <Typography variant="h5" noWrap component="div" sx={{ fontWeight: 700, color: theme.palette.text.primary, display: 'block' }}>
            {isOpen
              ? <>Study<span style={{ color: theme.palette.primary.main }}>Pal</span></>
              : <>S<span style={{ color: theme.palette.primary.main }}>P</span></>}
          </Typography>
        </LogoContainer>
        <IconButton onClick={onToggle}>
          {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider sx={{ borderColor: theme.palette.divider, opacity: 0.5, mx: 2, my: 1 }} />

      {/* Main Navigation */}
      <List sx={{ px: isOpen ? 2 : 0.5, flexGrow: 1 }}> {/* Allow list to grow */}
        {mainNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <Tooltip title={!isOpen ? item.text : ''} placement="right">
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))} // Better path matching
                sx={{
                  minHeight: 64, // Increased height
                  justifyContent: isOpen ? 'initial' : 'center',
                  px: 3, // Increased padding
                  ...(location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      bottom: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '60%',
                      borderRadius: '0 8px 8px 0',
                      backgroundColor: theme.palette.primary.main,
                    },
                    backgroundColor: theme.palette.action.hover,
                  } : {}),
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 0,
                  mr: isOpen ? 3 : 'auto', // Increased spacing
                  justifyContent: 'center',
                  ml: isOpen ? 0 : 0.5,
                  fontSize: '2rem', // Larger icons
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: isOpen ? 1 : 0, '& .MuiTypography-root': { fontSize: '1.1rem', fontWeight: 500 } }} />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* <Box sx={{ flexGrow: 1 }} /> Spacer - Removed as list now grows */}

      {/* Secondary Navigation (Settings, Logout) */}
      <Divider sx={{ borderColor: theme.palette.divider, mx: 2 }} />
      <List sx={{ px: isOpen ? 2 : 0.5, pb: 3 }}> {/* Padding bottom */}
        {secondaryNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <Tooltip title={!isOpen ? item.text : ''} placement="right">
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 64, // Increased height
                  justifyContent: isOpen ? 'initial' : 'center',
                  px: 3, // Increased padding
                  ...(location.pathname === item.path ? {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      bottom: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '60%',
                      borderRadius: '0 8px 8px 0',
                      backgroundColor: theme.palette.primary.main,
                    },
                    backgroundColor: theme.palette.action.hover,
                  } : {}),
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 0,
                  mr: isOpen ? 3 : 'auto', // Increased spacing
                  justifyContent: 'center',
                  fontSize: '2rem', // Larger icons
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: isOpen ? 1 : 0, '& .MuiTypography-root': { fontSize: '1.1rem', fontWeight: 500 } }} />
              </ListItemButton>
            </Tooltip>
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
        onClose={onToggle}
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