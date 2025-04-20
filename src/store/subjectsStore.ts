import { DBStore } from '@db';
import { Subject, SyncStatus, StoreNames } from '@type/db.types';
import { generateColorFromString } from '@utils/utils';
import slugify from '@utils/Slugify';

/**
 * Subjects store implementation
 * Extends the generic DBStore to provide type-safe access to subjects
 */
class SubjectsStore extends DBStore<Subject> {
  constructor() {
    super(StoreNames.SUBJECTS);
  }

  /**
   * Get all subjects
   * @returns Promise that resolves with all subjects
   */
  async getAllSubjects(): Promise<Subject[]> {
    return this.getAll();
  }

  /**
   * Create a new subject
   * @param name - The subject name
   * @param categories - Optional categories for the subject
   * @returns The created subject
   */
  async createSubject(name: string, categories: string[] = []): Promise<Subject> {
    const timestamp = Date.now();
    const id = slugify(name, true); // Using slugify with unique=true
    const color = generateColorFromString(name);
    
    const newSubject: Subject = {
      id,
      name,
      color,
      categories,
      createdAt: timestamp,
      lastModified: timestamp,
      syncStatus: SyncStatus.PENDING
    };
    
    await this.put(newSubject); // Use put(value) instead of set(key, value)
    return newSubject;
  }

  /**
   * Update an existing subject
   * @param subject - The updated subject data
   * @returns The updated subject
   */
  async updateSubject(subject: Partial<Subject> & { id: string }): Promise<Subject> {
    const existingSubject = await this.get(subject.id);
    if (!existingSubject) {
      throw new Error(`Subject not found: ${subject.id}`);
    }
    
    const updatedSubject: Subject = {
      ...existingSubject,
      ...subject,
      lastModified: Date.now(),
      syncStatus: SyncStatus.PENDING
    };
    
    await this.put(updatedSubject); // Use put(value) instead of set(key, value)
    return updatedSubject;
  }

  /**
   * Delete a subject
   * @param id - The subject ID to delete
   */
  async deleteSubject(id: string): Promise<void> {
    await this.delete(id);
  }

  /**
   * Get a subject by ID
   * @param id - The subject ID
   * @returns The subject or undefined if not found
   */
  async getSubjectById(id: string): Promise<Subject | undefined> {
    return this.get(id);
  }

  /**
   * Get subjects by category
   * @param category - The category to filter by
   * @returns Subjects that have the specified category
   */
  async getSubjectsByCategory(category: string): Promise<Subject[]> {
    const allSubjects = await this.getAll();
    return allSubjects.filter(subject => 
      subject.categories && subject.categories.includes(category)
    );
  }

  /**
   * Get all unique categories from all subjects
   * @returns Array of unique category strings
   */
  async getAllCategories(): Promise<string[]> {
    const allSubjects = await this.getAll();
    const categoriesSet = new Set<string>();
    
    allSubjects.forEach(subject => {
      if (subject.categories) {
        subject.categories.forEach(category => categoriesSet.add(category));
      }
    });
    
    return Array.from(categoriesSet).sort();
  }

  /**
   * Get subjects that need to be synced
   * @returns Array of subjects with pending sync status
   */
  async getPendingSubjects(): Promise<Subject[]> {
    const allSubjects = await this.getAll();
    return allSubjects.filter(subject => subject.syncStatus === SyncStatus.PENDING);
  }
}

// Create and export a singleton instance
export const subjectsStore = new SubjectsStore();
