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
 * Sync status for items, reflecting Drive sync state.
 */
export enum SyncStatus {
	IDLE = "idle",				// IDLE for local-only items
	CHECKING = "checking",		// CHECKING for items being checked for changes
	SYNCING_UP = "syncing_up",	// Syncing up to Drive
	SYNCING_DOWN = "syncing_down", // Syncing up to Drive or down from Drive
	UP_TO_DATE = "up_to_date",	// UP_TO_DATE for synced items
	CONFLICT = "conflict",		// CONFLICT for sync conflicts
	ERROR = "error",			// ERROR for sync errors
    PENDING = "pending",		// PENDING for local-only changes before first sync
}

/**
 * Material types supported by the application
 */
export enum MaterialType {
	FILE = "file",
	PDF = "pdf",
	TEXT = "text",
	WORD = "docx",
	LINK = "link",
	IMAGE = "image",
	VIDEO = "video",
	AUDIO = "audio",
	JUPYTER = "jupyter",
}

/**
 * Base interface for syncable items
 */
export interface SyncableItem {
	id: string;              // ID
	name: string;            // Display name
	createdAt: number;       // Creation timestamp
	lastModified: number;    // Last modification timestamp
	driveId?: string;        // Google Drive file/folder ID if synced
	syncStatus: SyncStatus;  // Use the newly defined SyncStatus enum
	size?: number;           // Size in bytes (optional)
}

/**
 * Subject interface representing a top-level category/folder
 */
export interface Subject extends SyncableItem {
	color?: string;          // Optional color for UI
	icon?: string;           // Optional icon for UI
	categories: string[];     // List of categories/tags for the subject
}

/**
 * Chapter interface representing a sub-folder within a subject
 */
export interface Chapter extends SyncableItem {
	subjectId: string;       // Parent subject ID
	number: number;         // Chapter number (for ordering) (can be decimal)
}

/**
 * Material interface representing a file/content within a chapter
 */
export interface Material extends SyncableItem {
	chapterId: string;       // Parent chapter ID
	type: MaterialType;      // Material type
	content?: string | ArrayBuffer; // string for text, ArrayBuffer for cached binary files (PDF, images, etc.)
	sourceRef?: string;     // Optional reference (URL or note) for where the material came from
	progress?: number;      // material completion progress (0-100% read or covered, etc)
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
