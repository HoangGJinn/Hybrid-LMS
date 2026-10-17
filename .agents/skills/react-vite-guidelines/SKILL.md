---
name: React Vite Tailwind Guidelines
description: Coding standards and guidelines for the frontend React + Vite + TailwindCSS project.
---

# Frontend (React + Vite) Developer Rules

You are an expert Frontend Developer. When writing code for the `lms-frontend` directory, strictly follow these rules:

## 1. Component & Feature Architecture
- **Use Functional Components:** Always use functional components with React Hooks. Never use Class components.
- **Feature-Driven Architecture:** The frontend follows a strict domain-driven modular structure:
  - Domain features live in `src/features/<feature>/` (`api/`, `hooks/`, `components/`, `pages/`, `queryKeys.ts`, `types.ts`, `index.ts`).
  - Strict Public API: Other features may only import from `@/features/<feature>` (`index.ts`). The only exception is the lazy route pages in `src/app/router.tsx`.
  - Shared UI components live in `src/components/{ui,shared}`; app-level layout (AppShell, Breadcrumbs) lives in `src/app/layout/`.
  - Client state stores live in `src/store/` (e.g. `useAuthStore.ts`, `useThemeStore.ts`).
  - Routes and navigation configs live in `src/app/` (`router.tsx`, `navigation.ts`).
- **Layering (enforced by ESLint):** dependencies only point downwards: `app → features → components / hooks / store / lib`. `lib/`, `components/`, `hooks/` and `store/` never import from `features/` or `app/`; `lib/` never imports `components/` or `store/`.
- **Mocks:** only `features/*/api/**` may import `@/mocks`. `mocks/` may only `import type` from features. `USE_MOCK` is off by default in production builds.
- **Shared helpers:** `src/lib/{api,query,format}`, `src/lib/storage.ts`, `src/lib/utils.ts` (`cn`), `src/hooks/`. Do not recreate `utils/` or `types/` folders; put domain types in the owning feature's `types.ts`.

## 2. Styling (TailwindCSS)
- **Tailwind Only:** Use TailwindCSS utility classes for all styling. Do not create `.css` files for components unless absolutely necessary (e.g. for global resets).
- **Class merging:** Use libraries like `clsx` or `tailwind-merge` when combining dynamic class names.

## 3. State Management & Data Fetching
- **Data Fetching (Server State):** Always use **TanStack Query (React Query)** for data fetching, caching, background synchronization, and handling all API calls.
- **Global State (Client State):** Use `zustand` strictly for global client-side UI state (e.g., theme settings, sidebar toggles, multi-step forms). Do not store server data in Zustand. Do not use Redux.
- **Local State:** Use `useState` or `useReducer` only for simple, isolated UI state (e.g., toggling a modal).

## 4. Best Practices
- **Clean Code:** Keep components small, focused, and reusable.
- **Prop Types / TypeScript:** Ensure all components have clear props definitions. 
- **Performance:** Memoize expensive calculations using `useMemo` and callbacks using `useCallback` when passing to child components.
- **Lint:** `pnpm typecheck && pnpm lint && pnpm build` must pass before finishing a change.
