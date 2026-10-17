# MIGRATION: chuyển sang cấu trúc feature-based

Tài liệu bàn giao của đợt refactor `lms-frontend-step4` → cấu trúc `core/ + shared/ + features/`.
Mục tiêu của đợt này là **đổi tổ chức mã, không đổi hành vi**: cùng route, cùng breadcrumb, cùng lazy chunk, cùng key lưu trữ, cùng biến môi trường.

## 1. Tóm tắt

| | Trước | Sau |
|---|---|---|
| Hạ tầng | rải ở `lib/`, `components/`, `hooks/`, `store/`, `mocks/`, `assets/`, `app/` | `core/` (hạ tầng app) và `shared/` (khối dựng không gắn nghiệp vụ) |
| Zustand | auth store nằm trong feature `auth`, theme/ui store ở `src/store/` | cả 3 store toàn cục ở `core/store/`; state riêng của feature → `features/<tên>/store/` (hiện chưa có) |
| Route | một file `app/router.tsx` (98 dòng) + `app/crumbs.tsx` import hook của 5 feature | mỗi feature có `routes.ts`, `router.tsx` chỉ lắp ráp; breadcrumb do feature sở hữu |
| Cấu trúc feature | `pages/`, `types.ts`, `queryKeys.ts` ở gốc | `views/`, `types/<tên>.types.ts`, `api/queryKeys.ts`, `utils/` |
| Import chéo giữa feature | 25 cặp | 21 cặp, **không có vòng** (kiểm tra mức file và mức feature) |
| Alias | `@/` | thêm `@core`, `@shared`, `@features` (`@/` còn nhưng không còn nơi nào dùng) |
| Biên giới | ESLint chặn import sâu | ESLint theo bảng tầng (`eslint.boundaries.js`) + `pnpm check:arch` |

Số liệu: 103 file được di chuyển, 3 file bị xóa, 24 file mới (phụ lục bên dưới). 16 feature, 15 feature có `routes.ts` (`theme` không có trang).

## 2. Cấu trúc mới và quy tắc

Xem README, mục "Architecture & Development Guidelines". Bảng tầng:

| Tầng | Được import | Không được import |
|---|---|---|
| `shared` | chỉ `shared` | `core`, `features`, `router.tsx`, `main.tsx` |
| `core` | `shared` | `features` (ngoại lệ: `core/layouts` dùng public API của feature, `core/mocks` chỉ `import type`) |
| `features/<x>` | `shared`, `core`, feature khác qua `@features/<y>` (`index.ts`) | `router.tsx`, `main.tsx`, `core/layouts`, `core/providers`, import sâu `@features/<y>/...` |
| `router.tsx`, `main.tsx` | tất cả | |

## 3. Cách đổi import (cheat-sheet)

| Import cũ | Import mới |
|---|---|
| `@/lib/utils` | `@shared/utils/cn` |
| `@/lib/storage`, `@/lib/format/...` | `@shared/utils/storage`, `@shared/utils/format/...` |
| `@/lib/query/async-state` | `@shared/utils/async-state` |
| `@/lib/query/query-client` | `@core/query/query-client` |
| `@/lib/api/client`, `@/lib/api/http` | `@core/api/client`, `@core/api/http` |
| `@/lib/api/config` (`API_BASE_URL`) | `@core/config/env` |
| `USE_MOCK` từ `@/mocks` | `USE_MOCK` từ `@core/config/env` |
| `@/mocks`, `@/mocks/x.mock` | `@core/mocks`, `@core/mocks/x.mock` |
| `@/components/ui/x` | `@shared/components/ui/x` |
| `@/components/shared/X` | `@shared/components/X` |
| `@/hooks/useCountdown` | `@shared/hooks/useCountdown` |
| `@/store/useThemeStore`, `@/store/useUiStore` | `@core/store/useThemeStore`, `@core/store/useUiStore` |
| `useAuthStore` từ `@/features/auth` | `@core/store/useAuthStore` |
| `useCurrentUserId` từ `@/features/auth` | `@core/hooks/useCurrentUserId` |
| `UserRole`, `AuthUser`, `UserProfile` từ `@/features/auth` | `@core/types/auth.types` |
| `@/app/navigation` | `@core/config/navigation` |
| `@/app/layout/AppShell`, `Breadcrumbs` | `@core/layouts/AppShell`, `@core/layouts/Breadcrumbs` |
| `@/app/routeHandle` | `@core/router/route-handle` |
| `@/assets/...`, `./index.css` | `@core/assets/...`, `@core/styles/index.css` |
| `@/features/<x>` | `@features/<x>` |
| trong feature: `pages/X`, `../types`, `../queryKeys` | `views/X`, `../types/<tên>.types`, `../api/queryKeys` |

