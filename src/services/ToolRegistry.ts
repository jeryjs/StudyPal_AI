/**
 * Tool Registry - Central registry for all AI Copilot tools
 * 
 * This module defines all available tools that the Gemini AI can use to interact
 * with the Study Pal application. Tools enable the AI to:
 * - Retrieve and manipulate study materials
 * - Manage application settings
 * - Search for content
 * - Perform web searches and fetch external URLs
 * 
 * Each tool includes:
 * - name: Unique identifier for the tool
 * - description: What the tool does (used by AI to decide when to call it)
 * - parameters: JSON schema defining the expected parameters
 * - execute: Async function that performs the actual operation
 */

import { availableThemes } from "@contexts/ThemeContext";
import { FunctionCall, SchemaType as TYPE } from "@google/generative-ai";
import { chaptersStore } from "@store/chaptersStore";
import { materialsStore } from "@store/materialsStore";
import settingsStore, { SettingKeys } from "@store/settingsStore";
import { subjectsStore } from "@store/subjectsStore";
import { CopilotTool } from "@type/copilot.types";
import { blobToBase64 } from "@utils/utils";

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
                let parsedSettings = settings;
                try { parsedSettings = settings.map(s => ({ key: s.key, value: JSON.parse(s.value) })) } catch (error) {/* ignore error parsing the settings */ }
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
        description: "Retrieves the definitions of all available themes along with the currently saved custom theme (if it exists). Provides reference context for generating a new custom theme (id is always 'custom' for generated themes). If need to generate/update a theme, always first call this tool to get the syntax for defining a theme.",
        parameters: { type: TYPE.OBJECT, properties: {}, required: [] },
        execute: async () => {
            try {
                return {
                    activeThemeId: await settingsStore.activeTheme,
                    availableThemes: availableThemes,
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
    {
        name: "get_material_content",
        description: "Retrieves the full content of a specific material by ID. Use this to read the actual content of notes, files, or links.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                id: { type: TYPE.STRING, description: "The ID of the material to retrieve content for." },
            },
            required: ["id"],
        },
        execute: async ({ id }: { id: string }) => {
            try {
                const material = await materialsStore.get(id);
                if (!material) return { error: "Material not found." };
                
                // Extract content based on type
                let contentText = "";
                if (material.content) {
                    if (typeof material.content.data === 'string') {
                        contentText = material.content.data;
                    } else if (material.content.data instanceof Blob) {
                        // For binary content, we can't return it directly, so return metadata
                        contentText = `[Binary content - ${material.content.mimeType}, ${material.size} bytes]`;
                    }
                }
                
                return {
                    id: material.id,
                    name: material.name,
                    type: material.type,
                    content: contentText,
                    sourceRef: material.sourceRef,
                    progress: material.progress,
                    sizeBytes: material.size,
                    mimeType: material.content?.mimeType
                };
            } catch (error) {
                console.error("Tool Error (get_material_content):", error);
                return { error: "Failed to retrieve material content." };
            }
        }
    },
    {
        name: "search_materials",
        description: "Searches for materials by name or content. Useful for finding specific materials across all chapters.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                query: { type: TYPE.STRING, description: "Search query to match against material names and content." },
                chapterId: { type: TYPE.STRING, description: "Optional chapter ID to limit search to a specific chapter." },
            },
            required: ["query"],
        },
        execute: async ({ query, chapterId }: { query: string, chapterId?: string }) => {
            try {
                const allMaterials = chapterId 
                    ? await materialsStore.getMaterialsByChapter(chapterId)
                    : await materialsStore.getAllMaterials();
                
                const searchLower = query.toLowerCase();
                const matches = allMaterials.filter(m => {
                    // Search in name
                    if (m.name.toLowerCase().includes(searchLower)) return true;
                    
                    // Search in content (if it's text)
                    if (m.content && typeof m.content.data === 'string') {
                        return m.content.data.toLowerCase().includes(searchLower);
                    }
                    
                    return false;
                });
                
                return {
                    query,
                    matchCount: matches.length,
                    matches: matches.map(m => ({
                        id: m.id,
                        name: m.name,
                        type: m.type,
                        chapterId: m.chapterId,
                        sizeBytes: m.size
                    }))
                };
            } catch (error) {
                console.error("Tool Error (search_materials):", error);
                return { error: "Failed to search materials." };
            }
        }
    },
    {
        name: "create_material",
        description: "Creates a new material (note, link, etc.) in a specific chapter. Use this when the user wants to save information or create notes.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                chapterId: { type: TYPE.STRING, description: "The ID of the chapter to create the material in." },
                name: { type: TYPE.STRING, description: "Name/title of the material." },
                type: { type: TYPE.STRING, enum: ["text", "link", "file", "pdf", "image", "video", "audio"], format: "enum", description: "Type of material." },
                content: { type: TYPE.STRING, description: "Content of the material (text content for notes, URL for links)." },
                sourceRef: { type: TYPE.STRING, description: "Optional reference/source URL." },
            },
            required: ["chapterId", "name", "type", "content"],
        },
        execute: async ({ chapterId, name, type, content, sourceRef }: { chapterId: string, name: string, type: string, content: string, sourceRef?: string }) => {
            try {
                // Validate chapter exists
                const chapter = await chaptersStore.get(chapterId);
                if (!chapter) return { error: "Chapter not found." };
                
                // Determine mime type based on material type
                let mimeType = 'text/plain';
                if (type === 'link') mimeType = 'text/uri-list';
                
                const newMaterial = await materialsStore.createMaterial(
                    name,
                    chapterId,
                    type as any, // MaterialType enum
                    { mimeType, data: content },
                    sourceRef || undefined,
                    0 // Initial progress
                );
                
                return {
                    success: true,
                    message: `Material "${name}" created successfully.`,
                    materialId: newMaterial.id,
                    material: {
                        id: newMaterial.id,
                        name: newMaterial.name,
                        type: newMaterial.type,
                        chapterId: newMaterial.chapterId
                    }
                };
            } catch (error) {
                console.error("Tool Error (create_material):", error);
                return { success: false, error: "Failed to create material." };
            }
        }
    },
    {
        name: "update_material",
        description: "Updates an existing material's content, name, or other properties.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                id: { type: TYPE.STRING, description: "The ID of the material to update." },
                name: { type: TYPE.STRING, description: "New name for the material (optional)." },
                content: { type: TYPE.STRING, description: "New content for the material (optional)." },
                progress: { type: TYPE.NUMBER, description: "New progress value 0-100 (optional)." },
                sourceRef: { type: TYPE.STRING, description: "New source reference (optional)." },
            },
            required: ["id"],
        },
        execute: async ({ id, name, content, progress, sourceRef }: { id: string, name?: string, content?: string, progress?: number, sourceRef?: string }) => {
            try {
                const existingMaterial = await materialsStore.get(id);
                if (!existingMaterial) return { error: "Material not found." };
                
                const updates: any = { id };
                if (name !== undefined) updates.name = name;
                if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, progress));
                if (sourceRef !== undefined) updates.sourceRef = sourceRef;
                
                if (content !== undefined && existingMaterial.content) {
                    updates.content = {
                        mimeType: existingMaterial.content.mimeType,
                        data: content
                    };
                }
                
                const updated = await materialsStore.updateMaterial(updates);
                
                return {
                    success: true,
                    message: `Material "${updated.name}" updated successfully.`,
                    material: {
                        id: updated.id,
                        name: updated.name,
                        type: updated.type,
                        progress: updated.progress
                    }
                };
            } catch (error) {
                console.error("Tool Error (update_material):", error);
                return { success: false, error: "Failed to update material." };
            }
        }
    },
    {
        name: "get_subject_details",
        description: "Retrieves detailed information about a specific subject including its metadata.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                id: { type: TYPE.STRING, description: "The ID of the subject to retrieve." },
            },
            required: ["id"],
        },
        execute: async ({ id }: { id: string }) => {
            try {
                const subject = await subjectsStore.get(id);
                if (!subject) return { error: "Subject not found." };
                
                // Get chapter count for this subject
                const chapters = await chaptersStore.getChaptersBySubject(id);
                
                return {
                    id: subject.id,
                    name: subject.name,
                    color: subject.color,
                    icon: subject.icon,
                    categories: subject.categories,
                    chapterCount: chapters.length,
                    sizeBytes: subject.size,
                    createdAt: subject.createdAt,
                    lastModified: subject.lastModified
                };
            } catch (error) {
                console.error("Tool Error (get_subject_details):", error);
                return { error: "Failed to retrieve subject details." };
            }
        }
    },
    {
        name: "get_chapter_details",
        description: "Retrieves detailed information about a specific chapter including its metadata.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                id: { type: TYPE.STRING, description: "The ID of the chapter to retrieve." },
            },
            required: ["id"],
        },
        execute: async ({ id }: { id: string }) => {
            try {
                const chapter = await chaptersStore.get(id);
                if (!chapter) return { error: "Chapter not found." };
                
                // Get material count for this chapter
                const materials = await materialsStore.getMaterialsByChapter(id);
                
                return {
                    id: chapter.id,
                    name: chapter.name,
                    number: chapter.number,
                    subjectId: chapter.subjectId,
                    materialCount: materials.length,
                    sizeBytes: chapter.size,
                    createdAt: chapter.createdAt,
                    lastModified: chapter.lastModified
                };
            } catch (error) {
                console.error("Tool Error (get_chapter_details):", error);
                return { error: "Failed to retrieve chapter details." };
            }
        }
    },

    // --- Miscellaneous Tools ---
    {
        name: "web_search",
        description: "Performs a web search using the provided query and returns result from duckduckgo's instant answer API.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                query: { type: TYPE.STRING, description: "The search query in concise natural language." },
            },
            required: ["query"],
        },
        execute: async ({ query }: { query: string }) => {
            // Use a free, API-keyless search engine like DuckDuckGo's instant answer API
            try {
                const data = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`).then(r => r.json());
                return { ...data };
            } catch (error) {
                console.error("Web search failed:", error);
                return { error: `Web search failed: ${error instanceof Error ? error.message : String(error)}` };
            }
        }
    },
    {
        name: "fetch_url",
        description: "Fetches the content of a URL and parses it.",
        parameters: {
            type: TYPE.OBJECT,
            properties: {
                url: { type: TYPE.STRING, description: "The URL of the web page to fetch." },
                parseAs: { type: TYPE.STRING, enum: ["text", "json", "html", "image"], format: "enum", description: "The format to parse the response as. (default: text (extracts all textContent))" },
            },
            required: ["url"],
        },
        execute: async ({ url, parseAs = "text" }: { url: string, parseAs?: string }) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                let data;
                switch (parseAs) {
                    case "json": data = await response.json(); break;
                    case "html": data = await response.text(); break;
                    case "image": data = await response.blob().then(blobToBase64); break;
                    default: data = await (new DOMParser()).parseFromString(await response.text(), "text/html").body.textContent; break;
                }
                return { ...data || data };
            } catch (error) {
                console.error("Fetch URL failed:", error);
                return { error: `Fetch URL failed: ${error instanceof Error ? error.message : String(error)}` };
            }
        }
    }
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
