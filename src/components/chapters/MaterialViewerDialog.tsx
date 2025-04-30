import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    Backdrop,
    Box,
    CircularProgress,
    IconButton,
    Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { Material, MaterialType } from '@type/db.types';
import { tryBase64ToBlob } from '@utils/utils';

// --- Sub-Components ---

const previewableTypes = [
    MaterialType.IMAGE,
    MaterialType.PDF,
    MaterialType.VIDEO,
    MaterialType.AUDIO,
    MaterialType.TEXT,
];

interface FullscreenPreviewProps {
    open: boolean;
    onClose: () => void;
    material: Material;
    contentBlob: Blob | null;
}

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ open, onClose, material, contentBlob }) => {
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Create Object URL for non-text types
    const objectUrl = useMemo(() => {
        if (contentBlob && material.type !== MaterialType.TEXT) {
            try {
                return URL.createObjectURL(contentBlob);
            } catch (error) {
                console.error("Error creating object URL:", error);
                return null;
            }
        }
        return null;
    }, [contentBlob, material.type]);

    // Effect to load content
    useEffect(() => {
        let isMounted = true;
        if (open && contentBlob) {
            setIsLoading(true);
            setContent(null);

            if (material.type === MaterialType.LINK || material.type === MaterialType.TEXT) {
                contentBlob.text()
                    .then(text => {
                        if (isMounted) {
                            setContent(text);
                        }
                    })
                    .catch(err => {
                        console.error("Error reading text blob:", err);
                        if (isMounted) {
                            setContent("Error loading text content.");
                        }
                    })
                    .finally(() => {
                        if (isMounted) {
                            setIsLoading(false);
                        }
                    });
            } else {
                setContent(objectUrl);
                setIsLoading(false);
            }
        } else {
            setContent(null); // Clear content if no blob
        }

        return () => {
            isMounted = false;
        };
    }, [open, material.type, contentBlob, objectUrl]);

    // Effect to revoke Object URL on cleanup
    useEffect(() => {
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [objectUrl]);

    const renderPreviewContent = () => {
        if (isLoading) return <CircularProgress color="inherit" />;

        if (!content && !material.driveId) return <Alert severity="error" children="No content available. This material doesn't seem to be synced to your Cloud Storage." />;

        if (!content) return <Alert severity="error" children="Failed to load content." />;

        switch (material.type) {
            case MaterialType.IMAGE: return <Box component="img" src={content} alt={material.name} sx={{ display: 'block', maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain' }} />;
            case MaterialType.PDF: return <Box component="iframe" src={content} title={material.name} sx={{ width: '95vw', height: '90vh', border: 'none', bgcolor: 'white' }} />;
            case MaterialType.VIDEO: return <Box component="video" src={content} controls sx={{ display: 'block', maxWidth: '95vw', maxHeight: '90vh' }} />;
            case MaterialType.AUDIO: return <Box component="audio" src={content} controls sx={{ display: 'block', mt: 4 }} />;
            case MaterialType.TEXT: return <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', p: 2, bgcolor: 'background.paper', borderRadius: 1, maxHeight: '90vh', overflowY: 'auto', color: 'text.primary', width: '80vw' }}>{content ?? '(Empty or loading...)'}</Box>;
            default:
                // For non-previewable types or links, show basic info or message
                return <Typography color="inherit">Preview not supported or content unavailable.</Typography>;
        }
    };

    return (
        <Backdrop
            open={open}
            onClick={onClose}
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(0, 0, 0, 0.85)' }}
        >
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                <Box onClick={(e) => e.stopPropagation()}>
                    {renderPreviewContent()}
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 16, right: 16, color: (theme) => theme.palette.grey[300], bgcolor: 'rgba(0, 0, 0, 0.5)', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' } }}
                >
                    <CloseIcon />
                </IconButton>
                <Typography sx={{ position: 'absolute', bottom: 16, left: 16, color: (theme) => theme.palette.grey[400], fontSize: '0.9rem' }}>
                    {material.name}
                </Typography>
            </Box>
        </Backdrop>
    );
};


// --- Main Component ---

interface MaterialViewerDialogProps {
    open: boolean;
    material: Material | null;
    onClose: () => void;
}

const MaterialViewerDialog: React.FC<MaterialViewerDialogProps> = ({ open, material, onClose }) => {
    const [contentBlob, setContentBlob] = useState<Blob | null>(null);

    const handleClose = () => {
        setContentBlob(null); // Clear blob on close
        onClose();
    };

    useEffect(() => {
        if (!open || !material) return setContentBlob(null); // Clear blob if not open or no material

        const localData = material.content?.data;

        // If the content is a string, try decode & convert it to a Blob
        if (typeof localData === 'string') return setContentBlob(tryBase64ToBlob(localData));

        // If the content is already a Blob, just set it directly
        return setContentBlob(localData as Blob);
    }, [open, material]);;

    if (!open || !material) {
        return null;
    }

    // Always render the previewer; it handles loading/unavailable states
    return (
        <FullscreenPreview
            open={open}
            onClose={handleClose}
            material={material}
            contentBlob={contentBlob}
        />
    );
};

export default MaterialViewerDialog;
