import { describe, it, expect } from 'vitest';
import { GeminiService } from '@services/GeminiService';
import { CopilotMessage, CopilotModel } from '@type/copilot.types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// Basic test to check GeminiService initialization and streaming

describe('GeminiService (real API smoke test)', () => {
it('should stream a response for a simple prompt and match expected structure', async () => {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
  // Patch GeminiService to use our env key
  const service = new GeminiService();
  // @ts-ignore
  service.genAI = new (await import('@google/generative-ai')).GoogleGenerativeAI(apiKey);
  const history: CopilotMessage[] = [
    {
      id: '1',
      role: 'user',
      parts: [{ text: 'Say hello world.' }],
      timestamp: Date.now(),
    },
  ];
  const stream = service.sendMessageStream(history, undefined, undefined, CopilotModel.LITE);
  let firstChunk;
  for await (const chunk of stream) {
    firstChunk = chunk;
    break;
  }
  expect(firstChunk).toBeDefined();
  expect(firstChunk).toHaveProperty('candidates');
  expect(Array.isArray(firstChunk.candidates)).toBe(true);
  expect(firstChunk.candidates[0]).toHaveProperty('content');
  expect(firstChunk.candidates[0].content).toHaveProperty('parts');
  expect(Array.isArray(firstChunk.candidates[0].content.parts)).toBe(true);
  expect(typeof firstChunk.candidates[0].content.parts[0].text).toBe('string');
  expect(firstChunk).toHaveProperty('usageMetadata');
  expect(firstChunk).toHaveProperty('modelVersion');
}, 20000);
 
 it('should stream a response for a simple prompt using the LARGE/REASON model and print reasoning if present', async () => {
   if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
   const service = new GeminiService();
   // @ts-ignore
   service.genAI = new (await import('@google/generative-ai')).GoogleGenerativeAI(apiKey);
   const history: CopilotMessage[] = [
     {
       id: '1',
       role: 'user',
       parts: [{ text: 'Say hello world.' }],
       timestamp: Date.now(),
     },
   ];
   const stream = service.sendMessageStream(history, undefined, undefined, CopilotModel.REASON);
   let firstChunk;
   for await (const chunk of stream) {
     firstChunk = chunk;
     break;
   }
   expect(firstChunk).toBeDefined();
   expect(firstChunk).toHaveProperty('candidates');
   expect(Array.isArray(firstChunk.candidates)).toBe(true);
   expect(firstChunk.candidates[0]).toHaveProperty('content');
   expect(firstChunk.candidates[0].content).toHaveProperty('parts');
   expect(Array.isArray(firstChunk.candidates[0].content.parts)).toBe(true);
   expect(typeof firstChunk.candidates[0].content.parts[0].text).toBe('string');
   expect(firstChunk).toHaveProperty('usageMetadata');
   expect(firstChunk).toHaveProperty('modelVersion');
   // Print the full chunk for inspection
   console.log('LARGE model chunk:', JSON.stringify(firstChunk, null, 2));
   // Print any reasoning/attribution if present
   if (firstChunk.candidates[0].content.parts[0].text) {
     console.log('LARGE model text:', firstChunk.candidates[0].content.parts[0].text);
   }
   if (firstChunk.candidates[0].citationMetadata) {
     console.log('LARGE model citationMetadata:', JSON.stringify(firstChunk.candidates[0].citationMetadata, null, 2));
   }
   if (firstChunk.usageMetadata) {
     console.log('LARGE model usageMetadata:', JSON.stringify(firstChunk.usageMetadata, null, 2));
   }
   if (firstChunk.candidates[0].safetyRatings) {
     console.log('LARGE model safetyRatings:', JSON.stringify(firstChunk.candidates[0].safetyRatings, null, 2));
   }
 }, 20000);
});
