// filepath: y:\All-Projects\Study-Pal\src\components\copilot\ChatListSidebar.tsx
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
    Box,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Paper,
    Tooltip,
    Typography
} from '@mui/material';
import { useCopilot } from '@hooks/useCopilot';
import { Chat } from '@type/copilot.types';
import React, { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListSidebarProps {
    // Add any necessary props, e.g., width
}

const ChatListSidebar: React.FC<ChatListSidebarProps> = () => {
    const { activeChat, listChats, setActiveChatId, deleteChat, isLoading: contextLoading } = useCopilot();
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedChats = await listChats();
            // Sort chats by lastModified date, newest first
            fetchedChats.sort((a, b) => b.lastModified - a.lastModified);
            setChats(fetchedChats);
        } catch (err) {
            console.error("Failed to fetch chats:", err);
            setError("Failed to load chat list.");
        } finally {
            setIsLoading(false);
        }
    }, [listChats]);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    // Refetch chats when the active chat changes (e.g., after deletion/creation)
    useEffect(() => {
        // Only refetch if context isn't already loading to avoid redundant fetches
        if (!contextLoading) {
            fetchChats();
        }
    }, [activeChat?.id, contextLoading, fetchChats]);


    const handleDelete = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation(); // Prevent the click from selecting the chat
        if (window.confirm('Are you sure you want to delete this chat?')) {
            try {
                await deleteChat(chatId);
                // List will refresh via useEffect dependency on activeChat.id change
            } catch (err) {
                console.error("Failed to delete chat:", err);
                setError("Failed to delete chat.");
                // Optionally show error to user
            }
        }
    };

    const handleSelectChat = (chatId: string) => {
        if (chatId !== activeChat?.id) {
            setActiveChatId(chatId);
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    return (
        <Paper
            elevation={2}
            sx={{
                width: 280,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden', // Prevent content overflow
                borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            }}
        >
            <ListSubheader sx={{ bgcolor: 'background.paper', pt: 1, pb: 1 }}>
                Chat History
            </ListSubheader>
            <Divider />
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}> {/* Scrollable chat list */}
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                {error && (
                    <Typography color="error" sx={{ p: 2 }}>
                        {error}
                    </Typography>
                )}
                {!isLoading && !error && chats.length === 0 && (
                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        No chats yet.
                    </Typography>
                )}
                {!isLoading && !error && chats.length > 0 && (
                    <List dense disablePadding>
                        {chats.map((chat) => (
                            <ListItem
                                key={chat.id}
                                disablePadding
                                secondaryAction={
                                    <Tooltip title="Delete Chat">
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            size="small"
                                            onClick={(e) => handleDelete(e, chat.id)}
                                            sx={{ mr: 0.5 }} // Adjust margin
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                }
                            >
                                <ListItemButton
                                    onClick={() => handleSelectChat(chat.id)}
                                    selected={activeChat?.id === chat.id}
                                    sx={{
                                        pr: 5, // Add padding to prevent text overlap with button
                                        '&.Mui-selected': {
                                            // Ensure selected style doesn't hide button
                                            backgroundColor: (theme) => theme.palette.action.selected,
                                            '&:hover': {
                                                backgroundColor: (theme) => theme.palette.action.hover,
                                            }
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={chat.title || 'Untitled Chat'}
                                        secondary={`Last activity: ${formatTimestamp(chat.lastModified)}`}
                                        primaryTypographyProps={{
                                            noWrap: true,
                                            sx: { fontWeight: activeChat?.id === chat.id ? 'bold' : 'normal' }
                                        }}
                                        secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Paper>
    );
};

export default ChatListSidebar;