Gợi ý khi gặp import cũ còn sót: luật ESLint `removedPaths` sẽ báo lỗi kèm gợi ý đường dẫn mới.

## 4. Thay đổi ngoài việc di chuyển file

Các thay đổi này là có chủ đích, nhưng không phải "chỉ đổi đường dẫn":

1. **`core/config/env.ts`** gom 3 chỗ đọc biến môi trường: `API_BASE_URL` (`VITE_API_URL`), `GOOGLE_CLIENT_ID` (`VITE_GOOGLE_CLIENT_ID`, mặc định `'dummy-client-id'`), `USE_MOCK` (logic production chỉ bật khi `VITE_USE_MOCK=true` giữ nguyên). Mọi nơi khác chỉ import từ đây. `core/api/config.ts` bị xóa. `core/mocks/mock-api.ts` giờ chỉ còn `delay`, nên 12 service đổi một dòng import thành hai (`USE_MOCK` từ `env.ts`, phần còn lại từ `@core/mocks`).
2. **`features/auth/index.ts`** không còn re-export `useAuthStore`, `useCurrentUserId`, `UserRole`, `AuthUser`, `UserProfile`. Code bên ngoài phải import từ `@core/...` (bảng ở mục 3). Nhờ đó các cặp `assignments/courses/dashboard/participants → auth` biến mất.
3. **Breadcrumb**: `app/crumbs.tsx` bị xóa. `CourseCrumb`, `DocumentCrumb`, `AssignmentCrumb`, `ExamCrumb`, `QuizCrumb` nằm trong `components/` của feature sở hữu. Tên component giữ nguyên.
4. **Route**: `router.tsx` ghép các fragment. Tab Grades (grading) và Classmates (participants) cắm vào `CourseLayout` qua `createStudentCourseRoutes({ tabs, detailPages })` của `courses/routes.ts`. Thứ tự, URL, crumb, trang lazy y nguyên (đã so sánh bằng cách chạy thật cấu hình route, xem mục 6).
5. **Provider**: `App.tsx` bị xóa. `AppProviders` (Google OAuth → React Query) bọc `[RouterProvider, ThemedToaster]` trong `main.tsx`, đúng thứ tự lồng cũ.
6. **`hooks/useCurrentUserId`** chuyển thành `core/hooks/`; `features/auth/types.ts` thành `core/types/auth.types.ts` (tiêu chí: type thuộc phiên đăng nhập, hoặc dùng bởi từ 3 feature trở lên).
7. **Cấu hình**: `tsconfig.json` (+3 alias), `vite.config.ts` (+3 alias), `components.json` (alias shadcn trỏ `@shared/components/ui`, `@shared/utils/cn`, css `src/core/styles/index.css`), `index.html` (một comment), `package.json` (thêm script `check:arch`), `eslint.config.js` + file mới `eslint.boundaries.js`, `README.md`.
8. **Sửa 3 lỗi lint có sẵn từ bản gốc** (`react-refresh/only-export-components`; bản gốc chưa bao giờ lint được nên không ai thấy): `getCoverUrl` trong `CourseCover.tsx` không còn `export` (chỉ dùng nội bộ); `masteryTone` chuyển từ `shared/components/Bar.tsx` sang `shared/utils/mastery-tone.ts` (2 trang import lại: `StudentRosterPage`, `ClassAnalyticsPage`); thư mục `shared/components/ui/` được tắt riêng luật này vì là file shadcn sinh tự động (`buttonVariants`).

## 5. Quyết định thiết kế cần biết

