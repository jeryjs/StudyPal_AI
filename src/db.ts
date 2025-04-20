import { openDB, DBSchema, IDBPDatabase, IDBPTransaction, StoreNames as IDBStoreNames, IndexNames as IDBIndexNames } from "idb";
// Import the new SyncStatus enum
import { Material, MaterialType, SyncStatus, Chapter, Subject, SyncQueueItem } from "./types/db.types"; 

/**
 * Application database name.
 */
export const DB_NAME = "StudyPalDB";

/**
 * Current database version.
 */
export const DB_VERSION = 1;

/**
 * Names of object stores in the database.
 */
export enum StoreNames {
	SETTINGS = "settings",
	SUBJECTS = "subjects",
	CHAPTERS = "chapters",
	MATERIALS = "materials",
	SYNC_QUEUE = "syncQueue"
}

// Define specific index names type for better type safety
type SubjectIndexNames = 'by-syncStatus';
type ChapterIndexNames = 'by-subjectId' | 'by-syncStatus';
type MaterialIndexNames = 'by-chapterId' | 'by-syncStatus';
type SyncQueueIndexNames = 'by-timestamp';

/**
 * The base database schema for StudyPal app.
 */
export interface StudyPalDB extends DBSchema {
	[StoreNames.SETTINGS]: { key: string; value: any };
	// Use the new SyncStatus enum for index value types
	[StoreNames.SUBJECTS]: { key: string; value: Subject; indexes: { [N in SubjectIndexNames]: SyncStatus } }; 
	[StoreNames.CHAPTERS]: { key: string; value: Chapter; indexes: { 'by-subjectId': string, 'by-syncStatus': SyncStatus } }; 
	[StoreNames.MATERIALS]: { key: string; value: Material; indexes: { 'by-chapterId': string, 'by-syncStatus': SyncStatus } }; 
	[StoreNames.SYNC_QUEUE]: { key: string; value: SyncQueueItem; indexes: { [N in SyncQueueIndexNames]: number } };
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
			upgrade(db, oldVersion, newVersion, transaction: IDBPTransaction<StudyPalDB, IDBStoreNames<StudyPalDB>[], "versionchange"> | null) {
				console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

				if (!transaction) {
					console.error("Upgrade transaction is null, cannot proceed with index creation.");
					return;
				}

				// Helper to create index if it doesn't exist - strongly typed
				const ensureIndex = <SName extends StoreNames,
					IdxName extends IDBIndexNames<StudyPalDB, SName>>(
					storeName: SName,
					indexName: IdxName,
					keyPath: string | string[],
					options?: IDBIndexParameters
				) => {
					const store = (transaction as IDBPTransaction<StudyPalDB, IDBStoreNames<StudyPalDB>[], "versionchange">).objectStore(storeName);
					if (!store.indexNames.contains(indexName)) {
						store.createIndex(indexName, keyPath, options);
						console.log(`Created index ${indexName as string} on ${storeName}`);
					}
				};

				// Settings store
				if (!db.objectStoreNames.contains(StoreNames.SETTINGS)) {
					db.createObjectStore(StoreNames.SETTINGS);
					console.log(`Created object store: ${StoreNames.SETTINGS}`);
				}

				// Subjects store
				if (!db.objectStoreNames.contains(StoreNames.SUBJECTS)) {
					const store = db.createObjectStore(StoreNames.SUBJECTS, { keyPath: 'id' });
					store.createIndex('by-syncStatus', 'syncStatus');
					console.log(`Created object store: ${StoreNames.SUBJECTS} with index by-syncStatus`);
				} else {
					ensureIndex(StoreNames.SUBJECTS, 'by-syncStatus', 'syncStatus');
				}

				// Chapters store
				if (!db.objectStoreNames.contains(StoreNames.CHAPTERS)) {
					const store = db.createObjectStore(StoreNames.CHAPTERS, { keyPath: 'id' });
					store.createIndex('by-subjectId', 'subjectId');
					store.createIndex('by-syncStatus', 'syncStatus');
					console.log(`Created object store: ${StoreNames.CHAPTERS} with indexes by-subjectId, by-syncStatus`);
				} else {
					ensureIndex(StoreNames.CHAPTERS, 'by-subjectId', 'subjectId');
					ensureIndex(StoreNames.CHAPTERS, 'by-syncStatus', 'syncStatus');
				}

				// Materials store
				if (!db.objectStoreNames.contains(StoreNames.MATERIALS)) {
					const store = db.createObjectStore(StoreNames.MATERIALS, { keyPath: 'id' });
					store.createIndex('by-chapterId', 'chapterId');
					store.createIndex('by-syncStatus', 'syncStatus');
					console.log(`Created object store: ${StoreNames.MATERIALS} with indexes by-chapterId, by-syncStatus`);
				} else {
					ensureIndex(StoreNames.MATERIALS, 'by-chapterId', 'chapterId');
					ensureIndex(StoreNames.MATERIALS, 'by-syncStatus', 'syncStatus');
				}

				// Sync Queue store
				if (!db.objectStoreNames.contains(StoreNames.SYNC_QUEUE)) {
					const store = db.createObjectStore(StoreNames.SYNC_QUEUE, { keyPath: 'id' });
					store.createIndex('by-timestamp', 'timestamp');
					console.log(`Created object store: ${StoreNames.SYNC_QUEUE} with index by-timestamp`);
				} else {
					ensureIndex(StoreNames.SYNC_QUEUE, 'by-timestamp', 'timestamp');
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
 * Exports all data from specified IndexedDB stores to a JSON string.
 * Optoinally, Strips 'content' (ArrayBuffer) from materials before export.
 */
export const exportDbToJson = async (stripContent = true): Promise<string> => {
	const db = await getDb();
	const exportData: DbExport = {};
	const storesToExport: StoreNames[] = [StoreNames.SETTINGS, StoreNames.SUBJECTS, StoreNames.CHAPTERS, StoreNames.MATERIALS];

	const tx = db.transaction(storesToExport, 'readonly');

	for (const storeName of storesToExport) {
		const store = tx.objectStore(storeName);
		let items = await store.getAll();

		// When stripContent is true, strip content from all materials
		if (storeName === StoreNames.MATERIALS) {
			items = items.map((item: Material) => {
				if (stripContent) {
					const { content, ...rest } = item;
					return rest; // Return without content
				}
				return item;
			});
		}

		exportData[storeName] = items;
	}

	await tx.done;
	console.log("DB Export: Exported stores:", storesToExport.join(', '));
	// Use null replacer, 2 spaces for readability
	return JSON.stringify(exportData, null, 2); 
};

/**
 * Imports data from a JSON string into IndexedDB, clearing existing data.
 * Assumes imported materials might not have 'content' if they are file types.
 */
export const importDbFromJson = async (jsonString: string): Promise<void> => {
	const db = await getDb();
	const importData: DbExport = JSON.parse(jsonString);
	const storesToImport = Object.keys(importData) as StoreNames[];

	// Use 'readwrite' for clearing and adding
	const tx = db.transaction(storesToImport, 'readwrite'); 

	console.log("DB Import: Starting import for stores:", storesToImport.join(', '));

	for (const storeName of storesToImport) {
		if (importData[storeName]) {
			const store = tx.objectStore(storeName);
			await store.clear(); // Clear existing data in the store
			console.log(`DB Import: Cleared store ${storeName}`);
			let count = 0;
			for (const item of importData[storeName]!) {
				// Use 'put' which handles both insert and update based on key
				// Assuming items have a valid 'id' property to be used as the key
				if (item && typeof item.id !== 'undefined') { 
					await store.put(item, item.id); 
					count++;
				} else {
					console.warn(`DB Import: Skipping item in ${storeName} due to missing or invalid id:`, item);
				}
			}
			console.log(`DB Import: Imported ${count} items into ${storeName}`);
		} else {
			console.warn(`DB Import: No data found for store ${storeName} in JSON.`);
		}
	}

	await tx.done;
	console.log("DB Import: Import process completed.");
	// Dispatch a generic event or specific events if needed after import
	document.dispatchEvent(new CustomEvent('dbChanged')); 
};
