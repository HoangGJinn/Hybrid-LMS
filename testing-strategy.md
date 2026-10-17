# 🧪 Chiến lược Kiểm thử — Hybrid LMS

## Phần 1: Phân biệt các loại Test

### 🔷 1.1 Khái niệm cốt lõi

```
                        ╔══════════════════╗
                        ║    E2E / UI Test ║  ← Ít nhất, chạy chậm nhất
                        ╠══════════════════╣
                        ║   API Test       ║
                        ╠══════════════════╣
                        ║ Integration Test ║
                        ╠══════════════════╣
                        ║   Unit Test      ║  ← Nhiều nhất, chạy nhanh nhất
                        ╚══════════════════╝
                          Testing Pyramid
```

| Loại | Kiểm tra cái gì? | Tốc độ | Cô lập | Tool |
|---|---|---|---|---|
| **Unit Test** | Một hàm / class / hook đơn lẻ | ⚡ Rất nhanh | ✅ Hoàn toàn (mock all deps) | Vitest |
| **Integration Test** | Nhiều module phối hợp nhau | 🚀 Nhanh | ⚠️ Một phần (mock DB, HTTP) | Vitest + `@nestjs/testing` |
| **API Test** | HTTP endpoint thực sự | 🐢 Trung bình | ❌ Không (app chạy thật, DB test) | Supertest + Vitest |
| **E2E / UI Test** | Toàn bộ luồng từ browser | 🐌 Chậm nhất | ❌ Không (stack đầy đủ) | Playwright |
| **Non-functional Test** | Hiệu suất, bảo mật, khả năng tiếp cận | - | - | Lighthouse, k6 |

---

### 🔷 1.2 Ví dụ cụ thể trong Hybrid LMS

#### ✅ Unit Test
> **Câu hỏi:** "Hàm này có hoạt động đúng khi đứng một mình không?"

```typescript
// Backend: refresh-token.service.spec.ts (đã có)
it('rejects an expired token', async () => {
  const { service } = createService({ ...activeToken(), expiresAt: new Date(Date.now() - ONE_MINUTE_MS) })
  await expect(service.rotate('raw')).rejects.toThrow(UnauthorizedException)
})

// Frontend (cần thêm): useCountdown.test.ts
it('counts down from 10 to 0', () => {
  const { result } = renderHook(() => useCountdown(10))
  expect(result.current.remaining).toBe(10)
})
```

#### ✅ Integration Test
> **Câu hỏi:** "Module A + Module B khi kết hợp có hoạt động đúng không?"

```typescript
// Backend: auth.controller + auth.service + mock DB
describe('AuthModule integration', () => {
  let authService: AuthService

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    })
    .overrideProvider(getRepositoryToken(User))
    .useValue(mockUserRepo)   // ← mock chỉ DB, còn lại thật
    .compile()

    authService = module.get(AuthService)
  })

  it('login flow creates refresh token', async () => { ... })
})
```

#### ✅ API Test (HTTP / Contract)
> **Câu hỏi:** "Endpoint POST /auth/login có trả đúng status code và body không?"

```typescript
// Backend: auth.e2e-spec.ts
it('POST /auth/login returns 200 with tokens', async () => {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'student@test.com', password: 'Test1234!' })
    .expect(200)

  expect(res.body.data).toHaveProperty('accessToken')
  expect(res.body.data).toHaveProperty('refreshToken')
})

// Âm: sai password
it('POST /auth/login returns 401 for wrong password', async () => {
  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'student@test.com', password: 'wrong' })
    .expect(401)
})
```

#### ✅ E2E / UI Test
> **Câu hỏi:** "Người dùng thật có thể hoàn thành luồng login → thi → nộp bài không?"

