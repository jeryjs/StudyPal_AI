import { useState, useEffect, useCallback } from 'react';
import { Material, MaterialType } from '@type/db.types';
import { materialsStore } from '@store/materialsStore';

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
      const chapterToQuery = targetChapterId || chapterId;
      
      let materialsList: Material[];
      
      if (chapterToQuery) {
        // Get materials for specific chapter
        materialsList = await materialsStore.getMaterialsByChapter(chapterToQuery);
      } else {
        // Get all materials if no chapter ID provided
        materialsList = await materialsStore.getAllMaterials();
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
    targetChapterId?: string,
    progress: number = 0,
    size?: number // Add size parameter
  ): Promise<Material> => {
    try {
      const chapterToUse = targetChapterId || chapterId;
      
      if (!chapterToUse) {
        throw new Error('Chapter ID is required to create a material');
      }
      
      // Create the material
      const newMaterial = await materialsStore.createMaterial(
        name, 
        type, 
        chapterToUse, 
        content, 
        contentUrl,
        progress,
        size // Pass size to the store method
      );
      
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
  const updateMaterial = useCallback(async (updatedMaterial: Partial<Material> & { id: string }): Promise<Material> => {
    try {
      // Update the material
      const mergedMaterial = await materialsStore.updateMaterial(updatedMaterial);
      
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
      // Delete the material
      await materialsStore.deleteMaterial(materialId);
      
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
      return await materialsStore.getMaterialById(materialId);
    } catch (err) {
      console.error('Error getting material:', err);
      throw err instanceof Error ? err : new Error('Failed to get material');
    }
  }, []);

  // Move a material to a different chapter
  const moveMaterial = useCallback(async (materialId: string, newChapterId: string): Promise<Material> => {
    try {
      // Move the material
      const updatedMaterial = await materialsStore.moveMaterial(materialId, newChapterId);
      
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
      return await materialsStore.getPendingMaterials();
    } catch (err) {
      console.error('Error getting pending materials:', err);
      throw err instanceof Error ? err : new Error('Failed to get pending materials');
    }
  }, []);

  // Update material progress
  const updateProgress = useCallback(async (materialId: string, progress: number): Promise<Material> => {
    try {
      // Update the material progress
      const updatedMaterial = await materialsStore.updateProgress(materialId, progress);
      
      // Update local state if this belongs to our current chapter
      if (updatedMaterial.chapterId === chapterId) {
        setMaterials(prevMaterials => 
          prevMaterials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m)
        );
      }
      
      return updatedMaterial;
    } catch (err) {
      console.error('Error updating material progress:', err);
      throw err instanceof Error ? err : new Error('Failed to update material progress');
    }
  }, [chapterId]);

  // Get materials by type
  const getMaterialsByType = useCallback(async (type: MaterialType): Promise<Material[]> => {
    try {
      return await materialsStore.getMaterialsByType(type);
    } catch (err) {
      console.error('Error getting materials by type:', err);
      throw err instanceof Error ? err : new Error('Failed to get materials by type');
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
    getPendingMaterials,
    updateProgress,
    getMaterialsByType
  };
}
