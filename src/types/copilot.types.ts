import { FunctionCallPart, FunctionResponsePart, Part } from "@google/generative-ai";

// Define the available Copilot models
export enum CopilotModel {
    LITE = 'gemini-2.5-flash-lite',
    REGULAR = 'gemini-2.0-flash',
    REASON = 'gemini-2.5-flash',
    LARGE = 'gemini-2.5-pro',
}

export type CopilotRole = "user" | "model" | "system" | "tool";

// Represents a part of a message (text, function call, or function response)
export type CopilotMessagePart =
    | { text: string }
    | { functionCall: FunctionCallPart }
    | { functionResponse: FunctionResponsePart };

// Represents a single message in the chat history
export interface CopilotMessage {
    id: string; // Unique ID for the message
    role: CopilotRole;
    // Use Gemini's generic Part structure for flexibility
    parts: Part[];
    timestamp: number; // Unix timestamp (ms)
    isLoading?: boolean; // Optional flag for streaming state
    error?: string; // Optional error message
    suggestions?: CopilotSuggestion[]; // Optional follow-up suggestions
    modelUsed?: CopilotModel; // Track which model generated the response
    reasoningMetadata?: unknown; // Placeholder for future reasoning/attribution data
}

// Represents a tool that the AI can call
export interface CopilotTool {
    name: string;
    description: string;
    parameters: object; // JSON schema for parameters
    execute: (args: any) => Promise<any>; // The actual function to run
}

// Represents a suggestion shown to the user (e.g., in the chatbar)
export interface CopilotSuggestion {
    id: string;
    text: string; // e.g., "Summarize this document?"
    action: () => void; // Function to execute when suggestion is clicked
}
