import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
// import ViewDayIcon from '@mui/icons-material/ViewDay'; // Removed if Row view not implemented
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import {
    Alert, // Keep for error/success messages
    Avatar,
    Box,
    Button,
    Chip, // Keep for categories
    CircularProgress, // Keep for loading states
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Fab,
    Grid,
    IconButton,
    LinearProgress, // Keep for progress display
    List,
    ListItem,
    ListItemAvatar,
    // ListItemSecondaryAction, // Replaced with direct Box in ListItem
    ListItemText,
    MenuItem,
    Paper,
    Popover,
    Snackbar, // Keep for feedback
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
import { formatDistanceToNow } from 'date-fns';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

// Import our hooks and types
import { useCopilot } from '@hooks/useCopilot';
import { useSubjects } from '@hooks/useSubjects';
import { Subject } from '@type/db.types';
import { formatBytes, generateColorFromString } from '@utils/utils';

// --- Styled Components ---

const StyledPaper = styled(Paper)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 2.5,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden', // Ensure content respects border radius
    '&:hover': {
        transform: 'translateY(-6px) scale(1.02)',
        boxShadow: `0 16px 40px -12px ${alpha(theme.palette.common.black, 0.2)}`,
    },
}));

// Pass accentcolor as a transient prop ($accentcolor) to avoid it being passed to the DOM
const SubjectCard = styled(StyledPaper, {
    shouldForwardProp: (prop) => prop !== '$accentcolor',
})<{ $accentcolor?: string }>(({ theme, $accentcolor }) => ({
    padding: theme.spacing(2.5, 3),
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 220,
    borderTop: `6px solid ${$accentcolor || theme.palette.primary.main}`,
    cursor: 'pointer',
    position: 'relative',
}));

