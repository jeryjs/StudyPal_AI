// src/contexts/CopilotContext.tsx
import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CopilotMessage, CopilotSuggestion, CopilotTool, CopilotModel } from '../types/copilot.types';
import { FunctionCallPart, FunctionResponsePart, Part } from '@google/generative-ai';
import { GeminiService } from '../services/GeminiService';
import { toolRegistry, executeTool as executeToolFromRegistry } from '../services/ToolRegistry';
import copilotStore from '../store/copilotStore';
import settingsStore from '../store/settingsStore';
import { subjectsStore } from '../store/subjectsStore';

interface CopilotContextType {
    messages: CopilotMessage[];
    suggestions: CopilotSuggestion[];
    isLoading: boolean;
    error: string | null;
    currentModel: CopilotModel;
    sendMessage: (prompt: string, context?: string, model?: CopilotModel) => Promise<void>;
    clearChat: () => Promise<void>;
    setPageContext: (context: string | null) => void;
    setCurrentModel: (model: CopilotModel) => void;
}

export const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

interface CopilotProviderProps {
    children: ReactNode;
}

export const CopilotProvider: React.FC<CopilotProviderProps> = ({ children }) => {
    const [messages, setMessages] = useState<CopilotMessage[]>([]);
    const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [pageContext, setPageContext] = useState<string | null>(null);
    const [currentModel, setCurrentModel] = useState<CopilotModel>(CopilotModel.REGULAR);

    const aiService = useMemo(() => new GeminiService(), []);

    // Load initial messages
    useEffect(() => {
        const loadInitialMessages = async () => {
            setIsLoading(true);
            try {
                const initialMessages = await copilotStore.getMessagesPaginated(1, 50);
                setMessages(initialMessages.reverse());
            } catch (err) {
                console.error("Failed to load initial messages:", err);
                setError("Failed to load chat history.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialMessages();
    }, []);

    // useCallback hooks for DB operations
    const addMessage = useCallback(async (message: CopilotMessage) => {
        try {
            await copilotStore.addMessage(message);
        } catch (err) {
            console.error("Failed to save message to DB:", err);
            setError("Failed to save message.");
        }
    }, []);

    const updateMessage = useCallback(async (message: CopilotMessage) => {
        try {
            await copilotStore.updateMessage(message);
            // Update local state after successful DB update
            setMessages(prev => prev.map(m => m.id === message.id ? message : m));
        } catch (err) {
            console.error("Failed to update message in DB:", err);
            setError("Failed to update message.");
        }
    }, []);

    const clearChat = useCallback(async () => {
        setIsLoading(true);
        try {
            await copilotStore.clearAllMessages();
            setMessages([]);
            setSuggestions([]);
            setError(null);
        } catch (err) {
            console.error("Failed to clear chat:", err);
            setError("Failed to clear chat history.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Extracted logic for processing stream and handling tools
    const processAndSendMessage = useCallback(async (
        historyForAPI: CopilotMessage[],
        systemInstruction: string,
        tools: CopilotTool[], // Pass the tool array directly
        modelToUse: CopilotModel,
        placeholderMessage: CopilotMessage
    ) => {
        let accumulatedText = '';
        let functionCalls: FunctionCallPart[] = [];
        let finalMessage = { ...placeholderMessage };
        let finalMessageContent: Part[] = placeholderMessage.parts;

        try {
            const stream = aiService.sendMessageStream(
                historyForAPI,
                systemInstruction,
                tools, // Use the passed tools array
                modelToUse
            );

            for await (const chunk of stream) {
                // Placeholder for reasoning extraction
                // const chunkReasoning = chunk.candidates?.[0]?.citationMetadata || chunk.usageMetadata;
                // if (chunkReasoning) { finalMessage.reasoningMetadata = { ...(finalMessage.reasoningMetadata || {}), ...chunkReasoning }; }

                const parts = chunk.candidates?.[0]?.content?.parts || [];
                let textUpdated = false;
                for (const part of parts) {
                    if ('text' in part && typeof part.text === 'string') {
                        accumulatedText += part.text;
                        finalMessageContent = [{ text: accumulatedText }];
                        textUpdated = true;
                    }
                    if ('functionCall' in part && part.functionCall) {
                        console.log("Function call received:", part.functionCall);
                        // If this is the first function call, replace content, otherwise append
                        if (functionCalls.length === 0) {
                            finalMessageContent = [part];
                        } else {
                            // Ensure finalMessageContent is an array before pushing
                            if (!Array.isArray(finalMessageContent)) finalMessageContent = [];
                            finalMessageContent.push(part);
                        }
                        functionCalls.push(part);
                        textUpdated = false; // Don't treat function call as text update for immediate display
                    }
                }

                // Update message in state only if text content changed
                if (textUpdated) {
                    finalMessage = { ...finalMessage, parts: finalMessageContent, isLoading: true };
                    // Update state optimistically during streaming for text
                    setMessages(prev => prev.map(m => m.id === finalMessage.id ? finalMessage : m));
                }
            }

            finalMessage = { ...finalMessage, isLoading: false };

            // --- Tool Execution --- (If function calls were received)
            if (functionCalls.length > 0) {
                finalMessage.parts = functionCalls;
                finalMessage.isLoading = true;
                await updateMessage(finalMessage);

                const toolResponses: FunctionResponsePart[] = [];
                for (const callPart of functionCalls) {
                    const { name, args } = callPart.functionCall;
                    try {
                        // Use the imported executeTool function
                        const result = await executeToolFromRegistry({ name, args });
                        toolResponses.push({ functionResponse: { name, response: { content: result } } });
                    } catch (toolError: any) {
                        console.error(`Error executing tool ${name}:`, toolError);
                        toolResponses.push({ functionResponse: { name, response: { content: `Error: ${toolError.message || 'Tool execution failed'}` } } });
                    }
                }

                // Create the tool response message
                const toolResponseMessage: CopilotMessage = {
                    id: uuidv4(),
                    role: 'tool',
                    parts: toolResponses,
                    timestamp: Date.now(),
                    modelUsed: modelToUse, // Carry over the model used
                };

                // Add tool response message to state and DB
                // Get the current state *before* setting the new state for the recursive call
                const currentMessagesBeforeToolResponse = messages.map(m => m.id === finalMessage.id ? finalMessage : m);
                const messagesWithToolResponse = [...currentMessagesBeforeToolResponse, toolResponseMessage];
                setMessages(messagesWithToolResponse); // Update UI
                await addMessage(toolResponseMessage); // Save to DB

                // Prepare history for the follow-up call (includes the tool response)
                const historyForToolResponse = messagesWithToolResponse;

                // Placeholder for the model's response after tool execution
                const toolModelResponsePlaceholder: CopilotMessage = {
                    id: uuidv4(),
                    role: 'model',
                    parts: [{ text: '' }],
                    timestamp: Date.now(),
                    isLoading: true,
                    modelUsed: modelToUse,
                    reasoningMetadata: null, // Reset reasoning for the new response
                };
                setMessages(prev => [...prev, toolModelResponsePlaceholder]);
                await addMessage(toolModelResponsePlaceholder);

                // Call this function recursively to handle the response after tool execution
                await processAndSendMessage(
                    historyForToolResponse,
                    systemInstruction,
                    tools, // Pass the same tools array
                    modelToUse,
                    toolModelResponsePlaceholder
                );
                return; // Exit after recursive call handles the final response
            }
            // --- End Tool Execution ---

        } catch (err: any) {
            console.error("Error during AI stream or tool execution:", err);
            setError(err.message || "An error occurred.");
            finalMessage = {
                ...finalMessage,
                error: err.message || "An error occurred.",
                isLoading: false,
                parts: [{ text: accumulatedText || "Failed to get response." }]
            };
        } finally {
            finalMessage.isLoading = false;
            await updateMessage(finalMessage);
            // TODO: Extract suggestions
        }
    }, [aiService, addMessage, updateMessage, messages]);

    // Main sendMessage function exposed to consumers
    const sendMessage = useCallback(async (prompt: string, context?: string, model?: CopilotModel) => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);

        const userMessage: CopilotMessage = {
            id: uuidv4(),
            role: 'user',
            parts: [{ text: prompt }],
            timestamp: Date.now(),
        };

        const modelToUse = model || currentModel;

        // Prepare history *before* adding placeholder
        const historyForAPI = [...messages, userMessage];
        setMessages(historyForAPI);
        await addMessage(userMessage);

        const systemInstruction = `You are Study Pal's AI Copilot. Be helpful and concise. Prioritise using the user's materials over your own knowledge. ${pageContext ? `Current context: ${pageContext}.` : ''} ${context ? `Action context: ${context}` : ''}`;
        // Use the imported toolRegistry array directly
        const tools = toolRegistry;

        // Placeholder for the initial model response
        const modelResponsePlaceholder: CopilotMessage = {
            id: uuidv4(),
            role: 'model',
            parts: [{ text: '' }],
            timestamp: Date.now(),
            isLoading: true,
            modelUsed: modelToUse,
            reasoningMetadata: null,
        };
        setMessages(prev => [...prev, modelResponsePlaceholder]);
        await addMessage(modelResponsePlaceholder);

        // Call the processing logic
        await processAndSendMessage(
            historyForAPI,
            systemInstruction,
            tools, // Pass the imported tool array
            modelToUse,
            modelResponsePlaceholder
        );

        setIsLoading(false);

    }, [processAndSendMessage, addMessage, currentModel, messages, pageContext]); // Removed toolRegistry dependency

    const value = useMemo(() => ({
        messages,
        suggestions,
        isLoading,
        error,
        currentModel,
        sendMessage,
        clearChat,
        setPageContext,
        setCurrentModel,
    }), [messages, suggestions, isLoading, error, currentModel, sendMessage, clearChat, setPageContext, setCurrentModel]);

    return (
        <CopilotContext.Provider value={value}>
            {children}
        </CopilotContext.Provider>
    );
};
