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
  LinearProgress
} from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import StyleIcon from '@mui/icons-material/Style';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimerIcon from '@mui/icons-material/Timer';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SchoolIcon from '@mui/icons-material/School';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

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
  { id: 1, name: 'Mathematics', icon: '📐', color: '#F06292', progress: 75 },
  { id: 2, name: 'Physics', icon: '🔭', color: '#64B5F6', progress: 60 },
  { id: 3, name: 'Computer Science', icon: '💻', color: '#81C784', progress: 85 },
  { id: 4, name: 'History', icon: '📜', color: '#FFB74D', progress: 30 },
];

const tests = [
  { id: 1, title: 'Algebra Basics', time: '15 mins', questions: 10, difficulty: 'Medium', subject: 'Mathematics' },
  { id: 2, title: 'Newton\'s Laws', time: '20 mins', questions: 15, difficulty: 'Hard', subject: 'Physics' },
  { id: 3, title: 'Data Structures', time: '25 mins', questions: 12, difficulty: 'Hard', subject: 'Computer Science' },
];

const flashcards = [
  { id: 1, front: 'What is a function?', back: 'A relation between inputs and outputs where each input is related to exactly one output.', subject: 'Mathematics' },
  { id: 2, title: 'Newton\'s First Law', front: 'What is Newton\'s First Law?', back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.', subject: 'Physics' },
  { id: 3, title: 'What is Big O Notation?', front: 'What is Big O Notation?', back: 'A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity.', subject: 'Computer Science' },
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

const LearnPage: React.FC = () => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);

  // Get subject color by name
  const getSubjectColor = (subjectName: string) => {
    const subject = subjects.find(s => s.name === subjectName);
    return subject ? subject.color : theme.palette.primary.main;
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Glassmorphism style for cards
  const glassCard = {
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
    borderRadius: '16px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: `0 12px 40px 0 ${alpha(theme.palette.common.black, 0.15)}`,
    }
  };

  // Pill button style
  const pillButton = {
    borderRadius: '20px',
    textTransform: 'none',
    px: 2.5,
    py: 1,
    fontWeight: 600,
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Learn
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          sx={pillButton}
        >
          Create New
        </Button>
      </Box>

      {/* Study Plan Overview - Top Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          ...glassCard, 
          p: 3, 
          mb: 4, 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Your Study Progress</Typography>
          <Chip 
            icon={<CalendarTodayIcon />} 
            label="This Week" 
            variant="filled" 
            color="primary"
            sx={{ 
              fontWeight: 500, 
              borderRadius: '12px',
              background: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main
            }} 
          />
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 2 }}>
          {subjects.map((subject) => (
            <Grid key={subject.id} size={{xs:12, sm:6, md:3}}>
              <Card sx={{ 
                ...glassCard, 
                background: alpha(theme.palette.background.paper, 0.5),
                border: `1px solid ${alpha(subject.color, 0.3)}`,
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: alpha(subject.color, 0.2), color: subject.color, mr: 1.5 }}>
                      {subject.icon}
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{subject.name}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={subject.progress} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: alpha(subject.color, 0.2),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: subject.color
                      }
                    }} 
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">Progress</Typography>
                    <Typography variant="body2" fontWeight={500}>{subject.progress}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Main Tabs Section */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabIndex} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minWidth: 100,
              }
            }}
          >
            <Tab icon={<QuizIcon />} label="Tests" iconPosition="start" />
            <Tab icon={<StyleIcon />} label="Flashcards" iconPosition="start" />
            <Tab icon={<LightbulbIcon />} label="Concepts" iconPosition="start" />
            <Tab icon={<SchoolIcon />} label="Study Plans" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tests Tab */}
        <TabPanel value={tabIndex} index={0}>
          <Grid container spacing={3}>
            {tests.map((test) => (
              <Grid key={test.id} size = {{xs:12, sm:6, md:4}}>
                <Card sx={glassCard}>
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
                        mb: 2
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
                      color="primary" 
                      startIcon={<PlayArrowIcon />}
                      sx={pillButton}
                    >
                      Start Test
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size = {{xs:12, sm:6, md:4}}>
              <Card sx={{ 
                ...glassCard, 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: 'transparent'
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconButton 
                    sx={{ 
                      mb: 1, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      }
                    }}
                  >
                    <AddIcon fontSize="large" />
                  </IconButton>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
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
          <Grid container spacing={3}>
            {flashcards.map((card) => (
              <Grid key={card.id} size = {{xs:12, sm:6, md:4}}>
                <Card sx={glassCard}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Chip 
                        label={card.subject} 
                        size="small" 
                        sx={{ 
                          bgcolor: alpha(getSubjectColor(card.subject), 0.15), 
                          color: getSubjectColor(card.subject),
                          fontWeight: 500,
                          mb: 2
                        }} 
                      />
                      <IconButton size="small">
                        <BookmarkIcon color="primary" sx={{ opacity: 0.7 }} />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                      {card.front}
                    </Typography>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      Click to reveal answer
                    </Typography>
                    
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      color="primary" 
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 600
                      }}
                    >
                      Flip Card
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size = {{xs:12, sm:6, md:4}}>
              <Card sx={{ 
                ...glassCard, 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: 'transparent'
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconButton 
                    sx={{ 
                      mb: 1, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      }
                    }}
                  >
                    <AddIcon fontSize="large" />
                  </IconButton>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
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
                <Card sx={glassCard}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Chip 
                        label={concept.subject} 
                        size="small" 
                        sx={{ 
                          bgcolor: alpha(getSubjectColor(concept.subject), 0.15), 
                          color: getSubjectColor(concept.subject),
                          fontWeight: 500
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
                          color: theme.palette.info.main
                        }}
                      />
                      <Button 
                        variant="text" 
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      >
                        Explore
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size = {{xs:12, sm:6, md:4}}>
              <Card sx={{ 
                ...glassCard, 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: 'transparent'
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconButton 
                    sx={{ 
                      mb: 1, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      }
                    }}
                  >
                    <AddIcon fontSize="large" />
                  </IconButton>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
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
                <Card sx={glassCard}>
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
                            fontWeight: 500
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
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: alpha(getSubjectColor(plan.subject), 0.15),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getSubjectColor(plan.subject)
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
                    <Box sx={{ mb: 2 }}>
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
                      color="primary" 
                      sx={pillButton}
                    >
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size={{xs:12, md:6}}>
              <Card sx={{ 
                ...glassCard, 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: 'transparent'
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconButton 
                    sx={{ 
                      mb: 1, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      }
                    }}
                  >
                    <AddIcon fontSize="large" />
                  </IconButton>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
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