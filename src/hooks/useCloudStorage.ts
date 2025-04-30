import { useEffect, useState } from 'react';
import getGoogleDrive from './cloudStorage/getGoogleDrive';

// Enum for future extensibility
export enum CloudProvider {
    GoogleDrive = 'gdrive',
    // Add more providers here (e.g., Dropbox, OneDrive)
}

export interface CloudStorageFile {
    id: string;
    name: string;
    mimeType?: string;
    size?: number;
    modifiedTime?: string;
    [key: string]: any;
}

export interface UseCloudStorage {
    provider: CloudProvider;
    isAuthenticated: boolean;
    isLoaded: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    uploadFile: (options: { file: Blob; name: string; folderPath?: string; mimeType?: string }) => Promise<string>;
    downloadFile: (fileId: string) => Promise<Blob>;
    deleteFile: (fileId?: string) => Promise<boolean>;
    deleteFolder: (folderId?: string) => Promise<boolean>;
    listFiles: (folderPath?: string) => Promise<CloudStorageFile[]>;
    findFile: (name: string, folderPath?: string) => Promise<CloudStorageFile | null>;
    error: Error | null;
}

export default function useCloudStorage(provider: CloudProvider = CloudProvider.GoogleDrive): UseCloudStorage {
    const gdrive = getGoogleDrive();

    // Subscribe to singleton state changes and trigger re-render
    const [_, setVersion] = useState(0);
    useEffect(() => {
        gdrive.init(); // Always trigger init on mount
        const unsub = gdrive.subscribe(() => setVersion(v => v + 1));
        return unsub;
    }, [gdrive]);

    // Helper to map Google Drive file to CloudStorageFile
    function mapDriveFile(file: any): CloudStorageFile {
        return {
            id: file.id || '',
            name: file.name,
            mimeType: file.mimeType,
            size: file.size ? Number(file.size) : undefined,
            modifiedTime: file.modifiedTime,
            ...file,
        };
    }

    return {
        provider,
        isAuthenticated: gdrive.isAuthenticated,
        isLoaded: gdrive.isGapiLoaded,
        signIn: gdrive.signIn,
        signOut: gdrive.signOut,
        uploadFile: async ({ file, name, folderPath, mimeType }) => {
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size exceeds 10MB limit for appDataFolder.');
            }
            let folderId = 'appDataFolder';
            if (folderPath) {
                folderId = await gdrive.findOrCreateFolderByPath(folderPath.split('/'));
            }
            return gdrive.uploadFileToFolder(file, name, folderId, mimeType);
        },
        downloadFile: gdrive.getDriveFileContent,
        deleteFile: gdrive.deleteFileItem,
        deleteFolder: gdrive.deleteFileItem,
        listFiles: async (folderPath) => {
            let folderId = 'appDataFolder';
            if (folderPath) {
                folderId = await gdrive.findOrCreateFolderByPath(folderPath.split('/'));
            }
            const files = await gdrive.listDriveItems(folderId);
            return files.filter(f => !!f.id).map(mapDriveFile);
        },
        findFile: async (name, folderPath) => {
            let folderId = 'appDataFolder';
            if (folderPath) {
                folderId = await gdrive.findOrCreateFolderByPath(folderPath.split('/'));
            }
            const file = await gdrive.findFile(name, folderId);
            return file && file.id ? mapDriveFile(file) : null;
        },
        error: gdrive.error,
    };
}
