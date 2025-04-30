import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiService } from '@services/GeminiService';
import { toolRegistry } from '@services/ToolRegistry';
import { CopilotMessage, CopilotModel } from '@type/copilot.types';
import { describe, expect, it } from 'vitest';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// Helper function to run a stream and check for a specific function call
async function expectFunctionCall(prompt: string, expectedToolName: string, expectedArgs?: object) {
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
    const service = new GeminiService();
    // @ts-ignore - Patching for test environment
    service.genAI = new GoogleGenerativeAI(apiKey);

    const history: CopilotMessage[] = [
        { id: '1', role: 'user', parts: [{ text: prompt }], timestamp: Date.now() },
    ];

    const stream = service.sendMessageStream(history, undefined, toolRegistry, CopilotModel.LITE);
    let functionCallPart;

    for await (const chunk of stream) {
        const part = chunk.candidates?.[0]?.content?.parts?.find(p => 'functionCall' in p);
        if (part) {
            functionCallPart = part.functionCall;
            break; // Found the function call, no need to continue streaming
        }
    }

    expect(functionCallPart).toBeDefined();
    expect(functionCallPart?.name).toBe(expectedToolName);
    if (expectedArgs) {
        expect(functionCallPart?.args).toEqual(expectedArgs);
    }
}

// Helper function to run a stream and ensure NO function call occurs
async function expectNoFunctionCall(prompt: string) {
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
    const service = new GeminiService();
    // @ts-ignore - Patching for test environment
    service.genAI = new GoogleGenerativeAI(apiKey);

    const history: CopilotMessage[] = [
        { id: '1', role: 'user', parts: [{ text: prompt }], timestamp: Date.now() },
    ];

    const stream = service.sendMessageStream(history, undefined, toolRegistry, CopilotModel.LITE);
    let functionCallPart;

    for await (const chunk of stream) {
        const part = chunk.candidates?.[0]?.content?.parts?.find(p => 'functionCall' in p);
        if (part) {
            functionCallPart = part.functionCall;
            break;
        }
    }
    expect(functionCallPart).toBeUndefined();
}


describe('GeminiService tool call integration (real API)', () => {
    // Test timeout
    const TIMEOUT = 20000;

    it('should call get_current_theme', async () => {
        await expectFunctionCall('What is my current theme?', 'get_current_theme');
    }, TIMEOUT);

    it('should call list_subjects', async () => {
        await expectFunctionCall('List my subjects', 'list_subjects');
    }, TIMEOUT);

    it('should call set_application_theme with correct args', async () => {
        await expectFunctionCall('Set the theme to dark', 'set_application_theme', { theme: 'dark' });
    }, TIMEOUT);

    it('should NOT call a tool for an unrelated prompt', async () => {
        await expectNoFunctionCall('Tell me a joke');
    }, TIMEOUT);

    // Add more tests as needed...
});