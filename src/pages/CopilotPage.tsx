import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
    alpha,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Paper,
    Typography,
    useTheme,
    Alert
} from '@mui/material';
import React, { useEffect, useRef } from 'react';
import { useCopilot } from '../hooks/useCopilot';
import { CopilotMessagePart, CopilotRole } from '../types/copilot.types'; // Import CopilotRole

// Remove placeholder data and related types

const CopilotPage: React.FC = () => {
    const theme = useTheme();
    const {
        messages,
        isLoading,
        error,
        loadMoreMessages, // Assuming this exists in context
        hasMoreMessages,  // Assuming this exists in context
    } = useCopilot();

    const chatListRef = useRef<HTMLDivElement>(null);
    const scrollLockRef = useRef(true);

    // Function to render message parts (handling text safely)
    const renderMessageContent = (parts: CopilotMessagePart[]) => {
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
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 10;
                if (isNearBottom) {
                    scrollLockRef.current = true; // Lock if near bottom
                } else if (scrollTop > 0) {
                    // If user scrolled up significantly, keep it unlocked
                    // This check prevents re-locking immediately if content loads while scrolled up
                }
            }
        };

        if (scrollLockRef.current && chatListRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        }

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
            if (scrollHeight - scrollTop - clientHeight > 50) {
                scrollLockRef.current = false; // Unlock if scrolled up
            } else {
                // Don't automatically re-lock here, let useEffect handle it
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
    const displayMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'model');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <Box
                ref={chatListRef}
                onScroll={handleScroll}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: { xs: 1, md: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: 720,
                    mx: 'auto',
                    pt: { xs: '70px', md: '80px' },
                    pb: 2,
                }}
            >
                {hasMoreMessages && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                        <Button onClick={loadMoreMessages} disabled={isLoading} size="small">
                            Load More
                        </Button>
                    </Box>
                )}

                {displayMessages.map((message) => (
                    <Box
                        key={message.id}
                        sx={{
                            display: 'flex',
                            // Cast role here after filtering
                            justifyContent: (message.role as 'user' | 'model') === 'user' ? 'flex-end' : 'flex-start',
                            mb: 2,
                            width: '100%',
                        }}
                    >
                        {message.parts.length > 0 && message.parts.some(p => 'text' in p && p.text?.trim()) && (
                             <Paper sx={{ ...glassChatBubble(message.role as 'user' | 'model'), flexDirection: (message.role as 'user' | 'model') === 'user' ? 'row-reverse' : 'row' }}>
                                <Avatar sx={{
                                    width: 32,
                                    height: 32,
                                    ml: message.role === 'user' ? 1.5 : 0,
                                    mr: message.role === 'user' ? 0 : 1.5,
                                    mt: 0.5,
                                    bgcolor: message.role === 'user' ? alpha(theme.palette.common.white, 0.3) : theme.palette.text.secondary,
                                    color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.background.default,
                                    fontSize: '1rem'
                                }}>
                                    {message.role === 'user' ? <AccountCircleOutlinedIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
                                </Avatar>
                                <Box>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {/* Pass the correct type to renderMessageContent */}
                                        {renderMessageContent(message.parts as CopilotMessagePart[])}
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                    </Box>
                ))}

                 {isLoading && displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === 'user' && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, width: '100%' }}>
                         <Paper sx={{ ...glassChatBubble('model'), flexDirection: 'row', alignItems: 'center', p: 1 }}>
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
                    <Alert severity="error" sx={{ mt: 1, maxWidth: '100%', mx: 'auto' }}>
                        {error}
                    </Alert>
                )}
            </Box>
        </Box>
    );
};

export default CopilotPage;