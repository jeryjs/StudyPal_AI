import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.tsx';
import './index.css';

import { CopilotProvider } from '@contexts/CopilotContext.tsx';
import { SyncContextProvider } from '@contexts/SyncContext';
import { ThemeContextProvider } from '@contexts/ThemeContext';
import { baseAppUrl } from '@utils/utils.ts';

createRoot(document.getElementById('root')!).render(
  <ThemeContextProvider>
    <SyncContextProvider>
      <CopilotProvider>
        <BrowserRouter basename={baseAppUrl}> {/* Set base URL for gh-pages */}
          <App />
        </BrowserRouter>
      </CopilotProvider>
    </SyncContextProvider>
  </ThemeContextProvider>
);
