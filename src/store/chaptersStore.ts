import { DBStore } from '@db';
import { Chapter, StoreNames, SyncStatus } from '@type/db.types';
import slugify from '@utils/Slugify';

/**
 * Chapters store implementation
 * Extends the generic DBStore to provide type-safe access to chapters
 */
class ChaptersStore extends DBStore<Chapter> {
  constructor() {
    super(StoreNames.CHAPTERS);
  }

  /**
   * Get all chapters
   * @returns Promise that resolves with all chapters
   */
  async getAllChapters(): Promise<Chapter[]> {
    return this.getAll();
  }

  /**
   * Get chapters for a specific subject
   * @param subjectId - The subject ID to get chapters for
   * @returns Chapters belonging to the specified subject
   */
  async getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
    const allChapters = await this.getAll();
    return allChapters.filter(chapter => chapter.subjectId === subjectId);
  }

  /**
   * Create a new chapter
   * @param name - The chapter name
   * @param subjectId - The subject ID this chapter belongs to
   * @param number - Optional chapter number for ordering
   * @returns The created chapter
   */
  async createChapter(name: string, subjectId: string, number?: number): Promise<Chapter> {
    const timestamp = Date.now();
    const id = slugify(`${name}-${number}`, true); // Using slugify with unique=true

    // If number isn't provided, calculate the next number by counting existing chapters
    let chapterNumber = number;
    if (chapterNumber === undefined) {
      const existingChapters = await this.getChaptersBySubject(subjectId);
      chapterNumber = existingChapters.length + 1;
    }

    const newChapter: Chapter = {
      id,
      name,
      subjectId,
      number: chapterNumber,
      createdAt: timestamp,
      lastModified: timestamp,
      syncStatus: SyncStatus.UPLOAD_PENDING
    };

    await this.put(newChapter); // Use put(value) instead of set(key, value)
    return newChapter;
  }

  /**
   * Update an existing chapter
   * @param chapter - The updated chapter data
   * @returns The updated chapter
   */
  async updateChapter(chapter: Partial<Chapter> & { id: string }): Promise<Chapter> {
    const existingChapter = await this.get(chapter.id);
    if (!existingChapter) {
      throw new Error(`Chapter not found: ${chapter.id}`);
    }

    const updatedChapter: Chapter = {
      ...existingChapter,
      ...chapter,
      lastModified: Date.now(),
      syncStatus: SyncStatus.UPLOAD_PENDING
    };

    await this.put(updatedChapter); // Use put(value) instead of set(key, value)
    return updatedChapter;
  }

  /**
   * Delete a chapter
   * @param id - The chapter ID to delete
   */
  async deleteChapter(id: string): Promise<void> {
    await this.delete(id);
  }

  /**
   * Get a chapter by ID
   * @param id - The chapter ID
   * @returns The chapter or undefined if not found
   */
  async getChapterById(id: string): Promise<Chapter | undefined> {
    return this.get(id);
  }

  /**
   * Move a chapter to a different subject
   * @param chapterId - The chapter ID to move
   * @param newSubjectId - The new subject ID
   * @returns The updated chapter
   */
  async moveChapter(chapterId: string, newSubjectId: string): Promise<Chapter> {
    const chapter = await this.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    // Update the chapter with the new subject ID
    const updatedChapter: Chapter = {
      ...chapter,
      subjectId: newSubjectId,
      lastModified: Date.now(),
      syncStatus: SyncStatus.UPLOAD_PENDING
    };

    await this.set(chapterId, updatedChapter);
    return updatedChapter;
  }

  /**
   * Reorder chapters within a subject
   * @param subjectId - The subject ID
   * @param newOrdering - Array of chapter IDs in the new order
   * @returns Array of updated chapters
   */
  async reorderChapters(subjectId: string, newOrdering: string[]): Promise<Chapter[]> {
    const chapters = await this.getChaptersBySubject(subjectId);

    // Create map of chapters by ID for quick lookup
    const chaptersMap = new Map(chapters.map(chapter => [chapter.id, chapter]));

    // Update chapter numbers based on the new ordering
    const updatedChapters: Chapter[] = [];

    for (let i = 0; i < newOrdering.length; i++) {
      const chapterId = newOrdering[i];
      const chapter = chaptersMap.get(chapterId);

      if (chapter) {
        const updatedChapter = await this.updateChapter({
          id: chapterId,
          number: i + 1
        });

        updatedChapters.push(updatedChapter);
      }
    }

    return updatedChapters;
  }

  /**
   * Get chapters that need to be synced
   * @returns Array of chapters with pending sync status
   */
  async getPendingChapters(): Promise<Chapter[]> {
    const allChapters = await this.getAll();
    return allChapters.filter(chapter => chapter.syncStatus === SyncStatus.UPLOAD_PENDING);
  }
}

// Create and export a singleton instance
export const chaptersStore = new ChaptersStore();
