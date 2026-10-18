import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { ThemedToaster, initTheme } from '@features/theme';
import { setupAuthInterceptors } from '@features/auth';
import { apiClient } from '@core/api/client';
import { AppProviders } from '@core/providers/AppProviders';
import '@core/styles/index.css';
import { router } from './router';

setupAuthInterceptors(apiClient);

// Keep <html class="dark"> in sync with the saved preference / OS setting for the lifetime of the page.
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <ThemedToaster />
    </AppProviders>
  </StrictMode>,
);
