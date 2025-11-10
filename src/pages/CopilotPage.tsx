import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import {
    Alert,
    alpha,
    Avatar,
    Box,
    CircularProgress,
    Drawer,
    IconButton,
    Paper,
    Tooltip,
    Typography,
    useTheme,
    Chip,
    useMediaQuery
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useCopilot } from '@hooks/useCopilot';
import { CopilotMessage } from '@type/copilot.types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // Import a code highlight style
import ChatHistorySidebar from '@components/copilot/ChatHistorySidebar';

const CopilotPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        activeChat,
        isLoading,
        error,
    } = useCopilot();

    const chatListRef = useRef<HTMLDivElement>(null);
    const scrollLockRef = useRef(true);
    const [historyOpen, setHistoryOpen] = useState(!isMobile); // Open by default on desktop

    const messages = activeChat?.messages || [];

    // Function to render message parts (handling text, function calls, and responses)
    const renderMessageContent = (message: CopilotMessage) => {
        const parts = message.parts;
        
        // Check if this is a function call message
        const hasFunctionCall = parts.some(p => 'functionCall' in p);
        if (hasFunctionCall && message.role === 'model') {
            return (
                <Box>
                    {parts.map((part, idx) => {
                        if ('functionCall' in part && part.functionCall) {
                            return (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <BuildIcon fontSize="small" color="primary" />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                        Using tool: <strong>{part.functionCall.name}</strong>
                                    </Typography>
                                </Box>
                            );
                        }
                        return null;
                    })}
                </Box>
            );
        }
        
        // Check if this is a function response message (tool role)
        if (message.role === 'tool') {
            return (
                <Box>
                    {parts.map((part, idx) => {
                        if ('functionResponse' in part && part.functionResponse) {
                            const response = part.functionResponse.response;
                            const content = response && typeof response === 'object' && 'content' in response 
                                ? JSON.stringify(response.content, null, 2)
                                : JSON.stringify(response, null, 2);
                            
                            return (
                                <Box key={idx} sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <CheckCircleIcon fontSize="small" color="success" />
                                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                            Tool result: <strong>{part.functionResponse.name}</strong>
                                        </Typography>
                                    </Box>
                                    <Paper sx={{ p: 1, bgcolor: alpha(theme.palette.background.default, 0.5), maxHeight: 200, overflow: 'auto' }}>
                                        <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {content}
                                        </pre>
                                    </Paper>
                                </Box>
                            );
                        }
                        return null;
                    })}
                </Box>
            );
        }
        
        // Regular text message - use markdown rendering
        const textContent = parts
            .map(part => ('text' in part ? part.text : ''))
            .join('');
        
        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Customize markdown rendering for better integration with theme
                    code({ node, inline, className, children, ...props }: any) {
                        return inline ? (
                            <code style={{ 
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.9em'
                            }} {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    a({ node, children, ...props }: any) {
                        return (
                            <a {...props} style={{ color: theme.palette.primary.main }} target="_blank" rel="noopener noreferrer">
                                {children}
                            </a>
                        );
                    }
                }}
            >
                {textContent}
            </ReactMarkdown>
        );
    };

    // Scroll to bottom logic (refined)
    useEffect(() => {
        const checkScrollPositionAndLock = () => {
            if (chatListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
                // Lock if near bottom (within 300px) or if scrollHeight is less than clientHeight
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
                const contentFits = scrollHeight <= clientHeight;
                if (isNearBottom || contentFits) {
                    scrollLockRef.current = true; // Lock if near bottom or content fits
                } else if (scrollTop > 0) {
                    // If user scrolled up significantly, keep it unlocked
                    // This check prevents re-locking immediately if content loads while scrolled up
                }
            }
        };

        if (scrollLockRef.current && chatListRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        }

        // Add event listener for scroll events within the chat list
        const currentChatList = chatListRef.current;
        currentChatList?.addEventListener('scroll', checkScrollPositionAndLock);

        // Initial check in case content loads shorter than viewport
        checkScrollPositionAndLock();

        return () => {
            currentChatList?.removeEventListener('scroll', checkScrollPositionAndLock);
        };
    }, [messages]); // Rerun when messages change

    // Handle manual scroll to unlock auto-scroll
    const handleScroll = () => {
        if (chatListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
            // Consider a larger threshold for unlocking to avoid accidental unlocks
            if (scrollHeight - scrollTop - clientHeight > 50) {
                scrollLockRef.current = false; // Unlock if scrolled up significantly
            } else {
                // Don't automatically re-lock here, let useEffect handle it on message changes
            }
        }
    };

    const glassChatBubble = (role: 'user' | 'model') => ({
        background: role === 'user' ? alpha(theme.palette.primary.main, 0.2) : theme.palette.background.paper,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: `0 4px 16px 0 ${alpha(theme.palette.common.black, 0.1)}`,
        borderRadius: '20px',
        borderTopLeftRadius: role === 'model' ? '4px' : '20px',
        borderTopRightRadius: role === 'user' ? '4px' : '20px',
        p: 1.5,
        maxWidth: { md: '75%', xs: '95%' },
        display: 'flex',
        alignItems: 'flex-start',
    });

    // Filter messages to display - show all roles for transparency
    const displayMessages = messages;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', position: 'relative' }}>
            {/* History Toggle Button (Mobile) */}
            {isMobile && (
                <Tooltip title="Chat History" placement="left">
                    <IconButton
                        onClick={() => setHistoryOpen(true)}
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 10,
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                    >
                        <HistoryIcon />
                    </IconButton>
                </Tooltip>
            )}

            {/* Chat History Sidebar */}
            {!isMobile ? (
                <Paper
                    sx={{
                        width: 280,
                        height: '100%',
                        borderRight: 1,
                        borderColor: 'divider',
                        display: historyOpen ? 'block' : 'none'
                    }}
                >
                    <ChatHistorySidebar />
                </Paper>
            ) : (
                <Drawer
                    anchor="right"
                    open={historyOpen}
                    onClose={() => setHistoryOpen(false)}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: '80%',
                            maxWidth: 320
                        }
                    }}
                >
                    <ChatHistorySidebar onClose={() => setHistoryOpen(false)} />
                </Drawer>
            )}

            {/* Main Chat Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', flex: 1 }}>
            <Box
                ref={chatListRef}
                onScroll={handleScroll}
                sx={{
                    flexGrow: 1,
                    p: { xs: 1, md: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: 900,
                    mx: 'auto',
                    pt: { xs: '70px', md: '20px' },
                }}
            >

                {/* Welcome message if no messages */}
                {displayMessages.length === 0 && !isLoading && (
                    <Box sx={{ textAlign: 'center', my: 'auto', p: 3, color: 'text.secondary' }}>
                        <SmartToyOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">How can I help you today?</Typography>
                        <Typography variant="body1">Ask me anything about your study materials!</Typography>
                    </Box>
                )}

                {displayMessages.map((message) => {
                    // Determine if this message should be shown (skip empty model function calls that will be followed by tool response)
                    const shouldShow = message.role === 'user' || 
                                      message.role === 'tool' ||
                                      (message.role === 'model' && message.parts.some(p => 'text' in p && p.text?.trim())) ||
                                      (message.role === 'model' && message.parts.some(p => 'functionCall' in p));
                    
                    if (!shouldShow) return null;
                    
                    const isUser = message.role === 'user';
                    const isTool = message.role === 'tool';
                    
                    return (
                        <Box
                            key={message.id}
                            sx={{
                                display: 'flex',
                                justifyContent: isUser ? 'flex-end' : 'flex-start',
                                mb: 2,
                                width: '100%',
                            }}
                        >
                            <Paper sx={{ 
                                ...glassChatBubble(isUser ? 'user' : 'model'), 
                                flexDirection: isUser ? 'row-reverse' : 'row',
                                opacity: isTool ? 0.85 : 1 // Slightly fade tool messages
                            }}>
                                <Avatar sx={{
                                    width: 32,
                                    height: 32,
                                    ml: isUser ? 1.5 : 0,
                                    mr: isUser ? 0 : 1.5,
                                    bgcolor: isUser 
                                        ? alpha(theme.palette.primary.main, 0.7) 
                                        : isTool
                                            ? alpha(theme.palette.success.main, 0.7)
                                            : theme.palette.text.secondary,
                                    color: isUser ? theme.palette.primary.contrastText : theme.palette.background.default,
                                    fontSize: '1rem'
                                }}>
                                    {isUser 
                                        ? <AccountCircleOutlinedIcon fontSize="small" /> 
                                        : isTool
                                            ? <BuildIcon fontSize="small" />
                                            : <SmartToyOutlinedIcon fontSize="small" />}
                                </Avatar>
                                <Box sx={{ overflow: 'hidden', flex: 1 }}>
                                    <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {renderMessageContent(message)}
                                        {/* Display loading indicator within the bubble if message is loading */}
                                        {message.isLoading && <CircularProgress size={16} sx={{ ml: 1, verticalAlign: 'middle' }} />}
                                        {/* Display error within the bubble */}
                                        {message.error && <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem', p: '2px 8px' }}>{message.error}</Alert>}
                                    </Box>
                                    {/* Display model used */}
                                    {message.modelUsed && message.role === 'model' && (
                                        <Chip 
                                            label={message.modelUsed.split('/').pop()} 
                                            size="small"
                                            sx={{ 
                                                mt: 0.5, 
                                                height: 20, 
                                                fontSize: '0.65rem',
                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                                color: theme.palette.text.secondary
                                            }}
                                        />
                                    )}
                                </Box>
                            </Paper>
                        </Box>
                    );
                })}

                {/* Show loading indicator after user message if waiting for first response chunk */}
                {isLoading && displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === 'user' && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, width: '100%' }}>
                        <Paper sx={{ ...glassChatBubble('model'), flexDirection: 'row', alignItems: 'center', p: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: theme.palette.text.secondary, color: theme.palette.background.default, fontSize: '1rem' }}>
                                <SmartToyOutlinedIcon fontSize="small" />
                            </Avatar>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                Thinking...
                            </Typography>
                        </Paper>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ m: 1, flexShrink: 0 }}>{error}</Alert>
                )}
            </Box>
        </Box>
        </Box>
    );
};

export default CopilotPage;