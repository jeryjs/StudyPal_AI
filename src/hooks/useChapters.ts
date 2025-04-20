import { useState, useEffect, useCallback } from 'react';
import slugify from '@utils/Slugify';
import { getDb } from '@db';
import { Chapter, StoreNames, SyncStatus } from '@type/db.types';

/**
 * Hook for managing chapters in the database
 */
export function useChapters(subjectId?: string) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch chapters for a specific subject or all chapters
  const fetchChapters = useCallback(async (targetSubjectId?: string) => {
    setLoading(true);
    try {
      const db = await getDb();
      const subjectToQuery = targetSubjectId || subjectId;
      
      let chaptersList: Chapter[];
      
      if (subjectToQuery) {
        // Get chapters for specific subject using the index
        chaptersList = await db.getAllFromIndex(
          StoreNames.CHAPTERS, 
          'by-subject', 
          subjectToQuery
        );
      } else {
        // Get all chapters if no subject ID provided
        chaptersList = await db.getAll(StoreNames.CHAPTERS);
      }
      
      setChapters(chaptersList);
      setError(null);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch chapters'));
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  // Load chapters on mount or when subjectId changes
  useEffect(() => {
    fetchChapters();
  }, [fetchChapters, subjectId]);

  // Create a new chapter
  const createChapter = useCallback(async (name: string, targetSubjectId?: string): Promise<Chapter> => {
    try {
      const timestamp = Date.now();
      const subjectToUse = targetSubjectId || subjectId;
      
      if (!subjectToUse) {
        throw new Error('Subject ID is required to create a chapter');
      }
      
      const id = slugify(`${subjectToUse}-${name}`, true); // Using slugify with unique=true
      
      const newChapter: Chapter = {
        id,
        name,
        subjectId: subjectToUse,
        createdAt: timestamp,
        lastModified: timestamp,
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      const db = await getDb();
      await db.put(StoreNames.CHAPTERS, newChapter);
      
      // Update local state if this belongs to our current subject
      if (subjectToUse === subjectId) {
        setChapters(prevChapters => [...prevChapters, newChapter]);
      }
      
      return newChapter;
    } catch (err) {
      console.error('Error creating chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to create chapter');
    }
  }, [subjectId]);

  // Update an existing chapter
  const updateChapter = useCallback(async (updatedChapter: Chapter): Promise<Chapter> => {
    try {
      const db = await getDb();
      
      // Get the current chapter to merge with updates
      const existingChapter = await db.get(StoreNames.CHAPTERS, updatedChapter.id);
      if (!existingChapter) {
        throw new Error(`Chapter not found: ${updatedChapter.id}`);
      }
      
      // Update timestamp and sync status
      const mergedChapter: Chapter = {
        ...existingChapter,
        ...updatedChapter,
        lastModified: Date.now(),
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      await db.put(StoreNames.CHAPTERS, mergedChapter);
      
      // Update local state if this belongs to our current subject
      if (mergedChapter.subjectId === subjectId) {
        setChapters(prevChapters => 
          prevChapters.map(c => c.id === mergedChapter.id ? mergedChapter : c)
        );
      }
      
      return mergedChapter;
    } catch (err) {
      console.error('Error updating chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to update chapter');
    }
  }, [subjectId]);

  // Delete a chapter
  const deleteChapter = useCallback(async (chapterId: string): Promise<void> => {
    try {
      const db = await getDb();
      
      // Check if chapter exists
      const chapter = await db.get(StoreNames.CHAPTERS, chapterId);
      if (!chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }
      
      // Delete chapter
      await db.delete(StoreNames.CHAPTERS, chapterId);
      
      // Remove from local state
      setChapters(prevChapters => prevChapters.filter(c => c.id !== chapterId));
      
      // Note: We should also delete related materials in a transaction
      // That will be handled in a more comprehensive hook or service
    } catch (err) {
      console.error('Error deleting chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to delete chapter');
    }
  }, []);

  // Get a chapter by ID
  const getChapter = useCallback(async (chapterId: string): Promise<Chapter | undefined> => {
    try {
      const db = await getDb();
      return await db.get(StoreNames.CHAPTERS, chapterId);
    } catch (err) {
      console.error('Error getting chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to get chapter');
    }
  }, []);

  // Move a chapter to a different subject
  const moveChapter = useCallback(async (chapterId: string, newSubjectId: string): Promise<Chapter> => {
    try {
      const db = await getDb();
      
      // Get the current chapter
      const chapter = await db.get(StoreNames.CHAPTERS, chapterId);
      if (!chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }
      
      // Update the chapter with new subject ID
      const updatedChapter: Chapter = {
        ...chapter,
        subjectId: newSubjectId,
        lastModified: Date.now(),
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      await db.put(StoreNames.CHAPTERS, updatedChapter);
      
      // Update local state - remove from our list if it's moved to a different subject
      if (subjectId && subjectId !== newSubjectId) {
        setChapters(prevChapters => prevChapters.filter(c => c.id !== chapterId));
      } else if (subjectId && subjectId === newSubjectId) {
        // Update the chapter in our list if it's moved to our current subject
        setChapters(prevChapters => 
          prevChapters.map(c => c.id === updatedChapter.id ? updatedChapter : c)
        );
      }
      
      return updatedChapter;
    } catch (err) {
      console.error('Error moving chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to move chapter');
    }
  }, [subjectId]);

  return {
    chapters,
    loading,
    error,
    fetchChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    getChapter,
    moveChapter
  };
}
