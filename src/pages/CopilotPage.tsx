import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NoteIcon from '@mui/icons-material/Note';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
    alpha,
    Avatar,
    Box,
    Collapse,
    Divider,
    Drawer,
    IconButton,
    List, ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

// Message and context types
interface Message {
    id: string;
    sender: 'user' | 'copilot';
    text: string;
    timestamp: string;
}

// Placeholder data
const messages: Message[] = [
    { id: '1', sender: 'copilot', text: 'Hello! How can I help you study today?', timestamp: '10:30 AM' },
    { id: '2', sender: 'user', text: 'Can you explain the concept of closures in JavaScript?', timestamp: '10:31 AM' },
    { id: '3', sender: 'copilot', text: 'Certainly! A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function\'s scope from an inner function. In JavaScript, closures are created every time a function is created, at function creation time.', timestamp: '10:32 AM' },
    { id: '4', sender: 'user', text: 'Thanks! That makes sense.', timestamp: '10:33 AM' },
    { id: '5', sender: 'user', text: 'Can you give me an example of a closure?', timestamp: '10:34 AM' },
    { id: '6', sender: 'copilot', text: 'Absolutely! Here is a simple example:\n\nfunction makeAdder(x) {\n  return function(y) {\n    return x + y;\n  };\n}\n\nconst add5 = makeAdder(5);\nconsole.log(add5(2)); // 7\n\nIn this example, add5 is a closure that remembers the value of x (which is 5) even after makeAdder has finished executing.', timestamp: '10:34 AM' },
    { id: '7', sender: 'user', text: 'So the inner function can access variables from the outer function even after the outer function has returned?', timestamp: '10:35 AM' },
    { id: '8', sender: 'copilot', text: 'Exactly! That\'s the power of closures. The inner function retains access to the variables of the outer function, even after the outer function has completed execution.', timestamp: '10:35 AM' },
    { id: '9', sender: 'user', text: 'Are closures used a lot in JavaScript?', timestamp: '10:36 AM' },
    { id: '10', sender: 'copilot', text: 'Yes, closures are very common in JavaScript. They are used for data privacy, event handlers, callback functions, and more. For example, when you use setTimeout or setInterval, you are often using closures.', timestamp: '10:36 AM' },
    { id: '11', sender: 'user', text: 'Can you show me how closures are used for data privacy?', timestamp: '10:37 AM' },
    { id: '12', sender: 'copilot', text: 'Sure! Here\'s an example using closures to create private variables:\n\nfunction Counter() {\n  let count = 0;\n  return {\n    increment: function() { count++; return count; },\n    decrement: function() { count--; return count; },\n    getCount: function() { return count; }\n  };\n}\n\nconst counter = Counter();\nconsole.log(counter.increment()); // 1\nconsole.log(counter.getCount()); // 1\n\nHere, count is not accessible from outside the Counter function, but the returned methods can access and modify it.', timestamp: '10:37 AM' },
    { id: '13', sender: 'user', text: 'That\'s really helpful. What about event handlers?', timestamp: '10:38 AM' },
    { id: '14', sender: 'copilot', text: 'Great question! Closures are often used in event handlers to remember the state at the time the handler was created. For example:\n\nfor (var i = 0; i < 3; i++) {\n  setTimeout(function() {\n    console.log(i);\n  }, 1000);\n}\n\nThis will print 3 three times, because the variable i is shared. But if you use a closure:\n\nfor (var i = 0; i < 3; i++) {\n  (function(j) {\n    setTimeout(function() {\n      console.log(j);\n    }, 1000);\n  })(i);\n}\n\nNow it prints 0, 1, 2 as expected.', timestamp: '10:38 AM' },
    { id: '15', sender: 'user', text: 'Why does the first example print 3 three times?', timestamp: '10:39 AM' },
    { id: '16', sender: 'copilot', text: 'Because the variable i is not block-scoped (with var), so by the time the setTimeout callbacks run, the loop has finished and i is 3. All callbacks reference the same i. Using a closure (or let instead of var) captures the value at each iteration.', timestamp: '10:39 AM' },
    { id: '17', sender: 'user', text: 'If I use let instead of var, will it work?', timestamp: '10:40 AM' },
    { id: '18', sender: 'copilot', text: 'Yes! let is block-scoped, so each iteration of the loop gets its own i. This means the setTimeout callbacks will print 0, 1, and 2 as expected.', timestamp: '10:40 AM' },
    { id: '19', sender: 'user', text: 'Awesome. Can closures cause memory leaks?', timestamp: '10:41 AM' },
    { id: '20', sender: 'copilot', text: 'Closures themselves do not cause memory leaks, but if a closure holds a reference to a large object that is no longer needed, it can prevent that object from being garbage collected. So, be mindful of what you keep in closures.', timestamp: '10:41 AM' },
    { id: '21', sender: 'user', text: 'Thanks for the detailed explanation! Can you summarize closures in one sentence?', timestamp: '10:42 AM' },
    { id: '22', sender: 'copilot', text: 'A closure is a function that remembers and can access variables from outside its own scope, even after the outer function has finished executing.', timestamp: '10:42 AM' },
    { id: '23', sender: 'user', text: 'Perfect. Now, can you tell me about promises in JavaScript?', timestamp: '10:43 AM' },
    { id: '24', sender: 'copilot', text: 'Of course! A Promise is an object representing the eventual completion or failure of an asynchronous operation. It allows you to write asynchronous code in a more manageable way, avoiding callback hell.', timestamp: '10:43 AM' },
    { id: '25', sender: 'user', text: 'How do I create a promise?', timestamp: '10:44 AM' },
    { id: '26', sender: 'copilot', text: 'You can create a promise using the Promise constructor:\n\nconst myPromise = new Promise((resolve, reject) => {\n  // Do something async\n  if (success) {\n    resolve(result);\n  } else {\n    reject(error);\n  }\n});', timestamp: '10:44 AM' },
    { id: '27', sender: 'user', text: 'How do I use then and catch?', timestamp: '10:45 AM' },
    { id: '28', sender: 'copilot', text: 'You can use .then() to handle resolved values and .catch() to handle errors:\n\nmyPromise.then(result => {\n  // handle result\n}).catch(error => {\n  // handle error\n});', timestamp: '10:45 AM' },
    { id: '29', sender: 'user', text: 'What about async/await?', timestamp: '10:46 AM' },
    { id: '30', sender: 'copilot', text: 'Async/await is syntax sugar over promises. You can write asynchronous code that looks synchronous:\n\nasync function fetchData() {\n  try {\n    const result = await myPromise;\n    // handle result\n  } catch (error) {\n    // handle error\n  }\n}', timestamp: '10:46 AM' },
    { id: '31', sender: 'user', text: 'Thank you so much! This has been really helpful.', timestamp: '10:47 AM' },
    { id: '32', sender: 'copilot', text: 'You\'re welcome! Let me know if you have any more questions or need further explanations.', timestamp: '10:47 AM' },
    // Add more messages if you want it even longer!
];
export interface ContextCategory {
    id: string;
    name: string;
    items: ContextItem[];
}
export interface ContextItem {
    id: string;
    name: string;
}
export const contextCategories: ContextCategory[] = [
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

export interface CopilotPageProps {
    input: string,
    contexts: ContextItem[],
    attachContextOpen: boolean,
};

const CopilotPage: React.FC<CopilotPageProps & { setCopilot: React.Dispatch<React.SetStateAction<CopilotPageProps>> }> = ({ input, contexts, attachContextOpen, setCopilot }) => {
    const theme = useTheme();
    
    const chatListRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on mount or when messages change
    useEffect(() => {
        if (chatListRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        }
    }, [messages.length]);

    const glassChatBubble = (sender: 'user' | 'copilot') => ({
        background: sender === 'user' ? alpha(theme.palette.primary.main, 0.2) : theme.palette.background.paper,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: `0 4px 16px 0 ${alpha(theme.palette.common.black, 0.1)}`,
        borderRadius: '20px',
        borderTopLeftRadius: sender === 'copilot' ? '4px' : '20px',
        borderTopRightRadius: sender === 'user' ? '4px' : '20px',
        p: 1.5,
        maxWidth: { md: '75%', xs: '95%' },
        display: 'flex',
        alignItems: 'flex-start',
    });

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', m: {xs: 1, md: 4} }}>
            {/* Main chat area */}
            {/* Scrollable chat list, fills available space above chatbar */}
            <Box
                ref={chatListRef}
                sx={{
                    width: '100%',
                    maxWidth: 720,
                    flexGrow: 1,
                    pt: {xs: 10, md: 0}, // leave space for appbar
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {messages.map((message) => (
                    <Box
                        key={message.id}
                        sx={{
                            display: 'flex',
                            justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                            mb: 2,
                            width: '100%',
                        }}
                    >
                        <Paper sx={{ ...glassChatBubble(message.sender), flexDirection: message.sender === 'user' ? 'row-reverse' : 'row' }}>
                            <Avatar sx={{
                                width: 32,
                                height: 32,
                                ml: message.sender === 'user' ? 1.5 : 0,
                                mr: message.sender === 'user' ? 0 : 1.5,
                                mt: 0.5,
                                bgcolor: message.sender === 'user' ? alpha(theme.palette.common.white, 0.3) : theme.palette.text.secondary,
                                color: message.sender === 'user' ? theme.palette.primary.contrastText : theme.palette.background.default,
                                fontSize: '1rem'
                            }}>
                                {message.sender === 'user' ? <AccountCircleOutlinedIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
                            </Avatar>
                            <Box>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {message.text}
                                </Typography>
                                <Typography variant="caption" sx={{
                                    display: 'block',
                                    textAlign: 'right',
                                    mt: 0.5,
                                    color: message.sender === 'user' ? alpha(theme.palette.primary.contrastText, 0.7) : 'text.secondary',
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
    );
};

export default CopilotPage;