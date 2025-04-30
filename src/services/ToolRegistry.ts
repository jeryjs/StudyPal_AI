// src/services/ToolRegistry.ts
import { CopilotTool } from "../types/copilot.types";
// Use DEFAULT imports based on TS error suggestions
import settingsStore from "../store/settingsStore";
// Import others if needed, assuming default exports
// import chaptersStore from "../store/chaptersStore";
// import materialsStore from "../store/materialsStore";
import { FunctionCall } from "@google/generative-ai"; // Import FunctionCall type
import { useThemeContext } from "@contexts/ThemeContext";
import { subjectsStore } from "@store/subjectsStore";

/**
 * Central registry for all custom tools the AI can use.
 */
export const toolRegistry: CopilotTool[] = [
    {
        name: "get_current_theme",
        description: "Retrieves the current application theme setting ('light', 'dark', or 'system').",
        parameters: { type: "object", properties: {}, required: [] },
        execute: async () => {
            try {
                // Access property from default imported instance
                const theme = await settingsStore.activeTheme;
                return { currentTheme: theme || 'system' };
            } catch (error) {
                console.error("Tool Error (get_current_theme):", error);
                return { error: "Failed to retrieve theme setting." };
            }
        },
    },
    {
        name: "set_application_theme",
        description: "Sets the application's visual theme.",
        parameters: {
            type: "object",
            properties: {
                theme: { type: "string", enum: ['light', 'dark', 'system'], description: "The theme to set." },
            },
            required: ["theme"],
        },
        execute: async ({ theme }: { theme: 'light' | 'dark' | 'system' }) => {
            if (!['light', 'dark', 'system'].includes(theme)) {
                 return { success: false, message: `Invalid theme value: ${theme}.` };
            }
            try {
                // Call method from default imported instance
                useThemeContext().setTheme(theme);
                return { success: true, message: `Theme successfully set to ${theme}.` };
            } catch (error) {
                console.error("Tool Error (set_application_theme):", error);
                return { success: false, message: `Failed to set theme.` };
            }
        },
    },
    {
        name: "list_subjects",
        description: "Retrieves a list of all subjects the user has created.",
        parameters: { type: "object", properties: {}, required: [] },
        execute: async () => {
            try {
                // Call method from default imported instance
                const subjects = await subjectsStore.getAllSubjects();
                return { subjects: subjects.map(s => ({ id: s.id, name: s.name })) };
            } catch (error) {
                console.error("Tool Error (list_subjects):", error);
                return { error: "Failed to retrieve subjects." };
            }
        },
    },
    // --- Add more tools here ---
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
        try {
             // Ensure result is JSON serializable
             return JSON.parse(JSON.stringify(result ?? {}));
        } catch (stringifyError) {
             console.error(`Failed to stringify/parse result for tool '${tool.name}':`, stringifyError);
             return { error: `Tool execution resulted in a non-serializable object.` };
        }
    } catch (error) {
        console.error(`Error executing tool '${tool.name}':`, error);
        return { error: `Error during tool execution: ${error instanceof Error ? error.message : String(error)}` };
    }
};
