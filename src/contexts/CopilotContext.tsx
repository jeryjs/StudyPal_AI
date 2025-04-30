// src/contexts/CopilotContext.tsx
import { FunctionCallPart, FunctionResponsePart } from '@google/generative-ai';
import { GeminiService } from '@services/GeminiService';
import { executeTool as executeToolFromRegistry, toolRegistry } from '@services/ToolRegistry';
import copilotStore from '@store/copilotStore';
import { Chat, ChatAttachmentWithContent, CopilotMessage, CopilotModel, CopilotSuggestion, CopilotTool, PageContext } from '@type/copilot.types';
import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const ACTIVE_CHAT_ID_KEY = 'activeCopilotChatId';

interface CopilotContextType {
    activeChat: Chat | null;
    suggestions: CopilotSuggestion[];
    isLoading: boolean;
    error: string | null;
    currentModel: CopilotModel;
    sendMessage: (prompt: string, args?: { attachments?: ChatAttachmentWithContent[]; model?: CopilotModel }) => Promise<void>;
    startNewChat: () => Promise<string>;
    setActiveChatId: (chatId: string | null) => void;
    setPageContext: (context: PageContext | null) => void;
    setCurrentModel: (model: CopilotModel) => void;
    listChats: () => Promise<Chat[]>;
    deleteChat: (chatId: string) => Promise<void>;
}

export const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

interface CopilotProviderProps {
    children: ReactNode;
}

