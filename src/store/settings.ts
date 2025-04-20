// filepath: y:\All-Projects\Study-Pal\src\store\settings.ts
import { DBStore } from '@db';
import { StoreNames } from '@type/db.types';

/**
 * Setting keys - enum of all available settings
 * This makes it easy to add new settings in a type-safe way
 */
export enum SettingKeys {
  ACTIVE_THEME = 'active_theme',
  GEMINI_API_KEY = 'gemini_api_key',
}

/**
 * Settings store implementation
 * Extends the generic DBStore to provide type-safe access to settings
 */
class SettingsStore extends DBStore<any> {
    constructor() {
        super(StoreNames.SETTINGS);
    }

    // Active Theme Setting
    get activeTheme(): Promise<string | undefined> {
        return this.get(SettingKeys.ACTIVE_THEME);
    }

    set activeTheme(value: string) {
        this.set(SettingKeys.ACTIVE_THEME, value);
    }

    // Gemini API Key Setting
    get geminiApiKey(): Promise<string | undefined> {
        return this.get(SettingKeys.GEMINI_API_KEY);
    }

    set geminiApiKey(value: string) {
        this.set(SettingKeys.GEMINI_API_KEY, value);
    }

    /**
     * Reset all settings to their defaults
     */
    async resetAll(): Promise<void> {
        await this.clear();
    }
}

// Create and export a singleton instance
const settingsStore = new SettingsStore();
export default settingsStore;
