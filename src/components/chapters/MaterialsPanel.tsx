import { CloudDone, CloudDownload, CloudOff, CloudSync } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleIcon from '@mui/icons-material/Article'; // Word
import AudioFileIcon from '@mui/icons-material/AudioFile';
import CodeIcon from '@mui/icons-material/Code'; // Jupyter
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description'; // Default/Text
import FilePresentIcon from '@mui/icons-material/FilePresent'; // Generic File
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Import MoreVertIcon
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import {
    Alert,
    alpha,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CircularProgress,
    Divider,
    Drawer,
    Fade,
    Grid,
    IconButton,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Snackbar,
    styled,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useCloudStorage from '@hooks/useCloudStorage';
import { useMaterials } from '@hooks/useMaterials';
import { Chapter, Material, MaterialType, SyncStatus } from '@type/db.types';
import { formatBytes } from '@utils/utils';
import { useCopilot } from '@hooks/useCopilot';

// --- Styled Components ---

// Keep MaterialsContainer, adjust padding/minHeight if needed
const MaterialsContainer = styled(Paper)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 1.5,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    height: '100%',
    minHeight: '360px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative', // Needed for overlay positioning
    overflow: 'hidden', // Prevent content overflow
}));

// Overlay DropZone - covers the entire panel when dragging
const OverlayDropZone = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'isDraggingOver'
})<{ isDraggingOver: boolean }>(({ theme, isDraggingOver }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha(theme.palette.background.default, 0.85), // Semi-transparent background
    border: `3px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius * 1.5, // Match container
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    zIndex: 2, // Ensure it's above the Masonry content
    pointerEvents: isDraggingOver ? 'auto' : 'none', // Only interactive when dragging
    opacity: isDraggingOver ? 1 : 0, // Fade in/out
    transition: theme.transitions.create('opacity', {
        duration: theme.transitions.duration.short,
    }),
    padding: theme.spacing(3),
    cursor: 'copy', // Indicate drop action
}));

// Styled Card for each Material Item
const MaterialCard = styled(Card)(({ theme }) => ({
    minWidth: 200,
    maxWidth: 450,
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(8px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    transition: theme.transitions.create(['box-shadow', 'transform'], {
        duration: theme.transitions.duration.short,
    }),
    '&:hover': {
        boxShadow: theme.shadows[4],
        transform: 'translateY(-2px)',
    },
    position: 'relative', // For positioning the menu button
}));

const CardTopActionArea = styled(CardActionArea)(({ theme }) => ({
    // Style for the main clickable area, excluding the menu button
    paddingBottom: theme.spacing(4), // Make space for absolutely positioned elements at bottom
}));


const CardMenuButton = styled(IconButton)(({ theme }) => ({
    position: 'absolute',
    top: theme.spacing(0.5),
    right: theme.spacing(0.5),
    zIndex: 1, // Above CardContent
    color: alpha(theme.palette.text.secondary, 0.7),
    '&:hover': {
        backgroundColor: alpha(theme.palette.action.hover, 0.1),
        color: theme.palette.text.primary,
    }
}));

const CardBottomInfo = styled(Box)(({ theme }) => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(1, 2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    background: alpha(theme.palette.background.paper, 0.5), // Subtle background
}));

// New styled component for content loading overlay
const ContentLoadingOverlay = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha(theme.palette.background.paper, 0.7),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2, // Above the card content but below menu
    backdropFilter: 'blur(2px)',
    borderRadius: theme.shape.borderRadius,
}));

const MaterialStatusIcon = ({ material }: { material: Material }) => {
    switch (material.syncStatus) {
        case SyncStatus.UP_TO_DATE: return <CloudDone fontSize="small" color="primary" />;
        case SyncStatus.SYNCING_UP: return <CloudSync fontSize="small" color="primary" />;
        case SyncStatus.SYNCING_DOWN: return <CloudSync fontSize="small" color="primary" />;
        case SyncStatus.ERROR: return <CloudOff fontSize="small" color="error" />;
        default:
            if (!material.driveId) return null; // No icon if not synced to Drive
            else return <CloudDownload fontSize="small" color="primary" />;
    }
}

// --- Helper Function ---

export const renderMaterialIcon = (type: MaterialType, sx?: object): React.ReactElement => {
    const props = { sx: { fontSize: 40, mb: 1, color: 'primary.main', ...sx } };
    switch (type) {
        case MaterialType.IMAGE: return <ImageIcon {...props} />;
        case MaterialType.PDF: return <PictureAsPdfIcon {...props} />;
        case MaterialType.LINK: return <LinkIcon {...props} />;
        case MaterialType.TEXT: return <DescriptionIcon {...props} />;
        case MaterialType.WORD: return <ArticleIcon {...props} />;
        case MaterialType.VIDEO: return <VideoFileIcon {...props} />;
        case MaterialType.AUDIO: return <AudioFileIcon {...props} />;
        case MaterialType.JUPYTER: return <CodeIcon {...props} />;
        case MaterialType.FILE: return <FilePresentIcon {...props} />;
        default: return <DescriptionIcon {...props} />;
    }
};

// --- Component ---

interface MaterialsPanelProps {
    selectedChapter: Chapter | null;
    onViewMaterial: (material: Material) => void;
    onDeleteMaterial: (material: Material) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    isDraggingOver: boolean;
    uploadProgress: Record<string, number>;
    onClose?: () => void; // For mobile drawer
}

const DrawerHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: '64px',
}));

const MaterialsPanel: React.FC<MaterialsPanelProps> = ({
    selectedChapter,
    onViewMaterial,
    onDeleteMaterial,
    onDrop,
    onDragOver,
    onDragEnter,
    onDragLeave,
    isDraggingOver,
    uploadProgress,
    onClose
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuMaterial, setMenuMaterial] = useState<Material | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

    // Track content loading state for each material
    const [loadingContent, setLoadingContent] = useState<Record<string, boolean>>({});
    // State for Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    // Get hooks for content fetching
    const { materials, loading, error, getMaterialContent } = useMaterials(selectedChapter?.id);
    const cloud = useCloudStorage();

    const { setPageContext } = useCopilot();
    useEffect(() => setPageContext({ page: 'materials', activeItem: { id: selectedChapter?.id || '', type: 'chapter' }, description: `Viewing chapter: ${selectedChapter?.name} from subjectId: ${selectedChapter?.subjectId}` }), [setPageContext, selectedChapter]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, material: Material) => {
        event.stopPropagation(); // Prevent card click
        setAnchorEl(event.currentTarget);
        setMenuMaterial(material);
    };

    const handleMenuClose = (event?: React.MouseEvent | {}) => {
        // Check if event exists and stop propagation if it's a mouse event
        if (event && typeof (event as React.MouseEvent).stopPropagation === 'function') {
            (event as React.MouseEvent).stopPropagation();
        }
        setAnchorEl(null);
        setMenuMaterial(null);
    };

    const handleDeleteClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (menuMaterial) {
            onDeleteMaterial(menuMaterial);
        }
        handleMenuClose();
    };

    const handleFileInputClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0 && selectedChapter) {
            const mockEvent = {
                dataTransfer: { files },
                preventDefault: () => { },
                stopPropagation: () => { },
            } as unknown as React.DragEvent<HTMLDivElement>;
            onDrop(mockEvent); // Use the existing onDrop handler
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear input
        }
    };

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
    };

    // Prepare material for viewing - ensure content is loaded before calling onViewMaterial
    const handleViewMaterial = useCallback(async (material: Material) => {
        // If material is already loaded or not synced to drive, open viewer immediately
        if (material.content?.data || material.type === MaterialType.LINK || !material.driveId) {
            onViewMaterial(material);
            return;
        }

        // Otherwise, fetch contentData first
        try {
            setLoadingContent(prev => ({ ...prev, [material.id]: true }));
            setSnackbar({ open: true, message: `Loading ${formatBytes(material.size || 0)} from Drive...` });

            const updatedMaterial = { ...material, content: await getMaterialContent(material.id) } as Material;
            if (updatedMaterial.content && updatedMaterial.content?.data) {
                onViewMaterial(updatedMaterial);
            } else {
                // If no updated material found (unlikely), use the original
                onViewMaterial(material);
            }
        } catch (err) {
            console.error(`Error loading content for ${material.id}:`, err);
            // Open the viewer anyway - it can handle the error
            onViewMaterial(material);
        } finally {
            setLoadingContent(prev => ({ ...prev, [material.id]: false }));
            setSnackbar({ ...snackbar, open: false });
        }
    }, [onViewMaterial, cloud, getMaterialContent, materials, formatBytes, snackbar]);

    // Type for display items (combines Material and uploading items)
    type DisplayItem = Material | {
        id: string;
        name: string;
        type: MaterialType;
        progress: number;
        isUploading: true; // Literal true to help with type narrowing
        size: number;
    };

    // Combine materials and uploading items for display
    const displayItems = useMemo<DisplayItem[]>(() => {
        const uploadingItems: DisplayItem[] = Object.entries(uploadProgress).map(([tempId, progress]) => ({
            id: tempId,
            name: tempId.substring(tempId.lastIndexOf('-') + 1),
            type: MaterialType.FILE, // Placeholder type
            progress: Math.round(progress),
            isUploading: true,
            size: 0, // Placeholder size
        }));
        // Filter out materials that are currently being uploaded (based on progress state)
        // const existingMaterials = materials.filter(m => !(m.syncStatus != 'up_to_date'));

        return [...materials, ...uploadingItems];
    }, [materials, uploadProgress]);


    // If mobile, render inside a Drawer
    // Always render the Drawer, only toggle open prop
    return isMobile ? (
        <Drawer
            anchor="right"
            open={!!selectedChapter}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            sx={{
                '& .MuiDrawer-paper': {
                    width: '100%',
                    maxWidth: { xs: '100%', sm: '450px' },
                    boxSizing: 'border-box',
                },
                display: { md: 'none' },
                zIndex: theme.zIndex.drawer + 1,
            }}
        >
            <DrawerHeader>
                <IconButton edge="start" onClick={onClose} aria-label="back">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" sx={{ ml: 1, flexGrow: 1 }}>
                    {selectedChapter ? 'Chapter Materials' : 'Select a Chapter'}
                </Typography>
            </DrawerHeader>
            <Box sx={{ height: 'calc(100% - 64px)', overflow: 'auto' }}>
                {renderPanelContent()}
            </Box>
        </Drawer>
    ) : (
        <MaterialsContainer
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {renderPanelContent()}
        </MaterialsContainer>
    );

    // Helper to render the main panel content (to avoid duplication)
    function renderPanelContent() {
        return (
            <>
                {/* Overlay Drop Zone */}
                <OverlayDropZone isDraggingOver={isDraggingOver} onDrop={onDrop} onDragOver={onDragOver}>
                    <UploadFileIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
                    <Typography variant="h5" color="text.primary">Drop files here</Typography>
                    <Typography variant="body1" color="text.secondary">to add them to "{selectedChapter?.name}"</Typography>
                </OverlayDropZone>

                {/* Main Content Area */}
                <Fade in={true} timeout={500}>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h6">
                                {selectedChapter ? `Materials for: ${selectedChapter.name}` : 'Select a Chapter'}
                            </Typography>
                            {selectedChapter && (
                                <Button variant="text" size='small' startIcon={<UploadFileIcon />} onClick={handleFileInputClick}>
                                    Add
                                    <input type="file" hidden multiple onChange={handleFileInputChange} />
                                </Button>
                            )}
                        </Box>
                        <Divider sx={{ mb: 4 }} />

                        {loading && !!selectedChapter && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ m: 1 }}>
                                Failed to load materials: {error.message}
                            </Alert>
                        )}

                        {selectedChapter && displayItems.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary" gutterBottom>
                                    No materials added yet.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<UploadFileIcon />}
                                    onClick={handleFileInputClick}
                                    sx={{ mt: 1 }}
                                >
                                    Upload First Material
                                </Button>
                            </Box>
                        )}

                        {!loading && !error && selectedChapter && displayItems.length > 0 && (
                            <Grid container columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2}>
                                {displayItems.map((item) => (
                                    <MaterialCard key={item.id} elevation={1}>  {/* Render differently if uploading - use proper type guard */}
                                        {'isUploading' in item ? (
                                            <CardContent sx={{ textAlign: 'center', opacity: 0.7 }}>
                                                <CircularProgress variant="determinate" value={item.progress} sx={{ mb: 1 }} />
                                                <Typography variant="body2" noWrap sx={{ mb: 0.5 }}>Uploading {item.name}</Typography>
                                                <LinearProgress variant="determinate" value={item.progress} sx={{ height: 6, borderRadius: 3 }} />
                                            </CardContent>
                                        ) : (
                                            <>
                                                <CardMenuButton
                                                    aria-label="material options"
                                                    aria-controls={Boolean(anchorEl) ? `material-menu-${item.id}` : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={Boolean(anchorEl) && menuMaterial?.id === item.id ? 'true' : undefined}
                                                    onClick={(e) => handleMenuOpen(e, item)}
                                                    size="small"
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </CardMenuButton>
                                                <CardTopActionArea onClick={() => handleViewMaterial(item)}>
                                                    <CardContent sx={{ textAlign: 'center' }}>
                                                        {renderMaterialIcon(item.type)}
                                                        <Typography variant="body1" fontWeight={500} noWrap gutterBottom>
                                                            {item.name}
                                                        </Typography>
                                                    </CardContent>

                                                    {/* Content loading overlay */}
                                                    {loadingContent[item.id] && (
                                                        <ContentLoadingOverlay>
                                                            <CircularProgress size={36} />
                                                        </ContentLoadingOverlay>
                                                    )}
                                                </CardTopActionArea>
                                                <CardBottomInfo>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">{formatBytes(item.size || 0)}</Typography>
                                                        <Tooltip title={item.syncStatus}><div><MaterialStatusIcon material={item} /></div></Tooltip>
                                                    </Box>
                                                    {item.progress !== undefined && item.progress < 100 && item.progress > 0 && (
                                                        <LinearProgress variant="determinate" value={item.progress} sx={{ height: 4, borderRadius: 2 }} />
                                                    )}
                                                </CardBottomInfo>
                                            </>
                                        )}
                                    </MaterialCard>
                                ))}
                            </Grid>
                        )}
                    </Box>
                </Fade>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    hidden
                    onChange={handleFileInputChange}
                    aria-hidden="true" // Hide from accessibility tree
                />

                {/* Material Action Menu */}
                <Menu
                    id={`material-menu-${menuMaterial?.id}`}
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl) && !!menuMaterial}
                    onClose={handleMenuClose}
                    MenuListProps={{
                        'aria-labelledby': 'material options',
                    }}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    {/* Add other actions like Edit, Download later */}
                    <MenuItem onClick={handleDeleteClick}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText primary="Delete" primaryTypographyProps={{ color: 'error.main' }} />
                    </MenuItem>
                </Menu>

                {/* Snackbar for loading message */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000} // Adjust as needed
                    onClose={handleSnackbarClose}
                    message={snackbar.message}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                />
            </>
        );
    }
};

export default MaterialsPanel;