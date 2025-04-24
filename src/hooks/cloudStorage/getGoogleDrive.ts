import { blobToBase64, tryBase64ToBlob } from '@utils/utils';
import { gapi } from 'gapi-script';

// --- Constants --- 
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const STUDYPAL_FOLDER_NAME = 'StudyPalData';

// Singleton state
let isGapiLoaded = false;
let isGapiInitStarted = false;
let isAuthenticated = false;
let error: Error | null = null;
let listeners: (() => void)[] = [];

function notifyListeners() {
    listeners.forEach(fn => fn());
}

async function initGapiClient() {
    if (isGapiLoaded || isGapiInitStarted) return;
    isGapiInitStarted = true;
    if (API_KEY.includes('PLACEHOLDER') || CLIENT_ID.includes('PLACEHOLDER')) {
        error = new Error('Google API credentials not configured.');
        notifyListeners();
        return;
    }
    try {
        await new Promise<void>((resolve, reject) => {
            gapi.load('client:auth2', {
                callback: resolve,
                onerror: reject,
                timeout: 10000,
                ontimeout: reject
            });
        });
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES,
        });
        console.log('Google API Client initialized successfully.');
        isGapiLoaded = true;
        const googleAuth = gapi.auth2.getAuthInstance();
        isAuthenticated = googleAuth.isSignedIn.get();
        googleAuth.isSignedIn.listen((signedIn: boolean) => {
            isAuthenticated = signedIn;
            if (!signedIn) error = null;
            notifyListeners();
        });
        notifyListeners();
    } catch (err: any) {
        error = new Error('Failed to initialize Google API Client. Drive API unavailable.');
        notifyListeners();
    }
}

