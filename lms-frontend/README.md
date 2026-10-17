# 🎓 Hybrid LMS — Frontend

Frontend application for the Hybrid Learning Management System (LMS), built with **React 19**, **Vite 8**, **TypeScript**, and a strict **Feature-Driven Architecture**.

---

## 🚀 Tech Stack

| Category | Technology | Description |
|---|---|---|
| **Core Framework** | [React 19](https://react.dev) + [Vite 8](https://vite.dev) | High-performance modern web application setup |
| **Language** | [TypeScript 7](https://www.typescriptlang.org/) | Strict static typing across all modules and features |
| **Routing** | [React Router v7](https://reactrouter.com/) | Data router, lazy-loaded route chunks, nested layouts, dynamic breadcrumbs |
| **Server State & Data Fetching** | [TanStack Query v5](https://tanstack.com/query/latest) | Server cache, query key factories, mutations, optimistic updates, synchronization |
| **Client State** | [Zustand v5](https://github.com/pmndrs/zustand) | Lean client-only global stores (Auth session, Theme preference, UI drawer/sidebar) |
| **Styling & Design System** | [Tailwind CSS v3](https://tailwindcss.com/) + CSS Variables | HSL token-based design system supporting Light / Dark / System mode |
| **UI Primitives** | [Radix UI](https://www.radix-ui.com/) + [CVA](https://cva.style/) | Headless, accessible primitives, CVA styling, Tailwind-merge (Shadcn-style) |
| **Visualizations & Charts** | [Recharts](https://recharts.org/) | Interactive charts for student progress, gradebook, and class analytics |
| **Document & PDF Viewer** | [PDF.js (`pdfjs-dist`)](https://mozilla.github.io/pdf.js/) | In-browser PDF rendering for lectures, reading materials, and documents |
| **Feedback & Notifications** | [Sonner](https://sonner.emilkowal.ski/) | Clean, accessible toast notification stack |
| **Icons** | [Lucide React](https://lucide.dev/) | Consistent, lightweight SVG icon system |
| **HTTP Client** | [Axios](https://axios-http.com/) | Configured API client with unified error & response unwrapping |
| **Testing** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) | Fast unit, hook, and UI component testing with `@vitest/coverage-v8` |
| **E2E Testing** | [Playwright](https://playwright.dev/) | End-to-end browser testing and user flow validation (`e2e/`) |

---

## 📁 Directory Structure

```
lms-frontend/
├── public/                     # Static assets, covers, and sample PDFs
├── scripts/
│   └── check-architecture.mjs  # pnpm check:arch: import cycles, layer table, Zustand/env placement, feature layout
├── eslint.boundaries.js        # Import-boundary rules (spread into eslint.config.js)
└── src/
    ├── main.tsx                # Entry: AppProviders + RouterProvider + ThemedToaster
    ├── router.tsx              # createBrowserRouter: assembles every features/<name>/routes.ts
    ├── core/                   # App-wide infrastructure (may know the app shell, never a feature's internals)
    │   ├── api/                # Axios client (client.ts) and response unwrapping (http.ts)
    │   ├── assets/             # Images used by the shell and the login page
    │   ├── config/             # env.ts (the only reader of VITE_* variables), navigation.ts (role-based menu)
    │   ├── hooks/              # useCurrentUserId
    │   ├── layouts/            # AppShell (sidebar, header) and Breadcrumbs
    │   ├── mocks/              # In-memory mock databases + delay() (data only)
    │   ├── providers/          # AppProviders (Google OAuth, TanStack Query)
    │   ├── query/              # query-client.ts
    │   ├── router/             # lazyPage() and crumb()/route handle types used by every routes.ts
    │   ├── store/              # GLOBAL Zustand stores: useAuthStore, useThemeStore, useUiStore
    │   ├── styles/             # index.css (Tailwind layers and design tokens)
    │   ├── types/              # Cross-feature models: auth.types.ts (UserRole, AuthUser, UserProfile)
    │   └── views/              # NotFoundPage
    ├── shared/                 # Domain-free building blocks (imports nothing but itself)
    │   ├── components/         # AsyncView, Loading/Error/EmptyState, PageHeader, HeroHeader, StatCard, Bar, Modal, ...
    │   │   └── ui/             # Atomic shadcn-style elements (button, input, label, card, badge, skeleton)
    │   ├── hooks/              # useCountdown
    │   └── utils/              # cn.ts, storage.ts, async-state.ts, format/ (date, number)
    └── features/               # One folder per domain (see "Feature layout" below)
        ├── ai-generate/        # AI-assisted question generation & draft editor
        ├── analytics/          # Class analytics & lecturer insights
        ├── assignments/        # Student assignment submissions & tracking
        ├── auth/               # Login, Google OAuth, session refresh, route guards
        ├── calendar/           # Deadlines, exam schedules & events
        ├── courses/            # Course catalog, sections, items, course layout
        ├── dashboard/          # Role-specific dashboard hubs
        ├── documents/          # Documents list & PDF.js viewer
        ├── exams/              # Exam taking desk, timer, question palette
        ├── grading/            # Lecturer grading desk & student gradebook
        ├── mastery/            # Competency radar & Knowledge Component mastery
        ├── notifications/      # Notification center & read status
        ├── participants/       # Classmates list & student roster
        ├── quizzes/            # Interactive quizzes
        ├── roadmap/            # Personalized learning paths
        └── theme/              # ThemeToggle, ThemedToaster, initTheme (its store is core/store/useThemeStore.ts)
```

Path aliases (`tsconfig.json` + `vite.config.ts`): `@core/*`, `@shared/*`, `@features/*`. `@/*` (= `src/*`) still exists but is not used by the code.

---

## 🏗️ Architecture & Development Guidelines

### 1. Feature layout (`src/features/<domain>/`)
Each feature module owns one domain and encapsulates its own logic. Only the folders a feature needs exist:
```
features/<domain>/
├── api/          # Promise-returning services (<x>.service.ts, switch mock / Axios) and queryKeys.ts
├── components/   # UI components private to this feature (including its breadcrumb component, if any)
├── hooks/        # TanStack Query hooks (queries and mutations)
├── store/        # Feature-only Zustand store (use<Domain>Store.ts), only when the state is not global
├── types/        # <domain>.types.ts: domain interfaces and types
├── utils/        # Pure helpers private to the feature
├── views/        # Route page components (lazy loaded from routes.ts)
├── routes.ts     # The feature's route fragments (RouteObject), assembled by src/router.tsx
└── index.ts      # PUBLIC API: the only entrypoint other features are allowed to import
```

Tests: configured with Vitest + Testing Library + jsdom. Put unit/component tests next to the code they cover (`useCountdown.test.ts` beside `useCountdown.ts`, `features/<domain>/hooks/useX.test.ts` beside the hook, `features/<domain>/components/X.test.tsx` beside the component).

### 2. Layers and boundary rules
Dependencies point downwards:

| Layer | May import | May not import |
|---|---|---|
| `shared` | `shared` only | `core`, `features`, `router.tsx`, `main.tsx` |
| `core` | `shared` | `features`, `router.tsx`, `main.tsx` (exceptions below) |
| `features/<x>` | `shared`, `core`, other features through `@features/<y>` (`index.ts`) | `router.tsx`, `main.tsx`, `core/layouts`, `core/providers`, deep paths like `@features/<y>/hooks/...` |
| `router.tsx`, `main.tsx` | everything | |

Exceptions: `core/layouts` may use the public API of features (the shell hosts the notification bell, theme toggle, dev role switcher, logout), and `core/mocks` may `import type` from features. `src/router.tsx` is the only file allowed to import `@features/<x>/routes`.

More rules:
- **Inside a feature** use relative imports (`../types/x.types`, `../hooks/use...`); never import your own feature through its alias.
- **Public API**: `index.ts` exports hooks, components and types that other features need. Do not export things only your own views use.
- **Shared types**: a type moves to `core/types` only when 3+ features use it or it belongs to the signed-in session; otherwise keep it in the feature and export it from `index.ts`.
- **No cycles**: neither between files nor between features. If two features need each other, extract the shared part into `shared/` or `core/`, or compose them in `router.tsx`.
- **Mocks**: only `features/*/api/**` (and the dev-only `DevRoleSwitcher`) may import `@core/mocks`.
- **Environment**: `import.meta.env.VITE_*` is read only in `core/config/env.ts`; import `API_BASE_URL`, `GOOGLE_CLIENT_ID`, `USE_MOCK` from there.
- **Routes**: `routes.ts` only imports `react-router`, `@core/router/*` and files of its own feature. A page that belongs inside another feature's layout is exported as a plain route and plugged in by `router.tsx` (example: the Grades and Classmates tabs of a course, see `createStudentCourseRoutes({ tabs, detailPages })` in `features/courses/routes.ts`).
- **Enforcement**: ESLint (`eslint.boundaries.js`, `@typescript-eslint/no-restricted-imports`) blocks forbidden imports while you type; `pnpm check:arch` adds what ESLint cannot see (import cycles, Zustand and env placement, feature layout).

### 3. Adding a feature
1. Create `features/<name>/` with `api/`, `hooks/`, `types/<name>.types.ts`, `views/` and `index.ts` (only what you need).
2. Declare its routes in `features/<name>/routes.ts` with `lazyPage()` and `crumb()` from `@core/router`.
3. Add the fragment to `src/router.tsx` and, if it needs a menu entry, to `core/config/navigation.ts`.
4. Run `pnpm typecheck && pnpm lint && pnpm check:arch`.

### 4. State Separation Principle
- **Server State (TanStack Query v5)**:
  - All data fetching, caching, refreshing, and mutation side-effects are managed by TanStack Query.
  - Queries are accessed via feature hooks (`useCourseDetail`, `useAssignmentList`).
  - Mutations handle cache invalidation or optimistic updates in `onSuccess`.
  - **Never** copy server query data into Zustand or manual `useState` with `useEffect`.
- **Client State (Zustand v5)**:
  - Used strictly for client-only state. **Global** state (user session, active theme, sidebar toggle) lives in `src/core/store/`; state that belongs to a single feature lives in `features/<domain>/store/use<Domain>Store.ts`.
  - Persisted keys are part of the user's saved data: `lms-theme` (theme) and `lms_user_profile` (profile). Do not rename them.
- **Local State (`useState` / `useReducer`)**:
  - Confined to component-local UI behaviors (e.g. dropdown open state, modal visibility).

### 5. Mock Data vs. Live Backend (`VITE_USE_MOCK`)
The frontend contains an integrated mock system for independent development:
- Controlled by `VITE_USE_MOCK=true|false` in `.env`.
- **Dev**: mock is on unless `VITE_USE_MOCK=false`. **Production build**: mock is off unless `VITE_USE_MOCK=true`, so a forgotten variable can never ship mock data.
- Services in `features/<domain>/api/` check this flag to either serve rich simulated responses from `src/core/mocks/` or perform HTTP calls via `apiClient` (`src/core/api/client.ts`). The flag itself (`USE_MOCK`) is defined in `src/core/config/env.ts`.
- Responses from live NestJS backend (`{ success, statusCode, data }`) are unwrapped in `src/core/api/http.ts`.

### 6. Theme & Design Tokens
- Supports **Light**, **Dark**, and **System** mode via `useThemeStore` (saved in `localStorage` under `lms-theme`).
- Styling uses CSS variable design tokens defined in `src/core/styles/index.css` (`bg-card`, `text-brand`, `border-border`, `text-success`).
- Avoid hardcoded Tailwind color names (e.g., `text-blue-600`); always prefer semantic design tokens.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 12.0.0`

### Installation
```bash
# Navigate to frontend directory
cd lms-frontend

# Install dependencies with pnpm
pnpm install
```

### Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Configure your `.env`:
```env
VITE_API_URL=http://localhost:9595
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_USE_MOCK=true
```

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts Vite development server with HMR |
| `pnpm build` | Compiles production bundle with Vite |
| `pnpm preview` | Locally previews production build |
| `pnpm typecheck` | Runs `tsc --noEmit` to validate TypeScript types across the project |
| `pnpm lint` | Runs ESLint (typescript-eslint, React hooks rules, import-boundary rules from `eslint.boundaries.js`) on `src/**/*.{ts,tsx}` |
| `pnpm check:arch` | Architecture check: import cycles, layer table, Zustand/env placement, feature layout |
| `pnpm test` | Runs all unit and component tests via Vitest |
| `pnpm test:watch` | Runs Vitest in interactive watch mode during development |
| `pnpm test:cov` | Runs Vitest with v8 coverage analysis and reports |
| `pnpm test:e2e` | Runs Playwright end-to-end tests against local dev server |
| `pnpm test:e2e:ui` | Opens interactive Playwright UI runner |
