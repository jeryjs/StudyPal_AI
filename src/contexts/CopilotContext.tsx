// src/contexts/CopilotContext.tsx
import { FunctionCallPart, FunctionResponsePart } from '@google/generative-ai';
import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from '../services/GeminiService';
import { executeTool as executeToolFromRegistry, toolRegistry } from '../services/ToolRegistry';
import copilotStore from '../store/copilotStore';
import { CopilotMessage, CopilotModel, CopilotSuggestion, CopilotTool } from '../types/copilot.types';

interface CopilotContextType {
    messages: CopilotMessage[];
    suggestions: CopilotSuggestion[];
    isLoading: boolean;
    error: string | null;
    currentModel: CopilotModel;
    hasMoreMessages: boolean;
    sendMessage: (prompt: string, context?: string, model?: CopilotModel) => Promise<void>;
    loadMoreMessages: () => Promise<void>;
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
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
    const messagesPerPage = 50;

    const aiService = useMemo(() => new GeminiService(), []);

    // Load initial messages
    useEffect(() => {
        const loadInitialMessages = async () => {
            setIsLoading(true);
            try {
                const initialMessages = await copilotStore.getMessagesPaginated(1, messagesPerPage);
                setMessages(initialMessages.reverse());
                setCurrentPage(1);
                setHasMoreMessages(initialMessages.length === messagesPerPage);
            } catch (err) {
                console.error("Failed to load initial messages:", err);
                setError("Failed to load chat history.");
                setHasMoreMessages(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialMessages();
    }, []);

    // Database operations
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
            setMessages(prev => prev.map(m => m.id === message.id ? message : m));
        } catch (err) {
            console.error("Failed to update message in DB:", err);
            setError("Failed to update message.");
        }
    }, []);

