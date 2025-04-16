import React, { useState } from 'react';
import { Box, TextField, IconButton, Grow, Paper, styled, useTheme, alpha, Zoom } from '@mui/material';
import ChatIcon from '@mui/icons-material/SmartToyOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import CopilotPage from '@pages/CopilotPage';

// --- Styled Components ---

const ChatbarContainer = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'isExpanded'
})<{ isExpanded?: boolean }>(({ theme, isExpanded }) => ({
    position: 'fixed',
    bottom: isExpanded ? 0 : theme.spacing(3),
    left: '0',
    right: '0',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: isExpanded ? '100%' : 'clamp(350px, 90%, 600px)',
    maxWidth: '90%',
    height: isExpanded ? '100vh' : 'auto',
    zIndex: theme.zIndex.drawer + 2,
    transition: theme.transitions.create(['width', 'height', 'bottom', 'border-radius', 'background-color', 'backdrop-filter'], {
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.complex,
    }),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: isExpanded ? alpha(theme.palette.background.default, 0.95) : 'transparent',
    backdropFilter: isExpanded ? 'blur(10px)' : 'none',
    WebkitBackdropFilter: isExpanded ? 'blur(10px)' : 'none',
    transformOrigin: 'bottom', // Key for upward growth
}));

const ChatbarPaper = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'isExpanded'
})<{ isExpanded?: boolean }>(({ theme, isExpanded }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 1, 2.5),
    ...(!isExpanded && {
        backgroundColor: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        boxShadow: theme.shadows[3],
        borderRadius: `calc(${theme.shape.borderRadius}px * 1.5)`,
    }),
    ...(isExpanded && {
        backgroundColor: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        border: 'none',
        boxShadow: 'none',
        borderRadius: 0,
        borderBottom: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(1.5, 2),
    }),
    width: '100%',
    transition: theme.transitions.create(['background-color', 'border-radius', 'backdrop-filter', 'box-shadow', 'border', 'padding'], {
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.complex,
    }),
}));

const ChatInput = styled(TextField)(({ theme }) => ({
    flexGrow: 1,
    marginRight: theme.spacing(1),
    '& .MuiOutlinedInput-root': {
        borderRadius: `calc(${theme.shape.borderRadius}px * 1.5)`,
        transition: theme.transitions.create(['background-color', 'box-shadow']),
        backgroundColor: 'transparent',
        '& fieldset': {
            border: 'none',
        },
        '&:hover': {
            backgroundColor: alpha(theme.palette.action.hover, 0.05),
        },
        '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.action.selected, 0.08),
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`,
        },
        input: {
            color: theme.palette.text.primary,
            padding: theme.spacing(1.5, 2),
            fontSize: '0.95rem',
        },
        '& ::placeholder': {
            color: theme.palette.text.secondary,
            opacity: 0.8,
        },
    },
}));

// --- Chatbar Component ---
const Chatbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const theme = useTheme();
    const [inputValue, setInputValue] = useState('');

    const isExpanded = location.pathname === '/copilot';
    const currentPage = searchParams.get('page') || '';

    // Handle keyboard events (Escape key for closing)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isExpanded) {
                navigate(currentPage);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, navigate, currentPage]);

    const handleFocus = () => {
        if (!isExpanded) {
            const currentPath = location.pathname + location.search + location.hash;
            navigate(`/copilot?page=${currentPath.replace(/^\//, '')}`);    // trim leading slash for URL
        }
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPage) navigate(currentPage);
        else navigate(-1);
    };

    const handleSend = (e: React.MouseEvent | React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            console.log('Sending message:', inputValue);
            // TODO: Implement actual message sending logic
            setInputValue('');
        }
    };

    return (
        <ChatbarContainer isExpanded={isExpanded} >
            {/* Expanded Content Area (Rendered first in DOM for layout) */}
            {isExpanded && (
                <Zoom in={isExpanded} style={{ transitionDelay: isExpanded ? '300ms' : '0ms' }}>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', width: '100%', position: 'relative' }}>
                        <CopilotPage /> 
                        {/* CopilotPage content is rendered by the Router here */}
                        {/* Add padding or container if CopilotPage doesn't handle it */}
                    </Box>
                </Zoom>
            )}

            {/* Input Area (Rendered last for visual bottom placement) */}
            {/* Use Grow only for the initial appearance of the collapsed bar */}
            <Grow
                in={!isExpanded}
                mountOnEnter
                unmountOnExit
                style={{ transformOrigin: 'bottom center' }} // Ensure it grows from the bottom
                timeout={500}
            >
                <Box sx={{
                    position: 'absolute',
                    bottom: theme.spacing(3),
                    left: '30%', // Center using transform
                    transform: 'translateX(-50%)', // Center using transform
                    width: 'clamp(350px, 90%, 600px)',
                    maxWidth: '90%',
                    zIndex: -10,
                }}>
                    {/* This inner Box is needed for Grow to work correctly with the fixed positioning logic */}
                    <ChatbarPaper elevation={0} isExpanded={false}> {/* Use elevation 0 as theme handles border/shadow */}
                        <ChatIcon sx={{ mr: 1.5, color: theme.palette.text.secondary }} />
                        <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                            <ChatInput
                                variant="outlined"
                                placeholder="Chat with Study-Pal Copilot..."
                                fullWidth
                                onFocus={handleFocus}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                autoComplete="off"
                            />
                            <IconButton type="submit" color="primary" aria-label="Send message" disabled={!inputValue.trim()}>
                                <SendIcon />
                            </IconButton>
                        </Box>
                    </ChatbarPaper>
                </Box>
            </Grow>

            {/* Input area when expanded (part of the main container flow) */}
            {isExpanded && (
                <ChatbarPaper elevation={0} isExpanded={true}>
                    <IconButton
                        onClick={handleClose}
                        size="small"
                        sx={{ mr: 10, color: theme.palette.text.secondary }}
                        aria-label="Close Copilot"
                    >
                        <CloseIcon />
                    </IconButton>
                    <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                        <ChatInput
                            variant="outlined"
                            placeholder="Ask Copilot anything..."
                            fullWidth
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoComplete="off"
                            autoFocus // Focus input when expanded
                        />
                        <IconButton type="submit" color="primary" aria-label="Send message" disabled={!inputValue.trim()}>
                            <SendIcon />
                        </IconButton>
                    </Box>
                </ChatbarPaper>
            )}
        </ChatbarContainer>
    );
};

export default Chatbar;