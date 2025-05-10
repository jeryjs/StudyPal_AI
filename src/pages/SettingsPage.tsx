import { useCopilot } from '@hooks/useCopilot';
import { Box, Typography } from '@mui/material'; // Removed Paper, Theme
import React, { useEffect } from 'react';

import GeminiApiKey from '@components/settings/Item_GeminiApiKey';
import GoogleDriveSync from '@components/settings/Item_GoogleDriveSync';
import ThemeSelector from '@components/settings/Item_ThemeSelector';
import SettingsSection from '@components/settings/SettingsSection'; // Import the new Section component

// --- Settings Page Component ---
const SettingsPage: React.FC = () => {
  const { setPageContext } = useCopilot();
  useEffect(() => setPageContext({page: 'settings', description: 'User is currently on Settings page. If you aren’t aware of the current settings yet, the first get_settings with the tool.'}), [setPageContext]);

  return (
    <Box sx={{ m: { xs: 1, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
        Settings
      </Typography>
      <SettingsSection title='Appearance' subTitle='Choose a theme that fits your style.'>
        <ThemeSelector />
      </SettingsSection>
      <SettingsSection title='AI Integration' subTitle='Configure API keys for AI integration to enhance your study experience.'>
        <GeminiApiKey />
      </SettingsSection>
      <SettingsSection title='Data Synchronization' subTitle='Sync your data with Google Drive to access it across all your devices.'>
        <GoogleDriveSync />
      </SettingsSection>
    </Box>
  );
};
export default SettingsPage;