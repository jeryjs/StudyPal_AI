// src/services/ToolRegistry.ts
import { CopilotTool } from "@type/copilot.types";
// Use DEFAULT imports based on TS error suggestions
import settingsStore, { SettingKeys } from "@store/settingsStore";
// Import others if needed, assuming default exports
// import chaptersStore from "@store/chaptersStore";
// import materialsStore from "@store/materialsStore";
import { availableThemes } from "@contexts/ThemeContext";
import { FunctionCall, SchemaType as TYPE } from "@google/generative-ai";
import { chaptersStore } from "@store/chaptersStore";
import { materialsStore } from "@store/materialsStore";
import { subjectsStore } from "@store/subjectsStore";

/**
 * Central registry for all custom tools the AI can use.
 */
export const toolRegistry: CopilotTool[] = [
    // --- Settings Tools ---
    {
        name: "get_settings",
        description: "Retrieves all current application settings, including the active theme ID, custom theme JSON (if any), and API keys.",
        parameters: { type: TYPE.OBJECT, properties: {}, required: [] },
        execute: async () => {
            try {
                const allSettings = await settingsStore.getAllSettings();
                return allSettings;
            } catch (error) {
                console.error("Tool Error (get_settings):", error);
                return { error: "Failed to retrieve settings." };
            }
        },
    },
    {
        name: "set_settings",
        description: "Updates one or more application settings. Use this to change the active theme, update the custom theme, or set API keys. Always first call get_settings to get the current settings and their types.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                settings: {
                    type: TYPE.ARRAY,
                    description: "An array of setting objects to update.",
                    items: {
                        type: TYPE.OBJECT,
                        properties: {
                            key: {
                                type: TYPE.STRING,
                                format: "enum",
                                enum: Object.values(SettingKeys) as string[],
                                description: "The setting key to update."
                            },
                            value: {
                                type: TYPE.STRING,
                                description: "The new value for the setting, can be a string, number, boolean, map, etc, depending on the setting as a valid JSON string (similar to generated with JSON.stringify(value). Eg: if want to set gemini_api_key, then the response should be `'\"Asx....xxx\"'` (note the extra quotes indicating that its json)).",
                            }
                        },
                        required: ["key", "value"]
                    }
                }
            },
            required: ["settings"],
        },
        execute: async ({ settings }: { settings: Array<{ key: SettingKeys, value: any }> }) => {
            if (!Array.isArray(settings) || settings.length === 0) {
                return { success: false, message: "Invalid input: 'settings' must be a non-empty array." };
            }
            try {
                const parsedSettings = settings.map(s => ({ key: s.key, value: JSON.parse(s.value) }));
                await settingsStore.setMultipleSettings(parsedSettings);
                return { success: true, message: `Settings updated successfully.` };
            } catch (error) {
                console.error("Tool Error (set_settings):", error);
                return { success: false, message: `Failed to update settings.` };
            }
        },
    },
    {
        name: "get_available_themes",
        description: "Retrieves the definitions of all available standard themes and the currently saved custom theme (if one exists). Provides context for generating a new custom theme (id is always 'custom' for generated themes). If need to generate/update a theme, always first call this tool to get the syntax for defining a theme.",
        parameters: { type: TYPE.OBJECT, properties: {}, required: [] },
        execute: async () => {
            try {
                const customTheme = await settingsStore.customTheme;
                return {
                    activeThemeId: await settingsStore.activeTheme, // The ID of the currently active theme
                    standardThemes: availableThemes, // Array of standard AppTheme objects
                    customTheme: customTheme || null // The stored custom AppTheme object or null
                };
            } catch (error) {
                console.error("Tool Error (get_available_themes):", error);
                return { error: "Failed to retrieve theme definitions." };
            }
        },
    },

    // --- Subject Related Tools ---
    {
        name: "list_subjects",
        description: "Retrieves a list of all subjects the user has created.",
        parameters: { type: TYPE.OBJECT, properties: {}, required: [] },
        execute: async () => {
            try {
                const subjects = await subjectsStore.getAllSubjects();
                return { subjects: subjects.map(s => ({ id: s.id, name: s.name, categories: s.categories, sizeBytes: s.size })) };
            } catch (error) {
                console.error("Tool Error (list_subjects):", error);
                return { error: "Failed to retrieve subjects." };
            }
        },
    },
    {
        name: "get_subject_chapters",
        description: "Retrieves the chapters of a specific subject by ID.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                id: { type: TYPE.STRING, description: "The ID of the subject to retrieve chapters for." },
            },
            required: ["id"],
        },
        execute: async ({ id }: { id: string }) => {
            try {
                const chapters = await chaptersStore.getChaptersBySubject(id);
                if (!chapters || chapters.length === 0) return { error: "No chapters found for the specified subject." };
                return { chapters: chapters.map(c => ({ id: c.id, name: c.name, number: c.number, sizeBytes: c.size })) };
            } catch (error) {
                console.error("Tool Error (get_subject_chapters):", error);
                return { error: "Failed to retrieve subject chapters." };
            }
        }
    },
    {
        name: "get_chapter_materials",
        description: "Retrieves the materials of a specific chapter by ID.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                id: { type: TYPE.STRING, description: "The ID of the chapter to retrieve materials for." },
            },
            required: ["id"],
        },
        execute: async ({ id }: { id: string }) => {
            try {
                const materials = await materialsStore.getMaterialsByChapter(id);
                if (!materials || materials.length === 0) return { error: "No materials found for the specified chapter." };
                return { materials: materials.map(m => ({ id: m.id, name: m.name, type: m.type, sizeBytes: m.size })) };
            } catch (error) {
                console.error("Tool Error (get_chapter_materials):", error);
                return { error: "Failed to retrieve chapter materials." };
            }
        }
    },
];

/**
 * Finds and executes a tool based on a function call from the AI.
 * @param functionCall The function call object (contains name and args).
 * @returns A promise resolving to the result to be sent back to the AI.
 */
// Use the imported FunctionCall type for better type safety
export const executeTool = async (functionCall: FunctionCall): Promise<any> => {
    const tool = toolRegistry.find(t => t.name === functionCall.name);
    if (!tool) {
        console.warn(`Tool '${functionCall.name}' not found in registry.`);
        return { error: `Tool '${functionCall.name}' not found.` };
    }
    try {
        console.log(`Executing tool: ${tool.name} with args:`, functionCall.args);
        // Ensure args are passed correctly, functionCall.args should match tool.parameters schema
        const result = await tool.execute(functionCall.args);
        console.log(`Tool '${tool.name}' result:`, result);
        // Return the raw result directly. The Gemini library handles serialization.
        return result ?? {}; // Return empty object if result is null/undefined
    } catch (error) {
        console.error(`Error executing tool '${tool.name}':`, error);
        return { error: `Error during tool execution: ${error instanceof Error ? error.message : String(error)}` };
    }
};
