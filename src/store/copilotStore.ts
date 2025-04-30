import { getDb, DBStore } from "../db";
import { StoreNames } from "../types/db.types";
import { CopilotMessage } from "../types/copilot.types";

/**
 * Copilot store implementation using IndexedDB via DBStore.
 * Stores chat messages.
 */
class CopilotStore extends DBStore<CopilotMessage> {
    constructor() {
        super(StoreNames.COPILOT);
    }

    // --- Chat Messages ---

    /**
     * Adds a new message to the store.
     * Uses message.id as the key.
     * @param message The CopilotMessage object to add.
     */
    async addMessage(message: CopilotMessage): Promise<void> {
        if (!message.id) {
            console.error("Message must have an ID to be added to the store.");
            return;
        }
        // Use put from DBStore which handles add/update and uses keyPath: 'id'
        await this.put(message);
    }

    /**
     * Updates an existing message in the store.
     * Uses message.id as the key.
     * @param message The CopilotMessage object with updated data.
     */
    async updateMessage(message: CopilotMessage): Promise<void> {
        if (!message.id) {
            console.error("Message must have an ID to be updated in the store.");
            return;
        }
        // Use put from DBStore which handles add/update and uses keyPath: 'id'
        await this.put(message);
    }

    /**
     * Retrieves a specific message by its ID.
     * @param id The ID of the message to retrieve.
     */
    async getMessageById(id: string): Promise<CopilotMessage | undefined> {
        // Use get from DBStore
        return this.get(id);
    }

    /**
     * Retrieves messages with pagination, sorted by timestamp descending (newest first).
     * Uses the 'by-timestamp' index for efficiency.
     * @param limit The maximum number of messages to retrieve.
     * @param offset The number of messages to skip (for pagination).
     */
    async getMessagesPaginated(limit: number, offset: number): Promise<CopilotMessage[]> {
        const db = await getDb();
        // Explicitly use the specific store name for better type inference
        const tx = db.transaction(StoreNames.COPILOT, 'readonly');
        const store = tx.objectStore(StoreNames.COPILOT);
        const index = store.index('by-timestamp'); // Now TS should know this index exists
        const messages: CopilotMessage[] = [];
        let cursor = await index.openCursor(null, 'prev'); // Open cursor to iterate newest first

        if (offset > 0 && cursor) {
            // Advance the cursor by the offset amount.
            await cursor.advance(offset);
            // Re-fetch cursor after advancing, as advance doesn't return the new cursor state directly
            // and might invalidate the original cursor variable if it goes past the end.
            // A simple way is to just re-open the cursor starting from where advance left off,
            // but let's try continuing first. If advance moves the cursor, continue should work.
            // If advance goes past the end, the loop condition `while(cursor...)` handles it.
        }

        let count = 0;
        while (cursor && count < limit) {
            messages.push(cursor.value);
            count++;
            cursor = await cursor.continue();
        }

        await tx.done;
        return messages; // Messages will be newest first due to 'prev' cursor
    }

    /**
     * Deletes a message by its ID.
     * @param id The ID of the message to delete.
     */
    async deleteMessage(id: string): Promise<void> {
        // Use delete from DBStore
        await this.delete(id);
    }

    /**
     * Clears all messages from the store. Be cautious using this!
     */
    async clearAllMessages(): Promise<void> {
        // Use clear from DBStore
        await this.clear();
        // Access protected storeName
        console.log(`Cleared all messages from ${this.storeName}.`);
    }
}

// Create and export a singleton instance
const copilotStore = new CopilotStore();
export default copilotStore;

// Export named functions for easier use in context/hooks
export const addMessage = (message: CopilotMessage) => copilotStore.addMessage(message);
export const updateMessage = (message: CopilotMessage) => copilotStore.updateMessage(message);
// Use the paginated version
export const getMessages = (limit: number, offset: number) => copilotStore.getMessagesPaginated(limit, offset);
export const getMessageById = (id: string) => copilotStore.getMessageById(id);
export const deleteMessage = (id: string) => copilotStore.deleteMessage(id);
export const clearAllMessages = () => copilotStore.clearAllMessages();