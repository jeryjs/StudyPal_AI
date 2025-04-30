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
    const currentPage = searchParams.get('page') || '';

    const { sendMessage, isLoading } = useCopilot();

    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

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
    }, [isExpanded, navigate, currentPage]);

    const handleFocus = () => {
        if (!isExpanded) {
            const currentPath = location.pathname + location.search + location.hash;
            navigate(`/copilot?page=${encodeURIComponent(currentPath.replace(/^\//, ''))}`, { preventScrollReset: true });
        }
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (!isExpanded) return;
        inputRef.current?.blur();
        e?.stopPropagation();
        // Navigate back to the previous page captured in the 'page' query param
        const previousPage = searchParams.get('page');
        if (previousPage) {
            navigate(`/${decodeURIComponent(previousPage)}`, { replace: true }); // Use replace to avoid adding copilot close to history
        } else {
            navigate(-1); // Fallback if no previous page recorded
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (trimmedInput && !isLoading) {
            try {
                // Pass only the input value to sendMessage
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
                {isExpanded && <CopilotPage />}
            </MorphCopilotPage>

            <MorphInputBar expanded={isExpanded} elevation={0}>
                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {!isExpanded && (
                        <ChatIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
                    )}
                    {isExpanded && (
                        <IconButton onClick={handleClose} size="small" sx={{ color: theme.palette.text.secondary, mr: 1 }}>
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
                        disabled={isLoading} // Disable input while loading
                        multiline // Allow multiline input
                        maxRows={5} // Limit height
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
                        sx={{ width: !!inputValue.trim() ? 40 : 0, transition: 'all 400ms cubic-bezier(.77,0,.18,1)', opacity: !!inputValue.trim() ? 1 : 0 }}
                        disabled={!inputValue.trim() || isLoading} // Disable if no input or loading
                    >
                        <SendIcon />
                    </IconButton>
                </form>
            </MorphInputBar>
        </MorphContainer>
    );
};

export default Chatbar;