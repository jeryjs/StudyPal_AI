import React from 'react';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Typography,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TimerIcon from '@mui/icons-material/Timer';
import QuizIcon from '@mui/icons-material/Quiz';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface TestCardProps {
  id: number;
  title: string;
  time: string;
  questions: number;
  difficulty: string;
  subject: string;
  subjectColor: string;
}

const TestCard: React.FC<TestCardProps> = ({ 
  id, 
  title, 
  time, 
  questions, 
  difficulty, 
  subject, 
  subjectColor 
}) => {
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

  // Glowing button style
  const glowButton = {
    borderRadius: '12px',
    textTransform: 'none',
    fontWeight: 600,
    letterSpacing: '0.5px',
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
    transition: 'all 0.3s ease',
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
    '&:hover': {
      boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.7)}`,
      transform: 'translateY(-2px)'
    }
  };

  return (
    <Card sx={{
      ...neumorphicCard,
      border: `1px solid ${alpha(subjectColor, 0.2)}`,
      background: alpha(theme.palette.background.paper, 0.5),
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {title}
          </Typography>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Chip
          label={subject}
          size="small"
          sx={{
            bgcolor: alpha(subjectColor, 0.15),
            color: subjectColor,
            fontWeight: 500,
            mb: 2,
            borderRadius: '10px'
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimerIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">{time}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuizIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">{questions} Questions</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Difficulty:</Typography>
          <Chip
            label={difficulty}
            size="small"
            sx={{
              ml: 1,
              borderRadius: '10px',
              bgcolor: difficulty === 'Easy'
                ? alpha(theme.palette.success.main, 0.15)
                : difficulty === 'Medium'
                  ? alpha(theme.palette.warning.main, 0.15)
                  : alpha(theme.palette.error.main, 0.15),
              color: difficulty === 'Easy'
                ? theme.palette.success.main
                : difficulty === 'Medium'
                  ? theme.palette.warning.main
                  : theme.palette.error.main,
              fontWeight: 500
            }}
          />
        </Box>

        <Button
          fullWidth
          variant="contained"
          startIcon={<PlayArrowIcon />}
          sx={glowButton}
        >
          Start Test
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestCard;
