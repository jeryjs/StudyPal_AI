import { FunctionDeclarationSchema, Part } from "@google/generative-ai";
import { Material } from "./db.types";

// Define the available Copilot models
export enum CopilotModel {
    REGULAR = 'gemini-2.0-flash-exp',   // use exp since flash is often overloaded
    LITE = 'gemini-2.0-flash-lite-preview-02-05',   // less often overloaded
    REASON = 'gemini-2.5-flash-preview-04-17',
    LARGE = 'gemini-2.5-pro-exp-03-25',
}

export type CopilotRole = "user" | "model" | "system" | "tool";

// Represents a part of a message (text, function call, or function response)
// Note: Using Gemini's `Part` type directly in CopilotMessage is simpler
// export type CopilotMessagePart =
//     | { text: string }
//     | { functionCall: FunctionCallPart }
//     | { functionResponse: FunctionResponsePart };

// Represents a single message in the chat history
export interface CopilotMessage {
    id: string; // Unique ID for the message
    role: CopilotRole;
    // Use Gemini's generic Part structure for flexibility
    parts: Part[];
    timestamp: number; // Unix timestamp (ms)
    isLoading?: boolean; // Optional flag for streaming state
    error?: string; // Optional error message
    modelUsed?: CopilotModel; // Track which model generated the response
    // reasoningMetadata?: unknown; // Placeholder removed for cleanup
}

// Represents a material attached to a chat
export interface ChatAttachment {
    id: string; // Material ID from materialsStore
    name: string;
    type: string; // Material type (e.g., FILE, LINK, etc.)
}
export interface ChatAttachmentWithContent extends ChatAttachment {
    content: Material['content']; // Content of the material
}

// Represents a single chat session
export interface Chat {
    id: string; // Unique ID for the chat session (e.g., uuid)
    title: string; // Title of the chat (e.g., first user message, truncated)
    messages: CopilotMessage[]; // Array of messages in this chat
    attachments: ChatAttachment[]; // Array of attached materials
    createdOn: number; // Timestamp of creation or first message
    lastModified: number; // Timestamp of the last message or modification
    suggestions?: CopilotSuggestion[]; // Optional follow-up suggestions generated with the LITE model
}

// Represents a tool that the AI can call
export interface CopilotTool {
    name: string;
    description: string;
    parameters: FunctionDeclarationSchema; // JSON schema for parameters
    execute: (args: any) => Promise<any>; // The actual function to run
}

// Represents a suggestion shown to the user (e.g., in the chatbar)
export interface CopilotSuggestion {
    id: string;
    text: string; // e.g., "Summarize this document?"
    action: () => void; // Function to execute when suggestion is clicked
}

export interface PageContext {
    page: 'settings' | 'subjects' | 'chapters' | 'materials';
    description: string; // Description of the page (e.g., "Viewing materials for Chapter 1")
    activeItem?: { id: string, type: 'subject' | 'chapter' | 'material' };
}