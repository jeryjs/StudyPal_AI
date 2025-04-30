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
    useTheme
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

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
import { useCopilot } from '@hooks/useCopilot';

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
    const { subjectId, chapterId } = useParams<{ subjectId: string, chapterId?: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // State
    const [subject, setSubject] = useState<Subject | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'chapter' | 'material' } | null>(null);
    const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'; }>({ open: false, message: '', severity: 'info' });

    // Hooks
    const { getSubject } = useSubjects();
    const { chapters, loading: chaptersLoading, error: chaptersError, createChapter, updateChapter, deleteChapter } = useChapters(subjectId || '');
    const { createMaterial, deleteMaterial, materials } = useMaterials(selectedChapter?.id);
    const { setPageContext } = useCopilot(); // Use the hook

    // Set page context when subject is found or changes
    useEffect(() => {
        if (subject) {
            setPageContext({page: 'chapters', activeItem: {id: subject.id, type: 'subject'}, description: `Viewing chapters for the subject: "${subject.name}" (id: ${subject.id}).`});
        } else if (subjectId) {
            // Fallback if subject name isn't loaded yet
            setPageContext({page: 'chapters', activeItem: {id: subjectId, type: 'subject'}, description: `Viewing chapters for subject ID: ${subjectId}.`});
        } else {
            setPageContext({page: 'chapters', description: `Viewing chapters (unknown subject).`});
        }
    }, [subject, subjectId, setPageContext]); // Update when subject or ID changes

    // Sync selectedChapter with chapterId param
    useEffect(() => {
        if (chapterId && chapters.length > 0) {
            const found = chapters.find(c => c.id === chapterId);
            setSelectedChapter(found || null);
        } else {
            setSelectedChapter(null);
        }
    }, [chapterId, chapters]);

    // Fetch Subject Details
    useEffect(() => {
        if (!subjectId) {
            navigate('/subjects', { replace: true });
            return;
        }

        let isMounted = true;
        if (!subject || subject.id !== subjectId) {
            getSubject(subjectId)
                .then(fetchedSubject => { isMounted && setSubject(fetchedSubject); })
                .catch(err => {
                    if (isMounted) {
                        console.error('Error fetching subject:', err);
                        setSnackbar({ open: true, message: 'Failed to load subject details', severity: 'error' });
                        setTimeout(() => navigate('/subjects', { replace: true }), 3000);
                    }
                });
        }
        return () => { isMounted = false }
    }, [subjectId, getSubject, navigate]);

    // --- Chapter Dialog Handlers ---
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
                navigate(`/subjects/${subjectId}/c/${editingChapter ? editingChapter.id : ''}`); // Navigate to the updated chapter
            } else {
                const newChapter = await createChapter(name, subjectId);
                setSelectedChapter(newChapter);
                setSnackbar({ open: true, message: 'Chapter created successfully', severity: 'success' });
                navigate(`/subjects/${subjectId}/c/${newChapter ? newChapter.id : ''}`); // Navigate to the new chapter
            }
            handleCloseChapterDialog(); // Explicitly close on success *after* operations
        } catch (error) {
            console.error('Error saving chapter:', error);
            // Let the ChapterDialog display the error, just re-throw it
            throw new Error(`Failed to save chapter: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // --- Delete Dialog Handlers ---
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
            throw error;
        }
    };

    // --- Material Viewer: Open on ?m=id ---
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const materialId = params.get('m');
        if (materialId && materials.length > 0) {
            const found = materials.find(m => m.id === materialId);
            if (found) {
                setSelectedMaterial(found);
                setMaterialViewerOpen(true);
            } else setSnackbar({ open: true, message: 'Material not found', severity: 'error' });
        }
    }, [location.search, materials]);

    // --- Material Handlers ---
    const handleViewMaterial = (material: Material) => {
        setSelectedMaterial(material);
        setMaterialViewerOpen(true);
        // Add ?m=material.id to the URL
        const params = new URLSearchParams(location.search);
        params.set('m', material.id);
        navigate({ search: params.toString() }, { replace: true });
    };

    const handleCloseMaterialViewer = () => {
        setMaterialViewerOpen(false);
        // Delay clearing selectedMaterial for closing animation
        setTimeout(() => setSelectedMaterial(null), 300);
        // Remove ?m from the URL
        const params = new URLSearchParams(location.search);
        params.delete('m');
        navigate({ search: params.toString() }, { replace: true });
    };

    // --- Drag and Drop Handlers ---
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
    }, [selectedChapter, createMaterial, setSnackbar]);

    // --- Render ---
    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with Breadcrumb */}
            <Box sx={{ mb: 3, flexShrink: 0 }}>
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 1 }}>
                    <Typography
                        component="a"
                        color="inherit"
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate('/subjects')}
                    >
                        Subjects
                    </Typography>
                    <Typography
                        component="a"
                        color="inherit"
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate(`/subjects/${subjectId}`)}
                    >
                        {subject?.name || '...'}
                    </Typography>
                    {selectedChapter && (
                        <Typography color="text.primary">{selectedChapter.name}</Typography>
                    )}
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
            <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                {/* Left Column - Chapter List */}
                <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ height: { xs: 'auto', md: '100%' }, overflowY: { xs: 'visible', md: 'auto' } }}>
                    <ChapterList
                        chapters={chapters}
                        selectedChapter={selectedChapter}
                        onSelectChapter={c => navigate(`/subjects/${subjectId}/c/${c.id}`, { replace: !!chapterId })}
                        onAddChapter={() => handleOpenChapterDialog()}
                        onEditChapter={handleOpenChapterDialog}
                        onDeleteChapter={(chapter) => handleOpenDeleteDialog(chapter.id, chapter.name, 'chapter')}
                        loading={chaptersLoading}
                        error={chaptersError}
                    />
                </Grid>

                <Grid size={{ md: 8, lg: 9 }} sx={{ height: '100%', overflowY: 'auto' }}>
                    <MaterialsPanel
                        key={!isMobile ? (selectedChapter?.id || 'no-chapter') : undefined} // Key to force re-render on chapter change for mobile
                        selectedChapter={selectedChapter}
                        onViewMaterial={handleViewMaterial}
                        onDeleteMaterial={(material) => handleOpenDeleteDialog(material.id, material.name, 'material')}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        isDraggingOver={isDraggingOver}
                        uploadProgress={uploadProgress}
                        onClose={() => navigate(-1)}
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
                itemType={itemToDelete?.type || 'item'}
                warningMessage={itemToDelete?.type === 'chapter' ? 'Warning: This will also delete all materials within this chapter!' : undefined}
            />

            {/* Ensure MaterialViewerDialog is always above the drawer */}
            <Box sx={{ position: 'fixed', zIndex: (theme) => theme.zIndex.drawer + 10, inset: 0, pointerEvents: 'none' }}>
                <Box sx={{ pointerEvents: 'auto' }}>
                    <MaterialViewerDialog
                        open={materialViewerOpen}
                        onClose={handleCloseMaterialViewer}
                        material={selectedMaterial}
                    />
                </Box>
            </Box>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Box>
                    <Alert
                        severity={snackbar.severity}
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                        sx={{ width: '100%' }}
                        variant="filled"
                        elevation={6}
                    >
                        {snackbar.message}
                    </Alert>
                </Box>
            </Snackbar>
        </Box>
    );
};

export default ChaptersPage;