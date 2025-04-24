import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Avatar, useTheme, alpha, 
  Drawer, List, ListItem, ListItemText, ListItemIcon, 
  Collapse, IconButton, Divider
} from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'; // Copilot icon
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'; // User icon
import AttachFileIcon from '@mui/icons-material/AttachFile'; // Attach icon
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import NoteIcon from '@mui/icons-material/Note';

// TODO: Replace with actual message data structure
interface Message {
    id: string;
    sender: 'user' | 'copilot';
    text: string;
    timestamp: string;
}

// Context data structure
interface ContextCategory {
    id: string;
    name: string;
    items: ContextItem[];
}

interface ContextItem {
    id: string;
    name: string;
}

// Placeholder messages
const messages: Message[] = [
    { id: '1', sender: 'copilot', text: 'Hello! How can I help you study today?', timestamp: '10:30 AM' },
    { id: '2', sender: 'user', text: 'Can you explain the concept of closures in JavaScript?', timestamp: '10:31 AM' },
    { id: '3', sender: 'copilot', text: 'Certainly! A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function\'s scope from an inner function. In JavaScript, closures are created every time a function is created, at function creation time.', timestamp: '10:32 AM' },
     { id: '4', sender: 'user', text: 'Thanks! That makes sense.', timestamp: '10:33 AM' },
];

// Placeholder context categories
const contextCategories: ContextCategory[] = [
    {
        id: 'notes',
        name: 'My Notes',
        items: [
            { id: 'n1', name: 'JavaScript Basics' },
            { id: 'n2', name: 'React Fundamentals' },
            { id: 'n3', name: 'TypeScript Types' },
        ]
    },
    {
        id: 'documents',
        name: 'Documents',
        items: [
            { id: 'd1', name: 'CS101 Lecture Notes' },
            { id: 'd2', name: 'Study Guide' },
        ]
    },
    {
        id: 'references',
        name: 'References',
        items: [
            { id: 'r1', name: 'MDN Web Docs' },
            { id: 'r2', name: 'JavaScript: The Good Parts' },
        ]
    },
];

const CopilotPage: React.FC = () => {
    const theme = useTheme();
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [sidebarWidth, setSidebarWidth] = useState(280); // Fixed width for the sidebar

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleAttach = (item: ContextItem) => {
        // TODO: Implement attachment functionality
        console.log(`Attaching item: ${item.name}`);
    };

    // Glassmorphism style for chat bubbles (adapted)
    const glassChatBubble = (sender: 'user' | 'copilot') => ({
        background: alpha(sender === 'user' ? theme.palette.primary.main : theme.palette.background.paper, 0.6), // Adjusted alpha and colors
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: `0 4px 16px 0 ${alpha(theme.palette.common.black, 0.1)}`,
        borderRadius: '20px', // iOS-like rounded corners
        borderTopLeftRadius: sender === 'copilot' ? '4px' : '20px', // Specific corner adjustments
        borderTopRightRadius: sender === 'user' ? '4px' : '20px',
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        p: 1.5,
        maxWidth: '75%',
        color: sender === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary, // Ensure text contrast
        display: 'flex',
        alignItems: 'flex-start', // Align icon with top of text
    });


    return (
        <Box sx={{ height: '100%', display: 'flex' }}>
            {/* Main chat area */}
            <Box sx={{ 
                flexGrow: 1, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                p: { xs: 2, md: 3 } 
            }}>
                {/* Message List */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 1 /* Padding for scrollbar */ }}>
                    {messages.map((message) => (
                        <Box
                            key={message.id}
                            sx={{
                                display: 'flex',
                                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                                mb: 2,
                            }}
                        >
                            {/* Apply the new style */}
                            <Paper sx={glassChatBubble(message.sender)}>
                                <Avatar sx={{
                                    width: 32,
                                    height: 32,
                                    mr: 1.5,
                                    mt: 0.5, // Align avatar slightly lower
                                    bgcolor: message.sender === 'user' ? alpha(theme.palette.common.white, 0.3) : theme.palette.text.secondary, // Adjust avatar background for user
                                    color: message.sender === 'user' ? theme.palette.primary.contrastText : theme.palette.background.default, // Adjust icon color
                                    fontSize: '1rem'
                                }}>
                                    {message.sender === 'user' ? <AccountCircleOutlinedIcon fontSize="small"/> : <SmartToyOutlinedIcon fontSize="small"/>}
                                </Avatar>
                                <Box>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {message.text}
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                        display: 'block', 
                                        textAlign: 'right', 
                                        mt: 0.5, 
                                        color: message.sender === 'user' ? alpha(theme.palette.primary.contrastText, 0.7) : 'text.secondary', // Adjust timestamp color
                                        fontSize: '0.7rem' 
                                    }}>
                                        {message.timestamp}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Box>
                    ))}
                </Box>

                {/* Input is handled by the Chatbar component */}
            </Box>

            <IconButton
                onClick={() => setSidebarWidth(sidebarWidth ? 0 : 280)} // Toggle sidebar width
                sx={{ 
                    position: 'absolute', 
                    right: 16, 
                    bottom: 16, 
                    zIndex: 10000003, 
                    backgroundColor: theme.palette.background.paper, 
                    boxShadow: theme.shadows[2], 
                    borderRadius: '50%', 
                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) } 
                }}
            >
                <AttachFileIcon />
            </IconButton>

            {/* Context Sidebar */}
            <Drawer
                variant="persistent"
                anchor="right"
                ModalProps={{ keepMounted: true }} // Better open performance on mobile
                open={!!sidebarWidth}
                sx={{
                    width: sidebarWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: sidebarWidth,
                        position: 'relative',
                        borderLeft: `1px solid ${theme.palette.divider}`,
                        boxSizing: 'border-box',
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
                            <ListItem 
                                onClick={() => toggleCategory(category.id)}
                                sx={{ py: 1 }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <NoteIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={category.name} />
                                {expandedCategories[category.id] ? 
                                    <ExpandLessIcon /> : 
                                    <ExpandMoreIcon />
                                }
                            </ListItem>
                            
                            <Collapse in={expandedCategories[category.id]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {category.items.map((item) => (
                                        <ListItem 
                                            key={item.id} 
                                            sx={{ 
                                                pl: 4,
                                                py: 0.5,
                                                '&:hover .attach-icon': {
                                                    opacity: 1,
                                                }
                                            }}
                                        >
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleAttach(item)}
                                                className="attach-icon"
                                                sx={{ 
                                                    mr: 1, 
                                                    opacity: 0.3,
                                                    transition: 'opacity 0.2s'
                                                }}
                                            >
                                                <AttachFileIcon fontSize="small" />
                                            </IconButton>
                                            <ListItemText 
                                                primary={item.name} 
                                                primaryTypographyProps={{ 
                                                    variant: 'body2',
                                                    noWrap: true
                                                }} 
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
        </Box>
    );
};

export default CopilotPage;