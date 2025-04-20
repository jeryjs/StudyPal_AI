import { DBStore } from '@db';
import { Material, MaterialType, SyncStatus, StoreNames } from '@type/db.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Materials store implementation
 * Extends the generic DBStore to provide type-safe access to materials
 */
class MaterialsStore extends DBStore<Material> {
  constructor() {
    super(StoreNames.MATERIALS);
  }

  /**
   * Get all materials
   * @returns Promise that resolves with all materials
   */
  async getAllMaterials(): Promise<Material[]> {
    return this.getAll();
  }

  /**
   * Get materials for a specific chapter
   * @param chapterId - The chapter ID to get materials for
   * @returns Materials belonging to the specified chapter
   */
  async getMaterialsByChapter(chapterId: string): Promise<Material[]> {
    const allMaterials = await this.getAll();
    return allMaterials.filter(material => material.chapterId === chapterId);
  }

  /**
   * Create a new material
   * @param name - The material name
   * @param type - The material type
   * @param chapterId - The chapter ID this material belongs to
   * @param content - Optional content of the material
   * @param contentUrl - Optional URL for external resources
   * @param progress - Optional completion progress (0-100%)
   * @returns The created material
   */
  async createMaterial(
    name: string,
    type: MaterialType,
    chapterId: string,
    content?: string | Blob,
    contentUrl?: string,
    progress: number = 0,
    size?: number // Add size parameter
  ): Promise<Material> {
    const timestamp = Date.now();
    const id = uuidv4(); // Using UUID for material IDs
    
    const newMaterial: Material = {
      id,
      name,
      type,
      chapterId,
      content,
      contentUrl,
      progress,
      size, // Include size
      createdAt: timestamp,
      lastModified: timestamp,
      syncStatus: SyncStatus.PENDING
    };
    
    await this.put(newMaterial);
    return newMaterial;
  }

  /**
   * Update an existing material
   * @param material - The updated material data
   * @returns The updated material
   */
  async updateMaterial(material: Partial<Material> & { id: string }): Promise<Material> {
    const existingMaterial = await this.get(material.id);
    if (!existingMaterial) {
      throw new Error(`Material not found: ${material.id}`);
    }
    
    const updatedMaterial: Material = {
      ...existingMaterial,
      ...material,
      lastModified: Date.now(),
      // Ensure syncStatus is updated correctly, only set to PENDING if relevant fields changed
      syncStatus: existingMaterial.syncStatus === SyncStatus.SYNCED && (material.name !== existingMaterial.name || material.content !== existingMaterial.content) 
                  ? SyncStatus.PENDING 
                  : existingMaterial.syncStatus
    };
    
    await this.put(updatedMaterial); // Use put(value) instead of set(key, value)
    return updatedMaterial;
  }

  /**
   * Delete a material
   * @param id - The material ID to delete
   */
  async deleteMaterial(id: string): Promise<void> {
    await this.delete(id);
  }

  /**
   * Get a material by ID
   * @param id - The material ID
   * @returns The material or undefined if not found
   */
  async getMaterialById(id: string): Promise<Material | undefined> {
    return this.get(id);
  }

  /**
   * Move a material to a different chapter
   * @param materialId - The material ID to move
   * @param newChapterId - The new chapter ID
   * @returns The updated material
   */
  async moveMaterial(materialId: string, newChapterId: string): Promise<Material> {
    const material = await this.getMaterialById(materialId);
    if (!material) {
      throw new Error(`Material not found: ${materialId}`);
    }
    
    // Update the material with the new chapter ID
    const updatedMaterial: Material = {
      ...material,
      chapterId: newChapterId,
      lastModified: Date.now(),
      syncStatus: SyncStatus.PENDING
    };
    
    await this.set(materialId, updatedMaterial);
    return updatedMaterial;
  }

  /**
   * Update material progress
   * @param materialId - The material ID
   * @param progress - The new progress value (0-100%)
   * @returns The updated material
   */
  async updateProgress(materialId: string, progress: number): Promise<Material> {
    // Ensure progress is within valid range
    const validProgress = Math.max(0, Math.min(100, progress));
    
    return this.updateMaterial({
      id: materialId,
      progress: validProgress
    });
  }

  /**
   * Get materials by type
   * @param type - The material type to filter by
   * @returns Materials of the specified type
   */
  async getMaterialsByType(type: MaterialType): Promise<Material[]> {
    const allMaterials = await this.getAll();
    return allMaterials.filter(material => material.type === type);
  }

  /**
   * Get materials with pending sync status
   * @returns Array of materials with pending sync status
   */
  async getPendingMaterials(): Promise<Material[]> {
    const allMaterials = await this.getAll();
    return allMaterials.filter(material => material.syncStatus === SyncStatus.PENDING);
  }
  
  /**
   * Get all materials for a subject by traversing through chapters
   * @param subjectId - The subject ID
   * @param chaptersStore - The chapters store instance
   * @returns Materials belonging to all chapters of the specified subject
   */
  async getMaterialsBySubject(subjectId: string, chaptersStore: any): Promise<Material[]> {
    const chapters = await chaptersStore.getChaptersBySubject(subjectId);
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const allMaterials = await this.getAll();
    return allMaterials.filter(material => chapterIds.includes(material.chapterId));
  }
  
  /**
   * Calculate completion statistics and total size for a subject
   * @param subjectId - The subject ID 
   * @param chaptersStore - The chapters store instance
   * @returns Object with total materials, average progress, and total size in bytes
   */
  async getSubjectStats(subjectId: string, chaptersStore: any): Promise<{totalMaterials: number, averageProgress: number, totalSize: number}> {
    const materials = await this.getMaterialsBySubject(subjectId, chaptersStore);
    
    if (materials.length === 0) {
      return { totalMaterials: 0, averageProgress: 0, totalSize: 0 };
    }
    
    const totalProgress = materials.reduce((sum, material) => sum + (material.progress || 0), 0);
    const totalSize = materials.reduce((sum, material) => sum + (material.size || 0), 0); // Calculate total size
    
    return {
      totalMaterials: materials.length,
      averageProgress: totalProgress / materials.length,
      totalSize // Add totalSize to the return object
    };
  }
}

// Create and export a singleton instance
export const materialsStore = new MaterialsStore();
