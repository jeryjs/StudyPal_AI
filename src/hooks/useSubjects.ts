import { useState, useEffect, useCallback } from 'react';
import slugify from '@utils/Slugify';
import { getDb } from '@db';
import { Subject, StoreNames, SyncStatus } from '@type/db.types';
import { generateColorFromString } from '@utils/utils';

/**
 * Hook for managing subjects in the database
 */
export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all subjects
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDb();
      const allSubjects = await db.getAll(StoreNames.SUBJECTS);
      setSubjects(allSubjects);
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
  const createSubject = useCallback(async (name: string): Promise<Subject> => {
    try {
      const timestamp = Date.now();
      const id = slugify(name, true); // Using slugify with unique=true to ensure uniqueness
      const color = generateColorFromString(name);
      
      const newSubject: Subject = {
        id,
        name,
        color,
        createdAt: timestamp,
        lastModified: timestamp,
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      const db = await getDb();
      await db.put(StoreNames.SUBJECTS, newSubject);
      
      // Update local state
      setSubjects(prevSubjects => [...prevSubjects, newSubject]);
      
      return newSubject;
    } catch (err) {
      console.error('Error creating subject:', err);
      throw err instanceof Error ? err : new Error('Failed to create subject');
    }
  }, []);

  // Update an existing subject
  const updateSubject = useCallback(async (updatedSubject: Subject): Promise<Subject> => {
    try {
      const db = await getDb();
      
      // Get the current subject to merge with updates
      const existingSubject = await db.get(StoreNames.SUBJECTS, updatedSubject.id);
      if (!existingSubject) {
        throw new Error(`Subject not found: ${updatedSubject.id}`);
      }
      
      // Update timestamp and sync status
      const mergedSubject: Subject = {
        ...existingSubject,
        ...updatedSubject,
        lastModified: Date.now(),
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      await db.put(StoreNames.SUBJECTS, mergedSubject);
      
      // Update local state
      setSubjects(prevSubjects => 
        prevSubjects.map(s => s.id === mergedSubject.id ? mergedSubject : s)
      );
      
      return mergedSubject;
    } catch (err) {
      console.error('Error updating subject:', err);
      throw err instanceof Error ? err : new Error('Failed to update subject');
    }
  }, []);

  // Delete a subject
  const deleteSubject = useCallback(async (subjectId: string): Promise<void> => {
    try {
      const db = await getDb();
      
      // Check if subject exists
      const subject = await db.get(StoreNames.SUBJECTS, subjectId);
      if (!subject) {
        throw new Error(`Subject not found: ${subjectId}`);
      }
      
      // Delete subject
      await db.delete(StoreNames.SUBJECTS, subjectId);
      
      // Remove from local state
      setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== subjectId));
      
      // Note: We should also delete related chapters and materials in a transaction
      // That will be handled in a more comprehensive hook or service
    } catch (err) {
      console.error('Error deleting subject:', err);
      throw err instanceof Error ? err : new Error('Failed to delete subject');
    }
  }, []);

  // Get a subject by ID
  const getSubject = useCallback(async (subjectId: string): Promise<Subject | undefined> => {
    try {
      const db = await getDb();
      return await db.get(StoreNames.SUBJECTS, subjectId);
    } catch (err) {
      console.error('Error getting subject:', err);
      throw err instanceof Error ? err : new Error('Failed to get subject');
    }
  }, []);

  return {
    subjects,
    loading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getSubject
  };
}
