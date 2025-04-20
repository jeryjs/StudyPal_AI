import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router';

import { ThemeContextProvider } from '@contexts/ThemeContext';
import { SyncContextProvider } from '@contexts/SyncContext'; // Import SyncContextProvider
import { baseAppUrl } from '@utils/utils.ts';

createRoot(document.getElementById('root')!).render(
  <ThemeContextProvider>
    <SyncContextProvider>
      <BrowserRouter basename={baseAppUrl}> {/* Set base URL for gh-pages */}
        <App />
      </BrowserRouter>
    </SyncContextProvider>
  </ThemeContextProvider>
);
