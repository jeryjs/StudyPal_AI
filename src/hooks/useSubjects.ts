import { useState, useEffect, useCallback } from 'react';
import { Subject } from '@type/db.types';
import { subjectsStore } from '@store/subjectsStore';
import { chaptersStore } from '@store/chaptersStore';
import { materialsStore } from '@store/materialsStore';

/**
 * Hook for managing subjects in the database
 */
export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch all subjects
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const allSubjects = await subjectsStore.getAllSubjects();
      setSubjects(allSubjects);
      
      // Also fetch categories
      const allCategories = await subjectsStore.getAllCategories();
      setCategories(allCategories);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch subjects'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Create a new subject
  const createSubject = useCallback(async (name: string, categories: string[] = []): Promise<Subject> => {
    try {
      const newSubject = await subjectsStore.createSubject(name, categories);
      
      // Update local state
      setSubjects(prevSubjects => [...prevSubjects, newSubject]);
      
      return newSubject;
    } catch (err) {
      console.error('Error creating subject:', err);
      throw err instanceof Error ? err : new Error('Failed to create subject');
    }
  }, []);

  // Update an existing subject
  const updateSubject = useCallback(async (updatedSubject: Partial<Subject> & { id: string }): Promise<Subject> => {
    try {
      const mergedSubject = await subjectsStore.updateSubject(updatedSubject);
      
      // Update local state
      setSubjects(prevSubjects => 
        prevSubjects.map(s => s.id === mergedSubject.id ? mergedSubject : s)
      );
      
      // If categories were updated, refresh categories list
      if (updatedSubject.categories) {
        const allCategories = await subjectsStore.getAllCategories();
        setCategories(allCategories);
      }
      
      return mergedSubject;
    } catch (err) {
      console.error('Error updating subject:', err);
      throw err instanceof Error ? err : new Error('Failed to update subject');
    }
  }, []);

  // Delete a subject
  const deleteSubject = useCallback(async (subjectId: string): Promise<void> => {
    try {
      // First get chapters of this subject to delete them too
      const subjectChapters = await chaptersStore.getChaptersBySubject(subjectId);
      
      // Delete related chapters and their materials
      for (const chapter of subjectChapters) {
        const chapterMaterials = await materialsStore.getMaterialsByChapter(chapter.id);
        
        // Delete all materials in the chapter
        for (const material of chapterMaterials) {
          await materialsStore.deleteMaterial(material.id);
        }
        
        // Delete the chapter
        await chaptersStore.deleteChapter(chapter.id);
      }
      
      // Delete subject
      await subjectsStore.deleteSubject(subjectId);
      
      // Remove from local state
      setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== subjectId));
      
      // Refresh categories as some may no longer be used
      const allCategories = await subjectsStore.getAllCategories();
      setCategories(allCategories);
      
    } catch (err) {
      console.error('Error deleting subject:', err);
      throw err instanceof Error ? err : new Error('Failed to delete subject');
    }
  }, []);

  // Get a subject by ID
  const getSubject = useCallback(async (subjectId: string): Promise<Subject | undefined> => {
    try {
      return await subjectsStore.getSubjectById(subjectId);
    } catch (err) {
      console.error('Error getting subject:', err);
      throw err instanceof Error ? err : new Error('Failed to get subject');
    }
  }, []);

  // Get subjects by category
  const getSubjectsByCategory = useCallback(async (category: string): Promise<Subject[]> => {
    try {
      return await subjectsStore.getSubjectsByCategory(category);
    } catch (err) {
      console.error('Error getting subjects by category:', err);
      throw err instanceof Error ? err : new Error('Failed to get subjects by category');
    }
  }, []);

  // Calculate statistics for a subject (for UI display)
  const getSubjectStats = useCallback(async (subjectId: string): Promise<{chaptersCount: number, materialsCount: number, progress: number, totalSize: number}> => {
    try {
      // Get chapters count
      const chapters = await chaptersStore.getChaptersBySubject(subjectId);
      const chaptersCount = chapters.length;
      
      // Get materials stats (including size)
      const { totalMaterials, averageProgress, totalSize } = await materialsStore.getSubjectStats(subjectId, chaptersStore);
      
      return {
        chaptersCount,
        materialsCount: totalMaterials,
        progress: averageProgress,
        totalSize // Include totalSize
      };
    } catch (err) {
      console.error('Error getting subject statistics:', err);
      // Return default values including totalSize
      return { chaptersCount: 0, materialsCount: 0, progress: 0, totalSize: 0 };
    }
  }, []);

  return {
    subjects,
    categories,
    loading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getSubject,
    getSubjectsByCategory,
    getSubjectStats
  };
}
