/**
 * Chat History Sidebar - Displays and manages chat sessions
 * 
 * Features:
 * - Lists all chat sessions sorted by last modified date
 * - Shows message count and time since last activity
 * - Supports chat navigation, deletion, and export
 * - Export creates JSON file with full chat history
 * - Responsive design with mobile drawer support
 */

import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {
    Box,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    Tooltip,
    Typography,
    alpha,
    useTheme,
    Divider
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useCopilot } from '@hooks/useCopilot';
import { Chat } from '@type/copilot.types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router';

interface ChatHistorySidebarProps {
    onClose?: () => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ onClose }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const currentChatId = searchParams.get('id');
    
    const { listChats, deleteChat, startNewChat, activeChat, exportChat } = useCopilot();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChats();
    }, [activeChat]); // Reload when active chat changes

    const loadChats = async () => {
        setLoading(true);
        try {
            const chatList = await listChats();
            // Sort by last modified, most recent first
            chatList.sort((a, b) => b.lastModified - a.lastModified);
            setChats(chatList);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChatClick = (chatId: string) => {
        navigate(`/copilot?id=${chatId}`, { preventScrollReset: true });
        onClose?.();
    };

    const handleNewChat = async () => {
        try {
            const newChatId = await startNewChat();
            navigate(`/copilot?id=${newChatId}`, { preventScrollReset: true });
            onClose?.();
        } catch (error) {
            console.error('Failed to start new chat:', error);
        }
    };

    const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            try {
                await deleteChat(chatId);
                await loadChats();
            } catch (error) {
                console.error('Failed to delete chat:', error);
            }
        }
    };

    const handleExportChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await exportChat(chatId);
        } catch (error) {
            console.error('Failed to export chat:', error);
        }
    };

    return (
        <Paper
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ChatIcon />
                        Chat History
                    </Typography>
                    <Tooltip title="New Chat">
                        <IconButton onClick={handleNewChat} size="small" color="primary">
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Chat List */}
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {loading ? (
                    <ListItem>
                        <ListItemText secondary="Loading chats..." />
                    </ListItem>
                ) : chats.length === 0 ? (
                    <ListItem>
                        <ListItemText 
                            secondary="No chat history yet. Start a new conversation!" 
                            sx={{ textAlign: 'center', color: 'text.secondary' }}
                        />
                    </ListItem>
                ) : (
                    chats.map((chat) => (
                        <React.Fragment key={chat.id}>
                            <ListItemButton
                                onClick={() => handleChatClick(chat.id)}
                                selected={currentChatId === chat.id}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                                    },
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: currentChatId === chat.id ? 600 : 400,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {chat.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {formatDistanceToNow(chat.lastModified, { addSuffix: true })}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                {chat.messages.length} messages
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleExportChat(chat.id, e)}
                                        sx={{
                                            opacity: 0.6,
                                            '&:hover': { opacity: 1, color: 'info.main' },
                                        }}
                                    >
                                        <FileDownloadIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDeleteChat(chat.id, e)}
                                        sx={{
                                            opacity: 0.6,
                                            '&:hover': { opacity: 1, color: 'error.main' },
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </ListItemButton>
                            <Divider />
                        </React.Fragment>
                    ))
                )}
            </List>
        </Paper>
    );
};

export default ChatHistorySidebar;
