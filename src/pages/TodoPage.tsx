import React, { useState, useMemo } from 'react'; // Added useMemo
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    IconButton,
    Chip,
    useTheme,
    alpha,
    styled,
    Divider,
    Checkbox, // For marking tasks done
    Menu, // For filter options
    MenuItem, // For filter options
    ListItemIcon, // For filter menu icons
    ListItemText, // For filter menu text
    Dialog, // For Add/Edit Task
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField, // For Dialog inputs
    DialogContentText // For Delete Confirmation
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // For Due Date Chip
import SchoolIcon from '@mui/icons-material/School'; // For Subject Chip
import SortIcon from '@mui/icons-material/Sort'; // For Sort option
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // For Date filter
import LabelIcon from '@mui/icons-material/Label'; // For Subject filter

// --- Reusable Styles (Consider moving to a shared styles file) ---

// Glassmorphism style for cards (adapted from HomePage/SubjectsPage)
const glassCard = (theme: any) => ({
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
    borderRadius: '16px', // Consistent rounding
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: `0 12px 40px 0 ${alpha(theme.palette.common.black, 0.15)}`,
    },
    height: '100%', // Ensure cards in a row have same height
    display: 'flex',
    flexDirection: 'column',
});

// Pill button style (from HomePage)
const pillButton = (theme: any) => ({
    borderRadius: '50px', // Make fully rounded
    textTransform: 'none',
    px: 3, // Adjust padding
    py: 1,
    fontWeight: 600,
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
        transform: 'translateY(-2px)',
    }
});

// --- Task Data Interface ---
interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string; // Consider using Date object for sorting
    subject?: string; // Link to subject/category
    completed: boolean;
}

