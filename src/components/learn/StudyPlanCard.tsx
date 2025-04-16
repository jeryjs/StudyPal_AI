import React from 'react';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Typography,
  useTheme
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface StudyPlanCardProps {
  id: number;
  title: string;
  subject: string;
  progress: number;
  tasks: number;
  completed: number;
  subjectColor: string;
}

const StudyPlanCard: React.FC<StudyPlanCardProps> = ({
  title,
  subject,
  progress,
  tasks,
  completed,
  subjectColor
}) => {
  const theme = useTheme();
  return (
    <Card sx={{
      background: alpha(theme.palette.background.paper, 0.5),
      border: `1px solid ${alpha(subjectColor, 0.2)}`,
      borderRadius: '16px',
      boxShadow: `0 10px 30px ${alpha(subjectColor, 0.1)}`
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
            <Chip
              label={subject}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: alpha(subjectColor, 0.15),
                color: subjectColor,
                fontWeight: 500,
                borderRadius: '10px'
              }}
            />
          </Box>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Progress</Typography>
            <Typography variant="body2" fontWeight={500}>{progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: alpha(subjectColor, 0.15),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${subjectColor}, ${alpha(subjectColor, 0.7)})`,
                borderRadius: 5,
              }
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" fontWeight={500}>
            {completed} of {tasks} tasks completed
          </Typography>
        </Box>
        <Box sx={{ mb: 2, p: 2, borderRadius: '12px', bgcolor: alpha(theme.palette.background.default, 0.5) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: alpha(theme.palette.text.primary, 0.7), textDecoration: 'line-through' }}>
              Read Chapter 3
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RadioButtonUncheckedIcon sx={{ mr: 1, fontSize: 20, color: theme.palette.text.secondary }} />
            <Typography variant="body2">
              Complete practice problems
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StudyPlanCard;
