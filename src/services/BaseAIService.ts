import { CopilotMessage, CopilotTool, CopilotModel } from "../types/copilot.types";
import { GenerateContentResponse } from "@google/generative-ai";

/**
 * Abstract base class for AI services.
 * Defines the core interface for sending messages and potentially other AI operations.
 */
export abstract class BaseAIService {
    /**
     * Sends a message history to the AI model and returns a stream of responses.
     *
     * @param history The conversation history.
     * @param systemInstruction Optional system instruction/prompt.
     * @param tools Optional list of available tools for the AI.
     * @param model Optional specific model to use for this request.
     * @returns An async generator yielding response chunks.
     */
    abstract sendMessageStream(
        history: CopilotMessage[],
        systemInstruction?: string,
        tools?: CopilotTool[],
        model?: CopilotModel // Use the enum here
    ): AsyncGenerator<GenerateContentResponse, void, unknown>;

    /**
     * Optional: Counts the number of tokens in a given message history.
     *
     * @param history The conversation history.
     * @returns A promise resolving to the token count.
     */
    abstract countTokens?(history: CopilotMessage[]): Promise<number>;
}