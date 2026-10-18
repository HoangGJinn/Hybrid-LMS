import type { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { GOOGLE_CLIENT_ID } from '@/core/config/env';
import { queryClient } from '@/core/query/query-client';

/** Every app-wide context provider, in one place. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </GoogleOAuthProvider>
);
