import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  LinearProgress,
  alpha,
  Card,
  Collapse,
  IconButton,
  useTheme,
  Divider,
  Stack,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion } from 'framer-motion';

// Sample question data
const sampleQuizData = {
  id: '1',
  title: 'Physics - Newton\'s Laws of Motion',
  description: 'Test your knowledge of Newton\'s laws and mechanics',
  questions: [
    {
      id: 1,
      question: 'What is Newton\'s First Law of Motion?',
      options: [
        { id: 'A', text: 'An object in motion stays in motion unless acted upon by an external force.' },
        { id: 'B', text: 'Force equals mass times acceleration.' },
        { id: 'C', text: 'For every action, there is an equal and opposite reaction.' },
        { id: 'D', text: 'Momentum is conserved in a closed system.' }
      ],
      correctOption: 'A',
      hint: 'This law is also known as the law of inertia.'
    },
    {
      id: 2,
      question: 'What does F = ma represent?',
      options: [
        { id: 'A', text: 'Newton\'s First Law' },
        { id: 'B', text: 'Newton\'s Second Law' },
        { id: 'C', text: 'Newton\'s Third Law' },
        { id: 'D', text: 'Law of Conservation of Energy' }
      ],
      correctOption: 'B',
      hint: 'This equation relates force to mass and acceleration.'
    },
    {
      id: 3,
      question: 'When a ball bounces off a wall, which law is most directly demonstrated?',
      options: [
        { id: 'A', text: 'Law of Conservation of Energy' },
        { id: 'B', text: 'Newton\'s First Law' },
        { id: 'C', text: 'Newton\'s Second Law' },
        { id: 'D', text: 'Newton\'s Third Law' }
      ],
      correctOption: 'D',
      hint: 'Think about the interaction between the ball and the wall as a pair of forces.'
    },
    {
      id: 4,
      question: 'What happens to acceleration when force increases but mass remains constant?',
      options: [
        { id: 'A', text: 'Acceleration decreases' },
        { id: 'B', text: 'Acceleration increases' },
        { id: 'C', text: 'Acceleration remains the same' },
        { id: 'D', text: 'Acceleration becomes zero' }
      ],
      correctOption: 'B',
      hint: 'Look at the relationship in F = ma.'
    },
    {
      id: 5,
      question: 'Which quantity is a vector?',
      options: [
        { id: 'A', text: 'Mass' },
        { id: 'B', text: 'Speed' },
        { id: 'C', text: 'Velocity' },
        { id: 'D', text: 'Time' }
      ],
      correctOption: 'C',
      hint: 'Vectors have both magnitude and direction.'
    }
  ]
};

interface QuestionState {
  selectedOption: string | null;
  submitted: boolean;
  isCorrect: boolean;
}

