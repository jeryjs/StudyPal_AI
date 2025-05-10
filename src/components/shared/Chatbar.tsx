import { useCopilot } from '@hooks/useCopilot';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/SmartToyOutlined';
import { Box, IconButton, Paper, styled, SxProps, TextField, Theme, Tooltip, useTheme } from '@mui/material';
import CopilotPage from '@pages/CopilotPage';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

// --- Styled Components ---

const MorphContainer = styled(Box)<{ expanded: boolean }>(({ theme, expanded }) => ({
    position: 'fixed',
    bottom: expanded ? 0 : 20,
    right: 0,
    height: expanded ? '100%' : 72,
    maxWidth: expanded ? '100%' : 360,
    margin: '0 auto',
    borderRadius: theme.shape.borderRadius,
    boxShadow: expanded ? theme.shadows[8] : theme.shadows[2],
    transition: 'all 400ms cubic-bezier(.77,0,.18,1)',
    overflowY: expanded ? 'scroll' : 'hidden',
    overflowX: 'clip',
    display: 'flex',
    flexDirection: 'column',
}));

const MorphInputBar = styled(Paper)<{ expanded: boolean }>(({ theme, expanded }) => ({
    position: 'sticky',
    bottom: 0, left: 0, right: 0,
    display: 'inline',
    alignItems: 'center',
    boxShadow: 'none',
    border: 'none',
    borderRadius: 20,
    flexDirection: 'column',
    padding: expanded ? theme.spacing(2, 1) : theme.spacing(0.5, 2),
    transition: 'all 400ms cubic-bezier(.77,0,.18,1)',
    zIndex: 1,
}));

const MorphInput = styled(TextField)(({ theme }) => ({
    flex: 1,
    '& .MuiOutlinedInput-root': {
        borderRadius: 20,
        backgroundColor: theme.palette.background.paper,
        fontSize: '1rem',
        '& fieldset': { border: 'none' },
        '& input': { color: theme.palette.text.primary },
        '&::placeholder': { color: theme.palette.text.secondary },
    },
}));

const MorphCopilotPage = styled(Paper)<{ show: boolean }>(({ show, theme }) => ({
    position: 'relative',
    flex: 1,
    backgroundColor: theme.palette.background.default,
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(24px)',
    transition: 'all 400ms cubic-bezier(.77,0,.18,1)',
}));

// Chatbar Action Button component
const ChatbarActionButton: React.FC<{
    show: boolean;
    title: string;
    onClick?: (e?: React.MouseEvent) => void;
    type?: 'button' | 'submit';
    size?: 'small' | 'medium';
    disabled?: boolean;
    sx?: SxProps<Theme>;
    children: React.ReactNode;
}> = ({ show, title, onClick, type = 'button', size = 'small', disabled = false, sx, children }) => {
    // Base styles including transition
    const baseSx: SxProps<Theme> = {
        color: 'text.secondary',
        opacity: show ? 1 : 0,
        padding: show ? 'auto' : 0,
        width: show ? 'auto' : 0,
        transform: show ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 400ms cubic-bezier(.77,0,.18,1)',
        // Merge custom sx
        ...sx,
    };

    return (
        <Tooltip title={title} arrow placement="top" enterDelay={500} leaveDelay={100}>
            <IconButton
                type={type}
                onClick={onClick}
                size={size}
                disabled={disabled || !show} // Also disable if not shown
                sx={baseSx}
                aria-label={title}
            >
                {children}
            </IconButton>
        </Tooltip>
    );
};

// --- Chatbar Component ---
interface ChatbarProps {
    navbarWidth?: number;
}

