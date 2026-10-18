# 📖 Chuẩn Mã Nguồn Toàn Dự Án — Hybrid LMS

Tài liệu chuẩn hóa mã nguồn thống nhất cho toàn bộ dự án **Hybrid LMS** (bao gồm `lms-frontend` và `lms-backend`).

---

## 1. Cổng chất lượng mã nguồn (Quality Gate)

### 1.1 Kiểm tra bắt buộc trước khi tạo / merge PR

Mỗi Pull Request (PR) phải vượt qua toàn bộ các bước kiểm tra tự động trong CI pipeline (`.github/workflows/ci.yml`). Một bước thất bại đồng nghĩa PR bị chặn.

| Dự án | Lệnh | Nội dung kiểm tra | Điều kiện đạt |
|---|---|---|---|
| **Frontend** | `pnpm typecheck` | `tsc --noEmit` (TypeScript 7) | Exit 0, 0 lỗi kiểu dữ liệu |
| | `pnpm lint` | `eslint . --max-warnings 0` | Exit 0, **0 error, 0 warning** |
| | `pnpm check:arch` | Bảng tầng, import ranh giới, chu trình phụ thuộc, vị trí Zustand/env | Exit 0 |
| | `pnpm test` | Vitest (Unit + Component test) | 100% test pass |
| | `pnpm build` | `vite build` | Exit 0, build thành công |
| **Backend** | `pnpm lint` | `oxlint --deny-warnings src/ test/` | Exit 0, **0 error, 0 warning** |
| | `pnpm build` | `nest build` | Exit 0, 0 lỗi biên dịch |
| | `pnpm test` | Vitest (`*.spec.ts`) | 100% test pass |
| | `pnpm test:e2e` | Vitest E2E (`*.e2e-spec.ts`, khi có DB test) | 100% test pass |

### 1.2 Nguyên tắc không nhân nhượng lỗi (Zero-Tolerance Policy)

1. **Khóa 0 warning:** Tuyệt đối không để tồn đọng warning trên CI. Frontend chạy `eslint . --max-warnings 0` và Backend chạy `oxlint --deny-warnings`.
2. **Không tắt luật để né lỗi:** Cấm `/* eslint-disable */` cho toàn bộ file. Trường hợp cá biệt bất khả kháng: `// eslint-disable-next-line <rule> -- <lý do>`, áp dụng đúng 1 dòng kèm giải thích rõ ràng.
3. **Cấm triệt để:**
   - Cấm `@ts-ignore`, `@ts-nocheck` (chỉ dùng `@ts-expect-error` khi có lý do kỹ thuật ghi chú rõ ràng bên cạnh).
   - Cấm kiểu `any` — luôn dùng `unknown` và thu hẹp kiểu bằng type guard / Zod / class-validator.
   - Cấm `console.log`, `console.warn`, `console.error` trong mã được merge.
   - Cấm comment `TODO`, `FIXME` chưa giải quyết trong mã merge vào `master`/`develop`.
4. **Sửa nguyên nhân, không sửa triệu chứng:** Lỗi sai tầng phải chuyển code hoặc đổi import; lỗi type phải định nghĩa lại schema/type đúng bản chất, không ép kiểu gượng ép.

### 1.3 Quy chuẩn định dạng (Formatting)

Toàn bộ dự án thống nhất phong cách định dạng qua **Prettier** (`.prettierrc` ở cả frontend và backend):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100
}
```

- **Luôn có dấu chấm phẩy (`semi: true`).**
- Sử dụng dấu nháy đơn (`'`), dấu phẩy cuối dòng (`trailingComma: 'all'`), thụt lề 2 spaces.
- Chạy `pnpm format` trước khi commit mã nguồn.

---

## 2. Tiêu chuẩn TypeScript & Phong cách mã chung

### 2.1 Ngôn ngữ & Đặt tên

