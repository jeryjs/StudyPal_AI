import { useCopilot } from '@hooks/useCopilot';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/SmartToyOutlined';
import { Box, IconButton, Paper, styled, TextField, useTheme } from '@mui/material';
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
    display: 'flex',
    flexDirection: 'column',
}));

const MorphInputBar = styled(Paper)<{ expanded: boolean }>(({ theme, expanded }) => ({
    position: expanded ? 'sticky' : 'relative',
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

const MorphCopilotPage = styled(Box)<{ show: boolean }>(({ show }) => ({
    position: 'relative',
    flex: 1,
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(24px)',
    transition: 'opacity 400ms cubic-bezier(.77,0,.18,1), transform 400ms cubic-bezier(.77,0,.18,1)',
}));

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
            if (inputRef.current) {
                inputRef.current.focus();
            }
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
            if (lastActiveId) {
                navigate(`/copilot?id=${lastActiveId}`, { preventScrollReset: true });
            } else {
                // If no last active chat, just navigate to /copilot, context will handle new chat creation on send
                navigate(`/copilot`, { preventScrollReset: true });
            }
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

    return (
        <MorphContainer expanded={isExpanded} sx={{ left: navbarWidth, width: isExpanded ? `calc(100vw - ${navbarWidth}px)` : 360 }}>
            <MorphCopilotPage show={isExpanded}>
                {/* Render CopilotPage only when expanded */}
                {isExpanded && <CopilotPage />}
            </MorphCopilotPage>

            <MorphInputBar expanded={isExpanded} elevation={0}>
                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
                    {!isExpanded && (
                        <IconButton onClick={handleFocus} sx={{ color: theme.palette.text.secondary }}>
                            <ChatIcon />
                        </IconButton>
                    )}
                    {isExpanded && (
                        <IconButton onClick={handleClose} size="small" sx={{ color: theme.palette.text.secondary }}>
                            <ExpandMoreIcon />
                        </IconButton>
                    )}
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
                    <IconButton
                        type="submit"
                        color="primary"
                        aria-label="Send message"
                        sx={{ width: !!inputValue.trim() ? 40 : 0, opacity: !!inputValue.trim() ? 1 : 0, transition: 'all 0.2s ease-out' }}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <SendIcon />
                    </IconButton>
                </form>
            </MorphInputBar>
        </MorphContainer>
    );
};

export default Chatbar;