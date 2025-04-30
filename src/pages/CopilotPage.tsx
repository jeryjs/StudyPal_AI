import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
    Alert,
    alpha,
    Avatar,
    Box,
    CircularProgress,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useRef } from 'react';
import { useCopilot } from '@hooks/useCopilot';
import { CopilotMessage } from '@type/copilot.types';

const CopilotPage: React.FC = () => {
    const theme = useTheme();
    const {
        activeChat,
        isLoading,
        error,
    } = useCopilot();

    const chatListRef = useRef<HTMLDivElement>(null);
    const scrollLockRef = useRef(true);

    const messages = activeChat?.messages || [];

    // Function to render message parts (handling text safely)
    const renderMessageContent = (parts: CopilotMessage['parts']) => {
        // Concatenate text parts, ignoring others for now
        return parts
            .map(part => ('text' in part ? part.text : '')) // Safely access text
            .join('');
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

    // Filter messages to display only user and model roles
    // Tool messages are not typically displayed directly in the main chat flow
    const displayMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'model');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
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

                {displayMessages.map((message) => (
                    <Box
                        key={message.id}
                        sx={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                            mb: 2,
                            width: '100%',
                        }}
                    >
                        {/* Render only if there are text parts to display */}
                        {message.parts.length > 0 && message.parts.some(p => 'text' in p && p.text?.trim()) && (
                            <Paper sx={{ ...glassChatBubble(message.role as 'user' | 'model'), flexDirection: (message.role as 'user' | 'model') === 'user' ? 'row-reverse' : 'row' }}>
                                <Avatar sx={{
                                    width: 32,
                                    height: 32,
                                    ml: message.role === 'user' ? 1.5 : 0,
                                    mr: message.role === 'user' ? 0 : 1.5,
                                    bgcolor: message.role === 'user' ? alpha(theme.palette.primary.main, 0.7) : theme.palette.text.secondary, // Stronger user avatar color
                                    color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.background.default,
                                    fontSize: '1rem'
                                }}>
                                    {message.role === 'user' ? <AccountCircleOutlinedIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
                                </Avatar>
                                <Box sx={{ overflow: 'hidden' }}> {/* Prevent long text from breaking layout */}
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {renderMessageContent(message.parts)}
                                        {/* Display loading indicator within the bubble if message is loading */}
                                        {message.isLoading && <CircularProgress size={16} sx={{ ml: 1, verticalAlign: 'middle' }} />}
                                        {/* Display error within the bubble */}
                                        {message.error && <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem', p: '2px 8px' }}>{message.error}</Alert>}
                                    </Typography>
                                    {/* Optionally display model used */}
                                    {message.modelUsed && message.role === 'model' && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
                                            Model: {message.modelUsed.split('/').pop()} {/* Show short model name */}
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>
                        )}
                        {/* Handle Function Call/Response Visualization (Optional/Future) */}
                        {/* {message.role === 'tool' && ... } */}
                        {/* {message.role === 'model' && message.parts.some(p => 'functionCall' in p) && ... } */}
                    </Box>
                ))}

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
    );
};

export default CopilotPage;