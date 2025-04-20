import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    LinearProgress,
    styled,
    alpha
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';
import { Material, MaterialType } from '@type/db.types';
import { formatBytes } from '@utils/utils';

// --- Styled Components (Copied from ChaptersPage) ---

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
    textAlign: 'center',
    paddingBottom: theme.spacing(1),
    fontWeight: 700,
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: theme.spacing(2, 3),
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
    padding: theme.spacing(2, 3),
    justifyContent: 'space-between', // Keep consistent styling
}));

// --- Helper Function ---

// Helper function for material icons
const renderMaterialIcon = (type: MaterialType) => {
    switch (type) {
        case MaterialType.IMAGE: return <ImageIcon />;
        case MaterialType.PDF: return <PictureAsPdfIcon />;
        case MaterialType.LINK: return <LinkIcon />;
        default: return <DescriptionIcon />;
    }
};


// --- Component ---

export interface MaterialViewerProps {
    open: boolean;
    onClose: () => void;
    material: Material | null;
}

const MaterialViewerDialog: React.FC<MaterialViewerProps> = ({ open, onClose, material }) => {
    if (!material) return null;

    const renderContent = () => {
        switch (material.type) {
            case MaterialType.IMAGE:
                if (material.contentUrl) {
                    return <Box component="img" src={material.contentUrl} alt={material.name} sx={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: 'auto' }} />;
                } else if (material.content instanceof Blob) {
                    const objectUrl = URL.createObjectURL(material.content);
                    return (
                        <Box
                            component="img"
                            src={objectUrl}
                            alt={material.name}
                            sx={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: 'auto' }}
                            onLoad={() => URL.revokeObjectURL(objectUrl)}
                        />
                    );
                }
                return <Typography>Unable to display image content</Typography>;

            case MaterialType.PDF:
                if (material.contentUrl) {
                    return (
                        <Box sx={{ width: '100%', height: '70vh' }}>
                            <iframe
                                src={material.contentUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                                title={material.name}
                            />
                        </Box>
                    );
                } else if (material.content instanceof Blob) {
                    const objectUrl = URL.createObjectURL(material.content);
                    return (
                        <Box sx={{ width: '100%', height: '70vh' }}>
                            <iframe
                                src={objectUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                                title={material.name}
                                onLoad={() => URL.revokeObjectURL(objectUrl)}
                            />
                        </Box>
                    );
                }
                return <Typography>Unable to display PDF content</Typography>;

            case MaterialType.LINK:
                return (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                        <Typography variant="h6" gutterBottom>External Link</Typography>
                        <Button
                            variant="outlined"
                            color="primary"
                            href={material.contentUrl || ''}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<LinkIcon />}
                        >
                            Open Link
                        </Button>
                        <Typography variant="caption" display="block" sx={{ mt: 2, wordBreak: 'break-all' }}>
                            {material.contentUrl}
                        </Typography>
                    </Box>
                );

            case MaterialType.TEXT:
            case MaterialType.MARKDOWN:
                return (
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, maxHeight: '70vh', overflowY: 'auto' }}>
                        <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {typeof material.content === 'string' ? material.content : 'Content not available'}
                        </Typography>
                    </Box>
                );

            default:
                return <Typography>This material type cannot be previewed directly</Typography>;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: (theme) => alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(12px)',
                }
            }}
        >
            <StyledDialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderMaterialIcon(material.type)}
                    <Typography variant="h6" sx={{ ml: 1 }}>{material.name}</Typography>
                </Box>
            </StyledDialogTitle>
            <StyledDialogContent>
                <Box sx={{ mb: 2 }}>
                    {renderContent()}
                </Box>
                {material.size !== undefined && ( // Check for undefined explicitly
                    <Typography variant="caption" color="text.secondary">
                        Size: {formatBytes(material.size)}
                    </Typography>
                )}
                {material.progress !== undefined && material.progress < 100 && ( // Only show progress if not 100%
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>Progress: {material.progress}%</Typography>
                        <LinearProgress variant="determinate" value={material.progress} sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                )}
            </StyledDialogContent>
            <StyledDialogActions sx={{ justifyContent: 'flex-end' }}> {/* Align close button to the right */}
                <Button onClick={onClose} color="primary" variant="outlined">Close</Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default MaterialViewerDialog;