- **D1–D6 của plan giữ nguyên** (tên feature kebab-case, giữ `index.ts`, mocks ở `core/mocks`, `core/layouts` được dùng public API của feature, feature tổng hợp được đọc public API, thêm alias).
- **Lệch so với plan, đã được bạn đồng ý**: shadcn `ui/` nằm ở `shared/components/ui/` (không phải `core/components/ui/`), vì `ErrorState`, `LoadingState`, `RouteErrorPage` của `shared` dùng `Button`/`Skeleton`; để ở `core` thì `shared` phải import `core`, trái bảng tầng.
- **Persist key không đổi**: `lms-theme` (theme) và `lms_user_profile` (hồ sơ). Người dùng không mất dữ liệu đã lưu. Đừng đổi tên hai key này.
- **`@/` còn trong `tsconfig`/`vite` (D6) nhưng không còn code nào dùng.**

## 6. Đã kiểm chứng gì, chưa kiểm chứng gì

Môi trường làm việc không có `node_modules` và không có mạng, nên **không chạy được `pnpm install/typecheck/lint/build` trong môi trường của tôi**.

Đã kiểm chứng bằng công cụ tự viết (so với zip gốc):
- Mỗi file gốc đều còn mặt (di chuyển, hoặc xóa có chủ đích): 181 file được ánh xạ, 0 mất. 150 file giống hệt từng ký tự sau khi che đường dẫn import; 31 file còn lại khác đúng các nhóm ở mục 4.
- Tập export không đổi, trừ 3 trường hợp có chủ đích (`crumb` thêm, `USE_MOCK` chuyển, 5 re-export của `auth` bỏ).
- **Toàn bộ chuỗi ký tự** trong code (key lưu trữ, tên biến môi trường, endpoint, nhãn breadcrumb, đường dẫn route): 1134 chuỗi khác nhau, trùng khớp tuyệt đối trước và sau.
- Cây route được dựng bằng cách **chạy thật** cấu hình route: 34 nút, cùng thứ tự, URL, breadcrumb, trang lazy, element, error boundary, lồng nhau.
- 26 điểm `import()` (lazy chunk) trỏ đúng cùng tập file; không có file mồ côi.
- Kiểm tra kiểu giữa các module nội bộ (gói npm khai báo `any`): các lỗi thật về API nội bộ bằng nhau tuyệt đối giữa hai bản.
- Không có vòng phụ thuộc (mức file, mức feature); bảng tầng được tuân thủ; luật ESLint được mô phỏng trên 777 import và 40 ca thử.
- Kết quả bạn đã chạy trên bản cuối: `pnpm typecheck`, `pnpm check:arch`, `pnpm build` xanh; `pnpm lint` chạy được với ESLint thật và **không có lỗi nào từ `eslint.boundaries.js`**.

Chưa kiểm chứng (cần bạn chạy):
- `pnpm lint` sau 3 chỗ sửa ở mục 4.8 (kết quả bạn gửi trước khi sửa: 0 lỗi ranh giới, đúng 3 lỗi `react-refresh` có sẵn từ bản gốc).
- Chạy thử app trên trình duyệt.

### Checklist chạy thử

```bash
# Một lần: typescript-eslint chưa hỗ trợ TypeScript 7, nên chạy TS 6 và TS 7 song song.
# Trong package.json (devDependencies) dùng hai alias, rồi `pnpm install`:
#   "@typescript/native": "npm:typescript@^7.0.2",
#   "typescript": "npm:@typescript/typescript6@^6.0.2",
#   "typescript-eslint": "^8.71.2"
pnpm install
pnpm exec tsc --version           # 7.0.x (dùng cho pnpm typecheck)
pnpm exec tsc6 --version          # 6.0.x (API cho typescript-eslint)
pnpm typecheck
pnpm lint
pnpm check:arch
pnpm build
pnpm dev
# (Windows PowerShell 5 không hỗ trợ `&&`: chạy từng lệnh, hoặc dùng PowerShell 7)
```

Trên trình duyệt: đăng nhập vai student và lecturer (dev có `DevRoleSwitcher`); mở trang khóa học với tab Content, Grades, Classmates; mở một document, quiz, assignment và exam từ khóa học (breadcrumb phải hiện tên); đổi theme rồi F5 (theme còn); F5 khi đang đăng nhập (tên người dùng còn); bật `VITE_USE_MOCK=false` nếu muốn thử gọi API thật; build production và mở `pnpm preview` kiểm tra trang lazy (ví dụ Mastery, PDF viewer).

