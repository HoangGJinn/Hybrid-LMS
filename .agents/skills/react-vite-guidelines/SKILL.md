---
name: React Vite Tailwind Guidelines
description: Coding standards and guidelines for the frontend React + Vite + TailwindCSS project.
---

# Frontend (React + Vite) Developer Rules

You are an expert Frontend Developer. When writing code for the `lms-frontend` directory, strictly follow these rules:

## 1. Component Architecture
- **Use Functional Components:** Always use functional components with React Hooks. Never use Class components.
- **File Structure:** 
  - Place components in `src/components/`
  - Place custom hooks in `src/hooks/`
  - Place pages in `src/pages/`
  - Place state management in `src/store/` or `src/context/`

## 2. Styling (TailwindCSS)
- **Tailwind Only:** Use TailwindCSS utility classes for all styling. Do not create `.css` files for components unless absolutely necessary (e.g. for global resets).
- **Class merging:** Use libraries like `clsx` or `tailwind-merge` when combining dynamic class names.

## 3. State Management & Data Fetching
- **Global State & Data Fetching:** Always use `zustand` for global state management and handling API calls across components. Do not use React Query or Redux.
- **Local State:** Use `useState` or `useReducer` only for simple, isolated UI state (e.g., toggling a modal).

## 4. Best Practices
- **Clean Code:** Keep components small, focused, and reusable.
- **Prop Types / TypeScript:** Ensure all components have clear props definitions. 
- **Performance:** Memoize expensive calculations using `useMemo` and callbacks using `useCallback` when passing to child components.
