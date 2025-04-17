import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    styled,
    alpha,
    useTheme,
    LinearProgress,
    Chip,
    Avatar,
    Tooltip,
    DialogContentText,
    Fab,
    ToggleButton, // Import ToggleButton
    ToggleButtonGroup, // Import ToggleButtonGroup
    FormControl, // Import FormControl
    FormLabel, // Import FormLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import ScienceIcon from '@mui/icons-material/Science';
import CalculateIcon from '@mui/icons-material/Calculate';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import CodeIcon from '@mui/icons-material/Code'; // Example: Add more icons
import LanguageIcon from '@mui/icons-material/Language'; // Example: Add more icons
import ArtTrackIcon from '@mui/icons-material/ArtTrack'; // Example: Add more icons
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { generateColorFromString } from '../utils/utils';

// --- Define Category Options ---
const CATEGORY_OPTIONS = [
    { key: 'general', label: 'General', icon: <FolderIcon /> },
    { key: 'science', label: 'Science', icon: <ScienceIcon /> },
    { key: 'math', label: 'Math', icon: <CalculateIcon /> },
    { key: 'social-science', label: 'Social Science', icon: <HistoryEduIcon /> }, // Changed from history
    { key: 'coding', label: 'Coding', icon: <CodeIcon /> },
    { key: 'language', label: 'Language', icon: <LanguageIcon /> },
    { key: 'art', label: 'Art', icon: <ArtTrackIcon /> },
];

// Helper to get category details by key
const getCategory = (key: string) => {
    return CATEGORY_OPTIONS.find(cat => cat.key === key) || CATEGORY_OPTIONS[0]; // Default to general
};


// Define types for our subject data
interface Subject {
  id: string;
  name: string;
  // categories: string[]; // Removed
  categoryKey: string; // Added
  storage: number; // Storage in MB
  lastUpdated: string;
  // icon: React.ReactElement; // Removed - derived from categoryKey
  color: string;
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
  // Removed .action-buttons absolute positioning and hover effect
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
    padding: theme.spacing(2, 4), // More horizontal padding
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
    padding: theme.spacing(2, 4, 3), // Adjust padding
    justifyContent: 'center', // Center buttons
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
      borderColor: theme.palette.primary.main,
      borderWidth: '1px', // Keep border width consistent
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
  borderRadius: '50px', // Fully rounded pill shape
  textTransform: 'none',
  padding: theme.spacing(1.2, 3.5),
  fontWeight: 600,
  boxShadow: `0 6px 15px -5px ${alpha(theme.palette.primary.main, 0.3)}`,
  transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease',
  '&:hover': {
    boxShadow: `0 8px 20px -6px ${alpha(theme.palette.primary.main, 0.5)}`,
    transform: 'translateY(-2px)',
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
}));

const IconWrapper = styled(Avatar)(({ theme, bgcolor }) => ({
    backgroundColor: alpha(bgcolor || theme.palette.primary.main, 0.15),
    color: bgcolor || theme.palette.primary.main,
    width: 56,
    height: 56,
    // Removed marginBottom: theme.spacing(2), - let the parent Box handle spacing
    '& .MuiSvgIcon-root': { // Ensure icon size is consistent
        fontSize: '1.75rem',
    },
}));

// --- Component ---

