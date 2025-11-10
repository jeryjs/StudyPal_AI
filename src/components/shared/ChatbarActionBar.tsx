import { useMaterials } from '@hooks/useMaterials';
import { useSubjects } from '@hooks/useSubjects';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popper,
    Tooltip,
    Typography,
    alpha
} from '@mui/material';
import { ChatAttachment, ChatAttachmentWithContent } from '@type/copilot.types';
import { Material, MaterialType } from '@type/db.types';
import { useEffect, useState } from 'react';

interface ChatbarActionBarProps {
    isExpanded: boolean;
    activeAttachments: ChatAttachment[];
    onAttachMaterial: (material: ChatAttachmentWithContent) => void;
    onRemoveAttachment: (attachmentId: string) => void;
}

interface AttachmentLoadingState {
    [materialId: string]: boolean;
}

const ChatbarActionBar: React.FC<ChatbarActionBarProps> = ({
    isExpanded,
    activeAttachments,
    onAttachMaterial,
    onRemoveAttachment
}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [loadingAttachments, setLoadingAttachments] = useState<AttachmentLoadingState>({});

    const { materials, getMaterialContent } = useMaterials();
    const { subjects } = useSubjects();

    const open = Boolean(anchorEl);
    const popperId = open ? 'attachment-popper' : undefined;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '/') {
                event.preventDefault();
                document.getElementById('attach-button')?.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleAttachClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const getMaterialIcon = (type: string) => {
        switch (type) {
            case MaterialType.PDF: return <PictureAsPdfIcon color="error" />;
            case MaterialType.IMAGE: return <ImageIcon color="primary" />;
            case MaterialType.LINK: return <LinkIcon color="secondary" />;
            default: return <DescriptionIcon color="info" />;
        }
    };

    const handleAttachMaterial = async (material: Material) => {
        try {
            // Mark this material as loading
            setLoadingAttachments(prev => ({ ...prev, [material.id]: true }));

            // Get material content using the new method from materialsStore
            const content = await getMaterialContent(material.id);

            // Create the attachment with content
            const attachment: ChatAttachmentWithContent = {
                id: material.id,
                name: material.name,
                type: material.type,
                content: content || undefined
            };

            // Send it to parent component
            onAttachMaterial(attachment);
        } catch (error) {
            console.error("Error attaching material:", error);
        } finally {
            // Remove loading state
            setLoadingAttachments(prev => {
                const newState = { ...prev };
                delete newState[material.id];
                return newState;
            });
            handleClose();
        }
    };

    if (!isExpanded) return null;

    return (
        <Box sx={{
            padding: 1,
            display: 'flex',
            borderRadius: theme => theme.shape.borderRadius * 0.4,
            backgroundColor: theme => alpha(theme.palette.background.default, 0.8),
            '& div > svg': { fontSize: '1rem' },
        }}>
            <Box display="flex" alignItems="center" gap={1}>
                <Tooltip title="Select materials to attach (Ctrl + /)" arrow placement="bottom-start">
                    <IconButton
                        id='attach-button'
                        size="small"
                        onClick={handleAttachClick}
                        sx={{ color: 'text.secondary' }}
                    >
                        <AttachFileIcon />
                    </IconButton>
                </Tooltip>

                <Popper
                    id={popperId}
                    open={open}
                    anchorEl={anchorEl}
                    placement="bottom-start"
                    sx={{ zIndex: 1300, width: 320, maxHeight: '70vh', overflowY: 'auto' }}
                >
                    <Paper elevation={3} sx={{ p: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle1">Select material to attach</Typography>
                            <IconButton size="small" onClick={handleClose}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Divider sx={{ mb: 1 }} />

                        <List dense sx={{ maxHeight: '20vh', overflow: 'auto' }}>
                            {materials.map((material) => {
                                const isAttached = activeAttachments.some(a => a.id === material.id);
                                const isLoading = loadingAttachments[material.id];

                                return (
                                    <ListItemButton
                                        key={material.id}
                                        disabled={isAttached || isLoading}
                                        onClick={() => handleAttachMaterial(material)}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            '&.Mui-disabled': {
                                                opacity: isLoading ? 1 : 0.5
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            {isLoading ? (
                                                <CircularProgress size={20} />
                                            ) : (
                                                getMaterialIcon(material.type)
                                            )}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={material.name}
                                            primaryTypographyProps={{
                                                variant: 'body2',
                                                noWrap: true
                                            }}
                                            secondary={isAttached ? "Already attached" : null}
                                        />
                                    </ListItemButton>
                                );
                            })}

                            {materials.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: 'center' }}>
                                    No materials available
                                </Typography>
                            )}
                        </List>
                    </Paper>
                </Popper>

                {/* Display active attachments */}
                <Box display="flex" gap={1}>
                    {activeAttachments.map(attachment => (
                        <Box
                            key={attachment.id}
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 4,
                                px: 1,
                                py: 0.5,
                                gap: 0.5
                            }}
                        >
                            {getMaterialIcon(attachment.type)}
                            <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                                {attachment.name}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => onRemoveAttachment(attachment.id)}
                                sx={{ p: 0.3 }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}

                    {Object.keys(loadingAttachments).map(id => (
                        <Box
                            key={id}
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 4,
                                px: 1,
                                py: 0.5,
                                gap: 0.5
                            }}
                        >
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">
                                Loading...
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default ChatbarActionBar;