- **100% tiếng Anh:** Toàn bộ tên file, thư mục, hàm, biến, class, kiểu dữ liệu, commit message và tài liệu kỹ thuật/JSDoc phải viết bằng tiếng Anh.
- **Quy tắc chữ hoa / thường:**
  - `PascalCase`: React Component, Class, Interface, Type alias, DTO, View model.
  - `camelCase`: Biến, hàm, phương thức (hàm luôn bắt đầu bằng động từ: `getSections`, `findUserById`, `calculateMastery`).
  - `UPPER_SNAKE_CASE`: Hằng số cố định toàn cục, biến môi trường (`API_BASE_URL`, `REFRESH_COOKIE_NAME`).
  - `kebab-case`: Tên thư mục, tên file tiện ích / service / repository / route (trừ Component/View `.tsx` ở frontend).
  - Biến boolean: Bắt buộc có tiền tố ngữ nghĩa `is`, `has`, `can`, `should` (`isLoading`, `hasPermission`, `canSubmit`).
- **Từ ngữ đầy đủ:** Không viết tắt tùy tiện, trừ các từ chuẩn mực: `id`, `url`, `api`, `dto`, `i`/`j` trong vòng lặp đếm.

### 2.2 Kiểu dữ liệu & Hàm

- **Bật Strict Mode:** TypeScript `strict: true` trên toàn dự án.
- **Tính bất biến:** Ưu tiên `readonly` cho thuộc tính không đổi và `as const` cho literal values.
- **Hạn chế ép kiểu:** Tránh dùng toán tử ép kiểu `as` và cấm non-null assertion `!`. Thu hẹp kiểu bằng kiểm tra logic hoặc type guard.
- **Xử lý bất đồng bộ:** Luôn dùng `async/await`, không chain `.then()/.catch()` thủ công.
- **Thiết kế hàm:** Ngắn gọn, single-responsibility, áp dụng **Early Return** để tránh lồng khối `if` sâu.
- **Không dùng số / chuỗi ma thuật:** Mọi hằng số thời gian, cấu hình, mã trạng thái phải được đặt tên rõ ràng.
- **Comment:** Dùng `/** ... */` cho API, component, hàm dùng chung. Comment giải thích *tại sao làm như vậy* (bối cảnh nghiệp vụ), không giải thích *code đang làm gì*.

---

## 3. Hợp đồng API & Giao tiếp Frontend - Backend

### 3.1 Định dạng URL & Định tuyến

- **Tiền tố toàn cục:** Mọi endpoint backend đều bắt đầu bằng `/api/` (ví dụ: `/api/auth/google`, `/api/users/me`).
- **Quy ước Route:** Dùng `kebab-case`, danh từ số nhiều:
  - `GET /api/courses` — Danh sách khóa học
  - `GET /api/courses/:id` — Chi tiết khóa học
  - `POST /api/courses` — Tạo khóa học mới
  - `PATCH /api/courses/:id` — Cập nhật một phần khóa học
  - `DELETE /api/courses/:id` — Xóa khóa học

### 3.2 Chuẩn bọc phản hồi (Wrapped Response)

Tất cả endpoint backend đều chuẩn hóa định dạng qua `ResponseInterceptor` và `AllExceptionsFilter`:

#### Phản hồi thành công (HTTP 2xx):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-10-18T10:00:00.000Z"
}
```

> [!NOTE]
> Phía Frontend: `@core/api/http.ts` đã tự động giải bọc và trích xuất `data`. Service frontend nhận trực tiếp payload bên trong `data`, **tuyệt đối không tự giải bọc lần 2**.

#### Phản hồi lỗi (HTTP 4xx / 5xx):
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Course not found",
  "timestamp": "2026-10-18T10:00:00.000Z",
  "path": "/api/courses/uuid-not-exist"
}
```

### 3.3 Cơ chế Xác thực & Bảo mật Token

- **Access Token:** Có thời hạn ngắn (`ACCESS_TOKEN_TTL`), chỉ truyền trong body phản hồi khi đăng nhập / refresh, lưu trong bộ nhớ RAM của frontend (Zustand auth store, không ghi xuống localStorage).
- **Refresh Token:**
  - Backend băm token (`token_hash`) trước khi lưu cơ sở dữ liệu.
  - Gửi qua cookie `httpOnly`, `secure`, `sameSite`, giới hạn phạm vi `path: '/api/auth'`.
  - Cơ chế Token Rotation: Mỗi lần cấp access token mới, refresh token cũ bị hủy và phát sinh refresh token mới. Nếu phát hiện refresh token cũ bị tái sử dụng, thu hồi toàn bộ phiên đăng nhập của người dùng.