## 7. Đang làm dở / việc nên làm tiếp

- Khi TypeScript 7.1 ra (có API lập trình), bỏ cấu hình TS 6/7 song song: đưa `typescript` về `^7.x` và xóa alias `@typescript/native`, nếu `typescript-eslint` đã hỗ trợ.
- `tsconfig.json` vẫn một file (giữ nguyên theo plan); có thể tách `tsconfig.app.json` sau.
- Chưa có test framework; quy ước sau này là `*.test.ts(x)` cạnh file nguồn.
- Ứng viên `features/exams/store/`: trạng thái làm bài đang đọc `localStorage` qua `readStoredJson`. Đổi sang Zustand sẽ đổi hành vi nên chưa làm.
- `mockQuizzes` dùng chung bởi `quizzes` và `exams`, `mockAssignments` bởi `assignments` và `grading`; vì vậy mocks nằm chung ở `core/mocks` (D3).
- Nhánh/PR đang mở: kết thúc hoặc merge trước khi áp dụng, hoặc đổi đường dẫn theo bảng mục 3 và phụ lục. Với `git diff -M`, 101 trong 103 file được nhận diện là rename (hai file bị viết lại nhiều là `app/router.tsx` → `router.tsx` và `mocks/mock-api.ts` → `core/mocks/mock-api.ts`, Git hiển thị là xóa + thêm).
- Công cụ refactor (`tools/refactor/`) và nhật ký (`docs/refactor/`) không nằm trong bản chính; chúng ở gói `lms-refactor-audit.zip` đi kèm, có thể xóa. `scripts/check-architecture.mjs` và `eslint.boundaries.js` là phần cần giữ.

---

## Phụ lục: bảng ánh xạ đầy đủ

### A. File được di chuyển / đổi tên (103)

