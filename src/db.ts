import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
	Subject,
	Chapter,
	Material,
	SyncStatus,
	StoreNames,
	SyncQueueItem,
	MaterialType
} from './types/db.types';

/**
 * Application database name.
 */
export const DB_NAME = "StudyPalDB";

/**
 * Current database version.
 */
export const DB_VERSION = 1;

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

// Type for DB export format
type DbExport = {
	[key in StoreNames]?: any[];
};

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
	constructor(private storeName: StoreNames) { }

	// Helper to dispatch change event
	private dispatchChangeEvent() {
		window.dispatchEvent(new Event('studypal-db-changed'));
	}

	/**
	 * Get a value by key from the store.
	 */
	async get(key: string): Promise<T | undefined> {
		const db = await getDb();
		return db.get(this.storeName, key);
	}

	/**
	 * Set a value by key in the store.
	 */
	async set(key: string, value: T): Promise<void> {
		const db = await getDb();
		await db.put(this.storeName, value, key);
		this.dispatchChangeEvent(); // Dispatch after successful put
	}

	/**
	 * Get all values from the store.
	 */
	async getAll(): Promise<T[]> {
		const db = await getDb();
		return db.getAll(this.storeName);
	}

	/**
	 * Get all keys from the store.
	 */
	async getAllKeys(): Promise<string[]> {
		const db = await getDb();
		// Type assertion needed as IDBPDatabase types might not perfectly match
		return (await db.getAllKeys(this.storeName)) as string[];
	}

	/**
	 * Delete a value by key from the store.
	 */
	async delete(key: string): Promise<void> {
		const db = await getDb();
		await db.delete(this.storeName, key);
		this.dispatchChangeEvent(); // Dispatch after successful delete
	}

	/**
	 * Clear all values from the store.
	 */
	async clear(): Promise<void> {
		const db = await getDb();
		await db.clear(this.storeName);
		this.dispatchChangeEvent(); // Dispatch after successful clear
	}

	/**
	 * Put a value into the store (useful when key is part of the value or using key generator).
	 */
	async put(value: T, key?: string): Promise<void> {
		const db = await getDb();
		await db.put(this.storeName, value, key);
		this.dispatchChangeEvent(); // Dispatch after successful put
	}
}

// --- Database Export/Import Functions ---

/**
 * Exports all data from specified IndexedDB stores to a JSON object.
 */
export const exportDbToJson = async (): Promise<string> => {
	const db = await getDb();
	const exportData: DbExport = {};
	const storesToExport: StoreNames[] = [
		StoreNames.SETTINGS,
		StoreNames.SUBJECTS,
		StoreNames.CHAPTERS,
		StoreNames.MATERIALS,
	];

	console.log('Starting DB export...');
	for (const storeName of storesToExport) {
		try {
			if (storeName === StoreNames.SETTINGS) {
				// Handle settings store: export as array of { key: string, value: any }
				const allKeys = await db.getAllKeys(storeName);
				// Explicitly type the array
				const settingsData: { key: string; value: any }[] = [];
				for (const key of allKeys) {
					const value = await db.get(storeName, key);
					settingsData.push({ key, value });
				}
				exportData[storeName] = settingsData;
				console.log(`Exported ${settingsData.length} items from ${storeName}`);
			} else {
				// Handle other stores (assuming they have an 'id' property as key)
				const allItems = await db.getAll(storeName);
				exportData[storeName] = allItems;
				console.log(`Exported ${allItems.length} items from ${storeName}`);
			}
		} catch (err) {
			console.error(`Error exporting store ${storeName}:`, err);
			throw new Error(`Failed to export data from ${storeName}`);
		}
	}
	console.log('DB export finished.');
	return JSON.stringify(exportData);
};

/**
 * Imports data from a JSON object into IndexedDB, clearing existing data.
 */
export const importDbFromJson = async (jsonString: string): Promise<void> => {
	let importData: DbExport;
	try {
		importData = JSON.parse(jsonString);
	} catch (err) {
		console.error('Failed to parse backup JSON:', err);
		throw new Error('Invalid backup file format.');
	}

	const db = await getDb();
	const storesToImport: StoreNames[] = [
		StoreNames.SETTINGS,
		StoreNames.SUBJECTS,
		StoreNames.CHAPTERS,
		StoreNames.MATERIALS,
		StoreNames.SYNC_QUEUE, // Clear sync queue on restore
	];

	console.log('Starting DB import...');
	const tx = db.transaction(storesToImport, 'readwrite');
	try {
		for (const storeName of storesToImport) {
			const store = tx.objectStore(storeName);
			await store.clear(); // Clear existing data
			console.log(`Cleared store: ${storeName}`);

			const itemsToImport = importData[storeName];
			if (itemsToImport && Array.isArray(itemsToImport)) {
				if (storeName === StoreNames.SETTINGS) {
					// Handle settings store: import from array of { key: string, value: any }
					for (const item of itemsToImport) {
						if (item && typeof item.key === 'string') {
							// Use put(value, key) for settings
							await store.put(item.value, item.key);
						} else {
							console.warn(`Skipping invalid settings item during import:`, item);
						}
					}
				} else {
					// Handle other stores (assuming they have an 'id' property as key)
					for (const item of itemsToImport) {
						// Use put(value, key) for other stores, assuming item.id is the key
						if (item && typeof item.id === 'string') {
							await store.put(item, item.id);
						} else {
							console.warn(`Skipping invalid item in ${storeName} during import (missing or invalid id):`, item);
						}
					}
				}
				console.log(`Imported ${itemsToImport.length} items into ${storeName}`);
			}
		}
		await tx.done;
		console.log('DB import finished successfully.');
	} catch (err) {
		console.error('Error during DB import transaction:', err);
		tx.abort();
		throw new Error('Failed to import data into the database.');
	}
};