    const loadMoreMessages = useCallback(async () => {
        if (isLoading || !hasMoreMessages) return;

        setIsLoading(true);
        const nextPage = currentPage + 1;
        try {
            const olderMessages = await copilotStore.getMessagesPaginated(nextPage, messagesPerPage);
            if (olderMessages.length > 0) {
                setMessages(prev => [...olderMessages.reverse(), ...prev]);
                setCurrentPage(nextPage);
                setHasMoreMessages(olderMessages.length === messagesPerPage);
            } else {
                setHasMoreMessages(false);
            }
        } catch (err) {
            console.error("Failed to load older messages:", err);
            setError("Failed to load more messages.");
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, hasMoreMessages, isLoading]);

    const clearChat = useCallback(async () => {
        setIsLoading(true);
        try {
            await copilotStore.clearAllMessages();
            setMessages([]);
            setSuggestions([]);
            setError(null);
            setCurrentPage(1);
            setHasMoreMessages(false);
        } catch (err) {
            console.error("Failed to clear chat:", err);
            setError("Failed to clear chat history.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle AI message streaming and tool calling
    const sendMessage = useCallback(async (prompt: string, context?: string, model?: CopilotModel) => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);

        try {
            // Create and add user message
            const userMessage: CopilotMessage = {
                id: uuidv4(),
                role: 'user',
                parts: [{ text: prompt }],
                timestamp: Date.now(),
            };

            const modelToUse = model || currentModel;

            // Update UI and DB with user message
            setMessages(prev => [...prev, userMessage]);
            await addMessage(userMessage);

            // Prepare model response placeholder
            const modelResponsePlaceholder: CopilotMessage = {
                id: uuidv4(),
                role: 'model',
                parts: [{ text: '' }],
                timestamp: Date.now(),
                isLoading: true,
                modelUsed: modelToUse,
            };

            // Update UI and DB with placeholder
            setMessages(prev => [...prev, modelResponsePlaceholder]);
            await addMessage(modelResponsePlaceholder);

            // Build system instruction with context awareness
            const systemInstruction = `You are Study Pal's AI Copilot. Be helpful and concise. Prioritise using the user's materials over your own knowledge. ${pageContext
                    ? `You are currently on a page described as: "${pageContext}". Always consider this when answering location questions.`
                    : ''
                } ${context ? `Action context: ${context}` : ''}`;

            // Create API history with just the conversation (no tool calls or responses yet)
            const apiHistory = [...messages, userMessage];

            // Begin processing the message
            await processModelResponse(
                apiHistory,
                systemInstruction,
                toolRegistry,
                modelToUse,
                modelResponsePlaceholder
            );
        } finally {
            setIsLoading(false);
        }
    }, [messages, currentModel, pageContext, addMessage]);

    // Process a single model response step (handles both regular responses and tool calls)
    const processModelResponse = useCallback(async (
        history: CopilotMessage[],
        systemInstruction: string,
        tools: CopilotTool[],
        modelToUse: CopilotModel,
        placeholder: CopilotMessage
    ) => {
        let accumulatedText = '';
        let functionCalls: FunctionCallPart[] = [];
        let currentMessage = { ...placeholder };

        try {
            // Get response stream from Gemini API
            const stream = aiService.sendMessageStream(
                history,
                systemInstruction,
                tools,
                modelToUse
            );

            // Process streaming chunks
            for await (const chunk of stream) {
                const parts = chunk.candidates?.[0]?.content?.parts || [];
                let textUpdated = false;

                for (const part of parts) {
                    // Handle text responses
                    if ('text' in part && typeof part.text === 'string') {
                        accumulatedText += part.text;
                        currentMessage.parts = [{ text: accumulatedText }];
                        textUpdated = true;
                    }

                    // Handle function calls
                    if ('functionCall' in part && part.functionCall) {
                        console.log("Function call received:", part.functionCall);
                        functionCalls.push(part);
                        currentMessage.parts = functionCalls;
                        textUpdated = false;
                    }
                }

                // Update UI with streaming text
                if (textUpdated) {
                    setMessages(prev =>
                        prev.map(m => m.id === currentMessage.id ? { ...currentMessage, isLoading: true } : m)
                    );
                }
            }

            // Update message state when streaming is complete
            currentMessage.isLoading = false;
            await updateMessage(currentMessage);

            // Handle tool calls if needed
            if (functionCalls.length > 0) {
                // Execute all tools
                const toolResponses: FunctionResponsePart[] = [];

                for (const call of functionCalls) {
                    const { name, args } = call.functionCall;
                    try {
                        const result = await executeToolFromRegistry({ name, args });
                        toolResponses.push({
                            functionResponse: {
                                name,
                                response: { content: result }
                            }
                        });
                    } catch (error: any) {
                        console.error(`Error executing tool ${name}:`, error);
                        toolResponses.push({
                            functionResponse: {
                                name,
                                response: { content: `Error: ${error.message || 'Tool execution failed'}` }
                            }
                        });
                    }
                }

                // Create response message to the tool call
                const toolResponseMessage: CopilotMessage = {
                    id: uuidv4(),
                    role: 'tool',
                    parts: toolResponses,
                    timestamp: Date.now(),
                    modelUsed: modelToUse,
                };

                // Add tool response to UI and DB
                setMessages(prev => [...prev, toolResponseMessage]);
                await addMessage(toolResponseMessage);

                // Create placeholder for model's response to tools
                const modelAfterToolsPlaceholder: CopilotMessage = {
                    id: uuidv4(),
                    role: 'model',
                    parts: [{ text: '' }],
                    timestamp: Date.now(),
                    isLoading: true,
                    modelUsed: modelToUse,
                };

                // Add placeholder to UI and DB
                setMessages(prev => [...prev, modelAfterToolsPlaceholder]);
                await addMessage(modelAfterToolsPlaceholder);

                // Create a new history array for the next API call
                // Only include the user message, function call message, and tool response message
                // This avoids history pollution that can cause the API to error
                const lastUserMessage = history.filter(msg => msg.role === 'user').pop();
                const newHistory = [
                    lastUserMessage!,           // The user's question
                    currentMessage,             // The model's function call response
                    toolResponseMessage         // The tool response
                ];

                // Process model response to tool execution
                await processModelResponse(
                    newHistory,
                    systemInstruction,
                    tools,
                    modelToUse,
                    modelAfterToolsPlaceholder
                );
            }
        } catch (err: any) {
            console.error("Error during AI stream or tool execution:", err);
            setError(err.message || "An error occurred");
            currentMessage = {
                ...currentMessage,
                error: err.message || "An error occurred",
                isLoading: false,
                parts: [{ text: accumulatedText || "Failed to get response." }]
            };
            await updateMessage(currentMessage);
        }
    }, [aiService, updateMessage, addMessage]);

    const value = useMemo(() => ({
        messages,
        suggestions,
        isLoading,
        error,
        currentModel,
        hasMoreMessages,
        sendMessage,
        loadMoreMessages,
        clearChat,
        setPageContext,
        setCurrentModel,
    }), [
        messages,
        suggestions,
        isLoading,
        error,
        currentModel,
        hasMoreMessages,
        sendMessage,
        loadMoreMessages,
        clearChat,
        setPageContext,
        setCurrentModel
    ]);

    return (
        <CopilotContext.Provider value={value}>
            {children}
        </CopilotContext.Provider>
    );
};
