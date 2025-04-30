# Study Pal Copilot Integration Instructions

## 1. Project Goal

Integrate a conversational AI assistant ("Copilot") powered by Google's Gemini models (with potential support for other providers) into the Study Pal application. The Copilot should assist users with study-related tasks, understand the application context, and interact with user data (subjects, chapters, materials) via defined tools.

## 2. Core Components & Status

*   **`src/services/GeminiService.ts`**: **[X] Implemented & Tested**
    *   Handles communication with the Gemini API using API key from settings.
    *   Supports streaming responses (`sendMessageStream`).
    *   Supports tool declarations and function calling flow.
    *   Supports model selection via `CopilotModel` enum (`LITE`, `REGULAR`, `REASON`, `LARGE`).
    *   Requires API key (`VITE_GEMINI_API_KEY` in `.env`) for operation.
*   **`src/contexts/CopilotContext.tsx`**: **[X] Implemented (Core Logic)**
    *   Manages chat state: `messages`, `isLoading`, `error`, `currentModel`, `suggestions`, `pageContext`.
    *   Provides core functions: `sendMessage`, `clearChat`, `setCurrentModel`, `setPageContext`, `addSuggestion`, `removeSuggestion`, `clearSuggestions`.
    *   Handles multi-turn tool execution logic.
    *   Includes `loadMoreMessages` for history pagination.
    *   `reasoningMetadata` field exists on messages (population deferred).
*   **`src/store/copilotStore.ts`**: **[X] Implemented & Tested**
    *   Uses IndexedDB (`idb`) via `DBStore` base class.
    *   Stores `CopilotMessage` objects.
    *   Provides efficient paginated history loading (`getMessagesPaginated`).
    *   Handles CRUD operations.
*   **`src/services/ToolRegistry.ts`**: **[X] Implemented (Basic Tools)**
    *   Defines initial tools: `get_current_theme`, `set_application_theme`, `list_subjects`.
    *   Provides `executeTool` function.
    *   **Needs Expansion:** Requires more tools to interact with study materials (e.g., get content, summarize, generate questions/flashcards).
*   **`src/types/copilot.types.ts`**: **[X] Implemented**
    *   Defines core types: `CopilotMessage`, `CopilotModel`, `CopilotTool`, `CopilotSuggestion`, etc.
*   **Testing (`src/tests/`)**: **[X] Basic Integration Tests Implemented**
    *   Tests confirm API connectivity, basic text generation, and tool triggering against the real Gemini API.

## 3. UI Implementation Plan (Checklist)

This checklist outlines the steps to build the user-facing Copilot interface.

*   [ ] **Phase 1: Basic Chat Interface**
    *   `[~]` Create Copilot Panel/View (`Chatbar.tsx` expands to show `CopilotPage.tsx`).
    *   `[~]` Display Messages (`CopilotPage.tsx` renders placeholder messages; needs context integration).
    *   `[~]` Message Input (`Chatbar.tsx` has input; needs context `sendMessage` integration).
    *   `[ ]` Loading Indicator (Show when context `isLoading` is true).
    *   `[ ]` Error Display (Show context `error` clearly).
    *   `[X]` Basic Styling (Components have initial styling).
    *   **Architectural Rule:**
        *   `Chatbar.tsx` is the **only** component responsible for user input to Copilot (sending messages, suggestions, etc.).
        *   `CopilotPage.tsx` is a **pure display** component: it only renders chat/messages and Copilot state from context/store, and never handles user input directly.
        *   All Copilot UI/UX must respect this separation of concerns for maintainability and extensibility.
*   [ ] **Phase 2: History & Controls**
    *   `[ ]` Infinite Scroll/Load More (Use `loadMoreMessages` from context).
    *   `[ ]` Clear Chat Button (Call `clearChat` from context).
    *   `[X]` Scroll Lock (Implemented in `CopilotPage.tsx`).
*   [ ] **Phase 3: Contextual Integration & Advanced Features**
    *   `[ ]` **Page Context:** Call `setPageContext` in relevant views (e.g., `SubjectsPage`, `ChaptersPage`, `MaterialView`) with page name and relevant IDs.
    *   `[ ]` **Active Material Context:** When viewing a specific material, update `pageContext` or pass context directly to `sendMessage` with material ID/content summary.
    *   `[ ]` **Action-Triggered Suggestions:**
        *   `[ ]` Identify key actions (e.g., new material upload, chapter completion).
        *   `[ ]` Implement logic to call `addSuggestion` in `CopilotContext` based on these actions.
    *   `[ ]` **Display Suggestions:** Render suggestions from context `suggestions` as clickable prompts below the input bar. Handle `removeSuggestion` on click/send. (`Chatbar.tsx` has UI for *attaching* context, not displaying suggestions).
    *   `[ ]` **Render Tool Calls/Responses:** Visually differentiate model requests for tools and the resulting tool output messages.
    *   `[ ]` **Model Selection UI:** (Optional) Add UI to change `currentModel` via `setCurrentModel`.
    *   `[ ]` **Display Model Used:** (Optional) Show `message.modelUsed` on model responses.
    *   `[ ]` **Refine Styling:** Improve overall look, feel, responsiveness, accessibility.
*   [ ] **Phase 4: Future Considerations**
    *   `[ ]` **Expand Toolset:** Add more tools for deeper interaction with study materials.
    *   `[ ]` **Reasoning Display:** Implement UI to show reasoning/attribution data from `reasoningMetadata` once API support is stable/clear.

## 4. Key Files

*   Context: `src/contexts/CopilotContext.tsx`
*   Service: `src/services/GeminiService.ts`
*   Store: `src/store/copilotStore.ts`
*   Tools: `src/services/ToolRegistry.ts`
*   Types: `src/types/copilot.types.ts`
*   Tests: `src/tests/`
*   UI Components: `src/components/shared/Chatbar.tsx`, `src/pages/CopilotPage.tsx` (and others to be created)

## 5. Notes

*   Real API calls require `VITE_GEMINI_API_KEY` in `.env`.
*   Reasoning display is deferred due to current API limitations/changes.
*   Focus on implementing the UI checklist items sequentially.
*   `GeminiService` should only be directly accessed/instantiated within `CopilotContext.tsx`. Other components should interact via the context or the `useCopilot` hook.
*   Avoid making multiple edits for the same file. Each file should be edited once per phase to ensure clarity and maintainability.