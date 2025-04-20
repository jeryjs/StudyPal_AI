import { Box, Typography, useTheme } from '@mui/material'; // Removed Paper, Theme
import React from 'react';

import GeminiApiKey from '@components/settings/Item_GeminiApiKey';
import GoogleDriveSync from '@components/settings/Item_GoogleDriveSync';
import ThemeSelector from '@components/settings/Item_ThemeSelector';
import SettingsSection from '@components/settings/SettingsSection'; // Import the new Section component

// --- Settings Page Component ---
const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
        Settings
      </Typography>

      {/* Appearance Section */}
      <SettingsSection title='Appearance' subTitle='Choose a theme that fits your style.'>
        <ThemeSelector />
      </SettingsSection>

      {/* AI Settings Section */}
      <SettingsSection title='AI Integration' subTitle='Configure API keys for AI integration to enhance your study experience.'>
        <GeminiApiKey />
      </SettingsSection>

      {/* Data Sync Section */}
      <SettingsSection title='Data Synchronization' subTitle='Sync your data with Google Drive to access it across all your devices.'>
        <GoogleDriveSync />
      </SettingsSection>
    </Box>
  );
};

export default SettingsPage;