const QuizPage: React.FC = () => {
  const theme = useTheme();
  const { testId } = useParams<{ testId: string }>();
  const [quizData, setQuizData] = useState(sampleQuizData);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [questionsState, setQuestionsState] = useState<{
    [key: number]: QuestionState;
  }>({});

  // Initialize question states
  useEffect(() => {
    resetQuiz();
  }, [quizData]);

  // Calculate quiz statistics
  const calculateQuizStats = () => {
    const totalQuestions = quizData.questions.length;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const state = questionsState[i];
      if (state?.submitted) {
        if (state.isCorrect) {
          correct++;
        } else {
          incorrect++;
        }
      } else {
        skipped++;
      }
    }

    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

    return {
      totalQuestions,
      correct,
      incorrect,
      skipped,
      accuracy
    };
  };

  // Reset the entire quiz
  const resetQuiz = () => {
    const initialState = quizData.questions.reduce((acc, question, index) => {
      acc[index] = {
        selectedOption: null,
        submitted: false,
        isCorrect: false
      };
      return acc;
    }, {} as { [key: number]: QuestionState });
    
    setQuestionsState(initialState);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setShowHint(false);
    setQuizCompleted(false);
  };

  // Current question from the array
  const currentQuestion = quizData.questions[currentQuestionIndex];

  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    if (!questionsState[currentQuestionIndex]?.submitted) {
      setSelectedOption(optionId);
    }
  };

  // Handle submit answer
  const handleSubmit = () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentQuestion.correctOption;
    
    setQuestionsState(prevState => ({
      ...prevState,
      [currentQuestionIndex]: {
        selectedOption,
        submitted: true,
        isCorrect
      }
    }));
    
    setSubmitted(true);
  };

  // Navigate to previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      navigateToQuestion(currentQuestionIndex - 1);
    }
  };

  // Navigate to next question
  const handleNextQuestion = () => {
    // Check if this is the last question
    if (currentQuestionIndex >= quizData.questions.length - 1) {
      setQuizCompleted(true);
    } else {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  // Navigate to specific question and restore its state
  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowHint(false);
    
    // Restore the state for the question we're navigating to
    const questionState = questionsState[index];
    if (questionState) {
      setSelectedOption(questionState.selectedOption);
      setSubmitted(questionState.submitted);
    } else {
      setSelectedOption(null);
      setSubmitted(false);
    }
  };

  // Toggle hint visibility
  const toggleHint = () => {
    setShowHint(!showHint);
  };

  // Calculate progress
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  // Glassmorphism card style
  const glassCard = {
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
    borderRadius: '16px',
  };

  // Render the results screen
  const renderResultsScreen = () => {
    const stats = calculateQuizStats();
    
    return (
      <Paper 
        elevation={0}
        sx={{
          ...glassCard,
          p: 4,
          mb: 3,
          textAlign: 'center',
          maxWidth: 800,
          mx: 'auto'
        }}
      >
        <Box sx={{ mb: 4, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 30px ${alpha(theme.palette.warning.main, 0.3)}`
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 4 }}>
            Quiz Results
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            {quizData.title}
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{xs: 12, sm: 6}}>
            <Box sx={{ 
              p: 3, 
              bgcolor: alpha(theme.palette.primary.main, 0.05), 
              borderRadius: '16px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ position: 'relative', mb: 1 }}>
                <CircularProgress
                  variant="determinate"
                  value={stats.accuracy}
                  size={120}
                  thickness={5}
                  sx={{
                    color: theme.palette.primary.main,
                    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                    borderRadius: '50%'
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h3" fontWeight={700}>
                    {stats.accuracy}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Overall Accuracy
              </Typography>
            </Box>
          </Grid>
          <Grid size={{xs: 12, sm: 6}}>
            <Stack spacing={2} sx={{ height: '100%', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Total Questions:</Typography>
                <Typography variant="h6" fontWeight={600}>{stats.totalQuestions}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="body1">Correct Answers:</Typography>
                </Box>
                <Typography variant="h6" fontWeight={600} color="success.main">{stats.correct}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CancelIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="body1">Incorrect Answers:</Typography>
                </Box>
                <Typography variant="h6" fontWeight={600} color="error.main">{stats.incorrect}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningAmberIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="body1">Skipped Questions:</Typography>
                </Box>
                <Typography variant="h6" fontWeight={600} color="warning.main">{stats.skipped}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Button 
          variant="contained" 
          color="primary"
          startIcon={<ReplayIcon />}
          onClick={resetQuiz}
          sx={{ 
            px: 4, 
            py: 1.5, 
            borderRadius: '12px', 
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
            }
          }}
        >
          Try Another Attempt
        </Button>
      </Paper>
    );
  };

  // Render the quiz screen
  const renderQuizScreen = () => (
    <>
      {/* Top Section with Title and Progress */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" fontWeight={700}>
            {quizData.title}
          </Typography>
          <Typography variant="h6" fontWeight={600} color="primary">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            mb: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              bgcolor: theme.palette.primary.main,
              borderRadius: 5
            }
          }} 
        />
      </Box>

      {/* Question Card */}
      <Paper 
        elevation={0} 
        sx={{ 
          ...glassCard, 
          p: 4, 
          mb: 3,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Typography variant="h5" fontWeight={600} mb={4}>
          {currentQuestion.question}
        </Typography>

        {/* Options Grid */}
        <Grid container spacing={3}>
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = option.id === currentQuestion.correctOption;
            const showAsCorrect = submitted && isCorrect;
            const showAsIncorrect = submitted && isSelected && !isCorrect;
            
            return (
              <Grid key={option.id} size={{xs:12, sm:6}}>
                <Card
                  component={motion.div}
                  whileHover={!submitted ? { scale: 1.02 } : {}}
                  onClick={() => handleOptionSelect(option.id)}
                  sx={{
                    p: 2,
                    cursor: submitted ? 'default' : 'pointer',
                    border: `2px solid ${
                      showAsCorrect 
                        ? theme.palette.success.main 
                        : showAsIncorrect
                          ? theme.palette.error.main
                          : isSelected
                            ? theme.palette.primary.main
                            : 'transparent'
                    }`,
                    bgcolor: showAsCorrect 
                      ? alpha(theme.palette.success.main, 0.1)
                      : showAsIncorrect
                        ? alpha(theme.palette.error.main, 0.1)
                        : 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: !submitted 
                        ? alpha(theme.palette.primary.main, 0.05)
                        : showAsCorrect 
                          ? alpha(theme.palette.success.main, 0.1)
                          : showAsIncorrect
                            ? alpha(theme.palette.error.main, 0.1)
                            : 'background.paper',
                    },
                    boxShadow: isSelected && !submitted 
                      ? `0 0 0 2px ${theme.palette.primary.main}`
                      : showAsCorrect
                        ? `0 0 10px ${alpha(theme.palette.success.main, 0.4)}`
                        : showAsIncorrect
                          ? `0 0 10px ${alpha(theme.palette.error.main, 0.4)}`
                          : 'none',
                    position: 'relative',
                    borderRadius: '12px'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main
                      }}
                    >
                      {option.id}
                    </Box>
                    
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      {option.text}
                    </Typography>
                    
                    {showAsCorrect && (
                      <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                    )}
                    {showAsIncorrect && (
                      <CancelIcon color="error" sx={{ ml: 1 }} />
                    )}
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Hint Section */}
        <Collapse in={showHint}>
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              bgcolor: alpha(theme.palette.info.main, 0.1),
              borderRadius: '12px',
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
            }}
          >
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
              <LightbulbOutlinedIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />
              <strong>Hint:</strong> {currentQuestion.hint}
            </Typography>
          </Box>
        </Collapse>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Button 
            variant="outlined" 
            onClick={toggleHint}
            startIcon={<LightbulbOutlinedIcon />}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
        </Box>
        
        <Box>
          {!submitted ? (
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSubmit}
              disabled={!selectedOption}
              sx={{ 
                borderRadius: '8px', 
                px: 3,
                textTransform: 'none',
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
              }}
            >
              Submit Answer
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleNextQuestion}
              sx={{ 
                borderRadius: '8px', 
                px: 3,
                textTransform: 'none',
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
              }}
            >
              {currentQuestionIndex >= quizData.questions.length - 1 ? 'See Results' : 'Next Question'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <IconButton 
          onClick={handlePrevQuestion} 
          disabled={currentQuestionIndex === 0}
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.1), 
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
            '&.Mui-disabled': { bgcolor: alpha(theme.palette.action.disabled, 0.1) }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <IconButton 
          onClick={handleNextQuestion} 
          disabled={!submitted || currentQuestionIndex === quizData.questions.length - 1}
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.1), 
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
            '&.Mui-disabled': { bgcolor: alpha(theme.palette.action.disabled, 0.1) }
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>
    </>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {quizCompleted ? renderResultsScreen() : renderQuizScreen()}
    </Box>
  );
};

export default QuizPage;