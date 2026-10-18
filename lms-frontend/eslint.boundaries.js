/**
 * Import boundaries of the codebase, as ESLint flat-config blocks (spread into eslint.config.js).
 * Plain data on purpose (no imports), so the rules can be loaded and tested without ESLint installed.
 *
 *   router.tsx / main.tsx   may import everything
 *   features/<name>         -> shared, core, other features through "@features/<name>" (index.ts) only
 *   core                    -> shared. Exceptions: core/layouts may use features' public APIs,
 *                              core/mocks may `import type` from features
 *   shared                  -> shared only
 *
 * Patterns follow gitignore syntax (as in `no-restricted-imports`): `*` is one path segment, `**` any depth, and a bare name such as
 * "@core" also matches everything below it. The TypeScript-aware rule is used so `import type` can be allowed where needed.
 * `scripts/check-architecture.mjs` enforces the same table plus what ESLint cannot see (import cycles, Zustand/env placement).
 */
const RULE = '@typescript-eslint/no-restricted-imports'

const removedPaths = {
  group: ['@/features', '@/features/**', '@/app', '@/app/**', '@/lib', '@/lib/**', '@/components', '@/components/**', '@/hooks', '@/hooks/**', '@/store', '@/store/**', '@/mocks', '@/mocks/**', '@/assets', '@/assets/**'],
  message: 'This path no longer exists. Use @core/..., @shared/... or @features/<feature> (see README, "Architecture").',
}
const deepFeature = {
  group: ['@features/*/*', '@features/*/**'],
  message: 'Import from the feature public API instead: "@features/<feature>" (its index.ts).',
}
const entryPoints = {
  group: ['@/router', '@/router.tsx', '@/main', '@/main.tsx'],
  message: 'router.tsx and main.tsx are entry points; nothing else may import them.',
}
const anyFeature = {
  group: ['@features', '@features/**'],
  message: 'shared/ and core/ must not depend on features (core/layouts and core/mocks are the documented exceptions).',
}
const anyCore = {
  group: ['@core', '@core/**'],
  message: 'shared/ is the lowest layer and must not import core.',
}
const mocks = {
  group: ['@core/mocks', '@core/mocks/**'],
  message: 'Mocks may only be used by features/*/api/** services (and the dev-only DevRoleSwitcher).',
}
const stores = {
  group: ['@core/store', '@core/store/**'],
  message: 'Low-level modules (core/api, core/query, core/mocks, shared/utils) must not read global stores.',
}
const sharedComponents = {
  group: ['@shared/components', '@shared/components/**'],
  message: 'Low-level modules (core/api, core/query, shared/utils) must not import components.',
}
// routes.ts only declares routes: react-router, @core/router/* and files of its own feature.
const notForRoutes = {
  group: ['@features', '@features/**', '@shared', '@shared/**', '@core/api', '@core/api/**', '@core/assets', '@core/assets/**', '@core/config', '@core/config/**', '@core/hooks', '@core/hooks/**', '@core/layouts', '@core/layouts/**', '@core/mocks', '@core/mocks/**', '@core/providers', '@core/providers/**', '@core/query', '@core/query/**', '@core/store', '@core/store/**', '@core/styles', '@core/styles/**', '@core/types', '@core/types/**', '@core/views', '@core/views/**'],
  message: 'routes.ts may only import react-router, @core/router/* and its own feature (relative paths).',
}
// The router may import `@features/<name>/routes` and nothing else below a feature.
const routerDeepImports = {
  group: ['@features/*/api/**', '@features/*/components/**', '@features/*/hooks/**', '@features/*/store/**', '@features/*/types/**', '@features/*/utils/**', '@features/*/views/**'],
  message: 'The router may only import "@features/<feature>" or "@features/<feature>/routes".',
}

const restrict = (...patterns) => ({ [RULE]: ['error', { patterns }] })

export const boundaryConfigs = [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: restrict(removedPaths, deepFeature),
  },
  {
    files: ['src/shared/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, anyFeature, anyCore),
  },
  {
    files: ['src/shared/utils/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, anyFeature, anyCore, sharedComponents),
  },
  {
    files: ['src/core/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, anyFeature, mocks),
  },
  {
    // The shell composes notification bell, theme toggle, dev role switcher...: public APIs of features are fine here.
    files: ['src/core/layouts/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, mocks),
  },
  {
    files: ['src/core/api/**', 'src/core/query/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, anyFeature, mocks, stores, sharedComponents),
  },
  {
    // Mock databases only borrow types from features.
    files: ['src/core/mocks/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, { ...anyFeature, allowTypeImports: true }, stores),
  },
  {
    files: ['src/features/**'],
    rules: restrict(removedPaths, deepFeature, entryPoints, mocks),
  },
  {
    // Services switch between mocks and HTTP; DevRoleSwitcher is a dev-only helper.
    files: ['src/features/*/api/**', 'src/features/auth/components/DevRoleSwitcher.tsx'],
    rules: restrict(removedPaths, deepFeature, entryPoints),
  },
  {
    files: ['src/features/*/routes.ts'],
    rules: restrict(removedPaths, deepFeature, entryPoints, mocks, notForRoutes),
  },
  {
    files: ['src/router.tsx'],
    rules: restrict(removedPaths, routerDeepImports, mocks),
  },
  {
    // Test files may import @core/mocks for fixtures and mock data.
    files: ['src/**/*.{test,spec}.{ts,tsx}'],
    rules: restrict(removedPaths, deepFeature, entryPoints),
  },
]