- **Bảo vệ dữ liệu nhạy cảm:** Tuyệt đối không lưu token, mật khẩu, thông tin cá nhân thô vào localStorage hay ghi vào log file.

---

## 4. Quy chuẩn Frontend (`lms-frontend`)

### 4.1 Tech Stack Chuẩn

- **Core:** React 19, Vite 8, React Router 7 (Data Router), TypeScript (Strict mode).
- **State Management:** TanStack Query v5 (Server state), Zustand v5 (Client state).
- **UI & Styling:** Tailwind CSS v3, Radix UI / shadcn, Lucide React, Recharts, Sonner.
- **Testing:** Vitest, Testing Library, Playwright.
- **Công cụ đặc thù:** Dự án sử dụng `@typescript/native` (TypeScript 7) cho `pnpm typecheck` và TypeScript 6 cho ESLint flat config.

### 4.2 Kiến trúc Phân tầng & Ranh giới Import

```
src/
├── main.tsx            # Điểm vào chính (AppProviders + RouterProvider + ThemedToaster)
├── router.tsx          # Ghép nối router tổng thể của ứng dụng
├── core/               # Hạ tầng dùng chung toàn app (layout, config, api, store toàn cục)
│   ├── api/ config/ hooks/ layouts/ mocks/ providers/ query/ router/ store/ styles/ types/
├── shared/             # Khối dựng UI và tiện ích độc lập nghiệp vụ
│   ├── components/ (chứa ui/)  hooks/  utils/
└── features/<name>/    # Mỗi domain nghiệp vụ độc lập trong một thư mục
    ├── api/            # <entity>.service.ts, queryKeys.ts
    ├── components/     # UI nội bộ của feature
    ├── hooks/          # TanStack Query hooks (useX, useSaveX)
    ├── store/          # Zustand store riêng của feature (nếu có)
    ├── types/          # <name>.types.ts
    ├── utils/          # Logic thuần nội bộ
    ├── views/          # Màn hình (page component), lazy loaded
    ├── routes.ts       # Cấu hình routes của feature
    └── index.ts        # PUBLIC API duy nhất cho feature khác import
```

#### Bảng quy tắc tầng:
- `shared`: Chỉ được import `shared`. Cấm import `core`, `features`, `router`, `main`.
- `core`: Chỉ được import `shared`. Cấm import `features` (ngoại lệ: `core/layouts` được dùng Public API của feature; `core/mocks` được `import type` từ feature).
- `features/<name>`: Được import `shared`, `core`, và feature khác **qua `@features/<other>` (index.ts)**.
  - Cấm import sâu vào nội bộ feature khác (ví dụ: cấm `@features/auth/components/LoginForm`).
  - Trong cùng một feature: Dùng đường dẫn tương đối (`../hooks/useX`), không dùng alias `@features/<chính-mình>`.
  - Cấm vòng phụ thuộc (import cycles) giữa các file và giữa các feature.
- File test (`*.test.ts`, `*.test.tsx`) được phép import `@core/mocks` phục vụ tạo mock fixture.

### 4.3 React & Giao diện

1. **Component:** Luôn dùng function component khai báo dạng arrow function: `export const MyComponent: React.FC<Props> = ...` hoặc `export const MyComponent = (props: Props) => ...`.
2. **Export:**
   - Dùng **Named Export** cho tất cả component tái sử dụng.
   - **Default Export** chỉ dùng riêng cho file màn hình trong `views/` và component tải trễ qua `React.lazy` (ví dụ `PdfViewer`).
3. **Props:** Luôn khai báo `interface <ComponentName>Props` nằm ngay phía trên component.
4. **Tailwind CSS:**
   - 100% style bằng Tailwind classes, không viết file `.css` lẻ cho component.
   - Ghép class động bắt buộc qua hàm tiện ích `cn(...)` từ `@shared/utils/cn`.
   - Màu sắc dùng token ngữ nghĩa của design system (`bg-primary`, `text-muted-foreground`, `border-border`).
   - Dark mode hỗ trợ thông qua biến CSS (CSS variables), không hardcode mã hex.
   - Inline `style` chỉ dùng cho giá trị động runtime tính bằng pixel/phần trăm mà Tailwind không định trước được.
