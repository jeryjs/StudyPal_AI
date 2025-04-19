import { openDB, DBSchema, IDBPDatabase } from "idb";
import { 
    StoreNames, 
    Subject, 
    Chapter, 
    Material, 
    SyncQueueItem,
    MaterialType, 
    SyncStatus
} from "./types/db.types";

/**
 * Application database name.
 */
export const DB_NAME = "StudyPalDB";

/**
 * Current database version.
 */
export const DB_VERSION = 2;

/**
 * The base database schema for StudyPal app.
 * Uses type definitions from @types/db.types.ts
 */
export interface StudyPalDB extends DBSchema {
	[StoreNames.SETTINGS]: { key: string; value: any };
	[StoreNames.SUBJECTS]: { key: string; value: Subject };
	[StoreNames.CHAPTERS]: { key: string; value: Chapter; indexes: { 'by-subject': string } };
	[StoreNames.MATERIALS]: { key: string; value: Material; indexes: { 'by-chapter': string; 'by-syncStatus': string } };
	[StoreNames.SYNC_QUEUE]: { key: string; value: SyncQueueItem; indexes: { 'by-timestamp': number } };
}

// Singleton database connection
let dbPromise: Promise<IDBPDatabase<StudyPalDB>> | null = null;

/**
 * Initializes and returns a database connection.
 * Creates and configures the database on first use.
 */
export function getDb(): Promise<IDBPDatabase<StudyPalDB>> {
	if (!dbPromise) {
		dbPromise = openDB<StudyPalDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion, newVersion) {
				console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);				// Settings store
				if (!db.objectStoreNames.contains(StoreNames.SETTINGS)) {
					db.createObjectStore(StoreNames.SETTINGS);
					console.log(`Created object store: ${StoreNames.SETTINGS}`);
				}

				// Subjects store
				if (!db.objectStoreNames.contains(StoreNames.SUBJECTS)) {
					db.createObjectStore(StoreNames.SUBJECTS, { keyPath: 'id' });
					console.log(`Created object store: ${StoreNames.SUBJECTS}`);
				}

				// Chapters store
				if (!db.objectStoreNames.contains(StoreNames.CHAPTERS)) {
					const chapterStore = db.createObjectStore(StoreNames.CHAPTERS, { keyPath: 'id' });
					// Create index to find chapters by subject ID
					chapterStore.createIndex('by-subject', 'subjectId');
					console.log(`Created object store: ${StoreNames.CHAPTERS}`);
				}

				// Materials store
				if (!db.objectStoreNames.contains(StoreNames.MATERIALS)) {
					const materialsStore = db.createObjectStore(StoreNames.MATERIALS, { keyPath: 'id' });
					// Create index to find materials by chapter ID
					materialsStore.createIndex('by-chapter', 'chapterId');
					// Create index to find materials by sync status
					materialsStore.createIndex('by-syncStatus', 'syncStatus');
					console.log(`Created object store: ${StoreNames.MATERIALS}`);
				}

				// Sync Queue store
				if (!db.objectStoreNames.contains(StoreNames.SYNC_QUEUE)) {
					const syncQueueStore = db.createObjectStore(StoreNames.SYNC_QUEUE, { keyPath: 'id' });
					// Create index to order items by timestamp
					syncQueueStore.createIndex('by-timestamp', 'timestamp');
					console.log(`Created object store: ${StoreNames.SYNC_QUEUE}`);
				}
			},
			blocked() {
				console.error("Database upgrade blocked. Close other tabs running this app.");
			},
			blocking() {
				console.warn("Database is blocking an upgrade. Closing connection.");
			},
			terminated() {
				console.warn("Database connection terminated unexpectedly.");
				dbPromise = null; // Reset promise to allow reconnection
			},
		});
	}
	return dbPromise;
}

/**
 * Refreshes the database connection by closing the existing connection and reopening it.
 * Useful to ensure the application is using the latest database schema or data.
 */
export async function refreshDb(): Promise<IDBPDatabase<StudyPalDB>> {
	if (dbPromise) {
		try {
			const db = await dbPromise;
			db.close();
			console.log("Database connection closed for refresh.");
		} catch (error) {
			console.error("Error closing database during refresh:", error);
		} finally {
			dbPromise = null; // Reset the promise to allow a new connection
		}
	}
	return getDb(); // Re-initialize the database connection
}

/**
 * Closes the database connection if it's open.
 */
export async function closeDb(): Promise<void> {
	if (dbPromise) {
		try {
			const db = await dbPromise;
			db.close();
			dbPromise = null;
			console.log("Database connection closed.");
		} catch (error) {
			console.error("Error closing database:", error);
		}
	}
}

/**
 * Generic database operations that can be used by any store.
 */
export class DBStore<T> {
	constructor(private storeName: StoreNames) {}

	/**
	 * Get a value by key from the store.
	 */
	async get(key: string): Promise<T | undefined> {
		try {
			const db = await getDb();
			return db.get(this.storeName, key);
		} catch (error) {
			console.error(`Error getting ${key} from ${this.storeName}:`, error);
			return undefined;
		}
	}

	/**
	 * Put a value with the given key into the store.
	 */
	async set(key: string, value: T): Promise<string> {
		try {
			const db = await getDb();
			return await db.put(this.storeName, value, key);
		} catch (error) {
			console.error(`Error setting ${key} in ${this.storeName}:`, error);
			throw error;
		}
	}

	/**
	 * Delete a value by key from the store.
	 */
	async delete(key: string): Promise<void> {
		try {
			const db = await getDb();
			await db.delete(this.storeName, key);
		} catch (error) {
			console.error(`Error deleting ${key} from ${this.storeName}:`, error);
			throw error;
		}
	}

	/**
	 * Get all keys in the store.
	 */
	async getAllKeys(): Promise<string[]> {
		try {
			const db = await getDb();
			return (await db.getAllKeys(this.storeName)) as string[];
		} catch (error) {
			console.error(`Error getting all keys from ${this.storeName}:`, error);
			return [];
		}
	}

	/**
	 * Get all values in the store.
	 */
	async getAll(): Promise<T[]> {
		try {
			const db = await getDb();
			return await db.getAll(this.storeName);
		} catch (error) {
			console.error(`Error getting all values from ${this.storeName}:`, error);
			return [];
		}
	}

	/**
	 * Clear all data in the store.
	 */
	async clear(): Promise<void> {
		try {
			const db = await getDb();
			await db.clear(this.storeName);
		} catch (error) {
			console.error(`Error clearing ${this.storeName}:`, error);
			throw error;
		}
	}
}