// --- ToDo Page Component ---
const TodoPage: React.FC = () => {
    const theme = useTheme();
    const [tasks, setTasks] = useState<Task[]>([
        { id: '1', title: 'Review Physics Chapter 4 Notes', dueDate: 'Today', subject: 'Physics', completed: false },
        { id: '2', title: 'Complete Math Assignment 3', dueDate: 'Tomorrow', subject: 'Math', completed: false },
        { id: '3', title: 'Prepare Presentation Slides', description: 'Draft slides for history presentation.', dueDate: 'Fri', subject: 'History', completed: true },
        { id: '4', title: 'Read Biology Textbook Ch. 2', dueDate: 'Next Week', subject: 'Biology', completed: false },
        { id: '5', title: 'Practice Spanish Vocabulary', subject: 'Language', completed: false },
    ]);

    // --- Filter/Sort State ---
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const openFilter = Boolean(filterAnchorEl);
    const [sortBy, setSortBy] = useState<string>('default'); // e.g., 'dueDate', 'subject'
    // Add more filter states as needed (e.g., filterBySubject, filterByDateRange)

    // --- Add Task Dialog State ---
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskSubject, setNewTaskSubject] = useState('');

    // --- Edit Task Dialog State (Placeholder) ---
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // --- Delete Confirmation Dialog State (Placeholder) ---
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);


    // --- Filter/Sort Handlers ---
    const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    const handleSort = (criteria: string) => {
        console.log(`Sorting by: ${criteria}`);
        setSortBy(criteria);
        // TODO: Implement actual sorting logic in useMemo below
        handleFilterClose();
    };

    const handleFilter = (type: string) => {
        console.log(`Filtering by: ${type}`);
        // TODO: Implement actual filtering logic (might need more state/dialogs)
        handleFilterClose();
    };

    // --- Add Task Handlers ---
    const handleAddTask = () => {
        // Reset fields before opening
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskDueDate('');
        setNewTaskSubject('');
        setAddDialogOpen(true);
    };

    const handleAddDialogClose = () => {
        setAddDialogOpen(false);
    };

    const handleSaveNewTask = () => {
        if (!newTaskTitle.trim()) return; // Basic validation

        const newTask: Task = {
            id: Date.now().toString(), // Simple unique ID generation
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim() || undefined,
            dueDate: newTaskDueDate.trim() || undefined,
            subject: newTaskSubject.trim() || undefined,
            completed: false,
        };
        setTasks(prevTasks => [newTask, ...prevTasks]); // Add to the beginning
        handleAddDialogClose();
    };

    // --- Toggle Complete Handler ---
    const handleToggleComplete = (taskId: string) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
            )
        );
    };

    // --- Edit Task Handlers (Placeholder) ---
    const handleEditTask = (taskId: string) => {
        const taskToEdit = tasks.find(task => task.id === taskId);
        if (taskToEdit) {
            console.log(`Opening edit dialog for Task ID: ${taskId}`);
            setEditingTask(taskToEdit);
            // Pre-fill edit dialog state here if needed
            setEditDialogOpen(true);
            // TODO: Implement edit dialog UI and state management
        }
    };

    const handleEditDialogClose = () => {
        setEditDialogOpen(false);
        setEditingTask(null);
    };

    const handleUpdateTask = () => {
        console.log("Updating task:", editingTask?.id);
        // TODO: Implement update logic using data from edit dialog state
        handleEditDialogClose();
    };

    // --- Delete Task Handlers (Placeholder) ---
    const handleDeleteTask = (taskId: string) => {
        console.log(`Opening delete confirmation for Task ID: ${taskId}`);
        setTaskToDelete(taskId);
        setConfirmDeleteDialogOpen(true);
        // TODO: Implement confirmation dialog UI
    };

    const handleConfirmDialogClose = () => {
        setConfirmDeleteDialogOpen(false);
        setTaskToDelete(null);
    };

    const handleConfirmDelete = () => {
        if (taskToDelete) {
            console.log(`Deleting Task ID: ${taskToDelete}`);
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete));
        }
        handleConfirmDialogClose();
    };

    // --- Display Logic (with placeholder sorting/filtering) ---
    const displayedTasks = useMemo(() => {
        let sortedTasks = [...tasks];
        // TODO: Implement actual sorting based on `sortBy` state
        if (sortBy === 'dueDate') {
            // Basic placeholder sort - needs proper date parsing/comparison
            sortedTasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
        }
        // TODO: Implement actual filtering based on filter states

        return sortedTasks;
    }, [tasks, sortBy /* Add other filter states here */]);

    return (
        <Box sx={{ m: { xs: 1, md: 4 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    My Tasks
                </Typography>
                <Box>
                     <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<FilterListIcon />}
                        sx={{ ...pillButton(theme), mr: 2, borderColor: theme.palette.secondary.main, color: theme.palette.secondary.main }}
                        onClick={handleFilterClick}
                        aria-controls={openFilter ? 'filter-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={openFilter ? 'true' : undefined}
                    >
                        Filter / Sort
                    </Button>
                    <Menu
                        id="filter-menu"
                        anchorEl={filterAnchorEl}
                        open={openFilter}
                        onClose={handleFilterClose}
                        MenuListProps={{
                          'aria-labelledby': 'filter-button',
                        }}
                        PaperProps={{
                            sx: {
                                borderRadius: '12px',
                                mt: 1,
                                boxShadow: theme.shadows[3],
                            }
                        }}
                    >
                        <MenuItem onClick={() => handleSort('dueDate')}>
                            <ListItemIcon><SortIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Sort by Due Date</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => handleFilter('date')}>
                            <ListItemIcon><CalendarTodayIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Filter by Date</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => handleFilter('subject')}>
                            <ListItemIcon><LabelIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Filter by Subject</ListItemText>
                        </MenuItem>
                    </Menu>
                    {/* <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        sx={pillButton(theme)}
                        onClick={handleAddTask} // Updated onClick
                    >
                        Add New Task
                    </Button> */}
                </Box>
            </Box>

            {/* Task List */}
            <Grid container spacing={3}>
                {displayedTasks.map((task) => (
                    <Grid key={task.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card sx={glassCard(theme)}>
                            <CardContent sx={{ flexGrow: 1, pb: 1 }}> {/* Reduced bottom padding */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Checkbox
                                        icon={<RadioButtonUncheckedIcon sx={{ color: theme.palette.text.disabled }} />}
                                        checkedIcon={<CheckCircleOutlineIcon sx={{ color: theme.palette.success.main }} />}
                                        checked={task.completed}
                                        onChange={() => handleToggleComplete(task.id)}
                                        sx={{ p: 0, mr: 1.5, mt: 0.5 }}
                                        aria-label={`Mark task ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                                    />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 600,
                                                textDecoration: task.completed ? 'line-through' : 'none',
                                                color: task.completed ? 'text.secondary' : 'text.primary',
                                                mb: task.description ? 0.5 : 1.5, // Adjust margin based on description presence
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {task.title}
                                        </Typography>
                                        {task.description && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                                                {task.description}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {task.dueDate && (
                                                <Chip
                                                    icon={<AccessTimeIcon fontSize="small" />}
                                                    label={`${task.dueDate}`}
                                                    size="small"
                                                    variant='outlined'
                                                    sx={{
                                                        borderColor: alpha(theme.palette.warning.main, 0.5),
                                                        color: theme.palette.warning.dark,
                                                        bgcolor: alpha(theme.palette.warning.light, 0.1),
                                                        fontWeight: 500,
                                                    }}
                                                />
                                            )}
                                            {task.subject && (
                                                <Chip
                                                    icon={<SchoolIcon fontSize="small" />}
                                                    label={task.subject}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                                        color: theme.palette.info.dark,
                                                        fontWeight: 500,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                            <Divider sx={{ mt: 'auto' }} /> {/* Push divider to bottom */}
                            <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => handleEditTask(task.id)} aria-label="edit task" sx={{ color: 'text.secondary' }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDeleteTask(task.id)} aria-label="delete task" sx={{ color: theme.palette.error.main }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Card>
                    </Grid>
                ))}
                {displayedTasks.length === 0 && (
                     <Grid size={12}>
                        <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
                            <Typography variant="h6" gutterBottom>No tasks here!</Typography>
                            <Typography>Click "Add New Task" to get started.</Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>

            {/* Add Task Dialog */}
            <Dialog open={addDialogOpen} onClose={handleAddDialogClose} PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>Add New Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="title"
                        label="Task Title"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="description"
                        label="Description (Optional)"
                        type="text"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Grid container spacing={2}>
                        <Grid size={6}>
                             <TextField
                                margin="dense"
                                id="dueDate"
                                label="Due Date (Optional)"
                                type="text" // Consider using a Date Picker component
                                fullWidth
                                variant="outlined"
                                value={newTaskDueDate}
                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                                placeholder="e.g., Tomorrow, Fri, 2024-12-31"
                            />
                        </Grid>
                         <Grid size={6}>
                             <TextField
                                margin="dense"
                                id="subject"
                                label="Subject (Optional)"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={newTaskSubject}
                                onChange={(e) => setNewTaskSubject(e.target.value)}
                                placeholder="e.g., Physics, Math"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={handleAddDialogClose} color="secondary">Cancel</Button>
                    <Button onClick={handleSaveNewTask} variant="contained" disabled={!newTaskTitle.trim()}>Save Task</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Task Dialog (Placeholder Structure) */}
            <Dialog open={editDialogOpen} onClose={handleEditDialogClose} PaperProps={{ sx: { borderRadius: '16px' } }}>
                 <DialogTitle sx={{ fontWeight: 600 }}>Edit Task</DialogTitle>
                 <DialogContent>
                     {/* TODO: Add TextFields pre-filled with editingTask data */}
                     <Typography>Edit form for task: {editingTask?.title}</Typography>
                 </DialogContent>
                 <DialogActions sx={{ p: '16px 24px' }}>
                     <Button onClick={handleEditDialogClose} color="secondary">Cancel</Button>
                     <Button onClick={handleUpdateTask} variant="contained">Update Task</Button>
                 </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog (Placeholder Structure) */}
            <Dialog open={confirmDeleteDialogOpen} onClose={handleConfirmDialogClose} PaperProps={{ sx: { borderRadius: '16px' } }}>
                 <DialogTitle sx={{ fontWeight: 600 }}>Confirm Deletion</DialogTitle>
                 <DialogContent>
                     <DialogContentText>
                         Are you sure you want to delete this task? This action cannot be undone.
                     </DialogContentText>
                 </DialogContent>
                 <DialogActions sx={{ p: '16px 24px' }}>
                     <Button onClick={handleConfirmDialogClose} color="secondary">Cancel</Button>
                     <Button onClick={handleConfirmDelete} variant="contained" color="error">Delete</Button>
                 </DialogActions>
            </Dialog>

        </Box>
    );
};

export default TodoPage;
