import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NoteIcon from '@mui/icons-material/Note';
import { AttachFile } from '@mui/icons-material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/SmartToyOutlined';
import { alpha, Box, Collapse, Divider, Drawer, IconButton, List, ListItem, ListItemIcon, ListItemText, Paper, styled, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import CopilotPage, { contextCategories, ContextItem, CopilotPageProps } from '@pages/CopilotPage';
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
    const [copilot, setCopilot] = useState<CopilotPageProps>({ input: '', contexts: [], attachContextOpen: false });
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    const isExpanded = location.pathname === '/copilot';
    const currentPage = searchParams.get('page') || '';

    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Handle keyboard events (Escape key for closing, c for opening)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if the active element is the body or null (no input focused)
            if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || (e.key === 'Escape' && document.activeElement == inputRef.current)) {
                e.preventDefault();

                if (e.key === 'Escape') handleClose();
                else if (e.key === 'c') handleFocus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, navigate, currentPage]);

    const handleFocus = () => {
        if (!isExpanded) {
            const currentPath = location.pathname + location.search + location.hash;
            navigate(`/copilot?page=${currentPath.replace(/^\//, '')}`, { preventScrollReset: true });    // trim leading slash for URL
        }
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (!isExpanded) return;

        inputRef.current?.blur(); // Remove focus from input
        e?.stopPropagation();
        navigate(-1);
    };

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };
    const handleAttach = (item: ContextItem) => {
        // Check if the item is already attached
        if (!copilot.contexts.some(ctx => ctx.id === item.id)) {
            setCopilot(p => ({ ...p, contexts: [...p.contexts, item] }));
        } else {
            // If already attached, remove it from the contexts
            setCopilot(p => ({ ...p, contexts: p.contexts.filter(ctx => ctx.id !== item.id) }));
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (copilot.input.trim()) {
            // TODO: Implement actual message sending logic
            setCopilot(prev => ({ ...prev, input: '' }));
        }
    };

    return (
        <MorphContainer expanded={isExpanded} sx={{ left: navbarWidth, width: isExpanded ? `calc(100vw - ${navbarWidth}px)` : 360 }}>
            <MorphCopilotPage show={isExpanded}>
                {isExpanded && <CopilotPage {...copilot} setCopilot={setCopilot} />}
            </MorphCopilotPage>

            <MorphInputBar expanded={isExpanded} elevation={0}>
                {isExpanded && (
                    <Box sx={{ pb: 1, display: 'flex', gap: 1 }}>
                        <Tooltip title="Add context (Ctrl + /)" arrow placement="top">
                            <IconButton
                                onClick={() => setCopilot(p => ({ ...p, attachContextOpen: !copilot.attachContextOpen }))}
                                size="small"
                                sx={{ bgcolor: alpha(theme.palette.primary.dark, copilot.attachContextOpen ? 0.4 : 0.2), borderRadius: 2, fontSize: 14, transition: 'all 400ms cubic-bezier(.77,0,.18,1)' }}
                            >
                                <AttachFile fontSize='small' /> Add Context
                            </IconButton>
                        </Tooltip>
                        {copilot.contexts.map((ctx, idx) => (
                            <Box
                                key={idx}
                                sx={{ pr: 1.5, bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontSize: 13, maxWidth: 180, borderRadius: theme.shape.borderRadius, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                                title={ctx.name || ''}
                            >
                                <IconButton size="small" onClick={() => setCopilot(prev => ({ ...prev, contexts: prev.contexts.filter(c => c.id !== ctx.id) }))}>
                                    <CloseIcon fontSize="small" sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
                                </IconButton>
                                {ctx.name || 'Context'}
                            </Box>
                        ))}
                    </Box>
                )}

                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {!isExpanded && (
                        <ChatIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
                    )}
                    {isExpanded && (
                        <IconButton onClick={handleClose} size="small" sx={{ color: theme.palette.text.secondary, mr: 1 }}>
                            <CloseIcon />
                        </IconButton>
                    )}
                    <MorphInput
                        inputRef={inputRef}
                        variant="outlined"
                        placeholder={isExpanded ? 'Ask Copilot anything...' : 'Chat with Study-Pal Copilot...'}
                        value={copilot.input}
                        onFocus={handleFocus}
                        onChange={e => setCopilot(prev => ({ ...prev, input: e.target.value }))}
                        autoComplete="off"
                        fullWidth
                    />
                    <IconButton
                        type="submit"
                        color="primary"
                        aria-label="Send message"
                        sx={{ width: !!copilot.input.trim() ? 40 : 0, transition: 'all 400ms cubic-bezier(.77,0,.18,1)', opacity: !!copilot.input.trim() ? 1 : 0 }}
                    >
                        <SendIcon />
                    </IconButton>
                </form>
            </MorphInputBar>

            {/* Context Sidebar */}
            <Drawer
                variant="persistent"
                anchor="bottom"
                open={isExpanded && copilot.attachContextOpen}
                hideBackdrop
                sx={{
                    '& .MuiDrawer-paper': {
                        left: navbarWidth,
                        width: '100%',
                        maxWidth: 360,
                        borderRadius: theme.shape.borderRadius,
                        pb: 16,
                        zIndex: 0,
                        transition: 'transform 400ms cubic-bezier(.77,0,.18,1)',
                    },
                }}
            >
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6">Contexts</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Attach relevant information to your chat
                    </Typography>
                </Box>
                <List sx={{ pt: 0 }}>
                    {contextCategories.map((category) => (
                        <React.Fragment key={category.id}>
                            <ListItem onClick={() => toggleCategory(category.id)} sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36, mr: 0 }}>
                                    <NoteIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={category.name} />
                                {expandedCategories[category.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </ListItem>
                            <Collapse in={expandedCategories[category.id]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {category.items.map((item) => (
                                        <ListItem
                                            key={item.id}
                                            sx={{ pl: 4, py: 0.5, '&:hover .attach-icon': { opacity: 1 } }}
                                            onClick={() => handleAttach(item)}
                                        >
                                            <IconButton
                                                size="small"
                                                className="attach-icon"
                                                sx={{ mr: 1, opacity: 0.3, transition: 'opacity 0.2s' }}
                                            >
                                                {copilot.contexts.some(ctx => ctx.id === item.id) ? (
                                                    <AttachFileIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
                                                ) : (
                                                    <AttachFileIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                                                )}
                                            </IconButton>
                                            <ListItemText
                                                primary={item.name}
                                                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                            <Divider component="li" variant="inset" />
                        </React.Fragment>
                    ))}
                </List>
            </Drawer>
        </MorphContainer>
    );
};

export default Chatbar;