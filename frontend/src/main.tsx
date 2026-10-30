// First: configures Zod before the generated schemas are created.
import './api/zodConfig.ts';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import './index.css';

import { App } from './App.tsx';
import { createQueryClient } from './api/queryClient.ts';
import { ProfileProvider } from './features/profile/ProfileProvider.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <ProfileProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProfileProvider>
    </QueryClientProvider>
  </StrictMode>,
);
