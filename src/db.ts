import { Chat } from "@type/copilot.types";
import { Chapter, Material, StoreNames, Subject, SyncStatus } from "@type/db.types";
import { blobToBase64, tryBase64ToBlob } from "@utils/utils";
import { DBSchema, IndexNames as IDBIndexNames, IDBPDatabase, IDBPTransaction, StoreNames as IDBStoreNames, openDB } from "idb";

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
 */
export interface StudyPalDB extends DBSchema {
	[StoreNames.SETTINGS]: { key: string; value: any };
	[StoreNames.SUBJECTS]: { key: string; value: Subject; indexes: { 'by-syncStatus': SyncStatus } };
	[StoreNames.CHAPTERS]: { key: string; value: Chapter; indexes: { 'by-subjectId': string, 'by-syncStatus': SyncStatus } };
	[StoreNames.MATERIALS]: { key: string; value: Material; indexes: { 'by-chapterId': string, 'by-syncStatus': SyncStatus } };
	[StoreNames.COPILOT]: { key: 'id'; value: Chat; indexes: { 'by-lastModified': number } };
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

				// Copilot store
				if (!db.objectStoreNames.contains(StoreNames.COPILOT)) {
					const store = db.createObjectStore(StoreNames.COPILOT, { keyPath: 'id' });
					store.createIndex('by-lastModified', 'lastModified');
					console.log(`Created object store: ${StoreNames.COPILOT} with index by-lastModified`);
				} else {
					// Ensure index exists and uses 'lastModified' (number)
					ensureIndex(StoreNames.COPILOT, 'by-lastModified', 'lastModified');
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
	// Make storeName and dispatchChangeEvent protected
	constructor(protected storeName: StoreNames) { }

	// Helper to dispatch change event
	protected dispatchChangeEvent() {
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
	async put(value: T, key?: string, dispatchChangeEvent = true): Promise<void> {
		const db = await getDb();
		await db.put(this.storeName, value, key);
		if (dispatchChangeEvent) {
			this.dispatchChangeEvent(); // Dispatch after successful put
		}
	}
}

// --- Database Export/Import Functions ---

/**
 * Exports all data from specified IndexedDB stores to a JSON string.
 * Optoinally, Strips 'content' (Blob) from materials before export.
 */
export const exportDbToJson = async (stripContentData = true): Promise<string> => {
	const db = await getDb();
	const exportData: DbExport = {};
	const storesToExport: StoreNames[] = [StoreNames.SETTINGS, StoreNames.SUBJECTS, StoreNames.CHAPTERS, StoreNames.MATERIALS, StoreNames.COPILOT];

	for (const storeName of storesToExport) {
		try {
			const tx = db.transaction(storeName, 'readonly');
			const store = tx.objectStore(storeName);
			let items = await store.getAll();

			if (storeName === StoreNames.SETTINGS) {
				// Handle settings store: export as array of { key: string; value: any }
				const allKeys = await db.getAllKeys(storeName);
				// Explicitly type the array
				const settingsData: { key: string; value: any }[] = [];
				for (const key of allKeys) {
					const value = await db.get(storeName, key);
					settingsData.push({ key, value });
				}
				exportData[storeName] = settingsData;
			}

			// When stripContent is true, strip content from all materials
			else if (storeName === StoreNames.MATERIALS) {
				exportData[storeName] = items.map((item: Material) => {
					if (stripContentData) {
						return { ...item, content: { mimeType: item.content?.mimeType, data: undefined } }; // Return without data
					} else if (item.content?.data instanceof Blob) {
						return { ...item, content: { mimeType: item.content.mimeType, data: blobToBase64(item.content.data) } }; // Convert Blob to base64 string for export
					}
					return item;
				});
			}

			else exportData[storeName] = items;

			await tx.done;
			// console.log(`Exported ${items?.length} items from ${storeName}`);

		} catch (err) {
			console.error(`Error exporting store ${storeName}:`, err);
			throw new Error(`Failed to export data from ${storeName}`);
		}
	}

	// console.log("DB Export: Exported stores:", storesToExport.join(', '));
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
		const store = tx.objectStore(storeName);
		const oldData = await store.getAll(); // Get existing data for logging
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
			} else if (storeName === StoreNames.MATERIALS) {
				for (const item of itemsToImport as Material[]) {
					if (item) {
						if (item.content && typeof item.content.data === 'string') {
							try {
								item.content.data = tryBase64ToBlob(item.content.data);
							} catch (e) {
								console.warn(`Failed to decode content for material ${item.id}:`, e);
							}
						} else if (item.content && item.content.data === undefined) {
							// Try to get the content from the existing database
							const oldMaterial = oldData.find(m => m.id === item.id);
							if (oldMaterial && oldMaterial.content) {
								item.content = oldMaterial.content;
								console.log(`Used existing content for material ${item.id}`);
							} else {
								// set the item's sync status to 'pending' if no content is found
								item.syncStatus = SyncStatus.DOWNLOAD_PENDING;
							}
						}
						await store.put(item);
					} else {
						console.warn(`Skipping invalid item in ${storeName} during import:`, item);
					}
				}
			} else {
				// Handle other stores
				for (const item of itemsToImport) {
					if (item) {
						await store.put(item);
					} else {
						console.warn(`Skipping invalid item in ${storeName} during import:`, item);
					}
				}
			}
			console.log(`Imported ${itemsToImport.length} items into ${storeName}`);
		}
	}

	await tx.done;
	console.log("DB Import: Import process completed.");
	window.dispatchEvent(new Event('studypal-db-changed'));
};