const Chatbar: React.FC<ChatbarProps> = ({ navbarWidth = 0 }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const isExpanded = location.pathname === '/copilot';
    const currentChatId = searchParams.get('id'); // Get chat ID from URL

    const { sendMessage, isLoading, activeChat, setActiveChatId, startNewChat } = useCopilot();

    // Effect to set active chat based on URL on initial load or URL change
    useEffect(() => {
        if (isExpanded) {
            setActiveChatId(currentChatId);
            // Delay focus slightly to ensure transition completes
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isExpanded, currentChatId, setActiveChatId]);

    // Handle keyboard events (Escape key for closing, c for opening)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElementTag = document.activeElement?.tagName;
            const isInputFocused = ['INPUT', 'TEXTAREA'].includes(activeElementTag || '');

            // Allow Escape even if input is focused
            if (e.key === 'Escape') {
                if (isExpanded) {
                    e.preventDefault();
                    handleClose();
                }
            } else if (e.key === 'c' && !isInputFocused) {
                // Only trigger open with 'c' if not focused on an input
                e.preventDefault();
                handleFocus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, navigate, activeChat]);

    const handleFocus = () => {
        if (!isExpanded) {
            // Check localStorage for last active chat ID first
            const lastActiveId = localStorage.getItem('activeCopilotChatId');
            const targetPath = lastActiveId ? `/copilot?id=${lastActiveId}` : '/copilot';
            navigate(targetPath, { preventScrollReset: true });
        }
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (!isExpanded) return;
        inputRef.current?.blur();
        e?.stopPropagation();
        navigate(-1);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (trimmedInput && !isLoading) {
            try {
                // If no active chat is set (e.g., navigated to /copilot directly),
                // sendMessage in context will handle creating a new one.
                await sendMessage(trimmedInput);
                setInputValue(''); // Clear input after successful send
            } catch (error) {
                console.error("Chatbar: Failed to send message:", error);
                // Error state is managed globally in CopilotContext
            }
        }
    };
    
    const handleStartNewChat = () => {
        startNewChat();
        setInputValue('');
        inputRef.current?.focus();
    };

    const hasInput = !!inputValue.trim();

    return (
        <MorphContainer expanded={isExpanded} sx={{ left: navbarWidth, width: isExpanded ? `calc(100vw - ${navbarWidth}px)` : 360 }}>
            <MorphCopilotPage show={isExpanded}>
                <CopilotPage />
            </MorphCopilotPage>

            <MorphInputBar expanded={isExpanded} elevation={0}>
                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
                    
                    {/* Button shown only when collapsed */}
                    <ChatbarActionButton show={!isExpanded} title="Open Chat (Ctrl+C)" onClick={handleFocus}>
                        <ChatIcon />
                    </ChatbarActionButton>

                    {/* Buttons shown only when expanded */}
                    <ChatbarActionButton show={isExpanded} title="Start New Chat" onClick={handleStartNewChat}>
                        <AddIcon />
                    </ChatbarActionButton>
                    <ChatbarActionButton show={isExpanded} title="Collapse Chat (Esc)" onClick={handleClose}>
                        <ExpandMoreIcon />
                    </ChatbarActionButton>
                    <MorphInput
                        inputRef={inputRef}
                        variant="outlined"
                        placeholder={isExpanded ? 'Ask Copilot anything...' : 'Chat with Study-Pal Copilot...'}
                        value={inputValue}
                        onFocus={handleFocus}
                        onChange={e => setInputValue(e.target.value)}
                        autoComplete="off"
                        fullWidth
                        disabled={isLoading}
                        multiline
                        maxRows={5}
                        onKeyDown={(e) => {
                            // Submit on Enter, allow Shift+Enter for newline
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />

                    {/* Send Button */}
                    <ChatbarActionButton
                        show={hasInput} // Show based on input value
                        title="Send Message (Enter)"
                        type="submit" // Set type to submit
                        size="medium"
                        disabled={!hasInput || isLoading}
                        sx={{ color: 'primary.main', transition: 'all 0.2s ease-out' }}
                    >
                        <SendIcon />
                    </ChatbarActionButton>
                </form>
            </MorphInputBar>
        </MorphContainer>
    );
};

export default Chatbar;