import { DBStore } from "@db";
import { Chat, CopilotMessage } from "@type/copilot.types";
import { StoreNames } from "@type/db.types"; // Import StoreNames enum
import { v4 as uuidv4 } from 'uuid';

/**
 * Copilot store implementation using IndexedDB via DBStore.
 * Stores chat sessions. Keyed by chat ID.
 */
class CopilotStore extends DBStore<Chat> {
    constructor() {
        // Pass the enum member for the store name
        super(StoreNames.COPILOT);
    }

    // --- Chat Sessions ---

    /**
     * Creates or updates a chat session in the store.
     * @param chat The Chat object to save.
     */
    async saveChat(chat: Chat): Promise<void> {
        chat.createdOn = chat.createdOn || Date.now(); // Set startedOn if not already set
        chat.lastModified = Date.now();
        await this.put(chat);
    }

    /**
     * Retrieves a specific chat session by its ID.
     * @param id The ID of the chat to retrieve.
     */
    async getChatById(id: string): Promise<Chat | undefined> {
        return await this.get(id);
    }

    /**
     * Retrieves all chat sessions, sorted by lastModified descending.
     */
    async listChats(): Promise<Chat[]> {
        const allChats = await this.getAll();
        // Sort by last modified time, newest first
        return allChats.sort((a, b) => b.lastModified - a.lastModified);
    }

    /**
     * Deletes a chat session by its ID.
     * @param id The ID of the chat to delete.
     */
    async deleteChat(id: string): Promise<void> {
        await this.delete(id);
    }

    /**
     * Adds a new message to a specific chat session.
     * @param chatId The ID of the chat to add the message to.
     * @param message The CopilotMessage object to add.
     */
    async addMessageToChat(chatId: string, message: CopilotMessage): Promise<void> {
        const chat = await this.getChatById(chatId);
        if (chat) {
            // Avoid adding duplicate message IDs if possible (e.g., rapid updates)
            if (!chat.messages.some(m => m.id === message.id)) {
                chat.messages.push(message);
            } else {
                // If message exists, update it instead (handles race conditions)
                const existingIndex = chat.messages.findIndex(m => m.id === message.id);
                chat.messages[existingIndex] = message;
            }
            chat.lastModified = message.timestamp; // Update lastModified to message time
            await this.put(chat); // Use put to save the whole chat object
        } else {
            console.error(`Chat with ID ${chatId} not found. Cannot add message.`);
            // Optionally throw an error
        }
    }

    /**
     * Updates an existing message within a specific chat session.
     * Useful for updating streaming messages (isLoading, final content, error).
     * @param chatId The ID of the chat containing the message.
     * @param messageUpdate The partial or full CopilotMessage object with updated data.
     */
    async updateMessageInChat(chatId: string, messageUpdate: Partial<CopilotMessage> & { id: string }): Promise<void> {
        const chat = await this.getChatById(chatId);
        if (chat) {
            const messageIndex = chat.messages.findIndex(m => m.id === messageUpdate.id);
            if (messageIndex !== -1) {
                // Merge the update with the existing message
                chat.messages[messageIndex] = { ...chat.messages[messageIndex], ...messageUpdate };
                // Only update lastModified if this message's timestamp is newer
                const updatedTimestamp = messageUpdate.timestamp ?? chat.messages[messageIndex].timestamp;
                if (updatedTimestamp > chat.lastModified) {
                    chat.lastModified = updatedTimestamp;
                }
                await this.put(chat); // Use put to save the whole chat object
            } else {
                console.warn(`Message with ID ${messageUpdate.id} not found in chat ${chatId}. Cannot update.`);
                // If it wasn't found, maybe add it? Or log error? Adding might be safer if creation failed previously.
                // Consider adding the full message if it's intended to be created here.
                // await this.addMessageToChat(chatId, messageUpdate as CopilotMessage); // Requires type assertion
            }
        } else {
            console.error(`Chat with ID ${chatId} not found. Cannot update message.`);
            // Optionally throw an error
        }
    }
}

// Export a singleton instance
const copilotStore = new CopilotStore();
export default copilotStore;