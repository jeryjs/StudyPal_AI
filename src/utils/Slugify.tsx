/**
 * Converts a string into a URL-friendly slug.
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Removes consecutive hyphens
 *
 * @param text - The string to convert to a slug
 * @param unique - Whether to add a unique hash to the end of the slug
 * @returns A URL-friendly slug string
 */
export default function slugify(text: string, unique: boolean = false): string {
    let slug = text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with hyphens
        .replace(/&/g, '-and-')      // Replace & with 'and'
        .replace(/[^\w\-]+/g, '')    // Remove all non-word characters except hyphens
        .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
        .replace(/^-+/, '')          // Trim hyphens from start
        .replace(/-+$/, '');         // Trim hyphens from end

    if (unique) {
        const hash = Math.random().toString(36).substring(2, 7);
        slug += '-' + hash;
    }

    return slug;
}