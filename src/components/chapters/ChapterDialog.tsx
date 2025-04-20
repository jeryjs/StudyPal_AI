import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Box,
    styled,
    alpha
} from '@mui/material';
import { Chapter } from '@type/db.types';

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
    justifyContent: 'space-between',
}));

// --- Component ---

export interface ChapterDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, number: number) => Promise<void>;
    initialData?: Chapter | null;
    subjectName?: string;
}

const ChapterDialog: React.FC<ChapterDialogProps> = ({ open, onClose, onSubmit, initialData, subjectName }) => {
    const [name, setName] = useState('');
    const [number, setNumber] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setName(initialData?.name || '');
            setNumber(initialData?.number || 0);
            setIsSubmitting(false);
            setError(null);
        }
    }, [open, initialData]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setError('Chapter name cannot be empty.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(name.trim(), number);
            onClose(); // Close dialog on successful submit
        } catch (err) {
            console.error("Error submitting chapter:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsSubmitting(false); // Keep dialog open on error
        }
        // Removed finally block to keep dialog open on error
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    width: '90%',
                    maxWidth: 500,
                    background: (theme) => alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: 'blur(12px)',
                }
            }}
        >
            <StyledDialogTitle>{initialData ? 'Edit Chapter' : `Add Chapter to ${subjectName || 'Subject'}`}</StyledDialogTitle>
            <Box component="form" onSubmit={handleSubmit}>
                <StyledDialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="chapter-name"
                        label="Chapter Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="chapter-number"
                        label="Chapter Number"
                        type="number"
                        inputProps={{ min: 0 }}
                        fullWidth
                        variant="outlined"
                        value={number}
                        onChange={(e) => setNumber(parseInt(e.target.value) || 0)}
                        disabled={isSubmitting}
                        helperText="Used for ordering chapters. Leave at 0 for automatic ordering."
                    />
                </StyledDialogContent>
                <StyledDialogActions>
                    <Button onClick={onClose} color="inherit" disabled={isSubmitting}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || !name.trim()}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (initialData ? 'Update Chapter' : 'Create Chapter')}
                    </Button>
                </StyledDialogActions>
            </Box>
        </Dialog>
    );
};

export default ChapterDialog;