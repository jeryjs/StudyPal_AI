import AddIcon from '@mui/icons-material/Add';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
    Alert,
    alpha,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    Divider,
    Grid,
    Snackbar,
    styled,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

// Hooks
import { useChapters } from '@hooks/useChapters';
import { useMaterials } from '@hooks/useMaterials';
import { useSubjects } from '@hooks/useSubjects';
// Import SyncContext if needed to trigger sync manually (optional)
// import { useSyncContext } from '@contexts/SyncContext';
import { Chapter, Material, MaterialType, Subject } from '@type/db.types';

// Components
import ChapterDialog from '@components/chapters/ChapterDialog';
import ChapterList from '@components/chapters/ChapterList';
import MaterialsPanel from '@components/chapters/MaterialsPanel';
import MaterialViewerDialog from '@components/chapters/MaterialViewerDialog';
import DeleteConfirmationDialog from '@components/shared/DeleteConfirmationDialog';

// --- Styled Components ---

const FloatingActionButton = styled(Button)(({ theme }) => ({
    position: 'fixed', // Use fixed for consistent positioning relative to viewport
    bottom: theme.spacing(3), // Adjust spacing
    right: theme.spacing(3),
    borderRadius: '50%', // Make it circular
    width: '56px', // Standard FAB size
    height: '56px',
    minWidth: 'auto', // Override default min-width
    padding: 0, // Remove padding if using only icon
    boxShadow: theme.shadows[6],
    zIndex: theme.zIndex.speedDial, // Ensure it's above other content
    transition: 'all 0.2s ease',
    '&:hover': {
        boxShadow: theme.shadows[10],
        transform: 'scale(1.05)', // Slight scale on hover
    }
}));

// --- Main Page Component ---

