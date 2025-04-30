import React from 'react';
import { Paper, Typography, useTheme } from '@mui/material';

interface SettingsSectionProps {
  title: string;
  subTitle: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, subTitle, children }) => {
  const theme = useTheme();

  return (
    <Paper sx={{
        p: { xs: 2, md: 3 },
        mb: 4, 
        backgroundColor: theme.palette.background.paper, 
        borderRadius: theme.shape.borderRadius
    }}>
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

export default SettingsSection;