5. **Khả năng chịu lỗi (Resilience):**
   - Màn hình bất đồng bộ phải xử lý đủ 4 trạng thái: Loading, Error, Empty, Success qua các component dùng chung `AsyncView`, `LoadingState`, `ErrorState`, `EmptyState`.
   - Thông báo Toast cho người dùng dùng `sonner` (`ThemedToaster`). Tuyệt đối không dùng `alert()` hay `confirm()` của trình duyệt.

### 4.4 Quản lý State: TanStack Query v5 & Zustand v5

#### TanStack Query v5 (Server State):
- Mọi dữ liệu từ backend/mock đồng bộ qua React Query, **không sao chép vào Zustand**.
- Cú pháp object bắt buộc: `useQuery({ queryKey, queryFn })`, `useMutation({ mutationFn })`.
- Quản lý query key bằng factory pattern trong `<feature>/api/queryKeys.ts`:
  ```ts
  export const courseKeys = {
    all: ['courses'] as const,
    lists: () => [...courseKeys.all, 'list'] as const,
    detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
  };
  ```
- Mutation phải invalidate query key liên quan trong `onSuccess` và trả về promise để giữ trạng thái `isPending` chuẩn xác.
- Mock data không bao giờ mutate trực tiếp tại chỗ; luôn trả về shallow/deep clone mới.

#### Zustand v5 (Client State):
- Chỉ dùng cho global client state thực sự (theme, sidebar collapsed, session phiên làm việc tạm).
- Store toàn cục đặt tại `core/store/`; store cục bộ feature đặt tại `features/<name>/store/use<Name>Store.ts`.
- Luôn gọi kèm **selector nhỏ nhất** (`const userName = useAuthStore((s) => s.user?.name)`). Nếu chọn nhiều giá trị, dùng `useShallow`. Tuyệt đối không gọi `useAuthStore()` trần.
- Cấm đưa form state vào Zustand khi chỉ có 1 component cần dùng.

---

## 5. Quy chuẩn Backend (`lms-backend`)

### 5.1 Tech Stack Chuẩn

- **Framework:** NestJS 12, TypeScript (Strict mode, ESM).
- **Cơ sở dữ liệu & ORM:** PostgreSQL, TypeORM 1.x (Database Factory hỗ trợ đa cơ sở dữ liệu).
- **Xác thực:** Passport (JWT, Google OAuth2).
- **Validation & Serialization:** `class-validator`, `class-transformer`.
- **Ghi log:** Winston Logger (xoay vòng file hàng ngày).
- **Testing & Linter:** Vitest, Supertest, oxlint.

> [!IMPORTANT]
> **Chuẩn ESM trong Backend:**
> File `package.json` khai báo `"type": "module"`. Mọi import nội bộ trong mã nguồn TypeScript **bắt buộc phải có đuôi `.js`** (ví dụ: `import { UserService } from '../services/user.service.js';`).

### 5.2 Kiến trúc Modular Monolith & Ranh giới Module

```
src/
├── main.ts · app.module.ts
├── common/                 # Hạ tầng dùng chung không gắn với domain nghiệp vụ nào
│   ├── decorators/ enums/ filters/ interceptors/ logger/ types/ guards/
│   └── common.module.ts    # Đăng ký ValidationPipe, Filter, Interceptor toàn cục
├── config/                 # Quản lý env, factory kết nối database
├── shared/<name>/          # Dịch vụ hạ tầng chia sẻ (file, notification)
└── modules/<name>/         # Domain nghiệp vụ độc lập
    ├── <name>.module.ts
    ├── index.ts            # PUBLIC API của module
    ├── controllers/        # Tiếp nhận HTTP request
    ├── services/           # Logic nghiệp vụ
    ├── repositories/       # Thao tác DB / TypeORM
    ├── facades/            # Cổng giao tiếp cho module khác gọi sang
    ├── entities/           # Thực thể TypeORM
    ├── dto/                # Data Transfer Object đầu vào
    └── types/              # View model, kiểu dữ liệu nội bộ
```

