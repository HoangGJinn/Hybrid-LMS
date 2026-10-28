---
name: TanStack Query v5 Guidelines
description: Best practices and conventions for TanStack Query (React Query) v5, query key factories, mutations, caching, and server state management.
---

You are an expert in **TanStack Query v5** (`@tanstack/react-query`), TypeScript, and async server state management. When working in `lms-frontend`, strictly adhere to these rules and project patterns.

# TanStack Query v5 Guidelines

## 1. Core Principles & State Ownership
- **Server State Only:** TanStack Query manages all server-synchronized data (API fetching, caching, revalidation, and mutations).
- **No Server Data in Zustand:** Never duplicate fetched query data into Zustand or global client stores. Zustand is reserved strictly for ephemeral client-only UI state (theme, sidebar open/close, auth session token).
- **No `useEffect` + `useState` Data Copying:** Do not mirror query data into local component `useState` inside a `useEffect`. Either derive values directly during render or use a draft overlay pattern (`draft ?? serverData`).
- **Encapsulation:** Pages and components never call `api/*.service.ts` directly. Reads belong in custom query hooks (`useQuery`), and writes belong in mutation hooks (`useMutation`) located in `features/<domain>/hooks/`.

---

## 2. TanStack Query v5 Rules & Breaking Changes
- **Object Syntax Only:** v5 requires single options objects for all hooks:
  ```ts
  // ✅ Correct (v5)
  useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
  useMutation({ mutationFn: updateTodo })

  // ❌ Prohibited (legacy positional arguments)
  useQuery(['todos'], fetchTodos)
  ```
- **Pending vs. Loading:**
  - Use `isPending` to indicate the initial load when there is no cached data yet.
  - Use `isFetching` to detect background refetches.
- **Cache Time Renamed:** Use `gcTime` (Garbage Collection time) instead of deprecated `cacheTime`.
- **No `undefined` as Cache Value:** Query v5 rejects `undefined` as resolved query data. If an entity is not found, return `null` explicitly:
  ```ts
  queryFn: async (): Promise<ClassRoom | null> => (await classService.getClassById(courseId)) ?? null
  ```
- **Callbacks Removed from `useQuery`:** `onSuccess`, `onError`, and `onSettled` are removed from `useQuery` in v5. Handle data transformations via `select` option or derive during render. (Note: `onSuccess`/`onError` are still valid and recommended on `useMutation`).

---

## 3. Query Key Factory Pattern (`queryKeys.ts`)
Every feature module must have its own `queryKeys.ts` with a root `all` key to enable targeted and hierarchical cache invalidation.

```ts
// src/features/<feature>/queryKeys.ts
export const courseKeys = {
  all: ['classes'] as const,
  mine: ['classes', 'me'] as const,
  list: (filters: CourseFilters) => [...courseKeys.all, 'list', filters] as const,
  detail: (courseId: string) => ['course', courseId] as const,
  sections: (courseId: string) => ['course', courseId, 'sections'] as const,
}
```

---

## 4. Writing Query Hooks
Place custom query hooks inside `src/features/<feature>/hooks/`.

```ts
import { useQuery } from '@tanstack/react-query'
import { classService } from '../api/class.service'
import { courseKeys } from '../queryKeys'
import type { ClassRoom } from '../types'

export const useCourse = (courseId: string) =>
  useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async (): Promise<ClassRoom | null> => {
      const data = await classService.getClassById(courseId)
      return data ?? null
    },
    enabled: Boolean(courseId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
```

---

## 5. Writing Mutation Hooks
Mutations must be named with action verbs (`useSaveSections`, `useSubmitQuiz`, `useDeleteAssignment`).
Always invalidate or update affected queries in `onSuccess`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classService } from '../api/class.service'
import { courseKeys } from '../queryKeys'
import type { Section } from '../types'

export const useSaveSections = (courseId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sections: Section[]) => classService.saveSections(courseId, sections),
    onSuccess: () => {
      // Invalidate relevant query keys
      return queryClient.invalidateQueries({
        queryKey: courseKeys.sections(courseId),
      })
    },
  })
}
```

> **Tip:** Returning the `queryClient.invalidateQueries(...)` promise from `onSuccess` keeps `mutation.isPending` true until the background refetch finishes.

---

## 6. Mock Data & Immutability Rules
When writing or updating simulated services in `src/mocks/` / `api/*.service.ts`:
- **Never mutate mock objects in place.** Always return a new copy (e.g. `{ ...item, status: 'DONE' }`).
- Mutating in place causes TanStack Query to see the same object reference, preventing React components from re-rendering.

---

## 7. Anti-Patterns to Avoid
1. ❌ **Calling services in components:** `const res = await courseService.get()` inside a `button onClick` or `useEffect`.
2. ❌ **Passing query keys as ad-hoc strings:** `useQuery({ queryKey: ['course-' + id], ... })` instead of using the query key factory.
3. ❌ **Mutating cache directly without schema:** Prefer `invalidateQueries()` unless optimistic updates are specifically required.
4. ❌ **Forgetting `enabled` guard:** Running queries with undefined or empty IDs (e.g. `enabled: Boolean(id)`).