export const CopilotProvider: React.FC<CopilotProviderProps> = ({ children }) => {
    const [activeChatId, _setActiveChatId] = useState<string | null>(() => localStorage.getItem(ACTIVE_CHAT_ID_KEY));
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [pageContext, setPageContext] = useState<PageContext | null>(null);
    const [currentModel, setCurrentModel] = useState<CopilotModel>(CopilotModel.REGULAR);

    const aiService = useMemo(() => new GeminiService(), []);

    // --- Chat Management ---

    // Wrapper for setting active chat ID and storing in localStorage
    const setActiveChatId = useCallback((chatId: string | null) => {
        _setActiveChatId(chatId);
        if (chatId) {
            localStorage.setItem(ACTIVE_CHAT_ID_KEY, chatId);
        } else {
            localStorage.removeItem(ACTIVE_CHAT_ID_KEY);
        }
    }, []);

    // Load active chat from store when activeChatId changes
    useEffect(() => {
        const loadChat = async () => {
            if (activeChatId) {
                setIsLoading(true);
                setError(null);
                try {
                    const chat = await copilotStore.getChatById(activeChatId);
                    if (chat) {
                        setActiveChat(chat);
                    } else {
                        console.warn(`Chat with ID ${activeChatId} not found, starting new chat.`);
                        setActiveChat(null);
                        setActiveChatId(null);
                    }
                } catch (err) {
                    console.error("Failed to load chat:", err);
                    setError("Failed to load chat session.");
                    setActiveChat(null);
                    setActiveChatId(null);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setActiveChat(null);
            }
        };
        loadChat();
    }, [activeChatId, setActiveChatId]);

    // Function to start a new chat
    const startNewChat = useCallback(async (): Promise<string> => {
        setIsLoading(true);
        setError(null);
        try {
            const newChat: Chat = {
                id: uuidv4(),
                title: "New Chat", // Placeholder title
                messages: [],
                attachments: [],
                createdOn: Date.now(),
                lastModified: Date.now(),
            };
            await copilotStore.saveChat(newChat);
            setActiveChatId(newChat.id); // Switch to the new chat
            setActiveChat(newChat); // Set the new chat as active immediately
            console.log("Started new chat:", newChat.id);
            return newChat.id;
        } catch (err) {
            console.error("Failed to start new chat:", err);
            setError("Could not start a new chat session.");
            throw err; // Re-throw error to be handled by caller if needed
        } finally {
            setIsLoading(false);
        }
    }, [setActiveChatId]);

    // Function to list chats
    const listChats = useCallback(async (): Promise<Chat[]> => {
        try {
            return await copilotStore.listChats();
        } catch (err) {
            console.error("Failed to list chats:", err);
            setError("Could not retrieve chat list.");
            return [];
        }
    }, []);

    // Function to delete a chat
    const deleteChat = useCallback(async (chatId: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            await copilotStore.deleteChat(chatId);
            // If the deleted chat was the active one, start a new chat or clear active state
            if (activeChatId === chatId) {
                setActiveChatId(null);
                setActiveChat(null);
                await startNewChat(); // Start a new chat after deletion
            }
            // Trigger a refresh of any chat list UI elsewhere
        } catch (err) {
            console.error(`Failed to delete chat ${chatId}:`, err);
            setError("Could not delete chat session.");
        } finally {
            setIsLoading(false);
        }
    }, [activeChatId, setActiveChatId]);


    // --- Database Operations (Now operate on the active chat) ---

    const addMessage = useCallback(async (message: CopilotMessage) => {
        if (!activeChatId) {
            console.error("No active chat ID. Cannot add message.");
            setError("Cannot save message: No active chat.");
            return;
        }
        try {
            await copilotStore.addMessageToChat(activeChatId, message);
            // Optimistically update local state
            setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, message], lastModified: message.timestamp } : null);
        } catch (err) {
            console.error("Failed to save message to DB:", err);
            setError("Failed to save message.");
        }
    }, [activeChatId]);

    const updateMessage = useCallback(async (message: CopilotMessage) => {
        if (!activeChatId) {
            console.error("No active chat ID. Cannot update message.");
            setError("Cannot update message: No active chat.");
            return;
        }
        try {
            await copilotStore.updateMessageInChat(activeChatId, message);
            // Optimistically update local state
            setActiveChat(prev => {
                if (!prev) return null;
                const newMessages = prev.messages.map(m => m.id === message.id ? message : m);
                const newLastModified = message.timestamp > prev.lastModified ? message.timestamp : prev.lastModified;
                return { ...prev, messages: newMessages, lastModified: newLastModified };
            });
        } catch (err) {
            console.error("Failed to update message in DB:", err);
            setError("Failed to update message.");
        }
    }, [activeChatId]);

    // --- Handle AI message streaming and tool calling ---
    const sendMessage = useCallback(async (prompt: string, args?: { attachments?: ChatAttachmentWithContent[], model?: CopilotModel }) => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);

        const { attachments, model } = args || {};

        let currentChatId = activeChatId;
        let currentChat = activeChat;

        try {
            // If no active chat, start a new one
            if (!currentChatId || !currentChat) {
                const newChatId = await startNewChat();
                currentChatId = newChatId;
                // Fetch the newly created chat to ensure we have the latest state
                const loadedChat = await copilotStore.getChatById(newChatId);
                if (!loadedChat) {
                    throw new Error("Failed to retrieve newly created chat.");
                }
                currentChat = loadedChat;
                // Update title with first prompt if it's the default
                if (currentChat.title === "New Chat") {
                    currentChat.title = prompt.substring(0, 50) + (prompt.length > 50 ? "..." : "");
                    await copilotStore.saveChat(currentChat);
                    setActiveChat(currentChat); // Update local state with new title
                }
            }

            // Add attachments if provided (and if chat exists)
            if (attachments && attachments.length > 0 && currentChat) {
                // Avoid duplicates
                const newAttachments = attachments.filter(att => !currentChat!.attachments.some(existing => existing.id === att.id));
                if (newAttachments.length > 0) {
                    currentChat.attachments.push(...newAttachments);
                    await copilotStore.saveChat(currentChat);
                    setActiveChat(currentChat); // Update local state
                }
            }


            // Create and add user message
            const userMessage: CopilotMessage = {
                id: uuidv4(),
                role: 'user',
                parts: [{ text: prompt }],
                timestamp: Date.now(),
            };

            const modelToUse = model || currentModel;

            // Update UI and DB with user message (using addMessage which handles activeChatId)
            await addMessage(userMessage);

            // Prepare model response placeholder
            const modelResponsePlaceholder: CopilotMessage = {
                id: uuidv4(),
                role: 'model',
                parts: [],
                timestamp: Date.now(),
                isLoading: true,
                modelUsed: modelToUse,
            };

            // Update UI and DB with placeholder
            await addMessage(modelResponsePlaceholder);

            // Build system instruction with context awareness (including attachments)
            const attachmentContext = currentChat?.attachments.map(a => `- ${a.name} (ID: ${a.id}, Type: ${a.type})`).join('\\n') || 'None';
            const systemInstruction = `You are Study Pal's AI Copilot. Be helpful and concise. Prioritise using the user's materials over your own knowledge. Unless explicitly asked, do not provide information about your own knowledge or internal workings like IDs.
                \n
                Available attached materials: [${attachmentContext}]
                Current Page context: ["${pageContext}"] (activeItemId, if available, is the ID of the currently open item (like material, subject or chapter) on the page).
                \n
                You are smart and highly personalised to the user, so you often infer user's intentions and avoid asking confirmations again and again. You are capable of utilising your own personal ideas (this can be random each time, but user doesnt need to know that its random).
                Smartly infer the tools usage. Theres always a workaround with the tools.. so even if it looks like a required tool is not available, think out of the box for a workaround. For example, you can actually set whatever custom theme the user wants (or edit current themes) using the set_settings tool on a custom theme using the get_available_themes tool to get the syntax for defining a new theme.
                If you are unable to answer a question, suggest the user provide their materials or ask for help. If you have access to the user's materials, use them to answer questions. Utilise the page context and any attachments provided for the current chat.`;

            // Create API history from the current chat's messages
            // Ensure the user message we just added is included for the API call
            const apiHistory = currentChat ? [...currentChat.messages, userMessage] : [userMessage];

            // Begin processing the message
            await processModelResponse(
                apiHistory,
                systemInstruction,
                toolRegistry,
                modelToUse,
                modelResponsePlaceholder // Pass the placeholder to update
            );
        } catch (err: any) {
            console.error("Error sending message:", err);
            setError(err.message || "Failed to send message.");
            // Potentially update the placeholder message with an error state
            // This requires finding the placeholder ID and calling updateMessage
        } finally {
            setIsLoading(false);
        }
    }, [activeChatId, activeChat, currentModel, pageContext, addMessage, startNewChat]); // Add startNewChat dependency

    // Process a single model response step (handles both regular responses and tool calls)
    const processModelResponse = useCallback(async (
        history: CopilotMessage[], // Full history for this turn (including user prompt)
        systemInstruction: string,
        tools: CopilotTool[],
        modelToUse: CopilotModel,
        placeholderToUpdate: CopilotMessage // The specific message object to update
    ) => {
        let accumulatedText = '';
        let functionCalls: FunctionCallPart[] = [];
        let currentMessage = { ...placeholderToUpdate }; // Work on a copy

        try {
            // Get response stream from Gemini API
            const stream = aiService.sendMessageStream(
                history, // Pass the history for this turn
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
                        // Ensure parts array holds FunctionCallPart compatible objects
                        // If the API returns multiple function calls in one response, accumulate them
                        if (Array.isArray(currentMessage.parts) && currentMessage.parts.every(p => 'functionCall' in p)) {
                            functionCalls = [...currentMessage.parts as FunctionCallPart[], part];
                        } else {
                            functionCalls = [part]; // Start new list if previous parts were text
                        }
                        currentMessage.parts = functionCalls;
                        textUpdated = false; // Don't stream update UI for function calls directly
                    }
                }

                // Update UI with streaming text
                if (textUpdated) {
                    // Use updateMessage which handles activeChatId
                    await updateMessage({ ...currentMessage, isLoading: true });
                }
            }

            // Update message state when streaming is complete
            currentMessage.isLoading = false;
            await updateMessage(currentMessage); // Final update for the text/function call message

            // Handle tool calls if needed
            if (functionCalls.length > 0) {
                // Execute all tools
                const toolResponses: FunctionResponsePart[] = [];

                for (const call of functionCalls) {
                    // Ensure call is correctly typed
                    const functionCallPart = call as FunctionCallPart;
                    const { name, args } = functionCallPart.functionCall;
                    try {
                        const result = await executeToolFromRegistry({ name, args });
                        toolResponses.push({
                            functionResponse: {
                                name,
                                response: { content: result } // Ensure result is serializable, often string
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
                    parts: toolResponses, // parts should be FunctionResponsePart[]
                    timestamp: Date.now(),
                    modelUsed: modelToUse, // Model didn't generate this, but good to know context
                };

                // Add tool response to UI and DB
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
                await addMessage(modelAfterToolsPlaceholder);

                // Create a new history array for the next API call
                // Include the original history, the model's function call message, and the tool response message
                const newApiHistory = [
                    ...history, // Original history (e.g., [userMessage])
                    currentMessage, // The message containing the functionCall part(s)
                    toolResponseMessage // The message containing the functionResponse part(s)
                ];

                // Process model response to tool execution
                await processModelResponse(
                    newApiHistory, // Pass the updated history
                    systemInstruction,
                    tools,
                    modelToUse,
                    modelAfterToolsPlaceholder // Pass the new placeholder to update
                );
            }
        } catch (err: any) {
            console.error("Error during AI stream or tool execution:", err);
            setError(err.message || "An error occurred");
            // Update the specific message being processed with the error
            currentMessage = {
                ...currentMessage, // Use the latest state of currentMessage
                error: err.message || "An error occurred",
                isLoading: false,
                parts: [{ text: accumulatedText || "Failed to get response." }] // Show accumulated text or error message
            };
            await updateMessage(currentMessage); // Update the message in the store/UI
        }
    }, [aiService, updateMessage, addMessage]);

    const value = useMemo(() => ({
        activeChat,
        suggestions,
        isLoading,
        error,
        currentModel,
        sendMessage,
        startNewChat,
        setActiveChatId,
        setPageContext,
        setCurrentModel,
        listChats,
        deleteChat,
    }), [
        activeChat,
        suggestions,
        isLoading,
        error,
        currentModel,
        sendMessage,
        startNewChat,
        setActiveChatId,
        setPageContext,
        setCurrentModel,
        listChats,
        deleteChat,
    ]);

    return (
        <CopilotContext.Provider value={value}>
            {children}
        </CopilotContext.Provider>
    );
};