| Cũ (trong `src/`) | Mới (trong `src/`) | Nội dung |
|---|---|---|
| `lib/api/client.ts` | `core/api/client.ts` | import + đọc `API_BASE_URL` từ `env.ts` |
| `lib/api/http.ts` | `core/api/http.ts` | giữ nguyên |
| `assets/campus-bg.jpg` | `core/assets/campus-bg.jpg` | giữ nguyên |
| `app/navigation.ts` | `core/config/navigation.ts` | chỉ đổi đường dẫn import |
| `features/auth/hooks/useCurrentUserId.ts` | `core/hooks/useCurrentUserId.ts` | giữ nguyên |
| `app/layout/AppShell.tsx` | `core/layouts/AppShell.tsx` | chỉ đổi đường dẫn import |
| `app/layout/Breadcrumbs.tsx` | `core/layouts/Breadcrumbs.tsx` | import + comment |
| `mocks/academic.mock.ts` | `core/mocks/academic.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/assignment.mock.ts` | `core/mocks/assignment.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/content.mock.ts` | `core/mocks/content.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/exam.mock.ts` | `core/mocks/exam.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/index.ts` | `core/mocks/index.ts` | giữ nguyên |
| `mocks/lecturer.mock.ts` | `core/mocks/lecturer.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/mastery.mock.ts` | `core/mocks/mastery.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/mock-api.ts` | `core/mocks/mock-api.ts` | `USE_MOCK` chuyển sang `env.ts` (chỉ còn `delay`) |
| `mocks/notification.mock.ts` | `core/mocks/notification.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/quiz.mock.ts` | `core/mocks/quiz.mock.ts` | chỉ đổi đường dẫn import |
| `mocks/users.mock.ts` | `core/mocks/users.mock.ts` | chỉ đổi đường dẫn import |
| `lib/query/query-client.ts` | `core/query/query-client.ts` | giữ nguyên |
| `app/routeHandle.ts` | `core/router/route-handle.ts` | import + thêm hàm `crumb()` |
| `features/auth/store/useAuthStore.ts` | `core/store/useAuthStore.ts` | chỉ đổi đường dẫn import |
| `store/useThemeStore.ts` | `core/store/useThemeStore.ts` | giữ nguyên |
| `store/useUiStore.ts` | `core/store/useUiStore.ts` | giữ nguyên |
| `index.css` | `core/styles/index.css` | giữ nguyên |
| `features/auth/types.ts` | `core/types/auth.types.ts` | giữ nguyên |
| `app/pages/NotFoundPage.tsx` | `core/views/NotFoundPage.tsx` | chỉ đổi đường dẫn import |
| `features/ai-generate/queryKeys.ts` | `features/ai-generate/api/queryKeys.ts` | giữ nguyên |
| `features/ai-generate/types.ts` | `features/ai-generate/types/ai-generate.types.ts` | chỉ đổi đường dẫn import |
| `features/ai-generate/pages/AiGeneratorPage.tsx` | `features/ai-generate/views/AiGeneratorPage.tsx` | chỉ đổi đường dẫn import |
| `features/analytics/queryKeys.ts` | `features/analytics/api/queryKeys.ts` | giữ nguyên |
| `features/analytics/types.ts` | `features/analytics/types/analytics.types.ts` | giữ nguyên |
| `features/analytics/pages/ClassAnalyticsPage.tsx` | `features/analytics/views/ClassAnalyticsPage.tsx` | chỉ đổi đường dẫn import |
| `features/assignments/queryKeys.ts` | `features/assignments/api/queryKeys.ts` | giữ nguyên |
| `features/assignments/types.ts` | `features/assignments/types/assignments.types.ts` | giữ nguyên |
| `features/assignments/pages/AssignmentDetailPage.tsx` | `features/assignments/views/AssignmentDetailPage.tsx` | chỉ đổi đường dẫn import |
| `features/assignments/pages/AssignmentsPage.tsx` | `features/assignments/views/AssignmentsPage.tsx` | chỉ đổi đường dẫn import |
| `features/auth/queryKeys.ts` | `features/auth/api/queryKeys.ts` | giữ nguyên |
| `features/auth/pages/Login.tsx` | `features/auth/views/Login.tsx` | chỉ đổi đường dẫn import |
| `features/calendar/types.ts` | `features/calendar/types/calendar.types.ts` | giữ nguyên |
| `features/calendar/calendarUtils.ts` | `features/calendar/utils/calendarUtils.ts` | chỉ đổi đường dẫn import |
| `features/calendar/pages/CalendarPage.tsx` | `features/calendar/views/CalendarPage.tsx` | chỉ đổi đường dẫn import |
| `features/courses/queryKeys.ts` | `features/courses/api/queryKeys.ts` | giữ nguyên |
| `features/courses/types.ts` | `features/courses/types/courses.types.ts` | giữ nguyên |
| `features/courses/pages/CourseContentPage.tsx` | `features/courses/views/CourseContentPage.tsx` | chỉ đổi đường dẫn import |
| `features/courses/pages/CourseEditorPage.tsx` | `features/courses/views/CourseEditorPage.tsx` | chỉ đổi đường dẫn import |
| `features/courses/pages/CourseLayout.tsx` | `features/courses/views/CourseLayout.tsx` | chỉ đổi đường dẫn import |
| `features/courses/pages/LecturerCoursesPage.tsx` | `features/courses/views/LecturerCoursesPage.tsx` | chỉ đổi đường dẫn import |
| `features/courses/pages/StudentCoursesPage.tsx` | `features/courses/views/StudentCoursesPage.tsx` | chỉ đổi đường dẫn import |
| `features/dashboard/pages/LecturerDashboard.tsx` | `features/dashboard/views/LecturerDashboard.tsx` | chỉ đổi đường dẫn import |
| `features/dashboard/pages/StudentDashboard.tsx` | `features/dashboard/views/StudentDashboard.tsx` | chỉ đổi đường dẫn import |
| `features/documents/queryKeys.ts` | `features/documents/api/queryKeys.ts` | giữ nguyên |
| `features/documents/types.ts` | `features/documents/types/documents.types.ts` | giữ nguyên |
| `features/documents/pages/DocumentViewerPage.tsx` | `features/documents/views/DocumentViewerPage.tsx` | chỉ đổi đường dẫn import |
| `features/exams/queryKeys.ts` | `features/exams/api/queryKeys.ts` | giữ nguyên |
| `features/exams/types.ts` | `features/exams/types/exams.types.ts` | giữ nguyên |
| `features/exams/pages/ExamRoomPage.tsx` | `features/exams/views/ExamRoomPage.tsx` | chỉ đổi đường dẫn import |
| `features/exams/pages/ExamsPage.tsx` | `features/exams/views/ExamsPage.tsx` | chỉ đổi đường dẫn import |
| `features/grading/queryKeys.ts` | `features/grading/api/queryKeys.ts` | giữ nguyên |
| `features/grading/types.ts` | `features/grading/types/grading.types.ts` | chỉ đổi đường dẫn import |
| `features/grading/pages/CourseGradesPage.tsx` | `features/grading/views/CourseGradesPage.tsx` | chỉ đổi đường dẫn import |
| `features/grading/pages/GradingDeskPage.tsx` | `features/grading/views/GradingDeskPage.tsx` | chỉ đổi đường dẫn import |
| `features/mastery/queryKeys.ts` | `features/mastery/api/queryKeys.ts` | giữ nguyên |
| `features/mastery/types.ts` | `features/mastery/types/mastery.types.ts` | giữ nguyên |
| `features/mastery/pages/MasteryPage.tsx` | `features/mastery/views/MasteryPage.tsx` | chỉ đổi đường dẫn import |
| `features/notifications/queryKeys.ts` | `features/notifications/api/queryKeys.ts` | giữ nguyên |
| `features/notifications/types.ts` | `features/notifications/types/notifications.types.ts` | giữ nguyên |
| `features/notifications/pages/NotificationsPage.tsx` | `features/notifications/views/NotificationsPage.tsx` | chỉ đổi đường dẫn import |
| `features/participants/queryKeys.ts` | `features/participants/api/queryKeys.ts` | giữ nguyên |
| `features/participants/types.ts` | `features/participants/types/participants.types.ts` | giữ nguyên |
| `features/participants/pages/ClassmatesPage.tsx` | `features/participants/views/ClassmatesPage.tsx` | chỉ đổi đường dẫn import |
| `features/participants/pages/StudentRosterPage.tsx` | `features/participants/views/StudentRosterPage.tsx` | chỉ đổi đường dẫn import |
| `features/quizzes/queryKeys.ts` | `features/quizzes/api/queryKeys.ts` | giữ nguyên |
| `features/quizzes/types.ts` | `features/quizzes/types/quizzes.types.ts` | giữ nguyên |
| `features/quizzes/pages/QuizPage.tsx` | `features/quizzes/views/QuizPage.tsx` | chỉ đổi đường dẫn import |
| `features/roadmap/queryKeys.ts` | `features/roadmap/api/queryKeys.ts` | giữ nguyên |
| `features/roadmap/types.ts` | `features/roadmap/types/roadmap.types.ts` | giữ nguyên |
| `features/roadmap/pages/RoadmapPage.tsx` | `features/roadmap/views/RoadmapPage.tsx` | chỉ đổi đường dẫn import |
| `features/theme/themeRuntime.ts` | `features/theme/utils/themeRuntime.ts` | chỉ đổi đường dẫn import |
| `app/router.tsx` | `router.tsx` | viết lại: chỉ lắp ráp route của các feature |
| `components/shared/AsyncView.tsx` | `shared/components/AsyncView.tsx` | giữ nguyên |
| `components/shared/Bar.tsx` | `shared/components/Bar.tsx` | chỉ đổi đường dẫn import |
| `components/shared/EmptyState.tsx` | `shared/components/EmptyState.tsx` | giữ nguyên |
| `components/shared/ErrorState.tsx` | `shared/components/ErrorState.tsx` | chỉ đổi đường dẫn import |
| `components/shared/FullPageLoader.tsx` | `shared/components/FullPageLoader.tsx` | giữ nguyên |
| `components/shared/HeroHeader.tsx` | `shared/components/HeroHeader.tsx` | giữ nguyên |
| `components/shared/LoadingState.tsx` | `shared/components/LoadingState.tsx` | chỉ đổi đường dẫn import |
| `components/shared/Modal.tsx` | `shared/components/Modal.tsx` | giữ nguyên |
| `components/shared/PageHeader.tsx` | `shared/components/PageHeader.tsx` | giữ nguyên |
| `components/shared/RouteErrorPage.tsx` | `shared/components/RouteErrorPage.tsx` | chỉ đổi đường dẫn import |
| `components/shared/StatCard.tsx` | `shared/components/StatCard.tsx` | giữ nguyên |
| `components/ui/badge.tsx` | `shared/components/ui/badge.tsx` | chỉ đổi đường dẫn import |
| `components/ui/button.tsx` | `shared/components/ui/button.tsx` | chỉ đổi đường dẫn import |
| `components/ui/card.tsx` | `shared/components/ui/card.tsx` | chỉ đổi đường dẫn import |
| `components/ui/input.tsx` | `shared/components/ui/input.tsx` | chỉ đổi đường dẫn import |
| `components/ui/label.tsx` | `shared/components/ui/label.tsx` | chỉ đổi đường dẫn import |
| `components/ui/skeleton.tsx` | `shared/components/ui/skeleton.tsx` | chỉ đổi đường dẫn import |
| `hooks/useCountdown.ts` | `shared/hooks/useCountdown.ts` | giữ nguyên |
| `lib/query/async-state.ts` | `shared/utils/async-state.ts` | giữ nguyên |
| `lib/utils.ts` | `shared/utils/cn.ts` | giữ nguyên |
| `lib/format/date.ts` | `shared/utils/format/date.ts` | giữ nguyên |
| `lib/format/index.ts` | `shared/utils/format/index.ts` | giữ nguyên |
| `lib/format/number.ts` | `shared/utils/format/number.ts` | giữ nguyên |
| `lib/storage.ts` | `shared/utils/storage.ts` | giữ nguyên |