```typescript
// Frontend: exam-flow.e2e.ts (Playwright)
test('student completes exam flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'student@test.com')
  await page.fill('[data-testid="password"]', 'Test1234!')
  await page.click('[data-testid="login-btn"]')

  await page.goto('/exams/1/take')
  await page.click('[data-testid="start-exam"]')
  await page.click('[data-testid="answer-A"]')
  await page.click('[data-testid="submit-exam"]')

  await expect(page.locator('[data-testid="exam-result"]')).toBeVisible()
})
```

#### ✅ Non-functional Test
> **Câu hỏi:** "App có đủ nhanh, đủ bảo mật, đủ dễ tiếp cận không?"

```bash
# Performance: Lighthouse CI
pnpm lighthouse https://localhost:3000 --budget.json

# Load test: k6
k6 run --vus 50 --duration 30s scripts/load-test.js

# Accessibility: axe-core (tích hợp Playwright)
await checkA11y(page)
```

---

## Phần 2: Kế hoạch Kiểm thử cho Hybrid LMS

### 🗂️ 2.1 Phạm vi theo Module

#### Backend (NestJS) — 10 modules

| Module | Unit | Integration | API (E2E) | Độ phức tạp |
|---|:---:|:---:|:---:|---|
| `auth` | ✅ Có sẵn 1 | ❌ Cần thêm | ❌ Cần thêm | ⭐⭐⭐ Cao |
| `user` | ❌ | ❌ | ❌ | ⭐⭐ |
| `academic` | ❌ | ❌ | ❌ | ⭐⭐ |
| `content` | ❌ | ❌ | ❌ | ⭐⭐ |
| `assignment` | ❌ | ❌ | ❌ | ⭐⭐⭐ |
| `exam` | ❌ | ❌ | ❌ | ⭐⭐⭐ Cao |
| `assessment-generation` | ❌ | ❌ | ❌ | ⭐⭐⭐ Cao |
| `mastery` | ❌ | ❌ | ❌ | ⭐⭐ |
| `roadmap` | ❌ | ❌ | ❌ | ⭐⭐ |
| `document` | ❌ | ❌ | ❌ | ⭐ |

#### Frontend (React) — 16 features

| Feature | Unit (hooks/utils) | Component | E2E flow | Độ ưu tiên |
|---|:---:|:---:|:---:|---|
| `auth` | ❌ | ❌ | ❌ | 🔴 Critical |
| `exams` | ❌ | ❌ | ❌ | 🔴 Critical |
| `assignments` | ❌ | ❌ | ❌ | 🟠 High |
| `grading` | ❌ | ❌ | ❌ | 🟠 High |
| `courses` | ❌ | ❌ | ❌ | 🟠 High |
| `dashboard` | ❌ | ❌ | ❌ | 🟡 Medium |
| `ai-generate` | ❌ | ❌ | ❌ | 🟡 Medium |
| `mastery` | ❌ | ❌ | ❌ | 🟡 Medium |
| Còn lại | ❌ | ❌ | ❌ | 🟢 Low |

---

### 🛠️ 2.2 Toolchain được chọn

#### Backend
```
Vitest           → Unit + Integration test (đã cấu hình ✅)
@nestjs/testing  → DI container test (đã cài ✅)
supertest        → HTTP API test (đã cài ✅)
@vitest/coverage-v8 → Coverage report (đã cài ✅)
```

#### Frontend
```
Vitest + @testing-library/react  → Unit + Component test (Đã cài & cấu hình ✅)
@testing-library/jest-dom        → Custom DOM matchers (Đã cài ✅)
@testing-library/user-event      → Simulate user interaction (Đã cài ✅)
jsdom                            → Browser DOM environment (Đã cài ✅)
@vitest/coverage-v8              → Coverage report (Đã cài ✅)
Playwright                       → E2E / UI test (Đã cài & cấu hình ✅)
@axe-core/playwright             → Accessibility check (cần cài ❌)
```

---

### 📐 2.3 Cấu trúc file test

