import { useState, useEffect, useCallback } from 'react';
import { Chapter } from '@type/db.types';
import { chaptersStore } from '@store/chaptersStore';
import { materialsStore } from '@store/materialsStore';

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
      const subjectToQuery = targetSubjectId || subjectId;
      
      let chaptersList: Chapter[];
      
      if (subjectToQuery) {
        // Get chapters for specific subject
        chaptersList = await chaptersStore.getChaptersBySubject(subjectToQuery);
        
        // Sort by chapter number
        chaptersList.sort((a, b) => a.number - b.number);
      } else {
        // Get all chapters if no subject ID provided
        chaptersList = await chaptersStore.getAllChapters();
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
      const subjectToUse = targetSubjectId || subjectId;
      
      if (!subjectToUse) {
        throw new Error('Subject ID is required to create a chapter');
      }
      
      // Create the new chapter
      const newChapter = await chaptersStore.createChapter(name, subjectToUse);
      
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
  const updateChapter = useCallback(async (updatedChapter: Partial<Chapter> & { id: string }): Promise<Chapter> => {
    try {
      // Update the chapter
      const mergedChapter = await chaptersStore.updateChapter(updatedChapter);
      
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
      // First, get all materials in this chapter and delete them
      const chapterMaterials = await materialsStore.getMaterialsByChapter(chapterId);
      
      // Delete all materials in the chapter
      for (const material of chapterMaterials) {
        await materialsStore.deleteMaterial(material.id);
      }
      
      // Delete chapter
      await chaptersStore.deleteChapter(chapterId);
      
      // Remove from local state
      setChapters(prevChapters => prevChapters.filter(c => c.id !== chapterId));
    } catch (err) {
      console.error('Error deleting chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to delete chapter');
    }
  }, []);

  // Get a chapter by ID
  const getChapter = useCallback(async (chapterId: string): Promise<Chapter | undefined> => {
    try {
      return await chaptersStore.getChapterById(chapterId);
    } catch (err) {
      console.error('Error getting chapter:', err);
      throw err instanceof Error ? err : new Error('Failed to get chapter');
    }
  }, []);

  // Move a chapter to a different subject
  const moveChapter = useCallback(async (chapterId: string, newSubjectId: string): Promise<Chapter> => {
    try {
      // Move the chapter
      const updatedChapter = await chaptersStore.moveChapter(chapterId, newSubjectId);
      
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

  // Reorder chapters within a subject
  const reorderChapters = useCallback(async (newOrdering: string[]): Promise<void> => {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required to reorder chapters');
      }
      
      // Update the chapter ordering
      const updatedChapters = await chaptersStore.reorderChapters(subjectId, newOrdering);
      
      // Update local state with the new ordering
      setChapters(updatedChapters);
    } catch (err) {
      console.error('Error reordering chapters:', err);
      throw err instanceof Error ? err : new Error('Failed to reorder chapters');
    }
  }, [subjectId]);

  // Calculate progress for a chapter
  const getChapterProgress = useCallback(async (chapterId: string): Promise<number> => {
    try {
      const materials = await materialsStore.getMaterialsByChapter(chapterId);
      
      if (materials.length === 0) {
        return 0;
      }
      
      const totalProgress = materials.reduce((sum, material) => sum + (material.progress || 0), 0);
      return totalProgress / materials.length;
    } catch (err) {
      console.error('Error calculating chapter progress:', err);
      return 0;
    }
  }, []);

  return {
    chapters,
    loading,
    error,
    fetchChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    getChapter,
    moveChapter,
    reorderChapters,
    getChapterProgress
  };
}