### B. File bị xóa (3)

| Cũ | Thay bằng |
|---|---|
| `lib/api/config.ts` | `core/config/env.ts` |
| `App.tsx` | `core/providers/AppProviders.tsx` + `main.tsx` |
| `app/crumbs.tsx` | mỗi feature sở hữu `<X>Crumb.tsx` của mình |

### C. File mới (24)

| File | Vai trò |
|---|---|
| `core/config/env.ts` | Nơi duy nhất đọc biến `VITE_*` (`API_BASE_URL`, `GOOGLE_CLIENT_ID`, `USE_MOCK`) |
| `core/providers/AppProviders.tsx` | Provider Google OAuth + React Query |
| `core/router/lazyPage.ts` | Hàm lazy-load trang (trước đây viết trong router) |
| `features/ai-generate/routes.ts` | Các route của feature |
| `features/analytics/routes.ts` | Các route của feature |
| `features/assignments/components/AssignmentCrumb.tsx` | Nhãn breadcrumb (chuyển từ `app/crumbs.tsx`) |
| `features/assignments/routes.ts` | Các route của feature |
| `features/auth/routes.ts` | Các route của feature |
| `features/calendar/routes.ts` | Các route của feature |
| `features/courses/components/CourseCrumb.tsx` | Nhãn breadcrumb (chuyển từ `app/crumbs.tsx`) |
| `features/courses/routes.ts` | Các route của feature |
| `features/dashboard/routes.ts` | Các route của feature |
| `features/documents/components/DocumentCrumb.tsx` | Nhãn breadcrumb (chuyển từ `app/crumbs.tsx`) |
| `features/documents/routes.ts` | Các route của feature |
| `features/exams/components/ExamCrumb.tsx` | Nhãn breadcrumb (chuyển từ `app/crumbs.tsx`) |
| `features/exams/routes.ts` | Các route của feature |
| `features/grading/routes.ts` | Các route của feature |
| `features/mastery/routes.ts` | Các route của feature |
| `features/notifications/routes.ts` | Các route của feature |
| `features/participants/routes.ts` | Các route của feature |
| `features/quizzes/components/QuizCrumb.tsx` | Nhãn breadcrumb (chuyển từ `app/crumbs.tsx`) |
| `features/quizzes/routes.ts` | Các route của feature |
| `features/roadmap/routes.ts` | Các route của feature |
| `shared/utils/mastery-tone.ts` | `masteryTone()` tách khỏi `Bar.tsx` (sửa lỗi `react-refresh`, mục 4.8) |
