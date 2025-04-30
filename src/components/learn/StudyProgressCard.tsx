import React from 'react';
import {
  alpha,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Typography,
  useTheme
} from '@mui/material';

interface StudyProgressCardProps {
  id: number;
  name: string;
  icon: string;
  color: string;
  progress: number;
}

const StudyProgressCard: React.FC<StudyProgressCardProps> = ({ id, name, icon, color, progress }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2,
        borderRadius: '16px',
        background: alpha(theme.palette.background.paper, 0.5),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(color, 0.2)}`,
        boxShadow: `0 10px 30px ${alpha(color, 0.1)}`
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={100}
          thickness={4}
          sx={{
            color: alpha(color, 0.15),
            position: 'absolute',
          }}
        />
        <CircularProgress
          variant="determinate"
          value={progress}
          size={100}
          thickness={4}
          sx={{
            color: color,
            position: 'absolute',
          }}
        />
        <Avatar
          sx={{
            width: 60,
            height: 60,
            bgcolor: alpha(color, 0.15),
            color: color,
            fontSize: '1.7rem',
            fontWeight: 'bold',
            boxShadow: `0 4px 20px ${alpha(color, 0.3)}`
          }}
        >
          {icon}
        </Avatar>
      </Box>

      <Typography variant="h6" fontWeight={600} mb={0.5}>{name}</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" fontWeight={700} color={color}>{progress}%</Typography>
      </Box>
    </Box>
  );
};

export default StudyProgressCard;
