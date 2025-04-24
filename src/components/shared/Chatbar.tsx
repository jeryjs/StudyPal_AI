import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton, Paper, styled, useTheme, alpha } from '@mui/material';
import ChatIcon from '@mui/icons-material/SmartToyOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import CopilotPage from '@pages/CopilotPage';

// --- Styled Components ---

const MorphContainer = styled(Box)<{ expanded: boolean }>(({ theme, expanded }) => ({
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: expanded ? 900 : 360,
    margin: '0 auto',
    borderRadius: expanded ? 24 : 24,
    boxShadow: expanded ? theme.shadows[8] : theme.shadows[2],
    transition: 'all 400ms cubic-bezier(.77,0,.18,1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
}));

const MorphInputRow = styled(Paper)<{ expanded: boolean }>(({ theme, expanded }) => ({
    display: 'flex',
    alignItems: 'center',
    boxShadow: 'none',
    border: 'none',
    padding: expanded ? theme.spacing(2, 2, 1, 2) : theme.spacing(1.5, 2),
    transition: 'padding 400ms cubic-bezier(.77,0,.18,1)',
}));

const MorphInput = styled(TextField)(({ theme }) => ({
    flex: 1,
    '& .MuiOutlinedInput-root': {
        borderRadius: 20,
        background: 'transparent',
        fontSize: '1rem',
        '& fieldset': { border: 'none' },
        '& input': { color: theme.palette.text.primary },
        '&::placeholder': { color: theme.palette.text.secondary },
    },
}));

const MorphCopilotPage = styled(Box)<{ show: boolean }>(({ show }) => ({
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
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const isExpanded = location.pathname === '/copilot';
    const currentPage = searchParams.get('page') || '';

    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Handle keyboard events (Escape key for closing)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isExpanded) {
                if (currentPage) navigate(currentPage);
                else navigate(-1);
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

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            // TODO: Implement actual message sending logic
            setInputValue('');
        }
    };

    return (
        <MorphContainer expanded={isExpanded} style={{ left: navbarWidth }}>
            <MorphCopilotPage show={isExpanded}>
                {isExpanded && <CopilotPage />}
                {/* CopilotPage content is rendered by the Router here */}
                {/* Add padding or container if CopilotPage doesn't handle it */}
            </MorphCopilotPage>
            <MorphInputRow expanded={isExpanded} elevation={0}>
                {!isExpanded && (
                    <ChatIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
                )}
                {isExpanded && (
                    <IconButton onClick={handleClose} size="small" sx={{ color: theme.palette.text.secondary, mr: 1 }}>
                        <CloseIcon />
                    </IconButton>
                )}
                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex' }}>
                    <MorphInput
                        inputRef={inputRef}
                        variant="outlined"
                        placeholder={isExpanded ? 'Ask Copilot anything...' : 'Chat with Study-Pal Copilot...'}
                        value={inputValue}
                        onFocus={handleFocus}
                        onChange={e => setInputValue(e.target.value)}
                        autoComplete="off"
                        fullWidth
                    />
                    <IconButton type="submit" color="primary" aria-label="Send message" disabled={!inputValue.trim()}>
                        <SendIcon />
                    </IconButton>
                </form>
            </MorphInputRow>
        </MorphContainer>
    );
};

export default Chatbar;