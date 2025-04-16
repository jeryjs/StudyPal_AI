import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tab, 
  Tabs, 
  Card, 
  CardContent, 
  Grid, 
  Button, 
  Chip,
  Avatar,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Stack,
  CircularProgress,
  Tooltip,
  Badge,
  LinearProgress
} from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import StyleIcon from '@mui/icons-material/Style';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimerIcon from '@mui/icons-material/Timer';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SchoolIcon from '@mui/icons-material/School';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PushPinIcon from '@mui/icons-material/PushPin';
import ReplayIcon from '@mui/icons-material/Replay';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

// Tab Panel Component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`learn-tabpanel-${index}`}
      aria-labelledby={`learn-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Dummy data for the components
const subjects = [
  { id: 1, name: 'Mathematics', icon: '📐', color: '#F06292', progress: 75, streak: 5 },
  { id: 2, name: 'Physics', icon: '🔭', color: '#64B5F6', progress: 60, streak: 3 },
  { id: 3, name: 'Computer Science', icon: '💻', color: '#81C784', progress: 85, streak: 7 },
  { id: 4, name: 'History', icon: '📜', color: '#FFB74D', progress: 30, streak: 2 },
];

const tests = [
  { id: 1, title: 'Algebra Basics', time: '15 mins', questions: 10, difficulty: 'Medium', subject: 'Mathematics' },
  { id: 2, title: 'Newton\'s Laws', time: '20 mins', questions: 15, difficulty: 'Hard', subject: 'Physics' },
  { id: 3, title: 'Data Structures', time: '25 mins', questions: 12, difficulty: 'Hard', subject: 'Computer Science' },
];

const flashcards = [
  { 
    id: 1, 
    front: 'What is a function?', 
    back: 'A relation between inputs and outputs where each input is related to exactly one output.', 
    subject: 'Mathematics',
    confidence: 'medium',
    bookmarked: true
  },
  { 
    id: 2, 
    front: 'What is Newton\'s First Law?', 
    back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.', 
    subject: 'Physics',
    confidence: 'high',
    bookmarked: false
  },
  { 
    id: 3, 
    front: 'What is Big O Notation?', 
    back: 'A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity.', 
    subject: 'Computer Science',
    confidence: 'low',
    bookmarked: true
  },
];

const concepts = [
  { id: 1, title: 'Quadratic Equations', description: 'Understanding the basics of quadratic equations and their solutions.', subject: 'Mathematics', resources: 3 },
  { id: 2, title: 'Thermodynamics', description: 'The branch of physics that deals with heat, work, and temperature.', subject: 'Physics', resources: 5 },
  { id: 3, title: 'Object-Oriented Programming', description: 'Programming paradigm based on the concept of objects.', subject: 'Computer Science', resources: 8 },
];

const studyPlans = [
  { id: 1, title: 'Calculus Mastery', subject: 'Mathematics', progress: 65, tasks: 12, completed: 8 },
  { id: 2, title: 'Quantum Physics', subject: 'Physics', progress: 40, tasks: 10, completed: 4 },
  { id: 3, title: 'Algorithm Design', subject: 'Computer Science', progress: 80, tasks: 15, completed: 12 },
];

const quickReviews = [
  { id: 1, icon: '📌', title: 'Review Newton\'s Laws', description: 'Last studied 7 days ago', subject: 'Physics', priority: 'high' },
  { id: 2, icon: '🔁', title: 'Revise Algebra Basics', description: 'Struggled with this last time', subject: 'Mathematics', priority: 'medium' },
  { id: 3, icon: '⏳', title: 'Continue Data Structures', description: 'You\'re 75% through this concept', subject: 'Computer Science', priority: 'low' },
];

const LearnPage: React.FC = () => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  
  // User stats
  const userLevel = 12;
  const userXP = 2480;
  const nextLevelXP = 3000;
  const userStreak = 8;

  // Get subject color by name
  const getSubjectColor = (subjectName: string) => {
    const subject = subjects.find(s => s.name === subjectName);
    return subject ? subject.color : theme.palette.primary.main;
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Handle card flip
  const handleCardFlip = (cardId: number) => {
    setFlippedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId) 
        : [...prev, cardId]
    );
  };

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

  // Get confidence icon
  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'low':
        return <SentimentNeutralIcon color="warning" />;
      case 'medium':
        return <SentimentSatisfiedAltIcon sx={{ color: theme.palette.info.main }} />;
      case 'high':
        return <SentimentVerySatisfiedIcon color="success" />;
      default:
        return <SentimentNeutralIcon color="warning" />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top Bar with Level and Streak */}
      <Paper 
        elevation={0} 
        sx={{ 
          ...neumorphicCard,
          mb: 3,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: `linear-gradient(120deg, ${alpha(theme.palette.background.paper, 0.7)}, ${alpha(theme.palette.background.paper, 0.4)})`
        }}
      >
        <Box display="flex" alignItems="center">
          <Avatar 
            sx={{ 
              width: 52, 
              height: 52, 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              mr: 2,
              p: 1
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              {userLevel}
            </Typography>
          </Avatar>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Level {userLevel}</Typography>
            <Box sx={{ width: 120, position: 'relative', mt: 0.5 }}>
              <LinearProgress 
                variant="determinate" 
                value={(userXP / nextLevelXP) * 100} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                  }
                }} 
              />
              <Typography variant="caption" sx={{ position: 'absolute', top: 10, left: 0 }}>
                {userXP}/{nextLevelXP} XP
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Tooltip title="Daily streak">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Badge 
                badgeContent={userStreak} 
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    fontWeight: 700, 
                    fontSize: '0.8rem',
                    width: 25,
                    height: 25,
                    borderRadius: '50%'
                  } 
                }}
              >
                <LocalFireDepartmentIcon 
                  sx={{ 
                    fontSize: 30, 
                    color: theme.palette.error.main 
                  }} 
                />
              </Badge>
            </Box>
          </Tooltip>

          <Tooltip title="Challenge mode">
            <IconButton 
              sx={{ 
                bgcolor: alpha(theme.palette.warning.main, 0.1), 
                color: theme.palette.warning.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.warning.main, 0.2),
                }
              }}
            >
              <SportsScoreIcon />
            </IconButton>
          </Tooltip>

          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<PsychologyIcon />}
            sx={{
              ...glowButton,
              ml: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.9),
            }}
          >
            AI Quick Test
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Learn
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AutoAwesomeIcon />}
          sx={glowButton}
        >
          Create New
        </Button>
      </Box>

      {/* Study Progress - Circular Rings */}
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
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Your Study Progress</Typography>
          <Chip 
            icon={<CalendarTodayIcon />} 
            label="This Week" 
            variant="filled" 
            sx={{ 
              fontWeight: 500, 
              borderRadius: '12px',
              background: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              px: 1
            }} 
          />
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 1 }}>
          {subjects.map((subject) => (
            <Grid key={subject.id} size = {{xs:12, sm:6, md:3}}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  p: 2,
                  borderRadius: '16px',
                  background: alpha(theme.palette.background.paper, 0.5),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(subject.color, 0.2)}`,
                  boxShadow: `0 10px 30px ${alpha(subject.color, 0.1)}`
                }}
              >
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={100} 
                    size={100} 
                    thickness={4}
                    sx={{ 
                      color: alpha(subject.color, 0.15),
                      position: 'absolute',
                    }} 
                  />
                  <CircularProgress 
                    variant="determinate" 
                    value={subject.progress} 
                    size={100} 
                    thickness={4}
                    sx={{ 
                      color: subject.color,
                      position: 'absolute',
                    }} 
                  />
                  <Avatar 
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      bgcolor: alpha(subject.color, 0.15), 
                      color: subject.color,
                      fontSize: '1.7rem',
                      fontWeight: 'bold',
                      boxShadow: `0 4px 20px ${alpha(subject.color, 0.3)}`
                    }}
                  >
                    {subject.icon}
                  </Avatar>
                </Box>
                
                <Typography variant="h6" fontWeight={600} mb={0.5}>{subject.name}</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h5" fontWeight={700} color={subject.color}>{subject.progress}%</Typography>
                </Box>
                
                <Chip 
                  icon={<LocalFireDepartmentIcon fontSize="small" />} 
                  label={`${subject.streak} day streak`}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(subject.color, 0.15), 
                    color: subject.color,
                    fontWeight: 500,
                    borderRadius: '10px'
                  }} 
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      {/* Quick Review Section */}
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
            <EmojiEventsIcon sx={{ color: theme.palette.warning.main, mr: 1, fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>Smart Suggestions</Typography>
          </Box>
          <Button 
            variant="text" 
            color="primary"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            View All
          </Button>
        </Box>
        
        <Grid container spacing={3}>
          {quickReviews.map((review) => {
            const iconComponent = review.icon === '📌' 
              ? <PushPinIcon /> 
              : review.icon === '🔁' 
                ? <ReplayIcon />
                : <HourglassEmptyIcon />;
                
            const priorityColor = review.priority === 'high' 
              ? theme.palette.error.main 
              : review.priority === 'medium' 
                ? theme.palette.warning.main 
                : theme.palette.info.main;
                
            return (
              <Grid key={review.id} size = {{xs:12, sm:6, md:4}}>
                <Card sx={{
                  ...neumorphicCard,
                  border: `1px solid ${alpha(getSubjectColor(review.subject), 0.2)}`,
                  background: alpha(theme.palette.background.paper, 0.5),
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip 
                        label={review.subject} 
                        size="small" 
                        sx={{ 
                          bgcolor: alpha(getSubjectColor(review.subject), 0.15), 
                          color: getSubjectColor(review.subject),
                          fontWeight: 500,
                          borderRadius: '10px'
                        }} 
                      />
                      <Box 
                        sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: priorityColor,
                          boxShadow: `0 0 8px ${priorityColor}`
                        }} 
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: alpha(priorityColor, 0.15), 
                          color: priorityColor,
                          mr: 2
                        }}
                      >
                        {iconComponent}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>{review.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{review.description}</Typography>
                      </Box>
                    </Box>
                    
                    <Button 
                      fullWidth 
                      variant="outlined"
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: alpha(priorityColor, 0.5),
                        color: priorityColor,
                        '&:hover': {
                          borderColor: priorityColor,
                          background: alpha(priorityColor, 0.05)
                        }
                      }}
                    >
                      Start Review
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Main Tabs Section */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            ...neumorphicCard,
            mb: 2,
            p: 0.5,
            background: alpha(theme.palette.background.paper, 0.7)
          }}
        >
          <Tabs 
            value={tabIndex} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 60,
                color: alpha(theme.palette.text.primary, 0.7),
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
              }
            }}
          >
            <Tab 
              icon={<QuizIcon />} 
              label="Tests" 
              iconPosition="start" 
              sx={{
                borderRadius: '12px',
                '&.Mui-selected': {
                  background: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            />
            <Tab 
              icon={<StyleIcon />} 
              label="Flashcards" 
              iconPosition="start"
              sx={{
                borderRadius: '12px',
                '&.Mui-selected': {
                  background: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            />
            <Tab 
              icon={<LightbulbIcon />} 
              label="Concepts" 
              iconPosition="start"
              sx={{
                borderRadius: '12px',
                '&.Mui-selected': {
                  background: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            />
            <Tab 
              icon={<SchoolIcon />} 
              label="Study Plans" 
              iconPosition="start"
              sx={{
                borderRadius: '12px',
                '&.Mui-selected': {
                  background: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            />
          </Tabs>
        </Paper>

        {/* Tests Tab */}
        <TabPanel value={tabIndex} index={0}>
          <Grid container spacing={3}>
            {tests.map((test) => (
              <Grid key={test.id} size = {{xs:12, sm:6, md:4}}>
                <Card sx={{
                  ...neumorphicCard,
                  border: `1px solid ${alpha(getSubjectColor(test.subject), 0.2)}`,
                  background: alpha(theme.palette.background.paper, 0.5),
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {test.title}
                      </Typography>
                      <IconButton size="small">
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Chip 
                      label={test.subject} 
                      size="small" 
                      sx={{ 
                        bgcolor: alpha(getSubjectColor(test.subject), 0.15), 
                        color: getSubjectColor(test.subject),
                        fontWeight: 500,
                        mb: 2,
                        borderRadius: '10px'
                      }} 
                    />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TimerIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">{test.time}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <QuizIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">{test.questions} Questions</Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Difficulty:</Typography>
                      <Chip 
                        label={test.difficulty} 
                        size="small" 
                        sx={{ 
                          ml: 1, 
                          borderRadius: '10px',
                          bgcolor: test.difficulty === 'Easy' 
                            ? alpha(theme.palette.success.main, 0.15) 
                            : test.difficulty === 'Medium'
                              ? alpha(theme.palette.warning.main, 0.15)
                              : alpha(theme.palette.error.main, 0.15),
                          color: test.difficulty === 'Easy' 
                            ? theme.palette.success.main 
                            : test.difficulty === 'Medium'
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
              </Grid>
            ))}
            <Grid size = {{xs:12, sm:6, md:4}}>
              <Card sx={{ 
                ...neumorphicCard,
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: alpha(theme.palette.background.paper, 0.3),
                minHeight: 280
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.2)})`,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                      mb: 2,
                      mx: 'auto'
                    }}
                  >
                    <AddIcon 
                      sx={{ 
                        fontSize: 40, 
                        color: theme.palette.primary.main 
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    Create New Test
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate custom tests with AI
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Flashcards Tab */}
        <TabPanel value={tabIndex} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>My Flashcards</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<ShuffleIcon />}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Shuffle All
            </Button>
          </Box>
          
          <Grid container spacing={3}>
            {flashcards.map((card) => {
              const isFlipped = flippedCards.includes(card.id);
              
              return (
                <Grid key={card.id} size = {{xs:12, sm:6, md:4}}>
                  <Card 
                    sx={{
                      ...neumorphicCard,
                      background: alpha(theme.palette.background.paper, 0.5),
                      border: `1px solid ${alpha(getSubjectColor(card.subject), 0.2)}`,
                      minHeight: 250,
                      perspective: '1000px', // For 3D effect
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.6s',
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                    onClick={() => handleCardFlip(card.id)}
                  >
                    {/* Front of card */}
                    <CardContent 
                      sx={{ 
                        backfaceVisibility: 'hidden',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: isFlipped ? 'none' : 'block',
                        p: 3
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Chip 
                          label={card.subject} 
                          size="small" 
                          sx={{ 
                            bgcolor: alpha(getSubjectColor(card.subject), 0.15), 
                            color: getSubjectColor(card.subject),
                            fontWeight: 500,
                            mb: 2,
                            borderRadius: '10px'
                          }} 
                        />
                        <IconButton size="small">
                          {card.bookmarked ? 
                            <BookmarkIcon color="primary" /> : 
                            <BookmarkBorderIcon />
                          }
                        </IconButton>
                      </Box>
                      
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          mb: 2, 
                          fontWeight: 500, 
                          fontSize: '1.1rem',
                          height: 120,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {card.front}
                      </Typography>
                      
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          mt: 2
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Tap to flip
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    {/* Back of card */}
                    <CardContent 
                      sx={{ 
                        backfaceVisibility: 'hidden',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        transform: 'rotateY(180deg)',
                        display: isFlipped ? 'block' : 'none',
                        p: 3,
                        bgcolor: alpha(getSubjectColor(card.subject), 0.05)
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          mb: 3, 
                          fontWeight: 500,
                          height: 150,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center'
                        }}
                      >
                        {card.back}
                      </Typography>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Typography variant="body2" mr={2}>Rate your confidence:</Typography>
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" color="warning">
                            <SentimentNeutralIcon />
                          </IconButton>
                          <IconButton size="small" color="info">
                            <SentimentSatisfiedAltIcon />
                          </IconButton>
                          <IconButton size="small" color="success">
                            <SentimentVerySatisfiedIcon />
                          </IconButton>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            <Grid size = {{xs:12, sm:6, md:4}}>
              <Card sx={{ 
                ...neumorphicCard,
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: alpha(theme.palette.background.paper, 0.3),
                minHeight: 250
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.2)})`,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                      mb: 2,
                      mx: 'auto'
                    }}
                  >
                    <AddIcon 
                      sx={{ 
                        fontSize: 40, 
                        color: theme.palette.primary.main 
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    Create Flashcards
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate flashcards with AI or manually
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Concepts Tab */}
        <TabPanel value={tabIndex} index={2}>
          <Grid container spacing={3}>
            {concepts.map((concept) => (
              <Grid key={concept.id} size = {{xs:12, sm:6, md:4}}>
                <Card sx={{
                  ...neumorphicCard,
                  background: alpha(theme.palette.background.paper, 0.5),
                  border: `1px solid ${alpha(getSubjectColor(concept.subject), 0.2)}`,
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Chip 
                        label={concept.subject} 
                        size="small" 
                        sx={{ 
                          bgcolor: alpha(getSubjectColor(concept.subject), 0.15), 
                          color: getSubjectColor(concept.subject),
                          fontWeight: 500,
                          borderRadius: '10px'
                        }} 
                      />
                      <IconButton size="small">
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {concept.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {concept.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip 
                        icon={<LightbulbIcon />} 
                        label={`${concept.resources} Resources`} 
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.info.main, 0.1), 
                          color: theme.palette.info.main,
                          borderRadius: '10px'
                        }}
                      />
                      <Button 
                        variant="text" 
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 600, textTransform: 'none' }}
                      >
                        Explore
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size= {{xs:12, sm:6, md:4}}>
              <Card sx={{ 
                ...neumorphicCard,
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: alpha(theme.palette.background.paper, 0.3),
                minHeight: 200
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.2)})`,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                      mb: 2,
                      mx: 'auto'
                    }}
                  >
                    <AddIcon 
                      sx={{ 
                        fontSize: 40, 
                        color: theme.palette.primary.main 
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    Add Concept
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create and organize learning materials
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Study Plans Tab */}
        <TabPanel value={tabIndex} index={3}>
          <Grid container spacing={3}>
            {studyPlans.map((plan) => (
              <Grid key={plan.id} size = {{xs:12, md:6}}>
                <Card sx={{
                  ...neumorphicCard,
                  background: alpha(theme.palette.background.paper, 0.5),
                  border: `1px solid ${alpha(getSubjectColor(plan.subject), 0.2)}`,
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {plan.title}
                        </Typography>
                        <Chip 
                          label={plan.subject} 
                          size="small" 
                          sx={{ 
                            mt: 0.5,
                            bgcolor: alpha(getSubjectColor(plan.subject), 0.15), 
                            color: getSubjectColor(plan.subject),
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
                        <Typography variant="body2" fontWeight={500}>{plan.progress}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={plan.progress} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          bgcolor: alpha(getSubjectColor(plan.subject), 0.15),
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(90deg, ${getSubjectColor(plan.subject)}, ${alpha(getSubjectColor(plan.subject), 0.7)})`,
                            borderRadius: 5,
                          }
                        }} 
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {plan.completed} of {plan.tasks} tasks completed
                      </Typography>
                    </Box>
                    
                    {/* Sample Tasks */}
                    <Box 
                      sx={{ 
                        mb: 2, 
                        p: 2, 
                        borderRadius: '12px', 
                        bgcolor: alpha(theme.palette.background.default, 0.5)
                      }}
                    >
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
                    
                    <Button 
                      fullWidth 
                      variant="contained" 
                      sx={glowButton}
                    >
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid  size= {{xs:12, md:4}}>
              <Card sx={{ 
                ...neumorphicCard,
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: alpha(theme.palette.background.paper, 0.3),
                minHeight: 300
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.2)})`,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                      mb: 2,
                      mx: 'auto'
                    }}
                  >
                    <AddIcon 
                      sx={{ 
                        fontSize: 40, 
                        color: theme.palette.primary.main 
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    Create Study Plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Build a structured learning path
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default LearnPage;