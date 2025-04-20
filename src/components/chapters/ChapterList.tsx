import React from 'react';
import {
    Box,
    Typography,
    Button,
    List,
    ListItemText,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Divider,
    Paper,
    ListItemButton,
    styled,
    alpha
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Chapter } from '@type/db.types';

// --- Styled Components (Copied from ChaptersPage) ---

const GlassmorphicPaper = styled(Paper)(({ theme }) => ({
    background: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
    borderRadius: theme.shape.borderRadius * 2,
    // padding: theme.spacing(3),
    // marginBottom: theme.spacing(3), // Removed margin bottom as it's handled by Grid spacing
    overflow: 'hidden',
    height: '100%', // Ensure it takes full height of the grid item
}));

const ChapterItem = styled(ListItemButton, {
    shouldForwardProp: (prop) => prop !== 'isSelected'
})<{ isSelected?: boolean }>(({ theme, isSelected }) => ({
    borderRadius: theme.shape.borderRadius,
    // marginBottom: theme.spacing(1), // Handled by Box wrapper now
    backgroundColor: isSelected
        ? alpha(theme.palette.primary.main, 0.15)
        : alpha(theme.palette.background.paper, 0.4),
    border: `1px solid ${isSelected
        ? theme.palette.primary.main
        : alpha(theme.palette.divider, 0.2)}`,
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: isSelected
            ? alpha(theme.palette.primary.main, 0.2)
            : alpha(theme.palette.action.hover, 0.15),
    },
    paddingRight: theme.spacing(7), // Make space for absolute positioned icons
}));

// --- Component ---

export interface ChapterListProps {
    chapters: Chapter[];
    selectedChapter: Chapter | null;
    onSelectChapter: (chapter: Chapter) => void;
    onAddChapter: () => void;
    onEditChapter: (chapter: Chapter) => void;
    onDeleteChapter: (chapter: Chapter) => void;
    loading: boolean;
    error: Error | null;
}

const ChapterList: React.FC<ChapterListProps> = ({
    chapters,
    selectedChapter,
    onSelectChapter,
    onAddChapter,
    onEditChapter,
    onDeleteChapter,
    loading,
    error
}) => {

    const sortedChapters = React.useMemo(() => {
        return [...chapters].sort((a, b) => a.number - b.number);
    }, [chapters]);

    return (
        <GlassmorphicPaper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p:2 }}>
                <Typography variant="h6">Chapters</Typography>
                <Button
                    startIcon={<AddIcon />}
                    size="small"
                    variant="outlined"
                    onClick={onAddChapter}
                >
                    Add
                </Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={32} />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load chapters: {error.message}
                </Alert>
            )}

            {!loading && !error && sortedChapters.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary" gutterBottom>
                        No chapters created yet
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={onAddChapter}
                        sx={{ mt: 1 }}
                    >
                        Add Your First Chapter
                    </Button>
                </Box>
            )}

            <List sx={{ overflowY: 'auto', maxHeight: 'calc(100% - 120px)', pr: 1 }}> {/* Adjust maxHeight */}
                {sortedChapters.map(chapter => (
                    <Box key={chapter.id} sx={{ position: 'relative', mb: 1 }}>
                        <ChapterItem
                            isSelected={selectedChapter?.id === chapter.id}
                            onClick={() => onSelectChapter(chapter)}
                        >
                            <ListItemText
                                primary={chapter.name}
                                secondary={chapter.number > 0 ? `Chapter ${chapter.number}` : null}
                                primaryTypographyProps={{
                                    fontWeight: selectedChapter?.id === chapter.id ? 600 : 400,
                                    noWrap: true, // Prevent long names from wrapping awkwardly
                                    sx: { pr: 1 } // Add padding to prevent overlap with icons
                                }}
                            />
                        </ChapterItem>
                        {/* Action Icons absolutely positioned */}
                        <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', zIndex: 1, background: 'inherit', borderRadius: '50%' }}>
                            <Tooltip title="Edit Chapter">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent ChapterItem onClick
                                        onEditChapter(chapter);
                                    }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Chapter">
                                <IconButton
                                    size="small"
                                    sx={{ ml: 0.5 }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent ChapterItem onClick
                                        onDeleteChapter(chapter);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" color="error" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                ))}
            </List>
        </GlassmorphicPaper>
    );
};

export default ChapterList;