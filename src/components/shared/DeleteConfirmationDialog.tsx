import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Alert,
    Typography,
    Box,
    styled,
    alpha
} from '@mui/material';

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

export interface DeleteConfirmationProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    itemName: string;
    itemType: 'subject' | 'chapter' | 'material' | 'item';
    warningMessage?: string; // Optional warning message for specific item types
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationProps> = ({ open, onClose, onConfirm, itemName, itemType, warningMessage }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
            onClose(); // Close dialog on success
        } catch (err) {
            console.error(`Error deleting ${itemType}:`, err);
            setError(err instanceof Error ? err.message : `Failed to delete ${itemType}.`);
            setIsDeleting(false); // Keep dialog open on error
        }
    };

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setIsDeleting(false);
            setError(null);
        }
    }, [open]);


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
            <StyledDialogTitle>Confirm Deletion</StyledDialogTitle>
            <StyledDialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Typography>
                    Are you sure you want to delete the {itemType} "<strong>{itemName}</strong>"?
                    {warningMessage
                        ? <Typography color="warning.main" sx={{ mt: 1 }}>{warningMessage}</Typography>
                        : (itemType === 'chapter' || itemType === 'subject') && (
                            <Typography color="error.main" sx={{ mt: 1 }}>
                                Warning: This will also delete all items within this {itemType}!
                            </Typography>
                        )}
                </Typography>
            </StyledDialogContent>
            <StyledDialogActions>
                <Button onClick={onClose} color="inherit" disabled={isDeleting}>Cancel</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="error"
                    disabled={isDeleting}
                >
                    {isDeleting ? <CircularProgress size={24} /> : `Delete ${itemType}`}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default DeleteConfirmationDialog;