const singleton = {
    get isGapiLoaded() { return isGapiLoaded; },
    get isAuthenticated() { return isAuthenticated; },
    get error() { return error; },
    init: () => { initGapiClient(); },
    subscribe: (fn: () => void) => { listeners.push(fn); return () => { listeners = listeners.filter(f => f !== fn); }; },
    // --- Auth Functions ---

    /**
     * Initiate Google Sign-In
     */
    signIn: async () => {
        if (!isGapiLoaded) throw new Error('Google API client not loaded yet.');
        try {
            error = null;
            await gapi.auth2.getAuthInstance().signIn();
            isAuthenticated = true;
        } catch (err: any) {
            console.error('Google Sign-In error:', err);
            if (err.error === 'popup_closed_by_user') {
                throw new Error('Sign-in cancelled.');
            } else if (err.error === 'access_denied') {
                throw new Error('Access denied. Please grant permission to Google Drive AppData.');
            } else {
                throw err instanceof Error ? err : new Error('Failed to sign in with Google.');
            }
        }
    },

    /**
       * Initiate Google Sign-Out
       */
    signOut: async () => {
        if (!isGapiLoaded) throw new Error('Google API client not loaded yet.');
        try {
            await gapi.auth2.getAuthInstance().signOut();
            isAuthenticated = false;
        } catch (err) {
            console.error('Google Sign-Out error:', err);
            throw err instanceof Error ? err : new Error('Failed to sign out.');
        }
    },

    // --- File & Folder Operations ---

    /**
     * Finds or creates a folder in Google Drive AppData folder by name.
     * Returns the folder ID.
     */
    findOrCreateFolder: async (folderName: string, parentFolderId: string = 'appDataFolder'): Promise<string> => {
        try {
            // Check if folder exists
            const listResponse = await singleton.driveApiAction(() =>
                gapi.client.drive.files.list({
                    spaces: 'appDataFolder',
                    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
                    fields: 'files(id)',
                })
            );

            if (listResponse.result.files && listResponse.result.files.length > 0) {
                console.log(`Found folder '${folderName}' with ID: ${listResponse.result.files[0].id}`);
                return listResponse.result.files[0].id!;
            }

            // Create folder if it doesn't exist
            console.log(`Creating folder '${folderName}' in parent ${parentFolderId}...`);
            const createResponse = await singleton.driveApiAction(() =>
                gapi.client.drive.files.create({
                    resource: {
                        name: folderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentFolderId],
                    },
                    fields: 'id',
                })
            );
            console.log(`Created folder '${folderName}' with ID: ${createResponse.result.id}`);
            return createResponse.result.id!;
        } catch (err) {
            console.error(`Error finding or creating folder '${folderName}':`, err);
            throw new Error(`Failed to find or create folder '${folderName}'.`);
        }
    },

    /**
     * Finds or creates a nested folder structure (e.g., subjectId/chapterId) in AppData.
     * Returns the ID of the innermost folder.
     */
    findOrCreateFolderByPath: async (pathSegments: string[]): Promise<string> => {
        let currentParentId = 'appDataFolder';
        for (const segment of pathSegments) {
            currentParentId = await singleton.findOrCreateFolder(segment, currentParentId);
        }
        return currentParentId;
    },

    /**
     * Uploads a file (Blob) to a specific folder in Google Drive AppData.
     * Returns the Google Drive file ID.
     */
    uploadFileToFolder: async (
        fileBlob: Blob, // Accepts Blob directly
        fileName: string, // Usually the material ID
        parentFolderId: string,
        mimeType: string = 'application/octet-stream'
    ): Promise<string> => {
        console.log(`Uploading file '${fileName}' (Type: ${mimeType}, Size: ${fileBlob.size}) to folder ${parentFolderId}...`);
        try {
            // Check if file already exists
            const listResponse = await singleton.driveApiAction(() =>
                gapi.client.drive.files.list({
                    spaces: 'appDataFolder',
                    q: `name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`,
                    fields: 'files(id)',
                })
            );

            const existingFileId = listResponse.result.files?.[0]?.id;

            const metadata = {
                name: fileName,
                mimeType: mimeType,
                ...(!existingFileId && { parents: [parentFolderId] }) // Only add parents if creating a new file
            };

            const base64Data = await blobToBase64(fileBlob);

            const path = existingFileId
                ? `/upload/drive/v3/files/${existingFileId}`
                : '/upload/drive/v3/files';
            // Use PATCH for update, POST for create
            const method = existingFileId ? 'PATCH' : 'POST';

            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const close_delim = `\r\n--${boundary}--`;

            // Construct the multipart body directly from the Blob
            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                `Content-Type: ${mimeType}\r\n\r\n` +
                base64Data +
                close_delim

            const response = await singleton.driveApiAction(() =>
                gapi.client.request({
                    path: path,
                    method: method,
                    params: { uploadType: 'multipart', fields: 'id' },
                    headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
                    body: multipartRequestBody
                })
            );

            console.log(`File '${fileName}' uploaded successfully`);
            return response.result.id!;

        } catch (err) {
            console.error(`Error uploading file '${fileName}':`, err);
            throw new Error(`Failed to upload file '${fileName}'.`);
        }
    },

    /**
     * Get file content (as Blob) from Google Drive using file ID.
     */
    getDriveFileContent: async (fileId: string): Promise<Blob> => {
        console.log(`getDriveFileContent: Fetching content for file ID: ${fileId}`);
        const response = await singleton.driveApiAction(() =>
            gapi.client.request({
                path: `/drive/v3/files/${fileId}`,
                method: 'GET',
                params: { alt: 'media' },
            })
        );

        const contentType = response.headers?.['Content-Type'] || 'application/octet-stream';
        let contentData = response.body;

        if (contentType.startsWith('image/') || contentType.startsWith('video/')) {
            return fetch(contentData).then(res => res.blob());
        }

        console.log(`getDriveFileContent: Successfully fetched content for file ID: ${fileId}, Type: ${contentType}`);
        return tryBase64ToBlob(contentData);
    },

    /**
     * Delete a file from Google Drive using its ID.
     */
    deleteFileItem: async (fileId?: string): Promise<boolean> => {
        if (!fileId) return false;
        console.log(`deleteFileItem: Deleting file with ID: ${fileId}`);
        try {
            await singleton.driveApiAction(() => gapi.client.drive.files.delete({ fileId }));
            console.log(`deleteFileItem: Successfully deleted file with ID: ${fileId}`);
            return true;
        } catch (err) {
            console.error(`deleteFileItem: Error deleting file with ID: ${fileId}`, err);
            throw new Error(`Failed to delete file with ID: ${fileId}`);
        }
    },

    /**
     * List files/folders in Google Drive App Data folder using gapi
     */
    listDriveItems: async (parentDriveId: string = 'appDataFolder'): Promise<gapi.client.drive.File[]> => {
        const response = await singleton.driveApiAction(() =>
            gapi.client.drive.files.list({
                spaces: 'appDataFolder',
                q: `'${parentDriveId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, modifiedTime, createdTime, parents, size)',
                orderBy: 'name',
            })
        );
        return response.result.files || [];
    },

    /**
     * Find a file in Google Drive by name and parent folder.
     */
    findFile: async (fileName: string, parentFolderId: string = 'appDataFolder'): Promise<gapi.client.drive.File | null> => {
        try {
            const response = await singleton.driveApiAction(() =>
                gapi.client.drive.files.list({
                    spaces: 'appDataFolder',
                    q: `name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`,
                    fields: 'files(id, name, mimeType, modifiedTime, createdTime, size)',
                })
            );
            return response.result.files && response.result.files.length > 0
                ? response.result.files[0]
                : null;
        } catch (err) {
            console.error(`Error finding file '${fileName}':`, err);
            throw new Error(`Failed to find file '${fileName}'.`);
        }
    },

    /**
     * Upload a JSON string to Drive as a file with metadata
     */
    uploadJsonToAppData: async (
        jsonContent: string,
        fileName: string,
        mimeType: string = 'application/json'
    ): Promise<{ id: string, modifiedTime?: string }> => {
        try {
            // Check if file already exists in App Data folder
            const existingFile = await singleton.findFile(fileName);

            const path = existingFile?.id
                ? `/upload/drive/v3/files/${existingFile.id}`
                : '/upload/drive/v3/files';
            // Use PATCH for update, POST for create
            const method = existingFile?.id ? 'PATCH' : 'POST';

            const metadata = {
                name: fileName,
                mimeType: mimeType,
                ...(!existingFile && { parents: ['appDataFolder'] })
            };

            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            const metadataStr = JSON.stringify(metadata);

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                metadataStr +
                delimiter +
                'Content-Type: ' + mimeType + '\r\n\r\n' +
                jsonContent +
                close_delim;

            const response = await singleton.driveApiAction(() =>
                gapi.client.request({
                    path: path,
                    method: method,
                    params: { uploadType: 'multipart', fields: 'id, name, modifiedTime' },
                    headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
                    body: multipartRequestBody
                })
            );

            return {
                id: response.result.id,
                modifiedTime: response.result.modifiedTime
            };
        } catch (err) {
            console.error(`Error uploading JSON file '${fileName}':`, err);
            throw new Error(`Failed to upload JSON file '${fileName}'.`);
        }
    },

    /**
     * Helper to perform Drive API actions with error handling using gapi
     */
    driveApiAction: async <T = any>(
        action: () => Promise<gapi.client.Response<T>>
    ): Promise<gapi.client.Response<T>> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google');
        }

        try {
            const response = await action();

            // Check if response exists AND status is a number before comparing
            if (response && typeof response.status === 'number' && response.status >= 400) {
                console.error('Google Drive API Error Response:', response.result);
                const errorResult = response.result as any;
                const errorMsg = errorResult?.error?.message || `Google Drive API request failed with status ${response.status}`;
                if (response.status === 401) {
                    await singleton.signOut();
                    throw new Error('Authentication expired or invalid. Please sign in again.');
                }
                throw new Error(errorMsg);
            }
            if (!response) {
                throw new Error('No response received from Google Drive API.');
            }
            return response;
        } catch (err: any) {
            console.error('Google Drive API Action Failed:', err);
            // Check for specific gapi error structures or status codes
            const statusCode = err?.status ?? err?.result?.error?.code;
            if (statusCode === 401 || err?.message?.includes('Unauthorized') || err?.message?.includes('Invalid Credentials')) {
                await singleton.signOut();
                throw new Error('Authentication failed. Please sign in again.');
            }
            throw err instanceof Error ? err : new Error(err?.message || 'Google Drive API request failed');
        }
    }
};

export default function getGoogleDrive() {
    return singleton;
}