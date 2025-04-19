/**
 * Type definitions for database schema and related objects
 */

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

/**
 * Sync status for items that can be synchronized with Google Drive
 */
export enum SyncStatus {
	SYNCED = "synced",     // Item is synced with Google Drive
	PENDING = "pending",   // Item has local changes that need to be synced
	ERROR = "error",       // Error occurred during sync
	CONFLICT = "conflict"  // Conflict detected between local and remote versions
}

/**
 * Material types supported by the application
 */
export enum MaterialType {
	MARKDOWN = "markdown",
	PDF = "pdf",
	LINK = "link",
	IMAGE = "image",
	VIDEO = "video"
}

/**
 * Base interface for syncable items
 */
export interface SyncableItem {
	id: string;              // ID
	name: string;            // Display name
	createdAt: number;       // Creation timestamp
	lastModified: number;    // Last modification timestamp
	driveId?: string;        // Google Drive file ID if synced
	syncStatus: SyncStatus;  // Current sync status
}

/**
 * Subject interface representing a top-level category/folder
 */
export interface Subject extends SyncableItem {
	color?: string;          // Optional color for UI
}

/**
 * Chapter interface representing a sub-folder within a subject
 */
export interface Chapter extends SyncableItem {
	subjectId: string;       // Parent subject ID
	order?: number;          // Optional order within subject
}

/**
 * Material interface representing a file/content within a chapter
 */
export interface Material extends SyncableItem {
	chapterId: string;       // Parent chapter ID
	type: MaterialType;      // Material type
	content?: string | Blob; // Content or data
	contentUrl?: string;     // URL for external resources
	driveLastModified?: number; // Last modification time from Drive
}

/**
 * SyncQueueItem interface to track items waiting to be synced
 */
export interface SyncQueueItem {
	id: string;               // Unique ID for the queue item
	storeType: StoreNames;    // Store type (SUBJECTS, CHAPTERS, MATERIALS)
	itemId: string;           // ID of the item to sync
	action: 'create' | 'update' | 'delete'; // Action to perform
	timestamp: number;        // When the item was queued
	retryCount: number;       // Number of retry attempts
}