#### Phân công trách nhiệm các tầng:
| Thành phần | Trách nhiệm chính | Điều cấm |
|---|---|---|
| **Controller** | Tiếp nhận HTTP, validate DTO, gọi Service, trả response thô | Chứa logic nghiệp vụ, gọi Repository trực tiếp |
| **Service** | Xử lý logic nghiệp vụ, ném HttpException chuẩn của Nest | Truy cập DB trực tiếp (không qua Repository), truy cập Express req/res |
| **Repository** | Đóng gói mọi câu lệnh TypeORM, quản lý Transaction | Chứa logic nghiệp vụ phức tạp |
| **Facade** | Cung cấp interface công khai cho module khác; chuyển đổi Entity sang View | Chứa logic mới ngoài việc ủy quyền Service |
| **Entity** | Ánh xạ bảng DB và quan hệ | Chứa logic nghiệp vụ |
| **DTO** | Kiểm tra dữ liệu đầu vào bằng `class-validator` | Dùng làm kiểu dữ liệu trả về cho client |

#### Ranh giới module:
1. **Facade là cổng duy nhất:** Module A muốn dùng dữ liệu/hành vi của Module B **phải thông qua `ModuleBFacade`** được export từ `modules/b/index.ts`.
2. Service và Repository của mỗi module là **riêng tư (private)**, tuyệt đối không export ra ngoài module.
3. `exports` trong `*.module.ts` chỉ chứa Facade (và module hạ tầng).
4. Không tạo vòng phụ thuộc giữa các module (`Module A -> Module B -> Module A`). Nếu có logic chung, chuyển xuống `common/` hoặc `shared/`.
5. **Ngoại lệ duy nhất:** File Entity TypeORM được phép import trực tiếp Entity của module khác phục vụ khai báo quan hệ bảng (`@ManyToOne`, `@OneToMany`).

### 5.3 Entity & Cơ sở dữ liệu

- **Quy ước tên:** Tên bảng dùng `snake_case`, số nhiều (`@Entity('quiz_instances')`). Tên cột trong DB dùng `snake_case`, thuộc tính trong code dùng `camelCase`:
  ```ts
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;
  ```
- **Khóa chính:** Luôn dùng UUID v4 (`@PrimaryGeneratedColumn('uuid') readonly id: string;`).
- **Thời gian:** Sử dụng kiểu `timestamptz` (Timestamp with Time Zone).
- **Migration môi trường Production:**
  - Môi trường Local/Dev: Cho phép `synchronize: true` để tăng tốc độ phát triển.
  - Môi trường Production: **Bắt buộc tắt `synchronize`**. Mọi thay đổi cấu trúc bảng phải viết bằng file script SQL thủ công trong thư mục `migrations-manual/NNN-ten-migration.sql` (viết dạng idempotent: `IF NOT EXISTS`).

### 5.4 Controller, DTO & Exception

- **Controller:**
  - Luôn bảo vệ bằng `@UseGuards(JwtAuthGuard)` trừ route public.
  - Sử dụng `@CurrentUser()` để lấy thông tin phiên người dùng đăng nhập.
  - Mỗi controller trang bị một route smoke test `@Get('test')` trả về chuỗi text xác nhận module hoạt động.
- **DTO:**
  - Định nghĩa dạng `class` với các thuộc tính `readonly`.
  - Phải dùng `class` (không dùng `interface`) cho các tham số có decorator để hỗ trợ reflection metadata lúc runtime.
