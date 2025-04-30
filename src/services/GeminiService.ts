// src/services/GeminiService.ts
import { Content, FunctionDeclaration, FunctionDeclarationSchema, GenerateContentResponse, GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAIService } from "@services/BaseAIService";
import { CopilotMessage, CopilotModel, CopilotTool } from "@type/copilot.types";
// Use DEFAULT import based on TS error suggestion
import settingsStore from "@store/settingsStore"; // Assuming default export

// Helper to convert our CopilotMessage history to Gemini's Content format
const convertMessagesToGeminiContent = (history: CopilotMessage[]): Content[] => {
    return history
        // Filter out system messages if they are handled separately by the API
        // and ensure roles are 'user' or 'model'
        .filter(msg => msg.role === 'user' || msg.role === 'model' || msg.role === 'tool')
        .map(msg => ({
            // Gemini API maps 'tool' role internally when parts contain FunctionResponsePart
            // Map 'system' to 'user' if needed, otherwise keep roles
            role: msg.role === 'system' ? 'user' : msg.role,
            parts: msg.parts,
        }));
};


// Helper to convert our CopilotTools to Gemini's FunctionDeclaration format
const convertToolsToGeminiDeclarations = (tools: CopilotTool[]): FunctionDeclaration[] => {
    return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as FunctionDeclarationSchema, // Correct type
    }));
};

export class GeminiService extends BaseAIService {
    // Default model if none is specified in the request
    defaultModel = CopilotModel.REGULAR;
    private genAI: GoogleGenerativeAI | null = null;
    private isInitializing = false; // Prevent race conditions during init

    constructor() {
        super();
        this.initialize(); // Start initialization
    }

    private async initialize() {
        if (this.genAI || this.isInitializing) {
            return; // Already initialized or initializing
        }
        this.isInitializing = true;
        console.log("Initializing GeminiService...");
        try {
            // Access property directly from the default imported store instance
            const apiKey = import.meta.env.MODE === 'test' ? import.meta.env.VITE_GEMINI_API_KEY : await settingsStore.geminiApiKey;
            if (apiKey) {
                this.genAI = new GoogleGenerativeAI(apiKey);
                console.log("GeminiService Initialized Successfully.");
            } else {
                console.error("Gemini API Key not found in settings. Gemini features will be disabled.");
            }
        } catch (error) {
            console.error("Failed to initialize GeminiService:", error);
            // Consider setting a state indicating initialization failure
        } finally {
            this.isInitializing = false;
        }
    }

    // Ensure this matches BaseAIService signature
    async *sendMessageStream(
        history: CopilotMessage[],
        systemInstruction?: string,
        tools?: CopilotTool[],
        modelId: CopilotModel = this.defaultModel // Use enum, default to REGULAR
    ): AsyncGenerator<GenerateContentResponse, void, unknown> {
        // Wait for initialization if it's in progress
        while (this.isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Simple wait
        }

        if (!this.genAI) {
            // Attempt re-initialization if failed previously
            await this.initialize();
            if (!this.genAI) {
                throw new Error("Gemini AI Service not initialized. API Key might be missing or initialization failed.");
            }
        }

        const modelConfig = {
            model: modelId,
            ...(systemInstruction && { systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] } }), // Gemini prefers 'user' for system instructions in some contexts
            ...(tools && tools.length > 0 && { tools: [{ functionDeclarations: convertToolsToGeminiDeclarations(tools) }] }),
        };
        console.log("Gemini Model Config:", JSON.stringify(modelConfig, null, 2)); // Debugging

        const model = this.genAI.getGenerativeModel(modelConfig);

        // Convert history, excluding the last message which is the current user prompt
        const geminiHistory = convertMessagesToGeminiContent(history.slice(0, -1));
        console.log("Gemini History:", JSON.stringify(geminiHistory, null, 2)); // Debugging

        const chat = model.startChat({
            history: geminiHistory,
        });

        const lastMessage = history[history.length - 1];
        if (!lastMessage || (lastMessage.role !== 'user' && lastMessage.role !== 'tool')) {
            // Allow 'tool' role if sending function responses back
            throw new Error("Last message in history must be from the user or a tool response.");
        }
        console.log("Sending last message parts:", JSON.stringify(lastMessage.parts, null, 2)); // Debugging


        try {
            // Send the last message content (user prompt or tool responses)
            const result = await chat.sendMessageStream(lastMessage.parts);
            for await (const chunk of result.stream) {
                console.log("Stream chunk received:", JSON.stringify(chunk, null, 2)); // Debugging
                yield chunk; // Yield the GenerateContentResponse chunk directly
            }
        } catch (error) {
            console.error("Error sending message stream to Gemini:", error);
            // Improve error reporting if possible (e.g., check error structure)
            if (error instanceof Error) {
                throw new Error(`Gemini API Error: ${error.message}`);
            } else {
                throw new Error("An unknown error occurred while communicating with the Gemini API.");
            }
        }
    }

    // Optional implementation for countTokens (if needed later)
    async countTokens(history: CopilotMessage[]): Promise<number> {
        while (this.isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!this.genAI) {
            console.warn("GeminiService not initialized, cannot count tokens.");
            return 0; // Or throw error
        }
        try {
            // Use the default model for token counting for simplicity, or accept a model param if needed
            const model = this.genAI.getGenerativeModel({ model: this.defaultModel });
            const contents = convertMessagesToGeminiContent(history);
            const { totalTokens } = await model.countTokens({ contents });
            return totalTokens;
        } catch (error) {
            console.error("Failed to count tokens:", error);
            return 0; // Or re-throw
        }
    }
}