#### Backend — đặt spec cạnh file gốc
```
src/modules/auth/
├── services/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts          ← Unit test
│   ├── refresh-token.service.ts
│   └── refresh-token.service.spec.ts ← Unit test (✅ đã có)
├── controllers/
│   ├── auth.controller.ts
│   └── auth.controller.spec.ts       ← Integration test
test/
├── auth.e2e-spec.ts                  ← API / E2E test
├── exam.e2e-spec.ts
└── setup.ts                          ← DB seed + teardown
```

#### Frontend — đặt test cạnh code
```
src/
├── shared/hooks/
│   ├── useCountdown.ts
│   └── useCountdown.test.ts           ← Unit test hook
├── features/auth/
│   ├── hooks/
│   │   ├── useLogin.ts
│   │   └── useLogin.test.ts           ← Unit test hook + mock API
│   └── components/
│       ├── LoginForm.tsx
│       └── LoginForm.test.tsx         ← Component test
e2e/                                   ← Playwright tests
├── auth.e2e.ts
├── exam-flow.e2e.ts
└── playwright.config.ts
```

---

### 📊 2.4 Yêu cầu Coverage ≥ 70%

#### Backend — vitest.config.ts (cập nhật)
```typescript
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.module.ts',    // DI glue — không cần test
        'src/**/*.dto.ts',       // Data class — không logic
        'src/**/*.entity.ts',    // TypeORM entity
        'src/main.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
})
```

#### Frontend — vitest.config.ts (Đã cấu hình ✅)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
      '@core': `${import.meta.dirname}/src/core`,
      '@shared': `${import.meta.dirname}/src/shared`,
      '@features': `${import.meta.dirname}/src/features`,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/router.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.types.ts',
      ],
      // Target threshold ≥ 70% for core modules (uncomment for CI check):
      // thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
})
```

#### Frontend — playwright.config.ts (Đã cấu hình ✅)
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

---

### 🔁 2.5 Ưu tiên và lộ trình triển khai

#### Giai đoạn 1 — Setup (Tuần 1)
- [x] Cài Vitest + Testing Library + jsdom + v8 coverage cho frontend (✅ Đã hoàn tất)
- [x] Cài Playwright E2E cho frontend (✅ Đã hoàn tất)
- [ ] Cập nhật `vitest.config.ts` backend với coverage thresholds
- [ ] Tạo test database riêng (`.env.test`)
- [ ] Tạo `test/setup.ts` cho E2E backend (seed data)

#### Giai đoạn 2 — Unit Test cốt lõi (Tuần 2-3)
- [ ] Backend: `auth.service.spec.ts`, `token.service.spec.ts`
- [ ] Backend: `exam` service (logic tính điểm, timer)
- [ ] Backend: `assignment` service (submit, grading)
- [ ] Frontend: `useLogin`, `useCountdown`, `useAuthStore`
- [ ] Frontend: `LoginForm` component test

#### Giai đoạn 3 — Integration + API Test (Tuần 3-4)
- [ ] Backend: `AuthModule` integration test
- [ ] Backend API: `POST /auth/login`, `POST /auth/refresh`
- [ ] Backend API: `GET /exams/:id`, `POST /exams/:id/submit`
- [ ] Backend API: `POST /assignments/:id/submit`

#### Giai đoạn 4 — E2E + Non-functional (Tuần 4-5)
- [ ] E2E: Login flow (thành công + thất bại)
- [ ] E2E: Student thi → nộp bài → xem kết quả
- [ ] E2E: Giảng viên chấm bài
- [ ] Non-func: Lighthouse CI cho trang Dashboard
- [ ] Non-func: Accessibility check với axe-core

---

### 📋 2.6 Test Case Template (truy vết tới Acceptance Criteria)

| TC ID | Acceptance Criteria | Loại | Input | Expected Output | Ca | Status |
|---|---|---|---|---|---|---|
| TC-AUTH-001 | AC-1: SV đăng nhập bằng email/pass | API | email đúng + pass đúng | 200, có accessToken | Happy | ⬜ |
| TC-AUTH-002 | AC-1 | API | email đúng + pass sai | 401 Unauthorized | Âm | ⬜ |
| TC-AUTH-003 | AC-1 | API | email không tồn tại | 401 Unauthorized | Âm | ⬜ |
| TC-AUTH-004 | AC-1 | API | pass < 8 ký tự | 400 Bad Request | Biên | ⬜ |
| TC-AUTH-005 | AC-2: Refresh token | Unit | token hết hạn | throw UnauthorizedException | Âm | ✅ |
| TC-AUTH-006 | AC-2: Refresh token | Unit | token bị reuse | revoke family, throw | Âm | ✅ |
| TC-EXAM-001 | AC-5: SV bắt đầu thi | E2E | navigate /exams/1/take | Hiện đề thi, timer chạy | Happy | ⬜ |
| TC-EXAM-002 | AC-5: Timer hết giờ | E2E | Timer expires | Tự động nộp bài | Biên | ⬜ |

---

### 🐛 2.7 Bug Tracker & Vòng đời lỗi

#### Mức độ ưu tiên

| Mức | Định nghĩa | SLA fix |
|---|---|---|
| 🔴 **Critical/Blocker** | App crash, không đăng nhập được, mất data | Fix trước khi merge |
| 🟠 **High** | Tính năng cốt lõi bị sai, không có workaround | Fix trong sprint |
| 🟡 **Medium** | Tính năng phụ bị sai, có workaround | Fix trong sprint sau |
| 🟢 **Low** | UI lỗi nhỏ, typo | Backlog |

#### Vòng đời bug
```
[New] → [In Progress] → [Fixed] → [In Review] → [Verified] → [Closed]
                ↑                                      |
                └──────── [Reopened] ←─────────────────┘
                          (Regression test fail)
