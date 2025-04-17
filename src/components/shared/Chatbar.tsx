import React, { useState } from 'react';
import { Box, TextField, IconButton, Grow, Paper, styled, useTheme, alpha, Zoom } from '@mui/material';
import ChatIcon from '@mui/icons-material/SmartToyOutlined'; // Placeholder: Replace with custom Siri-like icon/SVG
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
    // Centering logic:
    left: isExpanded ? '0' : '50%', // Set to 50% when collapsed
    right: isExpanded ? '0' : 'auto', // Set to auto when collapsed
    transform: isExpanded ? 'none' : 'translateX(-50%)', // Apply transform only when collapsed
    // Remove margin: auto as it's not needed with transform centering
    margin: isExpanded ? 0 : undefined, 
    width: isExpanded ? '100%' : 'clamp(350px, 90%, 600px)', // Width constraint for collapsed state
    maxWidth: '90%', // Max width constraint
    height: isExpanded ? '100vh' : 'auto',
    zIndex: theme.zIndex.drawer + 2,
    // Added left, transform, margin to transition
    transition: theme.transitions.create(['width', 'height', 'bottom', 'border-radius', 'background-color', 'backdrop-filter', 'margin', 'left', 'transform'], { 
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.complex,
    }),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: isExpanded ? alpha(theme.palette.background.default, 0.95) : 'transparent',
    backdropFilter: isExpanded ? 'blur(10px)' : 'none',
    WebkitBackdropFilter: isExpanded ? 'blur(10px)' : 'none',
    transformOrigin: 'bottom', // Key for upward growth
    // Ensure pointer events are enabled only when needed
    pointerEvents: isExpanded ? 'auto' : 'none', 
}));


const ChatbarPaper = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'isExpanded'
})<{ isExpanded?: boolean }>(({ theme, isExpanded }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 1, 2), // Adjusted padding slightly
    pointerEvents: 'auto', // Ensure paper itself is interactive
    ...(!isExpanded && {
        // Styles to mimic Siri bar
        backgroundColor: alpha(theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.common.white, 0.75), // Lighter, more translucent background
        backdropFilter: 'blur(20px) saturate(180%)', // Increased blur, added saturate
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${alpha(theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black, 0.1)}`, // Very subtle border
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`, // Softer, more diffused shadow
        borderRadius: '50px', // Pill shape
    }),
    ...(isExpanded && {
        // ... expanded styles remain the same ...
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
        borderRadius: '50px', // Match paper's border radius
        backgroundColor: 'transparent', // Ensure no background override
        '& fieldset': {
            border: 'none', // No border on the input itself
        },
        // Remove hover/focus background effects for cleaner look
        '&:hover': {
             backgroundColor: 'transparent',
        },
        '&.Mui-focused': {
             backgroundColor: 'transparent',
             boxShadow: 'none', // Remove focus ring
        },
        input: {
            color: theme.palette.text.primary,
            padding: theme.spacing(1.25, 0), // Adjust vertical padding, remove horizontal (handled by paper)
            fontSize: '1rem', // Slightly larger font like Siri
            textAlign: 'left', // Ensure text starts after icon
        },
        '& ::placeholder': {
            color: theme.palette.text.secondary,
            opacity: 0.9, // Slightly less opaque placeholder
            fontSize: '1rem',
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
            {/* Expanded Content Area */}
            {isExpanded && (
                <Zoom in={isExpanded} style={{ transitionDelay: isExpanded ? '300ms' : '0ms' }}>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', width: '100%', position: 'relative' }}>
                        <CopilotPage /> 
                        {/* CopilotPage content is rendered by the Router here */}
                        {/* Add padding or container if CopilotPage doesn't handle it */}
                    </Box>
                </Zoom>
            )}


            {/* Input Area (Collapsed) */}
            <Grow
                in={!isExpanded}
                mountOnEnter
                unmountOnExit
                style={{ transformOrigin: 'bottom center' }}
                timeout={500}
            >
                 <ChatbarPaper elevation={0} isExpanded={false}>
                    {/* TODO: Replace ChatIcon with a custom SVG icon that looks like the Siri logo */}
                    <ChatIcon sx={{ mr: 1.5, ml: 0.5, color: theme.palette.text.secondary }} />
                    <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                        <ChatInput
                            variant="outlined"
                            placeholder="Ask Copilot..." // Updated placeholder
                            fullWidth
                            onFocus={handleFocus}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoComplete="off"
                        />
                        {/* Send button is hidden when collapsed */}
                    </Box>
                </ChatbarPaper>
            </Grow>

            {/* Input area when expanded */}
            {isExpanded && (
                <ChatbarPaper elevation={0} isExpanded={true}>
                    <IconButton
                        onClick={handleClose}
                        size="small"
                        sx={{ mr: 1, color: theme.palette.text.secondary }} // Reduced margin
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