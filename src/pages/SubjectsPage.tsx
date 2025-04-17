import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewDayIcon from '@mui/icons-material/ViewDay'; // Icon for Row view
import ViewListIcon from '@mui/icons-material/ViewList'; // Icon for All view
import ViewModuleIcon from '@mui/icons-material/ViewModule'; // Icon for Tabbed view (or Grid)
import {
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Fab,
    Grid,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    MenuItem,
    Paper,
    Popover,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha,
    styled,
    useMediaQuery,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import { generateColorFromString } from '@utils/utils';

// Define types for our subject data
interface Subject {
    id: string;
    name: string;
    categories: string[];
    storage: number;
    lastUpdated: string;
    // color: string; // placeholder - generated on the fly
    // icon: string; // placeholder - using default FolderIcon
}

// --- Styled Components ---

const GlassmorphicPaper = styled(Paper)(({ theme }) => ({
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)', // For Safari
    border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
    borderRadius: theme.shape.borderRadius * 2.5, // More rounded corners
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden', // Ensure content respects border radius
    position: 'relative', // For potential absolute positioned elements inside
    '&:hover': {
        transform: 'translateY(-6px) scale(1.02)',
        boxShadow: `0 16px 40px -12px ${alpha(theme.palette.common.black, 0.2)}`,
    },
}));

const SubjectCard = styled(GlassmorphicPaper)(({ theme, bgcolor }) => ({
    padding: theme.spacing(2.5, 3),
    display: 'flex',
    flexDirection: 'column',
    height: '100%', // Ensure cards in a row have same height
    minHeight: 220, // Minimum height for content
    borderTop: `6px solid ${bgcolor || theme.palette.primary.main}`, // Accent color border
    cursor: 'pointer',
    position: 'relative', // Keep relative for potential future use, but not needed for buttons now
}));

