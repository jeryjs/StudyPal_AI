import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Paper, Grid, IconButton, Chip, List, ListItem, ListItemIcon, ListItemText, Divider, useTheme, alpha, Card, CardContent, Button, styled } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { format } from 'date-fns';

// Styled Components
const StyledIconButton = styled(IconButton)(({ theme }) => ({
    marginRight: theme.spacing(0.5),
}));
const StyledCalendarDay = styled(Box)<{ isToday: boolean }>(({ theme, isToday }) => ({
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '100%', backgroundColor: isToday ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
    border: isToday ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
    cursor: 'pointer', '&:hover': { backgroundColor: !isToday ? alpha(theme.palette.action.hover, 0.5) : undefined },
}));
const StyledTypography = styled(Typography)<{ isToday: boolean }>(({ theme, isToday }) => ({
    fontWeight: isToday ? 600 : 400, color: isToday ? theme.palette.primary.main : 'text.primary',
}));
const StyledListItem = styled(ListItem)(({ theme }) => ({
    marginBottom: theme.spacing(1), padding: theme.spacing(1), borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default, '&:hover': { backgroundColor: theme.palette.action.hover },
}));
const StyledChip = styled(Chip)(({ theme }) => ({
    marginLeft: theme.spacing(1), height: 'auto', fontSize: '0.7rem', padding: '2px 6px',
    backgroundColor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main,
}));
const StyledCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(2), backgroundColor: alpha(theme.palette.primary.dark, 0.1),
    color: theme.palette.primary.contrastText, borderRadius: '12px', maxWidth: '400px', margin: 'auto',
}));
const StyledButton = styled(Button)(({ theme }) => ({
    backgroundColor: theme.palette.primary.light, color: theme.palette.primary.contrastText,
}));
const StyledOutlinedButton = styled(Button)(({ theme }) => ({
    color: theme.palette.text.secondary, borderColor: theme.palette.divider,
}));

