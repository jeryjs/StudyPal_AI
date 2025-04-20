import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@db';
import { Material, MaterialType, StoreNames, SyncStatus } from '@type/db.types';

/**
 * Hook for managing materials in the database
 */
export function useMaterials(chapterId?: string) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch materials for a specific chapter or all materials
  const fetchMaterials = useCallback(async (targetChapterId?: string) => {
    setLoading(true);
    try {
      const db = await getDb();
      const chapterToQuery = targetChapterId || chapterId;
      
      let materialsList: Material[];
      
      if (chapterToQuery) {
        // Get materials for specific chapter using the index
        materialsList = await db.getAllFromIndex(
          StoreNames.MATERIALS, 
          'by-chapter', 
          chapterToQuery
        );
      } else {
        // Get all materials if no chapter ID provided
        materialsList = await db.getAll(StoreNames.MATERIALS);
      }
      
      setMaterials(materialsList);
      setError(null);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch materials'));
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  // Load materials on mount or when chapterId changes
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials, chapterId]);

  // Create a new material
  const createMaterial = useCallback(async (
    name: string, 
    type: MaterialType, 
    content?: string | Blob,
    contentUrl?: string,
    targetChapterId?: string
  ): Promise<Material> => {
    try {
      const timestamp = Date.now();
      const chapterToUse = targetChapterId || chapterId;
      
      if (!chapterToUse) {
        throw new Error('Chapter ID is required to create a material');
      }
      
      // Use UUID for material IDs as requested
      const id = uuidv4();
      
      const newMaterial: Material = {
        id,
        name,
        chapterId: chapterToUse,
        type,
        content,
        contentUrl,
        createdAt: timestamp,
        lastModified: timestamp,
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      const db = await getDb();
      await db.put(StoreNames.MATERIALS, newMaterial);
      
      // Update local state if this belongs to our current chapter
      if (chapterToUse === chapterId) {
        setMaterials(prevMaterials => [...prevMaterials, newMaterial]);
      }
      
      return newMaterial;
    } catch (err) {
      console.error('Error creating material:', err);
      throw err instanceof Error ? err : new Error('Failed to create material');
    }
  }, [chapterId]);

  // Update an existing material
  const updateMaterial = useCallback(async (updatedMaterial: Material): Promise<Material> => {
    try {
      const db = await getDb();
      
      // Get the current material to merge with updates
      const existingMaterial = await db.get(StoreNames.MATERIALS, updatedMaterial.id);
      if (!existingMaterial) {
        throw new Error(`Material not found: ${updatedMaterial.id}`);
      }
      
      // Update timestamp and sync status
      const mergedMaterial: Material = {
        ...existingMaterial,
        ...updatedMaterial,
        lastModified: Date.now(),
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      await db.put(StoreNames.MATERIALS, mergedMaterial);
      
      // Update local state if this belongs to our current chapter
      if (mergedMaterial.chapterId === chapterId) {
        setMaterials(prevMaterials => 
          prevMaterials.map(m => m.id === mergedMaterial.id ? mergedMaterial : m)
        );
      }
      
      return mergedMaterial;
    } catch (err) {
      console.error('Error updating material:', err);
      throw err instanceof Error ? err : new Error('Failed to update material');
    }
  }, [chapterId]);

  // Delete a material
  const deleteMaterial = useCallback(async (materialId: string): Promise<void> => {
    try {
      const db = await getDb();
      
      // Check if material exists
      const material = await db.get(StoreNames.MATERIALS, materialId);
      if (!material) {
        throw new Error(`Material not found: ${materialId}`);
      }
      
      // Delete material
      await db.delete(StoreNames.MATERIALS, materialId);
      
      // Remove from local state
      setMaterials(prevMaterials => prevMaterials.filter(m => m.id !== materialId));
    } catch (err) {
      console.error('Error deleting material:', err);
      throw err instanceof Error ? err : new Error('Failed to delete material');
    }
  }, []);

  // Get a material by ID
  const getMaterial = useCallback(async (materialId: string): Promise<Material | undefined> => {
    try {
      const db = await getDb();
      return await db.get(StoreNames.MATERIALS, materialId);
    } catch (err) {
      console.error('Error getting material:', err);
      throw err instanceof Error ? err : new Error('Failed to get material');
    }
  }, []);

  // Move a material to a different chapter
  const moveMaterial = useCallback(async (materialId: string, newChapterId: string): Promise<Material> => {
    try {
      const db = await getDb();
      
      // Get the current material
      const material = await db.get(StoreNames.MATERIALS, materialId);
      if (!material) {
        throw new Error(`Material not found: ${materialId}`);
      }
      
      // Update the material with new chapter ID
      const updatedMaterial: Material = {
        ...material,
        chapterId: newChapterId,
        lastModified: Date.now(),
        syncStatus: SyncStatus.PENDING // Mark as needing sync
      };
      
      await db.put(StoreNames.MATERIALS, updatedMaterial);
      
      // Update local state - remove from our list if it's moved to a different chapter
      if (chapterId && chapterId !== newChapterId) {
        setMaterials(prevMaterials => prevMaterials.filter(m => m.id !== materialId));
      } else if (chapterId && chapterId === newChapterId) {
        // Update the material in our list if it's moved to our current chapter
        setMaterials(prevMaterials => 
          prevMaterials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m)
        );
      }
      
      return updatedMaterial;
    } catch (err) {
      console.error('Error moving material:', err);
      throw err instanceof Error ? err : new Error('Failed to move material');
    }
  }, [chapterId]);

  // Get materials with pending sync status
  const getPendingMaterials = useCallback(async (): Promise<Material[]> => {
    try {
      const db = await getDb();
      return await db.getAllFromIndex(
        StoreNames.MATERIALS, 
        'by-syncStatus', 
        SyncStatus.PENDING
      );
    } catch (err) {
      console.error('Error getting pending materials:', err);
      throw err instanceof Error ? err : new Error('Failed to get pending materials');
    }
  }, []);

  return {
    materials,
    loading,
    error,
    fetchMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterial,
    moveMaterial,
    getPendingMaterials
  };
}