const SubjectsPage: React.FC = () => {
  const theme = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([
    // Updated initial state with categoryKey
    { id: '1', name: 'Quantum Physics', categoryKey: 'science', storage: 120, lastUpdated: '2 days ago', color: generateColorFromString('Quantum Physics') },
    { id: '2', name: 'Calculus III', categoryKey: 'math', storage: 85, lastUpdated: '5 hours ago', color: generateColorFromString('Calculus III') },
    { id: '3', name: 'World History 101', categoryKey: 'social-science', storage: 250, lastUpdated: '1 week ago', color: generateColorFromString('World History 101') }, // Updated categoryKey
    { id: '4', name: 'Organic Chemistry', categoryKey: 'science', storage: 150, lastUpdated: 'yesterday', color: generateColorFromString('Organic Chemistry') },
  ]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCategoryKey, setNewSubjectCategoryKey] = useState(CATEGORY_OPTIONS[0].key); // Default category
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [editedSubjectName, setEditedSubjectName] = useState('');
  const [editedSubjectCategoryKey, setEditedSubjectCategoryKey] = useState(CATEGORY_OPTIONS[0].key); // Default category
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);


  // Calculate the total storage across all subjects
  const totalStorage = subjects.reduce((sum, subject) => sum + subject.storage, 0);

  const handleOpenAddDialog = () => {
      setNewSubjectName(''); // Reset name
      setNewSubjectCategoryKey(CATEGORY_OPTIONS[0].key); // Reset category
      setAddDialogOpen(true);
  };
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    // No need to reset here, done in open or on success
  };

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      const newId = Date.now().toString();
      const newColor = generateColorFromString(newSubjectName);
      const newSubject: Subject = {
        id: newId,
        name: newSubjectName.trim(),
        categoryKey: newSubjectCategoryKey, // Use selected category key
        storage: 0,
        lastUpdated: 'Just now',
        color: newColor,
      };
      setSubjects([...subjects, newSubject]);
      handleCloseAddDialog();
    }
  };

  const handleSubjectCardClick = (id: string) => {
      console.log(`Navigating to subject ${id}`);
      // TODO: Implement navigation logic
  };

  // --- Edit Subject Logic ---
  const handleEditClick = (event: React.MouseEvent, subject: Subject) => {
    event.stopPropagation(); // Prevent card click navigation
    setSubjectToEdit(subject);
    setEditedSubjectName(subject.name);
    setEditedSubjectCategoryKey(subject.categoryKey); // Set current category
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSubjectToEdit(null);
    // Resetting name/category not strictly needed here as they are set on open
  };

  const handleSaveEdit = () => {
    if (subjectToEdit && editedSubjectName.trim()) {
      setSubjects(subjects.map(s =>
        s.id === subjectToEdit.id
          ? {
              ...s,
              name: editedSubjectName.trim(),
              categoryKey: editedSubjectCategoryKey, // Save edited category
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
      setSubjects(subjects.filter(s => s.id !== subjectToDelete.id));
      handleCloseDeleteDialog();
    }
  };


  return (
    <Box sx={{ m: { xs: 2, md: 4 }, position: 'relative', minHeight: 'calc(100vh - 120px)' /* Ensure space for FAB */ }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 4, background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        My Subjects
      </Typography>

      <Grid container spacing={3}>
        {subjects.map((subject) => {
          const storagePercentage = totalStorage > 0 ? (subject.storage / totalStorage) * 100 : 0;
          const category = getCategory(subject.categoryKey); // Get category details

          return (
            <Grid key={subject.id} item xs={12} sm={6} md={4} lg={3}>
              <SubjectCard bgcolor={subject.color} onClick={() => handleSubjectCardClick(subject.id)}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                   <IconWrapper bgcolor={subject.color}>
                      {category.icon} {/* Use icon from category */}
                   </IconWrapper>
                   {/* Optional: Display category label as a chip or text */}
                   <Chip
                      label={category.label}
                      size="small"
                      sx={{
                          bgcolor: alpha(subject.color, 0.1),
                          color: alpha(subject.color, 0.9),
                          fontWeight: 500,
                          // Ensure chip doesn't interfere with layout
                          alignSelf: 'flex-start',
                          ml: 1, // Add some margin if needed
                      }}
                    />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, flexGrow: 1 }}>
                  {subject.name}
                </Typography>
                {/* Removed old categories box */}
                {/* <Box sx={{ mb: 2 }}> ... </Box> */}

                {/* Storage Progress Bar */}
                {/* ... Tooltip, LinearProgress, Typography ... */}
                <Tooltip title={`Storage: ${subject.storage} MB (${storagePercentage.toFixed(1)}% of total)`}>
                    <Box sx={{ width: '100%', mb: 1 }}>
                        <LinearProgress
                        variant="determinate"
                        value={storagePercentage}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: alpha(subject.color, 0.2),
                            '& .MuiLinearProgress-bar': {
                            backgroundColor: subject.color,
                            borderRadius: 4,
                            },
                        }}
                        />
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: 'text.secondary' }}>
                            {subject.storage} MB Used
                        </Typography>
                    </Box>
                </Tooltip>

                {/* ... Updated Text ... */}
                <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'flex-end', mt: 'auto', mb: 1 }}>
                  Updated: {subject.lastUpdated}
                </Typography>

                 {/* ... Action Buttons Box ... */}
                 <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, pt: 1.5, mt: 1 }}>
                    <Tooltip title="Edit Subject">
                        <IconButton
                            size="small"
                            onClick={(e) => handleEditClick(e, subject)}
                            sx={{ '&:hover': { background: alpha(theme.palette.info.light, 0.1) } }}
                        >
                            <EditIcon fontSize="small" color="info" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Subject">
                        <IconButton
                            size="small"
                            onClick={(e) => handleDeleteClick(e, subject)}
                            sx={{ '&:hover': { background: alpha(theme.palette.error.light, 0.1) } }}
                        >
                            <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                    </Tooltip>
                 </Box>
              </SubjectCard>
            </Grid>
          );
        })}

        {/* ... Add Subject Card (conditionally rendered) ... */}
        {subjects.length === 0 && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
            <AddSubjectCard onClick={handleOpenAddDialog}>
                <AddIcon />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Add Your First Subject</Typography>
            </AddSubjectCard>
            </Grid>
        )}
      </Grid>

      {/* ... Add Subject FAB (conditionally rendered) ... */}
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
                    boxShadow: `0 8px 25px -8px ${alpha(theme.palette.primary.main, 0.6)}`,
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: `0 10px 30px -8px ${alpha(theme.palette.primary.main, 0.8)}`,
                    },
                    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                }}
            >
                <AddIcon />
            </Fab>
        </Tooltip>
      )}

      {/* Add Subject Dialog */}
      <StyledDialog open={addDialogOpen} onClose={handleCloseAddDialog} aria-labelledby="add-subject-dialog-title">
         {/* ... Close Button ... */}
         <IconButton
            aria-label="close"
            onClick={handleCloseAddDialog}
            sx={{
                position: 'absolute',
                right: theme.spacing(2),
                top: theme.spacing(2),
                color: theme.palette.grey[500],
            }}
            >
            <CloseIcon />
        </IconButton>
        <StyledDialogTitle id="add-subject-dialog-title">
          Create a New Subject
        </StyledDialogTitle>
        <StyledDialogContent>
          {/* ... Instructions Typography ... */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Enter the name and choose a category for your new subject.
          </Typography>
          <StyledTextField
            autoFocus
            margin="dense"
            id="subject-name"
            label="Subject Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            sx={{ mb: 3 }} // Add margin below text field
            // onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()} // Keep Enter key submission if desired
          />

          {/* Category Selection */}
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary', textAlign: 'center' }}>Choose a Category</FormLabel>
            <ToggleButtonGroup
              value={newSubjectCategoryKey}
              exclusive
              onChange={(event, newKey) => {
                if (newKey !== null) { // Prevent deselecting all
                  setNewSubjectCategoryKey(newKey);
                }
              }}
              aria-label="subject category"
              sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <ToggleButton key={cat.key} value={cat.key} aria-label={cat.label} size="small" sx={{ borderRadius: '50px !important', px: 1.5, '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.15) } }}>
                  {cat.icon}
                  <Typography variant="caption" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>{cat.label}</Typography> {/* Hide label on xs */}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </FormControl>

        </StyledDialogContent>
        <StyledDialogActions>
          <CancelButton onClick={handleCloseAddDialog}>
            Cancel
          </CancelButton>
          <PillButton onClick={handleAddSubject} variant="contained" disabled={!newSubjectName.trim()}>
            Create Subject
          </PillButton>
        </StyledDialogActions>
      </StyledDialog>

       {/* Edit Subject Dialog */}
      <StyledDialog open={editDialogOpen} onClose={handleCloseEditDialog} aria-labelledby="edit-subject-dialog-title">
         {/* ... Close Button ... */}
         <IconButton aria-label="close" onClick={handleCloseEditDialog} sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.grey[500] }}>
            <CloseIcon />
        </IconButton>
        <StyledDialogTitle id="edit-subject-dialog-title">
          Edit Subject
        </StyledDialogTitle>
        <StyledDialogContent>
          <StyledTextField
            autoFocus
            margin="dense"
            id="edit-subject-name"
            label="Subject Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editedSubjectName}
            onChange={(e) => setEditedSubjectName(e.target.value)}
            sx={{ mb: 3 }} // Add margin below text field
            // onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
          />

           {/* Category Selection */}
           <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary', textAlign: 'center' }}>Choose a Category</FormLabel>
            <ToggleButtonGroup
              value={editedSubjectCategoryKey}
              exclusive
              onChange={(event, newKey) => {
                if (newKey !== null) {
                  setEditedSubjectCategoryKey(newKey);
                }
              }}
              aria-label="subject category"
              sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                 <ToggleButton key={cat.key} value={cat.key} aria-label={cat.label} size="small" sx={{ borderRadius: '50px !important', px: 1.5, '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.15) } }}>
                  {cat.icon}
                  <Typography variant="caption" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>{cat.label}</Typography> {/* Hide label on xs */}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </FormControl>

        </StyledDialogContent>
        <StyledDialogActions>
          <CancelButton onClick={handleCloseEditDialog}>
            Cancel
          </CancelButton>
          {/* Update disabled logic if needed, e.g., check if category also changed */}
          <PillButton
             onClick={handleSaveEdit}
             variant="contained"
             disabled={!editedSubjectName.trim() || (editedSubjectName.trim() === subjectToEdit?.name && editedSubjectCategoryKey === subjectToEdit?.categoryKey)}
           >
            Save Changes
          </PillButton>
        </StyledDialogActions>
      </StyledDialog>

      {/* Delete Confirmation Dialog */}
      {/* ...existing code... */}
      <StyledDialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} aria-labelledby="delete-confirm-dialog-title">
         <IconButton aria-label="close" onClick={handleCloseDeleteDialog} sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.grey[500] }}>
            <CloseIcon />
        </IconButton>
        <StyledDialogTitle id="delete-confirm-dialog-title">
          Confirm Deletion
        </StyledDialogTitle>
        <StyledDialogContent>
           <DialogContentText sx={{ textAlign: 'center', color: theme.palette.text.secondary }}>
                Are you sure you want to delete the subject "{subjectToDelete?.name}"? This action cannot be undone.
           </DialogContentText>
        </StyledDialogContent>
        <StyledDialogActions>
          <CancelButton onClick={handleCloseDeleteDialog}>
            Cancel
          </CancelButton>
          <PillButton onClick={handleConfirmDelete} variant="contained" color="error" sx={{ boxShadow: `0 6px 15px -5px ${alpha(theme.palette.error.main, 0.4)}`, '&:hover': { boxShadow: `0 8px 20px -6px ${alpha(theme.palette.error.main, 0.6)}` } }}>
            Delete Subject
          </PillButton>
        </StyledDialogActions>
      </StyledDialog>

    </Box>
  );
};

export default SubjectsPage;