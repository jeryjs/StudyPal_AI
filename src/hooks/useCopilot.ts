// src/hooks/useCopilot.ts
import { useContext } from 'react';
import { CopilotContext } from '../contexts/CopilotContext';

/**
 * Custom hook to easily access the Copilot context.
 */
export const useCopilot = () => {
    const context = useContext(CopilotContext);
    if (context === undefined) {
        throw new Error('useCopilot must be used within a CopilotProvider');
    }
    return context;
};
