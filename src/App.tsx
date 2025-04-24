import { Box, CssBaseline, Typography } from '@mui/material';
import { Route, Routes } from 'react-router';

// Import Layout Components
import Navbar from '@components/shared/Navbar';

// Import Pages
import Chatbar from '@components/shared/Chatbar';
import ChaptersPage from '@pages/ChaptersPage';
import HomePage from '@pages/HomePage';
import LearnPage from '@pages/LearnPage';
import QuizPage from '@pages/QuizPage';
import SettingsPage from '@pages/SettingsPage';
import SubjectsPage from '@pages/SubjectsPage';
import TodoPage from '@pages/TodoPage';

function App() {
  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
        <Navbar>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:subjectId" element={<ChaptersPage />} />
            <Route path="/subjects/:subjectId/c/:chapterId" element={<ChaptersPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/profile" element={<Typography sx={{ p: 3 }}>Profile Page (Placeholder)</Typography>} />
            <Route path="/test/:testId" element={<QuizPage />} />

            {/* Copilot page is rendered within the chatbar */}
            {/* <Route path="/copilot" element={<CopilotPage />} /> */}
          </Routes>

          {/* Chatbar */}
          <Chatbar />
        </Navbar>
      </Box>
    </>
  );
}

export default App;