const AddSubjectCard = styled(StyledPaper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 220,
    border: `2px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
    cursor: 'pointer',
    color: theme.palette.text.secondary,
    background: alpha(theme.palette.background.default, 0.5),
    '&:hover': {
        background: alpha(theme.palette.primary.main, 0.1),
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main,
        transform: 'translateY(-6px) scale(1.02)',
        boxShadow: `0 16px 40px -12px ${alpha(theme.palette.common.black, 0.2)}`,
    },
    '& .MuiSvgIcon-root': {
        fontSize: '3rem',
        marginBottom: theme.spacing(1.5),
    },
}));

const StyledDialog = styled(Dialog)({
    '& .MuiDialog-paper': {
        width: '90%',
        maxWidth: '600px',
    },
});

const PillButton = styled(Button)({
    borderRadius: '50px', // Pill shape
});


// --- Helper Components ---

interface SubjectCardDisplayProps {
    subject: Subject;
    stats: { chaptersCount: number; materialsCount: number; progress: number; totalSize: number } | null;
    onEdit: (subject: Subject) => void;
    onDelete: (subject: Subject) => void;
    onClick: (subject: Subject) => void;
}

const SubjectCardDisplay: React.FC<SubjectCardDisplayProps> = React.memo(({ subject, stats, onEdit, onDelete, onClick }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    // Use $accentcolor for the styled component prop
    const cardColor = useMemo(() => subject.color || generateColorFromString(subject.name), [subject.color, subject.name]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation(); // Prevent card click
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (event?: React.MouseEvent<HTMLElement>) => {
        event?.stopPropagation(); // Prevent card click if closing via click outside
        setAnchorEl(null);
    };

    const handleEditClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        onEdit(subject);
        handleMenuClose();
    };

    const handleDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        onDelete(subject);
        handleMenuClose();
    };

    const handleCardClick = () => {
        onClick(subject);
    };

    return (
        // Pass color via $accentcolor prop
        <SubjectCard onClick={handleCardClick} $accentcolor={cardColor}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="h6" fontWeight={600} noWrap sx={{ maxWidth: 'calc(100% - 40px)' }}>
                    {subject.name}
                </Typography>
                <IconButton
                    size="small"
                    onClick={handleMenuOpen}
                    sx={{ mt: -0.5, mr: -1 }} // Adjust position
                >
                    <MoreVertIcon />
                </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {/* Display size along with chapter/material count */}
                {stats
                    ? `${stats.chaptersCount} Chapters • ${stats.materialsCount} Materials • ${formatBytes(stats.totalSize)}`
                    : 'Loading stats...'}
            </Typography>

            {/* Always show progress bar area, but maybe hide if progress is 0? Or show as empty. */}
            <Box sx={{ width: '100%', mb: 2, mt: 'auto' }}> {/* Use mt: 'auto' to push progress down */}
                {stats ? (
                    <>
                        <LinearProgress
                            variant="determinate"
                            value={stats.progress}
                            sx={{ height: 8, borderRadius: 4 }} // Slightly thicker bar
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                            {Math.round(stats.progress)}% Complete
                        </Typography>
                    </>
                ) : (
                    <LinearProgress sx={{ height: 8, borderRadius: 4, bgcolor: 'action.disabledBackground' }} /> // Show placeholder bar while loading
                )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end' }}> {/* Keep last updated time */}
                Updated {formatDistanceToNow(subject.lastModified, { addSuffix: true })}
            </Typography>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => handleMenuClose()} // Adjust onClose signature if needed, or keep simple
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { borderRadius: 2, mt: 1 } } }}
            >
                <MenuItem onClick={handleEditClick}>
                    <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
                </MenuItem>
            </Popover>
        </SubjectCard>
    );
});

interface SubjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, categories: string[]) => Promise<void>; // Make async
    initialData?: Subject | null;
    existingCategories: string[];
}

const SubjectDialog: React.FC<SubjectDialogProps> = ({ open, onClose, onSubmit, initialData }) => {
    const [name, setName] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setName(initialData?.name || '');
            setCategories(initialData?.categories || []);
            setNewCategory('');
            setIsSubmitting(false);
            setError(null);
        }
    }, [open, initialData]);

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !categories.includes(trimmed)) {
            setCategories([...categories, trimmed]);
            setNewCategory('');
        }
    };

    const handleRemoveCategory = (categoryToRemove: string) => {
        setCategories(categories.filter(cat => cat !== categoryToRemove));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setError('Subject name cannot be empty.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(name.trim(), categories);
            onClose(); // Close dialog on success
        } catch (err) {
            console.error("Error submitting subject:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsSubmitting(false); // Keep dialog open on error
        }
    };

    return (
        <StyledDialog open={open} onClose={onClose} TransitionProps={{ onExited: () => { setName(''); setCategories([]); setNewCategory(''); setError(null); setIsSubmitting(false); } }}>
            <DialogTitle>{initialData ? 'Edit Subject' : 'Create New Subject'}</DialogTitle>
            <Box component="form" onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="subject-name"
                        label="Subject Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
                        Categories (Optional)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {categories.map(cat => (
                            <Chip
                                key={cat}
                                label={cat}
                                onDelete={() => handleRemoveCategory(cat)}
                                size="small"
                                disabled={isSubmitting}
                            />
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                            margin="dense"
                            id="new-category"
                            label="Add to Category"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                            disabled={isSubmitting}
                            helperText="Type and press Enter or Add"
                        />
                        <Button onClick={handleAddCategory} variant="outlined" size="small" disabled={isSubmitting || !newCategory.trim()} sx={{ mb: 'auto', mt: 1.5 }}>Add</Button>
                    </Box>
                    {/* Optional: Suggest existing categories */}
                    {/* <Autocomplete ... /> */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="inherit" disabled={isSubmitting}>Cancel</Button>
                    <PillButton type="submit" variant="contained" color="primary" disabled={isSubmitting || !name.trim()}>
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (initialData ? 'Save Changes' : 'Create Subject')}
                    </PillButton>
                </DialogActions>
            </Box> {/* Closing tag for form Box */}
        </StyledDialog>
    );
};


interface DeleteConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>; // Make async
    subjectName: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ open, onClose, onConfirm, subjectName }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setIsDeleting(false);
            setError(null);
        }
    }, [open]);

    const handleConfirm = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
            onClose(); // Close on success
        } catch (err) {
            console.error("Error deleting subject:", err);
            setError(err instanceof Error ? err.message : 'Failed to delete subject.');
            setIsDeleting(false); // Keep dialog open on error
        }
    };

    return (
        <StyledDialog open={open} onClose={onClose} TransitionProps={{ onExited: () => { setIsDeleting(false); setError(null); } }}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <DialogContentText>
                    Are you sure you want to delete the subject "<strong>{subjectName}</strong>"?
                    This action is irreversible and will also delete all associated chapters and materials.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" disabled={isDeleting}>Cancel</Button>
                <PillButton onClick={handleConfirm} variant="contained" color="error" disabled={isDeleting}>
                    {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete Subject'}
                </PillButton>
            </DialogActions>
        </StyledDialog>
    );
};


// --- Main Page Component ---

export default function SubjectsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const {
        subjects,
        categories: allCategories,
        loading: subjectsLoading,
        error: subjectsError,
        fetchSubjects, // To refresh data
        createSubject,
        updateSubject,
        deleteSubject,
        getSubjectStats
    } = useSubjects();
    const { setPageContext } = useCopilot();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(localStorage.getItem('subjectsViewMode') as 'grid' | 'list' || 'grid');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [listPopoverAnchorEl, setListPopoverAnchorEl] = useState<null | HTMLElement>(null);
    const [listPopoverSubject, setListPopoverSubject] = useState<Subject | null>(null);
    // Update stats state type
    const [subjectStats, setSubjectStats] = useState<Record<string, { chaptersCount: number; materialsCount: number; progress: number; totalSize: number }>>({});
    const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({});
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        setPageContext('Viewing the list of all subjects.');
    }, [setPageContext]); // Dependency array ensures this runs once on mount/unmount

    // Fetch stats for visible subjects
    useEffect(() => {
        subjects.forEach(subject => {
            // Fetch only if stats don't exist and aren't currently loading
            if (!subjectStats[subject.id] && !statsLoading[subject.id]) {
                setStatsLoading(prev => ({ ...prev, [subject.id]: true }));
                getSubjectStats(subject.id)
                    .then(stats => {
                        setSubjectStats(prev => ({ ...prev, [subject.id]: stats }));
                    })
                    .catch(err => {
                        console.error(`Error fetching stats for subject ${subject.id}:`, err);
                        // Optionally set an error state for the specific card or show a snackbar
                        // setSnackbar({ open: true, message: `Could not load stats for ${subject.name}`, severity: 'warning' });
                    })
                    .finally(() => {
                        // Ensure loading state is cleared even if stats already exist (race condition)
                        setStatsLoading(prev => {
                            const newState = { ...prev };
                            delete newState[subject.id]; // Remove the loading flag
                            return newState;
                        });
                    });
            }
        });
        // Add dependencies: only re-run if subjects list changes or getSubjectStats function changes
    }, [subjects, getSubjectStats]); // Removed subjectStats and statsLoading to prevent infinite loops


    const handleViewModeChange = (
        event: React.MouseEvent<HTMLElement>,
        newViewMode: 'grid' | 'list' | null,
    ) => {
        if (newViewMode !== null) {
            setViewMode(newViewMode);
            localStorage.setItem('subjectsViewMode', newViewMode);
        }
    };

    const handleCategoryChange = (event: React.SyntheticEvent, newValue: string) => {
        setSelectedCategory(newValue);
    };

    const handleOpenDialog = (subjectToEdit: Subject | null = null) => {
        setEditingSubject(subjectToEdit);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingSubject(null); // Clear editing state when closing
    };

    const handleOpenDeleteDialog = (subject: Subject) => {
        setSubjectToDelete(subject);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSubjectToDelete(null);
    };

    const handleSubjectSubmit = useCallback(async (name: string, categories: string[]) => {
        // Try/catch is handled within the dialog component now to show errors inline
        if (editingSubject) {
            await updateSubject({ id: editingSubject.id, name, categories });
            setSnackbar({ open: true, message: 'Subject updated successfully!', severity: 'success' });
        } else {
            await createSubject(name, categories);
            setSnackbar({ open: true, message: 'Subject created successfully!', severity: 'success' });
        }
        // No need to call fetchSubjects, the hook should update the state
    }, [editingSubject, createSubject, updateSubject]);

    const handleSubjectDelete = useCallback(async () => {
        if (!subjectToDelete) return;
        // Try/catch is handled within the dialog component now
        await deleteSubject(subjectToDelete.id);
        setSnackbar({ open: true, message: 'Subject deleted successfully!', severity: 'success' });
        // Hook updates the state
    }, [subjectToDelete, deleteSubject]);


    const handleSubjectClick = (subject: Subject) => {
        navigate(`/subjects/${subject.id}`); // Navigate to subject detail page
    };

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Filter subjects based on selected category
    const filteredSubjects = useMemo(() => {
        if (selectedCategory === 'All') {
            return subjects;
        }
        return subjects.filter(subject => subject.categories.includes(selectedCategory));
    }, [subjects, selectedCategory]);

    // --- Render Logic ---

    const renderSubjectsGrid = () => (
        <Grid container spacing={isMobile ? 2 : 3}>
            {filteredSubjects.map((subject) => (
                // Use Grid item prop correctly
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={subject.id}>
                    <SubjectCardDisplay
                        subject={subject}
                        stats={subjectStats[subject.id] || null}
                        onEdit={handleOpenDialog} // Pass handler directly
                        onDelete={handleOpenDeleteDialog} // Pass handler directly
                        onClick={handleSubjectClick}
                    />
                </Grid>
            ))}
            {/* Add New Subject Card */}
            {/* Use Grid item prop correctly */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AddSubjectCard onClick={() => handleOpenDialog()}>
                    <AddIcon />
                    <Typography>Add New Subject</Typography>
                </AddSubjectCard>
            </Grid>
        </Grid>
    );

    const renderSubjectsList = () => (
        <Paper sx={{ background: alpha(theme.palette.background.paper, 0.7), borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding> {/* Remove default padding */}
                {filteredSubjects.map((subject, index) => (
                    <Fragment key={subject.id}>
                        <ListItem
                            // Use divider prop for lines instead of Fragment + Divider
                            divider={index < filteredSubjects.length - 1}
                            // Use button prop for hover effect and semantics
                            onClick={() => handleSubjectClick(subject)}
                            // Use sx for secondary action spacing if needed, or keep Box
                            secondaryAction={
                                <Tooltip title="More options">
                                    <IconButton
                                        edge="end"
                                        aria-label="more options"
                                        onClick={(e) => handleListMenuOpen(e, subject)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </Tooltip>
                            }
                            sx={{ py: 1.5 }} // Add some vertical padding
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: subject.color || generateColorFromString(subject.name) }}>
                                    <FolderIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={subject.name}
                                secondary={
                                    <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}> {/* Ensure secondary text wraps */}
                                        {statsLoading[subject.id] ? 'Loading stats...' :
                                            subjectStats[subject.id]
                                                // Include size in secondary text
                                                ? `${subjectStats[subject.id].chaptersCount} Ch • ${subjectStats[subject.id].materialsCount} Mat • ${Math.round(subjectStats[subject.id].progress)}% complete`
                                                : 'No stats available'}
                                        {/* {' • Upd: ' + formatDistanceToNow(subject.lastModified, { addSuffix: true })} */}
                                    </Typography>
                                }
                                // Add sx to limit primary text width if needed
                                primaryTypographyProps={{ noWrap: true, sx: { pr: 1 } }} // Prevent long names overlapping actions
                            />
                            {/* Optional: Show progress bar in list view - might make it too busy */}
                        </ListItem>
                        {/* Removed manual Divider */}
                    </Fragment>
                ))}
                {/* Add button for list view */}
                <ListItem onClick={() => handleOpenDialog()} sx={{ justifyContent: 'center', color: 'primary.main', py: 1.5 }}>
                    <AddIcon sx={{ mr: 1 }} /> Add New Subject
                </ListItem>
            </List>
        </Paper>
    );

    const handleListMenuOpen = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, subject: Subject): void => {
        e.stopPropagation();
        e.preventDefault();
        setListPopoverAnchorEl(e.currentTarget);
        setListPopoverSubject(subject);
    };

    const handleListMenuClose = () => {
        setListPopoverAnchorEl(null);
        setListPopoverSubject(null);
    };

    const handleListEditClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (listPopoverSubject) {
            handleOpenDialog(listPopoverSubject);
        }
        handleListMenuClose();
    };

    const handleListDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (listPopoverSubject) {
            handleOpenDeleteDialog(listPopoverSubject);
        }
        handleListMenuClose();
    };


    return (
        <Box sx={{ m: { xs: 1, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" fontWeight={700}>
                    My Subjects
                </Typography>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    aria-label="View mode"
                    size="small"
                >
                    <ToggleButton value="grid" aria-label="Grid view">
                        <Tooltip title="Grid View">
                            <ViewModuleIcon />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="list" aria-label="List view">
                        <Tooltip title="List View">
                            <ViewListIcon />
                        </Tooltip>
                    </ToggleButton>
                    {/* Add other view modes if needed */}
                </ToggleButtonGroup>
            </Box>

            {/* Category Tabs */}
            <Tabs
                value={selectedCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile // Ensure scroll buttons appear on mobile if needed
                aria-label="Subject categories"
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="All" value="All" />
                {allCategories.map((category) => (
                    <Tab key={category} label={category} value={category} />
                ))}
            </Tabs>

            {/* Content Area */}
            {subjectsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <CircularProgress />
                </Box>
            )}
            {!subjectsLoading && subjectsError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {/* Added null check for subjectsError */}
                    Error loading subjects: {subjectsError?.message || 'Unknown error'}. Please try refreshing.
                    <Button onClick={fetchSubjects} size="small" sx={{ ml: 1 }}>Refresh</Button>
                </Alert>
            )}
            {!subjectsLoading && !subjectsError && (
                <Box> {/* Wrap content in a Box to fix potential fragment issues */}
                    {viewMode === 'grid' ? renderSubjectsGrid() : renderSubjectsList()}
                    {filteredSubjects.length === 0 && selectedCategory !== 'All' && (
                        <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                            No subjects found in the "{selectedCategory}" category.
                        </Typography>
                    )}
                    {filteredSubjects.length === 0 && subjects.length > 0 && selectedCategory === 'All' && (
                        <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                            No subjects match the current filter. Select "All" categories to see everything.
                        </Typography>
                    )}
                    {subjects.length === 0 && selectedCategory === 'All' && ( // Check base subjects length for initial empty state
                        <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                            {viewMode === 'grid'
                                ? "No subjects yet. Click the '+' card or the button below to add your first one!"
                                : "No subjects yet. Click 'Add New Subject' below the list."}
                        </Typography>
                    )}
                </Box>
            )}


            {/* Add Subject FAB - Show only on desktop grid view */}
            {!isMobile && viewMode === 'grid' && (
                <Fab
                    color="primary"
                    aria-label="add subject"
                    onClick={() => handleOpenDialog()}
                    sx={{ position: 'fixed', bottom: theme.spacing(3), right: theme.spacing(3) }}
                >
                    <AddIcon />
                </Fab>
            )}


            {/* --- Popover for List View --- */}
            <Popover
                open={Boolean(listPopoverAnchorEl)}
                anchorEl={listPopoverAnchorEl}
                onClose={handleListMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { borderRadius: 2, mt: 1, minWidth: 120 } } }} // Ensure some min width
            >
                <MenuItem onClick={handleListEditClick}>
                    <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit
                </MenuItem>
                <MenuItem onClick={handleListDeleteClick} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
                </MenuItem>
            </Popover>


            {/* Dialogs */}
            <SubjectDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                onSubmit={handleSubjectSubmit}
                initialData={editingSubject}
                existingCategories={allCategories}
            />

            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleSubjectDelete}
                subjectName={subjectToDelete?.name || ''}
            />

            {/* Snackbar for feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000} // Hide after 4 seconds
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {/* Ensure Alert is rendered only when snackbar is open to allow transition */}
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}