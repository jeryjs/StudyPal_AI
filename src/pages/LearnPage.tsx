import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Tab, Tabs,
  Typography,
  useTheme,
  keyframes
} from '@mui/material';
import React, { useState } from 'react';

// Import Icons
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PushPinIcon from '@mui/icons-material/PushPin';
import QuizIcon from '@mui/icons-material/Quiz';
import ReplayIcon from '@mui/icons-material/Replay';
import SchoolIcon from '@mui/icons-material/School';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import InsightsIcon from '@mui/icons-material/Insights';
import HiveIcon from '@mui/icons-material/Hive';

import ConceptCard from '@components/learn/ConceptCard';
import SectionContainer from '@components/learn/SectionContainer';
import StudyPlanCard from '@components/learn/StudyPlanCard';
import StudyProgressCard from '@components/learn/StudyProgressCard';
import TabPanel from '@components/learn/TabPanel';
import TestCard from '@components/learn/TestCard';

// Tab Panel Component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type Subject = {
  id: number;
  name: string;
  icon: string;
  color: string;
  progress: number;
};

const subjects: Subject[] = [
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

// Define animations for bees
const flyAnimation1 = keyframes`
  0% { transform: translate(0, 0) rotate(10deg); }
  25% { transform: translate(10px, -5px) rotate(0deg); }
  50% { transform: translate(5px, 5px) rotate(-10deg); }
  75% { transform: translate(-5px, 0px) rotate(0deg); }
  100% { transform: translate(0, 0) rotate(10deg); }
`;

const flyAnimation2 = keyframes`
  0% { transform: translate(0, 0) rotate(-5deg); }
  30% { transform: translate(-8px, 8px) rotate(5deg); }
  60% { transform: translate(8px, -8px) rotate(-5deg); }
  100% { transform: translate(0, 0) rotate(-5deg); }
`;

const LearnPage: React.FC = () => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(parseInt(localStorage.getItem("learnTabIndex") || '0'));

  // Get subject color by name
  const getSubjectColor = (subjectName: string) => {
    const subject = subjects.find(s => s.name === subjectName);
    return subject ? subject.color : theme.palette.primary.main;
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    localStorage.setItem("learnTabIndex", newValue.toString());
  };

  // Neumorphic style for cards - reduced foggy appearance
  const neumorphicCard = {
    background: alpha(theme.palette.background.paper, 0.9), // Increased opacity from 0.8 to 0.9
    backdropFilter: 'blur(8px)', // Reduced blur from 10px to 5px
    borderRadius: '16px',
    boxShadow: `
      8px 8px 16px ${alpha(theme.palette.common.black, 0.08)},
      -8px -8px 16px ${alpha(theme.palette.common.white, 0.03)}
    `,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: `
        12px 12px 20px ${alpha(theme.palette.common.black, 0.1)},
        -12px -12px 20px ${alpha(theme.palette.common.white, 0.05)}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ position: 'relative', mr: 2, width: 40, height: 40 }}>
            <HiveIcon 
              sx={{ 
                fontSize: 40, 
                color: theme.palette.warning.main,
                filter: 'drop-shadow(0 0 2px rgba(255, 160, 0, 0.5))'
              }} 
            />
            {/* Small bees */}
            <Box 
              sx={{ 
                position: 'absolute', 
                top: -5, 
                left: -5, 
                width: 12, 
                height: 12, 
                borderRadius: '50%',
                backgroundColor: '#FFC107',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 2,
                  backgroundColor: '#000',
                  borderRadius: 1,
                },
                animation: `${flyAnimation1} 4s infinite`
              }} 
            />
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 30, 
                left: 30, 
                width: 10, 
                height: 10, 
                borderRadius: '50%',
                backgroundColor: '#FFC107',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 6,
                  height: 2,
                  backgroundColor: '#000',
                  borderRadius: 1,
                },
                animation: `${flyAnimation2} 5s infinite`
              }} 
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Focus Hive
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          sx={glowButton}
        >
          Create Study Plan
        </Button>
      </Box>

      {/* Study Progress Section */}
      <SectionContainer title="Learning Insights" icon={<InsightsIcon />} actionButton={<Chip icon={<InsightsIcon />} label="This Week" variant="filled" sx={{ fontWeight: 500, borderRadius: '12px', background: alpha(theme.palette.primary.main, 0.15), color: theme.palette.primary.main, px: 1 }} />}>
        <Grid container spacing={3} sx={{ mb: 1 }}>
          {subjects.map((subject) => (
            <Grid key={subject.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <StudyProgressCard {...subject} />
            </Grid>
          ))}
        </Grid>
      </SectionContainer>

      {/* Quick Review Section */}
      <SectionContainer title="Smart Suggestions" icon={<EmojiEventsIcon sx={{ color: theme.palette.warning.main, fontSize: 28 }} />} actionButton={<Button variant="text" color="primary" sx={{ fontWeight: 600, textTransform: 'none' }}>View All</Button>}>
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
              <Grid key={review.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{
                  ...neumorphicCard,
                  border: `1px solid ${alpha(getSubjectColor(review.subject), 0.2)}`,
                  background: alpha(theme.palette.background.paper, 0.7),
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
      </SectionContainer>

      {/* Main Tabs Section */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            ...neumorphicCard,
            mb: 2,
            p: 0.5,
            background: alpha(theme.palette.background.paper, 0.8)
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
              <Grid key={test.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <TestCard {...test} subjectColor={getSubjectColor(test.subject)} />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{
                ...neumorphicCard,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                background: alpha(theme.palette.background.paper, 0.4),
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
                    <AddIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
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

        {/* Concepts Tab */}
        <TabPanel value={tabIndex} index={1}>
          <Grid container spacing={3}>
            {concepts.map((concept) => (
              <Grid key={concept.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ConceptCard {...concept} subjectColor={getSubjectColor(concept.subject)} />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                    <AddIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
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
        <TabPanel value={tabIndex} index={2}>
          <Grid container spacing={3}>
            {studyPlans.map((plan) => (
              <Grid key={plan.id} size={{ xs: 12, md: 6 }}>
                <StudyPlanCard {...plan} subjectColor={getSubjectColor(plan.subject)} />
              </Grid>
            ))}
            <Grid size={{ xs: 12, md: 4 }}>
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
                    <AddIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
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