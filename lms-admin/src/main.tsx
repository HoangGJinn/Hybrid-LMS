import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'sonner';
import { apiClient } from '@/core/api/client';
import { AppProviders } from '@/core/providers/AppProviders';
import { setupAuthInterceptors } from '@/features/auth';
import '@/core/styles/index.css';
import { router } from './router';

setupAuthInterceptors(apiClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <Toaster richColors closeButton position="top-right" />
    </AppProviders>
  </StrictMode>,
);
