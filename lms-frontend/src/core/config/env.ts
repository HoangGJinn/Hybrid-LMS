/**
 * The only place that reads build-time environment variables (Vite `import.meta.env.VITE_*`).
 * Everything else imports the constants below, so configuration can be audited and changed in one file.
 */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:9595';

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 'dummy-client-id';

/**
 * Mock mode is opt-in for production builds: it is on in dev unless `VITE_USE_MOCK=false`,
 * and off in production unless `VITE_USE_MOCK=true`. A forgotten env var can never ship mock data.
 */
export const USE_MOCK: boolean = import.meta.env.PROD
  ? import.meta.env.VITE_USE_MOCK === 'true'
  : import.meta.env.VITE_USE_MOCK !== 'false';

// src/core/config/env.ts  (thêm vào cuối file)
export const ZALO_BOT_NAME: string =
  import.meta.env.VITE_ZALO_BOT_NAME || 'BOT HCM-UTE';
export const ZALO_BOT_LINK: string = import.meta.env.VITE_ZALO_BOT_LINK || '';
