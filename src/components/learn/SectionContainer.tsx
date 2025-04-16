import React from 'react';
import {
  alpha,
  Box,
  Chip,
  Paper,
  Typography,
  useTheme
} from '@mui/material';

interface SectionContainerProps {
  title: string;
  actionButton?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const SectionContainer: React.FC<SectionContainerProps> = ({ title, actionButton, icon, children }) => {
  const theme = useTheme();
  
  // Neumorphic style for cards
  const neumorphicCard = {
    background: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    boxShadow: `
      8px 8px 16px ${alpha(theme.palette.common.black, 0.1)},
      -8px -8px 16px ${alpha(theme.palette.common.white, 0.05)}
    `,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: `
        12px 12px 20px ${alpha(theme.palette.common.black, 0.12)},
        -12px -12px 20px ${alpha(theme.palette.common.white, 0.08)}
      `,
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        ...neumorphicCard,
        p: 3,
        mb: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.7)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
          <Typography variant="h5" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
        {actionButton}
      </Box>

      {children}
    </Paper>
  );
};

export default SectionContainer;
