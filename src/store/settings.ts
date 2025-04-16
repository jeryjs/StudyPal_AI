import { DBStore, StoreNames } from '../db';

/**
 * Setting keys - enum of all available settings
 * This makes it easy to add new settings in a type-safe way
 */
export enum SettingKeys {
  THEME_NAME = 'theme_name',
  // Add more settings as needed:
}

/**
 * Settings store implementation
 * Extends the generic DBStore to provide type-safe access to settings
 */
class SettingsStore extends DBStore<any> {
  constructor() {
    super(StoreNames.SETTINGS);
  }

  /**
   * Get the currently selected theme name
   */
  async getTheme(): Promise<string | undefined> {
    return this.get(SettingKeys.THEME_NAME);
  }

  /**
   * Set the theme name
   */
  async setTheme(themeName: string): Promise<void> {
    await this.set(SettingKeys.THEME_NAME, themeName);
  }

  /**
   * Get a setting by key with strong typing
   */
  async getSetting<T>(key: SettingKeys): Promise<T | undefined> {
    return this.get(key) as Promise<T | undefined>;
  }

  /**
   * Set a setting with strong typing
   */
  async setSetting<T>(key: SettingKeys, value: T): Promise<void> {
    await this.set(key, value);
  }

  /**
   * Reset all settings to their defaults
   */
  async resetAll(): Promise<void> {
    await this.clear();
  }
}

// Create and export a singleton instance
export const settingsStore = new SettingsStore();

/**
 * Retrieves the saved theme name
 * @returns A promise that resolves with the theme name or undefined
 */
export async function getThemeSetting(): Promise<string | undefined> {
  return settingsStore.getTheme();
}

/**
 * Saves the selected theme name
 * @param themeName - The name of the theme to save
 * @returns A promise that resolves when the theme name is saved
 */
export async function setThemeSetting(themeName: string): Promise<void> {
  await settingsStore.setTheme(themeName);
}

// Export legacy functions to maintain backward compatibility
// So existing code doesn't need to be updated all at once
export async function getSettings(): Promise<Record<string, any>> {
  const keys = await settingsStore.getAllKeys();
  const result: Record<string, any> = {};
  
  for (const key of keys) {
    result[key] = await settingsStore.get(key);
  }
  
  return result;
}

export async function updateSettings(partialSettings: Record<string, any>): Promise<void> {
  for (const [key, value] of Object.entries(partialSettings)) {
    await settingsStore.set(key, value);
  }
}