- **Exception:**
  - Ném các lớp ngoại lệ chuẩn của NestJS (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`).
  - Không bao giờ trả mã lỗi dạng string/number qua lệnh `return`.

### 5.5 Cấu hình & Ghi log

- **Biến môi trường:** Mọi biến môi trường mới bắt buộc phải khai báo validation trong `src/config/env.validation.ts` và bổ sung giá trị mẫu trong `.env.example`.
- **Đọc cấu hình:** Luôn đọc cấu hình qua `ConfigService` của NestJS. Cấm đọc `process.env` rải rác trong Controller và Service.
- **Ghi log:** Sử dụng `LoggerService` (Winston) hoặc `new Logger(Context.name)`. Hệ thống tự động ghi và xoay vòng file log 14 ngày trong thư mục `logs/`.

---

## 6. Chiến lược Kiểm thử (Testing Standards)

### 6.1 Tổng quan & Công cụ

| Tầng kiểm thử | Frontend | Backend | Vị trí đặt file |
|---|---|---|---|
| **Unit Test** | Vitest + Testing Library | Vitest + `@nestjs/testing` | **Nằm cạnh file nguồn kiểm thử** (`*.test.ts(x)` / `*.spec.ts`) |
| **Integration Test** | Vitest | Vitest + Supertest (Mock DB) | Nằm cạnh file nguồn kiểm thử |
| **E2E / API Test** | Playwright (`*.spec.ts`) | Vitest + Supertest (`*.e2e-spec.ts`) | `lms-frontend/e2e/` hoặc `lms-backend/test/` |

### 6.2 Quy tắc viết test

1. **Vị trí file:** Unit test nằm **ngay cạnh file nguồn** (cùng thư mục). Ví dụ:
   - Frontend: `features/auth/hooks/useLogin.test.ts` cạnh `useLogin.ts`.
   - Backend: `modules/auth/services/refresh-token.service.spec.ts` cạnh `refresh-token.service.ts`.
   - Cấm tạo thư mục `__tests__/`.
2. **Cấu trúc test:** Tuân thủ quy tắc **Arrange - Act - Assert** (hoặc Given - When - Then).
3. **Đặt tên biến trong test:** Rõ nghĩa theo ngữ cảnh: `inputX`, `mockX`, `actualX`, `expectedX`.
4. **Tiêu đề test:** Viết bằng tiếng Anh, mô tả hành vi:
   ```ts
   describe('RefreshTokenService.rotateToken', () => {
     it('should revoke previous token family when reuse is detected', async () => { ... });
   });
   ```
5. **Mỗi Bug Fix đi kèm một Test:** Khi phát hiện và sửa bug, bắt buộc bổ sung 1 test tái hiện lỗi vào test suite để ngăn chặn tái phát (regression).
6. **Không phụ thuộc DB thật trong Unit Test:** Sử dụng test doubles (`vi.fn()`, mock repository) cho các dependency bên ngoài.

---

## 7. Quy trình Git, PR & Definition of Done

### 7.1 Chiến lược Nhánh & Commit

Tuân thủ hướng dẫn tại [`GIT_STRATEGY.md`](GIT_STRATEGY.md):
- **Tên nhánh:** `feature/<module>-<mô-tả-ngắn>`, `fix/<module>-<mô-tả-ngắn>`, `chore/<mô-tả>`.
- **Commit Message:** Định dạng Conventional Commits ở thể mệnh lệnh, không có dấu chấm ở cuối:
  ```
  feat(auth): support google sso login
  fix(exam): prevent double submission on network latency
  test(assignment): add unit test for grading calculation
  ```
- **Hợp nhất:** Sử dụng **Squash and Merge** để giữ git log sạch sẽ. Không tự ý bấm Merge khi chưa có phê duyệt (review approval).

### 7.2 Checklist Hoàn thành (Definition of Done)

Một tác vụ chỉ được coi là hoàn thành khi đáp ứng đầy đủ checklist sau:

- [ ] Toàn bộ lệnh kiểm tra tự động chạy xanh trên máy dev:
  - Frontend: `pnpm typecheck`, `pnpm lint`, `pnpm check:arch`, `pnpm test`, `pnpm build`.
  - Backend: `pnpm lint`, `pnpm build`, `pnpm test` (và `pnpm test:e2e` nếu sửa đổi endpoint).
- [ ] 0 lỗi, 0 cảnh báo lint. Không thêm `eslint-disable`, `@ts-ignore`, `any`, `console.*`, `TODO`.
- [ ] Định dạng mã nguồn chuẩn với `pnpm format` (Prettier `semi: true`).
- [ ] File mới đặt đúng vị trí thư mục và tuân thủ hậu tố đặt tên quy định.
- [ ] Các ranh giới tầng và ranh giới module được tuân thủ tuyệt đối (không có import chu trình, không import sâu xuyên feature/module).
- [ ] Đã viết unit test / integration test cho logic mới hoặc bug fix.
- [ ] Biến môi trường mới (nếu có) đã được khai báo trong validation file và file `.env.example`.
- [ ] Không có file `.env`, token, chuỗi kết nối, secret hay dữ liệu nhạy cảm lọt vào Git diff.
