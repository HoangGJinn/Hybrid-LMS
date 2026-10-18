# lms-admin

Admin portal of Hybrid LMS (React 19 + Vite + Tailwind 3 + TanStack Query + Zustand).

## Run

```bash
pnpm install
cp .env.example .env   # then fill VITE_GOOGLE_CLIENT_ID
pnpm dev               # http://localhost:3001
```

- `VITE_API_URL` is the backend origin **without** `/api` (service paths already start with `/api/...`).
- Add `http://localhost:3001` to the Google OAuth client's *Authorized JavaScript origins*.
- Sign-in is Google only. An account becomes an admin when its `users.role` is `ADMIN` in the database;
  any other role is signed out again and sees "no access".

## Structure

```
src/
├── core/       app-wide: api client, auth store, providers, layouts, router helpers, theme
├── shared/     reusable UI (components/ui, Table, Modal, Pagination…), hooks, utils
└── features/
    ├── auth/       Google login, session restore (refresh cookie), ProtectedRoute (role ADMIN)
    ├── dashboard/  placeholder (stats wired later: GET /api/admin/stats/overview)
    └── courses/    classes: list/filter/paginate, create/edit modal, deactivate (no delete)
```

Each feature owns `routes.ts`; `src/router.tsx` only assembles them. Import across features only through
a feature's `index.ts` (auth) or its `routes.ts`.

## Courses ↔ backend

| Action | Endpoint |
|---|---|
| List | `GET /api/classes?isActive=&semesterId=&search=` (full list; paging is client-side, 10/page) |
| Create / edit | `POST /api/classes`, `PATCH /api/classes/:id` |
| Deactivate | `PATCH /api/classes/:id/deactivate` |
| Dropdowns | `GET /api/subjects`, `GET /api/semesters`, `GET /api/users?role=LECTURER` |