const AddSubjectCard = styled(GlassmorphicPaper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 220,
    border: `2px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
    cursor: 'pointer',
    color: theme.palette.text.secondary,
    background: alpha(theme.palette.background.default, 0.5), // Slightly different background
    '&:hover': {
        background: alpha(theme.palette.primary.main, 0.1),
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main,
        transform: 'translateY(-6px) scale(1.02)', // Keep hover consistent
        boxShadow: `0 16px 40px -12px ${alpha(theme.palette.common.black, 0.2)}`,
    },
    '& .MuiSvgIcon-root': {
        fontSize: '3rem',
        marginBottom: theme.spacing(1.5),
    },
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        background: alpha(theme.palette.background.paper, 0.85),
        backdropFilter: 'blur(15px) saturate(200%)',
        WebkitBackdropFilter: 'blur(15px) saturate(200%)',
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: theme.shape.borderRadius * 3,
        boxShadow: `0 12px 50px -15px ${alpha(theme.palette.common.black, 0.3)}`,
        width: '90%',
        maxWidth: '450px', // Control max width
        padding: theme.spacing(1, 0), // Add some internal vertical padding
    },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
    textAlign: 'center',
    paddingBottom: theme.spacing(1),
    fontWeight: 700,
    fontSize: '1.4rem',
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: theme.spacing(2, 4),
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
    padding: theme.spacing(2, 4, 3),
    justifyContent: 'space-between', // Center buttons
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: theme.shape.borderRadius * 1.5,
        background: alpha(theme.palette.background.default, 0.6),
        '& fieldset': {
            borderColor: alpha(theme.palette.divider, 0.3),
        },
        '&:hover fieldset': {
            borderColor: alpha(theme.palette.primary.main, 0.6),
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main
        },
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary,
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: theme.palette.primary.main,
    },
}));

const PillButton = styled(Button)(({ theme }) => ({
    textTransform: 'none',
    padding: theme.spacing(1.2, 2),
    fontWeight: 600,
    boxShadow: `0 6px 15px -5px ${alpha(theme.palette.primary.main, 0.3)}`,
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease',
    '&:hover': {
        boxShadow: `0 8px 20px -6px ${alpha(theme.palette.primary.main, 0.5)}`,
        transform: 'translateY(-2px)',
    },
    [theme.breakpoints.down('sm')]: {
        fontSize: '0.9rem',
    },
}));

const CancelButton = styled(PillButton)(({ theme }) => ({
    backgroundColor: alpha(theme.palette.background.default, 0.8),
    color: theme.palette.text.secondary,
    boxShadow: `0 6px 15px -5px ${alpha(theme.palette.common.black, 0.1)}`,
    marginRight: theme.spacing(1.5),
    '&:hover': {
        backgroundColor: alpha(theme.palette.background.default, 1),
        boxShadow: `0 8px 20px -6px ${alpha(theme.palette.common.black, 0.15)}`,
    },
    [theme.breakpoints.down('sm')]: {
        fontSize: '0.9rem',
    },
}));

const IconWrapper = styled(Avatar)(({ theme, bgcolor }) => ({
    backgroundColor: alpha(bgcolor || theme.palette.primary.main, 0.15),
    color: bgcolor || theme.palette.primary.main,
    width: 56,
    height: 56,
    '& .MuiSvgIcon-root': { // Ensure icon size is consistent
        fontSize: '1.75rem',
    },
}));

// --- Component ---

const SubjectsPage: React.FC = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // Check for small screens
    const [subjects, setSubjects] = useState<Subject[]>([
        { id: '1', name: 'Quantum Physics', categories: ['Physics', 'Advanced'], storage: 120, lastUpdated: '2 days ago' },
        { id: '2', name: 'Calculus III', categories: ['Mathematics'], storage: 85, lastUpdated: '5 hours ago' },
        { id: '3', name: 'World History 101', categories: ['History', 'Social Science'], storage: 250, lastUpdated: '1 week ago' },
        { id: '4', name: 'Organic Chemistry', categories: ['Chemistry', 'Lab'], storage: 150, lastUpdated: 'yesterday' },
        { id: '5', name: 'Intro to Programming', categories: ['Coding', 'Computer Science'], storage: 50, lastUpdated: '3 days ago' },
        { id: '6', name: 'Spanish II', categories: ['Language'], storage: 30, lastUpdated: '10 hours ago' },
    ]);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectCategories, setNewSubjectCategories] = useState('');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
    const [editedSubjectName, setEditedSubjectName] = useState('');
    const [editedSubjectCategories, setEditedSubjectCategories] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [popoverSubject, setPopoverSubject] = useState<Subject | null>(null);

    // --- State for Display Modes and Categories ---
    const [displayMode, setDisplayMode] = useState<'all' | 'tabbed' | 'row'>(() => {
        return (localStorage.getItem('subjectsDisplayMode') as 'all' | 'tabbed' | 'row') || 'all';
    });
    const [allCategories, setAllCategories] = useState<string[]>([]);
    const [selectedTab, setSelectedTab] = useState<string>('all');

    // --- Effects ---

    // Load/Save displayMode from/to localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('subjectsDisplayMode') as 'all' | 'tabbed' | 'row';
        if (savedMode) {
            setDisplayMode(savedMode);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('subjectsDisplayMode', displayMode);
    }, [displayMode]);

    // Derive unique categories from subjects
    useEffect(() => {
        const categories = new Set<string>();
        subjects.forEach(subject => {
            subject.categories.forEach(cat => categories.add(cat));
        });
        const sortedCategories = Array.from(categories).sort();
        setAllCategories(sortedCategories);
        // Reset tab if the current selection is no longer valid (except 'all')
        if (selectedTab !== 'all' && !sortedCategories.includes(selectedTab)) {
            setSelectedTab('all');
        }
    }, [subjects, selectedTab]);

    // --- Handlers ---

    const handleDisplayModeChange = (
        event: React.MouseEvent<HTMLElement>,
        newMode: 'all' | 'tabbed' | 'row' | null,
    ) => {
        if (newMode !== null) {
            setDisplayMode(newMode);
            setSelectedTab('all'); // Reset tab selection when changing mode
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setSelectedTab(newValue);
    };

    // Calculate the total storage across all subjects
    const totalStorage = subjects.reduce((sum, subject) => sum + subject.storage, 0);

    const handleOpenAddDialog = () => {
        setNewSubjectName('');
        setNewSubjectCategories(''); // Reset category input
        setAddDialogOpen(true);
    };
    const handleCloseAddDialog = () => {
        setAddDialogOpen(false);
    };

    const handleAddSubject = () => {
        const trimmedName = newSubjectName.trim();
        if (trimmedName) {
            const newId = Date.now().toString();
            const categoriesArray = newSubjectCategories
                .split(',')
                .map(cat => cat.trim())
                .filter(cat => cat !== '');

            const newSubject: Subject = {
                id: newId,
                name: trimmedName,
                categories: categoriesArray.length > 0 ? categoriesArray : ['General'],
                storage: 0,
                lastUpdated: 'Just now',
            };
            setSubjects(prevSubjects => [...prevSubjects, newSubject]); // Use functional update
            handleCloseAddDialog();
        }
    };

    const handleSubjectCardClick = (id: string) => {
        console.log(`Navigating to subject ${id}`);
        // TODO: Implement navigation logic
    };

    // --- Edit Subject Logic ---
    const handleEditClick = (event: React.MouseEvent, subject: Subject) => {
        event.stopPropagation();
        setSubjectToEdit(subject);
        setEditedSubjectName(subject.name);
        setEditedSubjectCategories(subject.categories.join(', ')); // Join categories for editing
        setEditDialogOpen(true);
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setSubjectToEdit(null);
    };

    const handleSaveEdit = () => {
        const trimmedName = editedSubjectName.trim();
        if (subjectToEdit && trimmedName) {
            const categoriesArray = editedSubjectCategories
                .split(',')
                .map(cat => cat.trim())
                .filter(cat => cat !== '');

            setSubjects(prevSubjects => prevSubjects.map(s => // Use functional update
                s.id === subjectToEdit.id
                    ? {
                        ...s,
                        name: trimmedName,
                        categories: categoriesArray.length > 0 ? categoriesArray : ['General'],
                    }
                    : s
            ));
            handleCloseEditDialog();
        }
    };

    // --- Delete Subject Logic ---
    const handleDeleteClick = (event: React.MouseEvent, subject: Subject) => {
        event.stopPropagation(); // Prevent card click navigation
        setSubjectToDelete(subject);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSubjectToDelete(null);
    };

    const handleConfirmDelete = () => {
        if (subjectToDelete) {
            setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== subjectToDelete.id)); // Use functional update
            handleCloseDeleteDialog();
        }
    };

    // --- Rendering Logic ---

    // Renders subjects as Cards in a Grid (for larger screens)
    const renderSubjectGrid = (subjectsToRender: Subject[]) => (
        <Grid container spacing={isSmallScreen ? 2 : 3}> {/* Adjust spacing for small screens if needed */}
            {subjectsToRender.map((subject) => {
                const storagePercentage = totalStorage > 0 ? (subject.storage / totalStorage) * 100 : 0;
                const subjectColor = generateColorFromString(subject.name);

                return (
                    <Grid key={subject.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <SubjectCard onClick={() => handleSubjectCardClick(subject.id)}>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <IconWrapper>
                                    <FolderIcon /> {/* Default icon */}
                                </IconWrapper>
                                {/* More Options Menu */}
                                <Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const anchor = e.currentTarget;
                                            setAnchorEl(anchor);
                                            setPopoverSubject(subject);
                                        }}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                    <Popover
                                        open={Boolean(anchorEl) && popoverSubject?.id === subject.id}
                                        anchorEl={anchorEl}
                                        onClose={() => {
                                            setAnchorEl(null);
                                            setPopoverSubject(null);
                                        }}
                                        anchorOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'right',
                                        }}
                                        transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                    >
                                        <MenuItem
                                            onClick={(e) => {
                                                handleEditClick(e, subject);
                                                setAnchorEl(null);
                                            }}
                                        >
                                            <EditIcon fontSize="small" sx={{ mr: 1 }} />
                                            Edit
                                        </MenuItem>
                                        <MenuItem
                                            onClick={(e) => {
                                                handleDeleteClick(e, subject);
                                                setAnchorEl(null);
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                                            Delete
                                        </MenuItem>
                                    </Popover>
                                </Box>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, flexGrow: 1 }}>
                                {subject.name}
                            </Typography>
                            {/* Removed categories Box */}

                            {/* Storage Progress Bar */}
                            <Tooltip title={`Storage: ${subject.storage} MB (${storagePercentage.toFixed(1)}% of total)`}>
                                <Box sx={{ width: '100%', mb: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={storagePercentage}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: alpha(subjectColor, 0.2),
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: subjectColor,
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: 'text.secondary' }}>
                                        {subject.storage} MB Used
                                    </Typography>
                                </Box>
                            </Tooltip>

                            <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'flex-end', mt: 'auto', mb: 1 }}>
                                Updated: {subject.lastUpdated}
                            </Typography>
                        </SubjectCard>
                    </Grid>
                );
            })}
            {/* Conditionally render Add Card if the filtered list is empty */}
            {subjectsToRender.length === 0 && displayMode !== 'row' && ( // Avoid showing in row view if category is empty
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <AddSubjectCard onClick={handleOpenAddDialog}>
                        <AddIcon />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Add Subject</Typography>
                        {selectedTab !== 'all' && <Typography variant="body2">to '{selectedTab}'</Typography>}
                    </AddSubjectCard>
                </Grid>
            )}
        </Grid>
    );

    // Renders subjects as a List (for smaller screens)
    const renderSubjectList = (subjectsToRender: Subject[]) => (
        <Paper sx={{ background: alpha(theme.palette.background.paper, 0.7), backdropFilter: 'blur(10px)', borderRadius: 2 }}>
            <List disablePadding>
                {subjectsToRender.map((subject, index) => {
                    return (
                        <React.Fragment key={subject.id}>
                            <ListItem
                                onClick={() => handleSubjectCardClick(subject.id)}
                                sx={{ py: 1.5, px: 2 }}
                            >
                                <ListItemAvatar>
                                    <IconWrapper sx={{ width: 48, height: 48 }}> {/* Slightly smaller avatar */}
                                        <FolderIcon fontSize="small" />
                                    </IconWrapper>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={subject.name}
                                    secondary={
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            Updated: {subject.lastUpdated}
                                        </Typography>
                                    }
                                    primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                                />
                                <ListItemSecondaryAction sx={{ right: 12 }}> {/* Adjust position */}
                                    <Tooltip title="Edit Subject">
                                        <IconButton edge="end" aria-label="edit" size="small" onClick={(e) => handleEditClick(e, subject)} sx={{ mr: 0.5 }}>
                                            <EditIcon fontSize="small" color="info" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Subject">
                                        <IconButton edge="end" aria-label="delete" size="small" onClick={(e) => handleDeleteClick(e, subject)}>
                                            <DeleteIcon fontSize="small" color="error" />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemSecondaryAction>
                            </ListItem>
                            {index < subjectsToRender.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                    );
                })}
                {/* Add Subject Item in List */}
                {subjectsToRender.length === 0 && displayMode !== 'row' && (
                    <ListItem onClick={handleOpenAddDialog} sx={{ py: 2, justifyContent: 'center', color: 'text.secondary' }}>
                        <AddIcon sx={{ mr: 1 }} />
                        <ListItemText primary={`Add Subject ${selectedTab !== 'all' ? `to '${selectedTab}'` : ''}`} primaryTypographyProps={{ variant: 'body1', fontWeight: 500 }} />
                    </ListItem>
                )}
            </List>
        </Paper>
    );

    const getFilteredSubjects = () => {
        if (displayMode !== 'tabbed' || selectedTab === 'all') {
            return subjects;
        }
        return subjects.filter(subject => subject.categories.includes(selectedTab));
    };

    return (
        <Box sx={{ m: { xs: isSmallScreen ? 1 : 2, md: 4 }, position: 'relative', minHeight: 'calc(100vh - 120px)' }}>
            {/* Header with Title and Display Mode Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isSmallScreen ? 2 : 4, px: isSmallScreen ? 1 : 0 }}>
                <Typography variant={isSmallScreen ? "h4" : "h3"} /* Adjust title size */ gutterBottom sx={{ /* ... title styles */ }}>
                    My Subjects
                </Typography>
                <ToggleButtonGroup
                    value={displayMode}
                    exclusive
                    onChange={handleDisplayModeChange}
                    aria-label="display mode"
                    size="small"
                >
                    <ToggleButton value="all" aria-label="show all">
                        <Tooltip title="Show All"><ViewListIcon /></Tooltip>
                    </ToggleButton>
                    <ToggleButton value="tabbed" aria-label="tabbed view">
                        <Tooltip title="View by Category Tab"><ViewModuleIcon /></Tooltip>
                    </ToggleButton>
                    <ToggleButton value="row" aria-label="row view">
                        <Tooltip title="View by Category Row"><ViewDayIcon /></Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Conditional Tabs */}
            {displayMode === 'tabbed' && (
                <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: isSmallScreen ? 2 : 3 }}>
                    <Tabs
                        value={selectedTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="subject categories tabs"
                    >
                        <Tab label="All" value="all" />
                        {allCategories.map(category => (
                            <Tab key={category} label={category} value={category} />
                        ))}
                    </Tabs>
                </Box>
            )}

            {/* Conditional Content Rendering based on screen size and display mode */}
            {displayMode === 'row' ? (
                allCategories.map(category => {
                    const categorySubjects = subjects.filter(s => s.categories.includes(category));
                    if (categorySubjects.length === 0) return null; // Don't render empty categories
                    return (
                        <Box key={category} sx={{ mb: isSmallScreen ? 3 : 4 }}>
                            <Typography variant={isSmallScreen ? "h6" : "h5"} /* Adjust heading size */ gutterBottom sx={{ fontWeight: 600, /* ... heading styles */ mb: 2, px: isSmallScreen ? 1 : 0 }}>
                                {category}
                            </Typography>
                            {/* Render List or Grid based on screen size */}
                            {isSmallScreen
                                ? renderSubjectList(categorySubjects)
                                : renderSubjectGrid(categorySubjects)}
                        </Box>
                    );
                })
            ) : (
                // Render List or Grid based on screen size for 'all' and 'tabbed' modes
                isSmallScreen
                    ? renderSubjectList(getFilteredSubjects())
                    : renderSubjectGrid(getFilteredSubjects())
            )}


            {/* Add Subject Card/Item (Only if NO subjects exist at all) */}
            {subjects.length === 0 && (
                isSmallScreen ? (
                    <Paper sx={{ mt: 2, background: alpha(theme.palette.background.paper, 0.7), backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                        <List disablePadding>
                            <ListItem onClick={handleOpenAddDialog} sx={{ py: 2, justifyContent: 'center', color: 'text.secondary' }}>
                                <AddIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Add Your First Subject" primaryTypographyProps={{ variant: 'body1', fontWeight: 500 }} />
                            </ListItem>
                        </List>
                    </Paper>
                ) : (
                    <Grid container spacing={3} sx={{ mt: 0 }}> {/* Ensure no extra margin */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <AddSubjectCard onClick={handleOpenAddDialog}>
                                <AddIcon />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Add Your First Subject</Typography>
                            </AddSubjectCard>
                        </Grid>
                    </Grid>
                )
            )}

            {/* FAB (conditionally rendered based on whether subjects exist) */}
            {subjects.length > 0 && (
                <Tooltip title="Add New Subject">
                    <Fab
                        color="primary"
                        aria-label="add subject"
                        onClick={handleOpenAddDialog}
                        sx={{
                            position: 'fixed',
                            bottom: theme.spacing(4),
                            right: theme.spacing(4),
                            // ... fab styles
                        }}
                    >
                        <AddIcon />
                    </Fab>
                </Tooltip>
            )}

            {/* Dialogs (Add, Edit, Delete) */}
            {/* ... Add Subject Dialog ... */}
            {/* ... Edit Subject Dialog ... */}
            {/* ... Delete Confirmation Dialog ... */}
            <StyledDialog open={addDialogOpen} onClose={handleCloseAddDialog} aria-labelledby="add-subject-dialog-title">
                <IconButton
                    aria-label="close"
                    onClick={handleCloseAddDialog}
                    sx={{ position: 'absolute', right: theme.spacing(2), top: theme.spacing(2), color: theme.palette.grey[500] }}
                > <CloseIcon /> </IconButton>
                <StyledDialogTitle id="add-subject-dialog-title"> Create a New Subject </StyledDialogTitle>
                <StyledDialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}> Enter the name and categories (comma-separated) for your new subject. </Typography>
                    <StyledTextField autoFocus margin="dense" id="subject-name" label="Subject Name" type="text" fullWidth variant="outlined" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} sx={{ mb: 2 }} />
                    <StyledTextField margin="dense" id="subject-categories" label="Categories (comma-separated)" type="text" fullWidth variant="outlined" value={newSubjectCategories} onChange={(e) => setNewSubjectCategories(e.target.value)} sx={{ mb: 3 }} />
                </StyledDialogContent>
                <StyledDialogActions>
                    <CancelButton onClick={handleCloseAddDialog}> Cancel </CancelButton>
                    <PillButton onClick={handleAddSubject} variant="contained" disabled={!newSubjectName.trim()}> Create Subject </PillButton>
                </StyledDialogActions>
            </StyledDialog>

            <StyledDialog open={editDialogOpen} onClose={handleCloseEditDialog} aria-labelledby="edit-subject-dialog-title">
                <IconButton aria-label="close" onClick={handleCloseEditDialog} sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.grey[500] }}> <CloseIcon /> </IconButton>
                <StyledDialogTitle id="edit-subject-dialog-title"> Edit Subject </StyledDialogTitle>
                <StyledDialogContent>
                    <StyledTextField autoFocus margin="dense" id="edit-subject-name" label="Subject Name" type="text" fullWidth variant="outlined" value={editedSubjectName} onChange={(e) => setEditedSubjectName(e.target.value)} sx={{ mb: 2 }} />
                    <StyledTextField margin="dense" id="edit-subject-categories" label="Categories (comma-separated)" type="text" fullWidth variant="outlined" value={editedSubjectCategories} onChange={(e) => setEditedSubjectCategories(e.target.value)} sx={{ mb: 3 }} />
                </StyledDialogContent>
                <StyledDialogActions sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <CancelButton onClick={handleCloseEditDialog} sx={{ flex: 1 }}> Cancel </CancelButton>
                    <PillButton onClick={handleSaveEdit} variant="contained" disabled={!editedSubjectName.trim() || (editedSubjectName.trim() === subjectToEdit?.name && editedSubjectCategories === subjectToEdit?.categories.join(', '))} sx={{ flex: 2 }}> Save Changes </PillButton>
                </StyledDialogActions>
            </StyledDialog>

            <StyledDialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} aria-labelledby="delete-confirm-dialog-title">
                <IconButton aria-label="close" onClick={handleCloseDeleteDialog} sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.grey[500] }}> <CloseIcon /> </IconButton>
                <StyledDialogTitle id="delete-confirm-dialog-title"> Confirm Deletion </StyledDialogTitle>
                <StyledDialogContent>
                    <DialogContentText sx={{ textAlign: 'center', color: theme.palette.text.secondary }}> Are you sure you want to delete the subject "{subjectToDelete?.name}"? This action cannot be undone. </DialogContentText>
                </StyledDialogContent>
                <StyledDialogActions>
                    <CancelButton onClick={handleCloseDeleteDialog}> Cancel </CancelButton>
                    <PillButton onClick={handleConfirmDelete} variant="contained" color="error" sx={{ boxShadow: `0 6px 15px -5px ${alpha(theme.palette.error.main, 0.4)}`, '&:hover': { boxShadow: `0 8px 20px -6px ${alpha(theme.palette.error.main, 0.6)}` } }}> Delete Subject </PillButton>
                </StyledDialogActions>
            </StyledDialog>

        </Box>
    );
};

export default SubjectsPage;