// Simplified Timer Hook
const usePersistentTimer = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [display, setDisplay] = useState({ minutes: 0, seconds: 0, centiseconds: 0 });
    const startTimeRef = useRef<number | null>(null); // When the current running segment started
    const pausedElapsedRef = useRef<number>(0);      // Total time elapsed when paused

    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

    const calculateDisplay = (totalMs: number) => {
        const totalCentis = Math.floor(totalMs / 10);
        return {
            minutes: Math.floor(totalCentis / 6000),
            seconds: Math.floor((totalCentis % 6000) / 100),
            centiseconds: totalCentis % 100,
        };
    };

    const resetTimerState = useCallback(() => {
        localStorage.removeItem('timerStartTime');
        localStorage.removeItem('timerPausedElapsed');
        setIsRunning(false);
        setDisplay({ minutes: 0, seconds: 0, centiseconds: 0 });
        startTimeRef.current = null;
        pausedElapsedRef.current = 0;
    }, []);

    // Initialize timer from localStorage
    useEffect(() => {
        const storedStart = localStorage.getItem('timerStartTime');
        const storedPaused = localStorage.getItem('timerPausedElapsed');
        const lsPausedElapsed = storedPaused ? parseInt(storedPaused, 10) : 0;

        if (storedStart) { // Was running
            const lsStartTime = parseInt(storedStart, 10);
            const elapsedSinceStoredStart = Date.now() - lsStartTime;
            const totalElapsed = lsPausedElapsed + elapsedSinceStoredStart;

            if (totalElapsed > SIX_HOURS_MS) {
                resetTimerState();
            } else {
                startTimeRef.current = lsStartTime;
                pausedElapsedRef.current = lsPausedElapsed;
                setIsRunning(true);
                setDisplay(calculateDisplay(totalElapsed));
            }
        } else if (lsPausedElapsed > 0) { // Was paused
             if (lsPausedElapsed > SIX_HOURS_MS) {
                resetTimerState();
            } else {
                startTimeRef.current = null;
                pausedElapsedRef.current = lsPausedElapsed;
                setIsRunning(false);
                setDisplay(calculateDisplay(lsPausedElapsed));
            }
        } else { // Was stopped/reset
             resetTimerState();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // Timer interval effect
    useEffect(() => {
        if (!isRunning || !startTimeRef.current) return;

        const interval = setInterval(() => {
            const currentElapsed = Date.now() - (startTimeRef.current as number);
            const totalElapsed = pausedElapsedRef.current + currentElapsed;

            if (totalElapsed > SIX_HOURS_MS) {
                resetTimerState();
                clearInterval(interval);
                return;
            }
            setDisplay(calculateDisplay(totalElapsed));
        }, 10); // Update every 10ms for centiseconds

        return () => clearInterval(interval);
    }, [isRunning, resetTimerState]);

    const pause = useCallback(() => {
        if (!isRunning || !startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        pausedElapsedRef.current += elapsed;
        localStorage.setItem('timerPausedElapsed', pausedElapsedRef.current.toString());
        localStorage.removeItem('timerStartTime');
        startTimeRef.current = null;
        setIsRunning(false);
    }, [isRunning]);

    const resume = useCallback(() => {
        if (isRunning) return;
        startTimeRef.current = Date.now();
        localStorage.setItem('timerStartTime', startTimeRef.current.toString());
        // Keep timerPausedElapsed in LS
        setIsRunning(true);
    }, [isRunning]);

    const start = useCallback(() => {
        if (isRunning) return; // Should not happen if button logic is correct
        startTimeRef.current = Date.now();
        pausedElapsedRef.current = 0;
        localStorage.setItem('timerStartTime', startTimeRef.current.toString());
        localStorage.setItem('timerPausedElapsed', '0'); // Explicitly set paused to 0
        setIsRunning(true);
    }, [isRunning]);

    const reset = useCallback(() => {
        resetTimerState();
    }, [resetTimerState]);

    // Determine button action based on state
    const handlePrimaryButtonClick = () => {
        if (isRunning) {
            pause();
        } else if (pausedElapsedRef.current > 0) {
            resume();
        } else {
            start();
        }
    };

    // Button label logic
    let buttonLabel = 'Start';
    if (isRunning) buttonLabel = 'Pause';
    else if (pausedElapsedRef.current > 0) buttonLabel = 'Resume';

    return {
        time: display,
        isRunning,
        handlePrimaryButtonClick,
        reset,
        buttonLabel,
    };
};


const CalendarSidebar: React.FC = () => {
    const theme = useTheme();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const currentDay = today.getDate();
    // Use the simplified hook
    const { time, handlePrimaryButtonClick, reset, buttonLabel } = usePersistentTimer();

    const handleMonthChange = (dir: 'prev' | 'next') =>
        setCurrentMonth(m => {
            if (dir === 'prev') return m === 0 ? (setCurrentYear(y => y - 1), 11) : m - 1;
            return m === 11 ? (setCurrentYear(y => y + 1), 0) : m + 1;
        });

    const todoItems = [
        { id: 1, text: 'Review Physics Chapter 4', completed: false, date: 'Today' },
        { id: 2, text: 'Complete Math Assignment', completed: false, date: 'Tomorrow' },
        { id: 3, text: 'Prepare Presentation Slides', completed: true, date: 'Yesterday' },
        { id: 4, text: 'Study Group Meeting', completed: false, date: 'Fri' },
    ];
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendarGrid = Array.from({ length: 42 }, (_, i) => {
        const day = i - firstDayOfMonth + 1;
        return day > 0 && day <= daysInMonth ? day : null;
    });
    const isToday = (day: number) => day === currentDay && currentMonth === today.getMonth() && currentYear === today.getFullYear();


    return (
        <Paper sx={{
            p: 2.5, height: '85%', display: 'flex', flexDirection: 'column', borderRadius: '16px',
        }}>
            {/* Calendar Section */}
            <Box mb={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {format(new Date(currentYear, currentMonth), 'MMMM yyyy')}
                    </Typography>
                    <Box>
                        <StyledIconButton size="small" onClick={() => handleMonthChange('prev')}>
                            <ChevronLeftIcon fontSize="small" />
                        </StyledIconButton>
                        <IconButton size="small" onClick={() => handleMonthChange('next')}>
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
                {/* Timer Widget */}
                <StyledCard>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="textSecondary">
                            Session Stopwatch
                        </Typography>
                        {/* Updated Timer Display */}
                        <Typography variant="h4" component="div" sx={{ fontWeight: 600, my: 1, color: theme.palette.primary.main }}>
                            {String(time.minutes).padStart(2, '0')}:{String(time.seconds).padStart(2, '0')}
                            <Typography component="span" variant="h6" sx={{ color: alpha(theme.palette.primary.main, 0.7), ml: 0.5 }}>
                                :{String(time.centiseconds).padStart(2, '0')}
                            </Typography>
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                            {/* Use the combined handler */}
                            <StyledButton variant="contained" size="small" onClick={handlePrimaryButtonClick}>
                                {buttonLabel}
                            </StyledButton>
                            <StyledOutlinedButton variant="outlined" size="small" onClick={reset}>
                                Reset
                            </StyledOutlinedButton>
                        </Box>
                    </CardContent>
                </StyledCard>

                <Divider sx={{ my: 3 }} />

                {/* Calendar Grid */}
                <Box>
                    <Grid container spacing={1} sx={{ justifyContent: 'space-between', pl: '6px', pr: '16px', my: 3 }}>
                        {daysOfWeek.map((day) => (
                            <Grid key={day}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    {day}
                                </Typography>
                            </Grid>
                        ))}
                    </Grid>
                    <Grid container spacing={1} sx={{ textAlign: 'center' }}>
                        {calendarGrid.map((day, idx) => (
                            <Grid key={idx} size={1.71}>
                                {day ? (
                                    <StyledCalendarDay isToday={isToday(day)}>
                                        <StyledTypography variant="body2" isToday={isToday(day)}>
                                            {day}
                                        </StyledTypography>
                                    </StyledCalendarDay>
                                ) : null}
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* To-Do List Section */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
                    This Week's Tasks
                </Typography>
                <List disablePadding>
                    {todoItems.map(item => (
                        <StyledListItem key={item.id}>
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                                <IconButton edge="start" size="small" sx={{ color: item.completed ? theme.palette.success.main : theme.palette.text.secondary }}>
                                    {item.completed ? <CheckCircleOutlineIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                                </IconButton>
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            textDecoration: item.completed ? 'line-through' : 'none',
                                            color: item.completed ? 'text.secondary' : 'text.primary',
                                            backgroundColor: 'transparent',
                                            '&:hover': { backgroundColor: 'transparent' }
                                        }}
                                    >
                                        {item.text}
                                    </Typography>
                                }
                            />
                            <StyledChip label={item.date} size="small" />
                        </StyledListItem>
                    ))}
                </List>
            </Box>
        </Paper>
    );
};

export default CalendarSidebar;