```

#### Regression Test
- Mỗi bug fix **phải đi kèm một test case** cover ca đó
- Test này được giữ lại vĩnh viễn trong suite để phòng regression
- Commit message format: `fix(exam): timer không reset khi reload [BUG-042]`

---

### ⚙️ 2.8 CI Pipeline

```yaml
# .github/workflows/test.yml (ví dụ)
jobs:
  backend-test:
    steps:
      - run: pnpm test --coverage      # Unit + Integration
      - run: pnpm test:e2e             # API test
      - uses: actions/upload-artifact  # Upload coverage report
        with: { path: coverage/lcov.info }

  frontend-test:
    steps:
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --coverage      # Unit + Component
      - run: pnpm check:arch

  e2e-test:
    steps:
      - run: pnpm playwright test      # Full E2E
```

> [!IMPORTANT]
> **100% test pass** là điều kiện bắt buộc để merge vào `main`. CI tự block nếu có test fail hoặc coverage dưới 70%.

---

### 📈 2.9 Tỉ lệ tự động hóa ≥ 70%

| Loại | Tổng TC dự kiến | Tự động | Thủ công |
|---|:---:|:---:|:---:|
| Unit Test | ~120 | 120 (100%) | 0 |
| Integration Test | ~30 | 30 (100%) | 0 |
| API Test | ~60 | 60 (100%) | 0 |
| E2E / UI Test | ~20 | 18 (90%) | 2 |
| Non-functional | ~10 | 6 (60%) | 4 |
| **Tổng** | **~240** | **~234 (≈ 97%)** | **~6** |

---

## Tóm tắt nhanh

| Yêu cầu | Giải pháp |
|---|---|
| ≥ 4 tầng kiểm thử | Unit → Integration → API → E2E + Non-functional |
| Coverage ≥ 70% | `thresholds` trong vitest.config.ts, CI block nếu dưới |
| ≥ 70% tự động hóa | ~97% tự động với Vitest + Playwright |
| 100% pass ở CI cuối | CI pipeline block merge nếu fail |
| 0 Critical/Blocker | Bug tracker với vòng đời, regression test bắt buộc |
| Truy vết tới AC | Test Case table với cột Acceptance Criteria |
