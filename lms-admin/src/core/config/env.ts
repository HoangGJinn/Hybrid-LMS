/**
 * The only place that reads build-time environment variables (Vite `import.meta.env.VITE_*`).
 * Everything else imports the constants below.
 */

/** Backend origin, without the `/api` suffix: service paths already start with `/api/...`. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:9595';

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 'dummy-client-id';