const ChaptersPage: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // State
    const [subject, setSubject] = useState<Subject | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    // uploadProgress now tracks the initial file reading/DB insertion phase
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    // Dialog states
    const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'chapter' | 'material' } | null>(null);
    const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

    // Snackbar
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'; }>({ open: false, message: '', severity: 'info' });

    // Hooks
    const { getSubject } = useSubjects();
    const { chapters, loading: chaptersLoading, error: chaptersError, createChapter, updateChapter, deleteChapter } = useChapters(subjectId || '');
    const { materials, loading: materialsLoading, error: materialsError, createMaterial, updateMaterial, deleteMaterial } = useMaterials(selectedChapter?.id || '');
    // Optional: Get sync context if you want to manually trigger a sync check after adding files
    // const { backupDatabaseToDrive } = useSyncContext();

    // Fetch Subject Details
    useEffect(() => {
        if (subjectId) {
            setSubject(null); // Reset subject when ID changes
            setSelectedChapter(null); // Reset chapter selection
            getSubject(subjectId)
                .then(fetchedSubject => {
                    if (fetchedSubject) {
                        setSubject(fetchedSubject);
                    } else {
                        setSnackbar({ open: true, message: 'Subject not found', severity: 'error' });
                        navigate('/subjects', { replace: true });
                    }
                })
                .catch(err => {
                    console.error("Error fetching subject:", err);
                    setSnackbar({ open: true, message: 'Failed to load subject details', severity: 'error' });
                });
        } else {
            navigate('/subjects', { replace: true }); // Navigate away if no subjectId
        }
    }, [subjectId, getSubject, navigate]);

    // Auto-select first chapter when chapters load or subject changes
    // useEffect(() => {
    //     if (!selectedChapter && chapters.length > 0) {
    //         // Sort chapters by number before selecting the first one
    //         const sorted = [...chapters].sort((a, b) => a.number - b.number);
    //         setSelectedChapter(sorted[0]);
    //     } else if (selectedChapter && !chapters.find(c => c.id === selectedChapter.id)) {
    //         // If selected chapter is deleted, select the first available one or null
    //         const sorted = [...chapters].sort((a, b) => a.number - b.number);
    //         setSelectedChapter(sorted.length > 0 ? sorted[0] : null);
    //     }
    // }, [chapters, selectedChapter]); // Rerun when chapters change


    // --- Handlers ---

    // Chapter Dialog Handlers
    const handleOpenChapterDialog = (chapter: Chapter | null = null) => {
        setEditingChapter(chapter);
        setChapterDialogOpen(true);
    };

    const handleCloseChapterDialog = () => {
        setChapterDialogOpen(false);
        setEditingChapter(null); // Clear editing state on close
    };

    const handleChapterSubmit = async (name: string, chapterNumberInput: number) => {
        if (!subjectId) return;

        // Use 0 or undefined to signify auto-numbering based on store logic
        const chapterNumber = chapterNumberInput > 0 ? chapterNumberInput : undefined;

        try {
            if (editingChapter) {
                await updateChapter({
                    id: editingChapter.id,
                    name,
                    number: chapterNumber
                });
                setSnackbar({ open: true, message: 'Chapter updated successfully', severity: 'success' });
                // No need to close dialog here, ChapterDialog handles it on success
            } else {
                const newChapter = await createChapter(name, subjectId);
                setSelectedChapter(newChapter);
                setSnackbar({ open: true, message: 'Chapter created successfully', severity: 'success' });
                // No need to close dialog here, ChapterDialog handles it on success
            }
            handleCloseChapterDialog(); // Explicitly close on success *after* operations
        } catch (error) {
            console.error('Error saving chapter:', error);
            // Let the ChapterDialog display the error, just re-throw it
            throw new Error(`Failed to save chapter: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // Delete Dialog Handlers
    const handleOpenDeleteDialog = (id: string, name: string, type: 'chapter' | 'material') => {
        setItemToDelete({ id, name, type });
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        // Delay clearing itemToDelete to prevent dialog content flicker during close animation
        setTimeout(() => setItemToDelete(null), 300);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            if (itemToDelete.type === 'chapter') {
                await deleteChapter(itemToDelete.id);
                // Selection logic is handled by useEffect watching `chapters`
            } else {
                await deleteMaterial(itemToDelete.id);
            }
            setSnackbar({ open: true, message: `${itemToDelete.type} deleted successfully`, severity: 'success' });
            // No need to close dialog here, DeleteConfirmationDialog handles it on success
        } catch (error) {
            console.error(`Error deleting ${itemToDelete.type}:`, error);
            // Let the DeleteConfirmationDialog display the error, just re-throw it
            throw new Error(`Failed to delete ${itemToDelete.type}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // Material Handlers
    const handleViewMaterial = (material: Material) => {
        setSelectedMaterial(material);
        setMaterialViewerOpen(true);
    };

    const handleCloseMaterialViewer = () => {
        setMaterialViewerOpen(false);
        // Delay clearing selectedMaterial for closing animation
        setTimeout(() => setSelectedMaterial(null), 300);
    };

    // Drag and Drop Handlers
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if the leave target is outside the drop zone
        const relatedTarget = e.relatedTarget as Node;
        if (!e.currentTarget.contains(relatedTarget)) {
            setIsDraggingOver(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        if (!selectedChapter) {
            setSnackbar({ open: true, message: 'Please select a chapter first', severity: 'warning' });
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        setSnackbar({ open: true, message: `Adding ${files.length} material(s) locally...`, severity: 'info' });

        for (const file of files) {
            const tempId = `adding-${Date.now()}-${file.name}`; // Use 'adding' prefix
            setUploadProgress(prev => ({ ...prev, [tempId]: 0 })); // Show initial progress

            try {
                // Determine material type
                let type: MaterialType = MaterialType.FILE; // Default fallback
                if (file.type.startsWith('image/')) type = MaterialType.IMAGE;
                else if (file.type === 'application/pdf') type = MaterialType.PDF;
                else if (file.type.startsWith('text/')) type = MaterialType.TEXT;
                else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') type = MaterialType.WORD;
                else if (file.type.startsWith('video/')) type = MaterialType.VIDEO;
                else if (file.type.startsWith('application/')) type = MaterialType.FILE;
                else if (file.type.startsWith('text/html')) type = MaterialType.LINK;
                else if (file.type.startsWith('application/x-www-form-urlencoded')) type = MaterialType.LINK;
                else if (file.type.startsWith('audio/')) type = MaterialType.AUDIO;
                else if (file.type.startsWith('application/x-ipynb+json')) type = MaterialType.JUPYTER;

                // Read file content as ArrayBuffer
                const fileContent = await file.arrayBuffer();
                setUploadProgress(prev => ({ ...prev, [tempId]: 50 })); // Indicate reading complete

                // Create material record via hook
                const newMaterial = await createMaterial(
                    file.name,
                    type,
                    { mimeType: file.type, data: new Blob([fileContent], { type: file.type }) },
                    undefined, // sourceRef
                    selectedChapter.id,
                    0, // Initial user progress is 0
                    file.size, // Pass size
                );

                setUploadProgress(prev => ({ ...prev, [tempId]: 100 })); // Indicate DB insertion complete
                setSnackbar({ open: true, message: `"${newMaterial.name}" added locally. Sync pending.`, severity: 'success' });

                // Optional: Trigger a sync check if desired after adding files
                // backupDatabaseToDrive(); // This will initiate the sync process including pending items

            } catch (error) {
                console.error("Error handling dropped file:", file.name, error);
                setSnackbar({ open: true, message: `Failed to add material: ${file.name}`, severity: 'error' });
            } finally {
                // Clean up progress state after a short delay, regardless of success/failure
                setTimeout(() => {
                    setUploadProgress(prev => {
                        const newState = { ...prev };
                        delete newState[tempId];
                        return newState;
                    });
                }, 1500); // Delay to allow user to see completion/error
            }
        }
    }, [selectedChapter, createMaterial, setSnackbar /*, backupDatabaseToDrive */]); // Add backupDatabaseToDrive if using manual trigger

    // Filter materials for selected chapter (already done in MaterialsPanel, but keep for potential future use)
    const materialsForSelectedChapter = useMemo(() => {
        if (!selectedChapter) return [];
        // Ensure materials are filtered correctly if materials hook doesn't filter
        return materials.filter(m => m.chapterId === selectedChapter.id);
    }, [materials, selectedChapter]);

    // --- Render ---

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with Breadcrumb */}
            <Box sx={{ mb: 3, flexShrink: 0 /* Prevent header shrinking */ }}>
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    aria-label="breadcrumb"
                    sx={{ mb: 1 }}
                >
                    <Typography
                        component="a"
                        color="inherit"
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate('/subjects')}
                    >
                        Subjects
                    </Typography>
                    <Typography color="text.primary" sx={{ fontWeight: 500 }}>
                        {subject?.name || 'Loading...'}
                    </Typography>
                </Breadcrumbs>

                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700}>
                        {subject?.name || 'Loading Subject...'}
                    </Typography>

                    {subject?.categories && subject.categories.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {subject.categories.map(category => (
                                <Chip
                                    key={category}
                                    label={category}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.primary.light, 0.15), // Use light variant
                                        color: theme.palette.primary.dark, // Use dark variant for contrast
                                        fontWeight: 500,
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />
            </Box>

            {/* Main Content Grid - Make it grow */}
            <Grid container spacing={3} sx={{ flexGrow: 1,  /* Prevent double scrollbars */ }}>
                {/* Left Column - Chapter List */}
                <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ height: { xs: 'auto', md: '100%' }, overflowY: { xs: 'visible', md: 'auto' } /* Allow scrolling on medium+ */ }}>
                    <ChapterList
                        chapters={chapters}
                        selectedChapter={selectedChapter}
                        onSelectChapter={setSelectedChapter}
                        onAddChapter={() => handleOpenChapterDialog()}
                        onEditChapter={handleOpenChapterDialog} // Pass the chapter object
                        onDeleteChapter={(chapter) => handleOpenDeleteDialog(chapter.id, chapter.name, 'chapter')}
                        loading={chaptersLoading}
                        error={chaptersError}
                    />
                </Grid>

                {/* Right Column - Materials */}
                <Grid size={{ xs: 12, md: 8, lg: 9 }} sx={{ height: { xs: 'auto', md: '100%' }, overflowY: { xs: 'visible', md: 'auto' } }}>
                    <MaterialsPanel
                        selectedChapter={selectedChapter}
                        materials={materialsForSelectedChapter} // Pass filtered materials
                        onViewMaterial={handleViewMaterial}
                        onDeleteMaterial={(material) => handleOpenDeleteDialog(material.id, material.name, 'material')}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        isDraggingOver={isDraggingOver}
                        loading={materialsLoading && !!selectedChapter}
                        error={materialsError}
                        uploadProgress={uploadProgress}
                    />
                </Grid>
            </Grid>

            {/* Floating Action Button for Mobile */}
            {isMobile && (
                <FloatingActionButton
                    color="primary"
                    aria-label="add chapter"
                    onClick={() => handleOpenChapterDialog()}
                >
                    <AddIcon />
                </FloatingActionButton>
            )}

            {/* Dialogs */}
            <ChapterDialog
                open={chapterDialogOpen}
                onClose={handleCloseChapterDialog}
                onSubmit={handleChapterSubmit}
                initialData={editingChapter}
                subjectName={subject?.name}
            />

            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.name || ''}
                itemType={itemToDelete?.type || 'item'} // Use generic 'item' if type is missing
                warningMessage={itemToDelete?.type === 'chapter' ? 'Warning: This will also delete all materials within this chapter!' : undefined}
            />

            <MaterialViewerDialog
                open={materialViewerOpen}
                onClose={handleCloseMaterialViewer}
                material={selectedMaterial}
                chapterId={selectedChapter?.id || ''}
            />

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000} // Slightly longer duration
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} // Use functional update
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {/* Wrapping Alert in a Box prevents Snackbar width issues */}
                <Box>
                    <Alert
                        severity={snackbar.severity}
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                        sx={{ width: '100%' }}
                        variant="filled"
                        elevation={6} // Add elevation like Material Design spec
                    >
                        {snackbar.message}
                    </Alert>
                </Box>
            </Snackbar>
        </Box>
    );
};

export default ChaptersPage;