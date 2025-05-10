import { AppTheme } from '@contexts/ThemeContext';
import { DBStore } from '@db';
import { StoreNames } from '@type/db.types';
import mitt, { Emitter } from 'mitt';

/**
 * Setting keys - enum of all available settings
 * This makes it easy to add new settings in a type-safe way
 */
export enum SettingKeys {
    ACTIVE_THEME = 'active_theme',
    CUSTOM_THEME = 'custom_theme',
    GEMINI_API_KEY = 'gemini_api_key',
}

// Event types for the emitter: { [SettingKey]: NewValue | undefined }
// Using 'any' for simplicity, but specific types are better practice
type SettingsEvents = {
    [key in SettingKeys]: any | undefined;
};

/**
 * Settings store implementation
 * Extends the generic DBStore to provide type-safe access to settings
 */
class SettingsStore extends DBStore<any> {
    private emitter: Emitter<SettingsEvents>; // Emitter instance

    constructor() {
        super(StoreNames.SETTINGS);
        this.emitter = mitt<SettingsEvents>(); // Initialize emitter
    }

    // --- Settings Access Methods ---

    // Active Theme Setting
    get activeTheme(): Promise<string> { return this.get(SettingKeys.ACTIVE_THEME) }
    set activeTheme(value: string) { this.set(SettingKeys.ACTIVE_THEME, value) }

    // Custom Theme Setting
    get customTheme(): Promise<AppTheme> { return this.get(SettingKeys.CUSTOM_THEME); }
    set customTheme(value: AppTheme) { this.set(SettingKeys.CUSTOM_THEME, value); }

    // Gemini API Key Setting
    get geminiApiKey(): Promise<string> { return this.get(SettingKeys.GEMINI_API_KEY) }
    set geminiApiKey(value: string) { this.set(SettingKeys.GEMINI_API_KEY, value) }


    // --- Override DBStore methods to emit events ---

    async set(key: string, value: any): Promise<void> {
        await super.set(key, value);
        // Check if the key is a valid SettingKeys member before emitting
        if (Object.values(SettingKeys).includes(key as SettingKeys)) {
            this.emitter.emit(key as SettingKeys, value);
            console.log(`SettingsStore: Emitted change for key '${key}'`);
        }
    }

    async clear(): Promise<void> {
        // Get keys before clearing - assuming DBStore has a method like getAllKeys()
        // If not, this part might need adjustment based on DBStore's capabilities
        let keysToEmit: SettingKeys[] = [];
        try {
            const allKeys = await this.getAllKeys(); // Use base class method if available
            keysToEmit = allKeys.filter(k => Object.values(SettingKeys).includes(k as SettingKeys)) as SettingKeys[];
        } catch (e) {
            console.warn("SettingsStore: Could not get keys before clear. Emission on clear might be incomplete.", e);
            // Fallback: emit undefined for all known SettingKeys
            keysToEmit = Object.values(SettingKeys);
        }

        await super.clear();

        // Emit undefined for all relevant keys after clearing
        keysToEmit.forEach(key => {
            this.emitter.emit(key, undefined);
            console.log(`SettingsStore: Emitted clear for key '${key}'`);
        });
    }

    // --- Event Listener Methods ---

    /**
     * Register a listener for changes to a specific setting key.
     * @param key The SettingKeys key to listen for.
     * @param listener The callback function to execute when the setting changes.
     *                 Receives the new value (or undefined if deleted/cleared).
     */
    onChange<K extends SettingKeys>(key: K, listener: (value: any | undefined) => void): void {
        this.emitter.on(key, listener);
    }

    /**
     * Unregister a listener for a specific setting key.
     * @param key The SettingKeys key to stop listening to.
     * @param listener The callback function to remove.
     */
    offChange<K extends SettingKeys>(key: K, listener: (value: any | undefined) => void): void {
        this.emitter.off(key, listener);
    }


    /**
     * Get all settings as an object.
     */
    async getAllSettings(): Promise<Record<string, any>> {
        const keys = Object.values(SettingKeys);
        const settings: Record<string, any> = {};
        for (const key of keys) {
            settings[key] = await this.get(key);
        }
        return settings;
    }

    /**
     * Set multiple settings from an object or array.
     * @param settings An array of { key: SettingKeys, value: any } or an object { [SettingKeys.KEY]: value }
     */
    async setMultipleSettings(settings: Array<{ key: SettingKeys, value: any }> | Record<string, any>): Promise<void> {
        if (Array.isArray(settings)) {
            for (const { key, value } of settings) {
                if (Object.values(SettingKeys).includes(key)) {
                    await this.set(key, value);
                } else {
                    console.warn(`Invalid setting key ignored: ${key}`);
                }
            }
        } else { // Handle object format
            for (const key in settings) {
                if (Object.values(SettingKeys).includes(key as SettingKeys)) {
                    await this.set(key as SettingKeys, settings[key]);
                } else {
                    console.warn(`Invalid setting key ignored: ${key}`);
                }
            }
        }
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
