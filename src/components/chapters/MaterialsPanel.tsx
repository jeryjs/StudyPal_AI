import React, { useState, useRef, useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Divider,
    LinearProgress,
    Paper,
    styled,
    alpha,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Card,
    CardContent,
    CardActionArea,
    Fade, // Import Fade for transition
    Button
} from '@mui/material';
import { Masonry } from '@mui/lab'; // Import Masonry
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Import MoreVertIcon
import { Material, Chapter, MaterialType } from '@type/db.types';
import { formatBytes } from '@utils/utils';

// --- Styled Components ---

// Keep MaterialsContainer, adjust padding/minHeight if needed
const MaterialsContainer = styled(Paper)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 1.5,
    padding: theme.spacing(3),
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
    padding: theme.spacing(1, 2), // Consistent padding
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // background: alpha(theme.palette.background.paper, 0.5), // Optional subtle background
}));


// --- Helper Function ---

const renderMaterialIcon = (type: MaterialType, sx?: object) => {
    const props = { sx: { fontSize: 40, mb: 1, color: 'primary.main', ...sx } };
    switch (type) {
        case MaterialType.IMAGE: return <ImageIcon {...props} />;
        case MaterialType.PDF: return <PictureAsPdfIcon {...props} />;
        case MaterialType.LINK: return <LinkIcon {...props} />;
        default: return <DescriptionIcon {...props} />;
    }
};

// --- Component ---

interface MaterialsPanelProps {
    selectedChapter: Chapter | null;
    materials: Material[];
    onViewMaterial: (material: Material) => void;
    onDeleteMaterial: (material: Material) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    isDraggingOver: boolean;
    loading: boolean;
    error: Error | null;
    uploadProgress: Record<string, number>;
}

const MaterialsPanel: React.FC<MaterialsPanelProps> = ({
    selectedChapter,
    materials,
    onViewMaterial,
    onDeleteMaterial,
    onDrop,
    onDragOver,
    onDragEnter,
    onDragLeave,
    isDraggingOver,
    loading,
    error,
    uploadProgress
}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuMaterial, setMenuMaterial] = useState<Material | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

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
    };    // Type for display items (combines Material and uploading items)
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
        const existingMaterials = materials.filter(m => !(m.progress !== undefined && m.progress < 100));

        return [...existingMaterials, ...uploadingItems];
    }, [materials, uploadProgress]);


    return (
        <MaterialsContainer
            // Add drag handlers to the main container to detect drag enter/leave for the overlay
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver} // Need onDragOver on the container too
            onDrop={onDrop} // Handle drop on the container if it happens outside the overlay somehow
        >
            {/* Overlay Drop Zone */}
            <OverlayDropZone isDraggingOver={isDraggingOver} onDrop={onDrop} onDragOver={onDragOver}>
                <UploadFileIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
                <Typography variant="h5" color="text.primary">Drop files here</Typography>
                <Typography variant="body1" color="text.secondary">to add them to "{selectedChapter?.name}"</Typography>
            </OverlayDropZone>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0.5 /* Add slight padding for Masonry items */ }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, ml: 1 }}>
                    {selectedChapter ? `Materials for: ${selectedChapter.name}` : 'Select a Chapter'}
                </Typography>
                <Divider sx={{ mb: 2 }} />

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

                {!loading && selectedChapter && displayItems.length === 0 && (
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
                    <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2}>
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
                                            onClick={(e) => handleMenuOpen(e, item)} // No cast needed with proper type guard
                                            size="small"
                                        >
                                            <MoreVertIcon fontSize="small" />
                                        </CardMenuButton>
                                        <CardTopActionArea onClick={() => onViewMaterial(item as Material)}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                {renderMaterialIcon(item.type)}
                                                <Typography variant="body1" fontWeight={500} noWrap gutterBottom>
                                                    {item.name}
                                                </Typography>
                                            </CardContent>
                                        </CardTopActionArea>
                                        <CardBottomInfo>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatBytes(item.size || 0)}
                                            </Typography>
                                            {item.progress !== undefined && item.progress < 100 && item.progress > 0 && (
                                                 <Box sx={{ width: '40%' }}>
                                                     <LinearProgress variant="determinate" value={item.progress} sx={{ height: 4, borderRadius: 2 }} />
                                                 </Box>
                                            )}
                                        </CardBottomInfo>
                                    </>
                                )}
                            </MaterialCard>
                        ))}
                    </Masonry>
                )}
            </Box>

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
        </MaterialsContainer>
    );
};

export default MaterialsPanel;