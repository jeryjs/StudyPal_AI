import useCloudStorage from '@hooks/useCloudStorage';
import { materialsStore } from '@store/materialsStore';
import { Material, MaterialType, SyncStatus } from '@type/db.types';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for managing materials in the database
 */
export function useMaterials(chapterId?: string) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const cloud = useCloudStorage();

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

  // Load materials on mount or when chapterId/materials changes
  useEffect(() => {
    fetchMaterials();
    const handleDbChange = () => {
      console.log('Database changed, refetching materials...');
      fetchMaterials();
    };
    window.addEventListener('studypal-db-changed', handleDbChange);
    return () => window.removeEventListener('studypal-db-changed', handleDbChange);
  }, [chapterId, fetchMaterials]);

  // Create a new material
  const createMaterial = useCallback(async (
    name: Material['name'],
    type: Material['type'],
    content?: Material['content'],
    sourceRef?: Material['sourceRef'],
    targetChapterId?: Material['chapterId'],
    progress: Material['progress'] = 0,
    size?: Material['size']
  ): Promise<Material> => {
    setLoading(true);
    try {
      const chapterToUse = targetChapterId || chapterId;

      if (!chapterToUse) {
        throw new Error('Chapter ID is required to create a material');
      }

      // Create the material
      const newMaterial = await materialsStore.createMaterial(
        name, chapterToUse, type, content,
        sourceRef, progress, size,
      );

      return newMaterial;
    } catch (err: any) {
      setError(err);
      throw err instanceof Error ? err : new Error('Failed to create material');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  // Update an existing material
  const updateMaterial = useCallback(async (updatedMaterial: Partial<Material> & { id: string }): Promise<Material> => {
    try {
      const existingMaterial = await materialsStore.getMaterialById(updatedMaterial.id);
      if (!existingMaterial) throw new Error(`Material not found: ${updatedMaterial.id}`);

      updatedMaterial.syncStatus = existingMaterial.syncStatus === SyncStatus.UP_TO_DATE && (updatedMaterial.name !== existingMaterial.name || updatedMaterial.content !== existingMaterial.content)
        ? SyncStatus.UPLOAD_PENDING
        : existingMaterial.syncStatus;
      const mergedMaterial = await materialsStore.updateMaterial(updatedMaterial);

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
      await cloud.deleteFile((await getMaterial(materialId)).driveId);
      await materialsStore.deleteMaterial(materialId);

    } catch (err: any) {
      console.error('Error deleting material:', err);
      if (err.status === 404) return await materialsStore.deleteMaterial(materialId); // Ignore 404 errors for missing files
      throw err;
    }
  }, []);

  // Get a material by ID
  const getMaterial = useCallback(async (materialId: string): Promise<Material> => {
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

  // Get the content of a material from cloud storage if not cached
  const getMaterialContent = useCallback(async (materialId: string): Promise<Material['content'] | null> => {
    const material = await materialsStore.getMaterialById(materialId);
    if (!material) throw new Error(`Material not found: ${materialId}`);

    // Check if content is already cached or is not synced to cloud
    if (material.content?.data || material.type === MaterialType.LINK || !material.driveId) {
      return material.content;
    }

    // Fetch content from cloud storage if not cached
    if (material.content && !material.content.data) {
      // Retrieve the content from cloud storage
      const blob = await cloud.downloadFile(material.driveId);
      const content = { mimeType: blob.type, data: blob }

      // update the material in db with the new content
      const updatedMaterial = await materialsStore.cacheMaterialContent(materialId, content);
      setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));

      return content;
    }

    return material.content;
  }, [materials, setMaterials]);

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
    getMaterialsByType,
    getMaterialContent,
  };
}
