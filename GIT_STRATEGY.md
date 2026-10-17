# 🌿 TÀI LIỆU QUY TRÌNH QUẢN LÝ MÃ NGUỒN (SIMPLIFIED GITFLOW)
### Dự án: Hybrid Learning Management System (LMS)

---

## 📌 Mục lục

1. [Cấu Trúc Các Nhánh (Branching Model)](#1-cấu-trúc-các-nhánh-branching-model)
2. [Quy Chuẩn Đặt Tên (Naming Conventions)](#2-quy-chuẩn-đặt-tên-naming-conventions)
3. [Luồng Làm Việc Trực Tiếp (Step-by-Step Workflow)](#3-luồng-làm-việc-trực-tiếp-step-by-step-workflow)
4. [Quy Tắc Kỷ Luật Nhóm (Team Discipline Rules)](#4-quy-tắc-kỷ-luật-nhóm-team-discipline-rules)
5. [Cổng Chất Lượng Trước Khi Merge (Quality Gates)](#5-cổng-chất-lượng-trước-khi-merge-quality-gates)

---

## 1. Cấu Trúc Các Nhánh (Branching Model)

Hệ thống Git của dự án bao gồm **2 nhánh cố định** và **các nhánh tạm thời**. Tuyệt đối **không ai được quyền push (đẩy code) trực tiếp lên 2 nhánh cố định**.

```
master  (v1.0.0) ─────────────────────────────────────────────────────────────●─── (Release tag v1.0.0)
                                                                             /
develop (Active) ─────────●───────────────────────●─────────────────────────●─────
                           \                     /                         /
feature/quiz-ui             ●──────●────────────/                         /
                                    \                                    /
feature/bkt-model                    ●──────●───────────────────────────/
```

### 1.1 Hai nhánh cố định (Permanent Protected Branches)

* **`master` (Nhánh cố định - Production Ready):**
  * Chứa phiên bản code hoàn hảo nhất, đã vượt qua mọi bài kiểm thử (unit, integration, E2E) và tích hợp hoàn chỉnh.
  * Chỉ nhận code được merge từ nhánh `develop` (hoặc `hotfix/*` khi có sự cố khẩn cấp).
  * Dùng để deploy lên máy chủ thật (AWS) hoặc mang đi demo, nghiệm thu cho giảng viên/khách hàng.

* **`develop` (Nhánh cố định - Integration):**
  * Là trái tim của toàn bộ quá trình phát triển. Đây là nơi code của 3 thành viên hội tụ để kiểm tra tích hợp (ví dụ: test API của NestJS chạy với UI của React có khớp data không, hoặc service Backend gọi mô hình Python BKT có trả kết quả đúng chuẩn không).
  * Chỉ nhận code thông qua **Pull Request (PR)** từ các nhánh `feature/*` hoặc `bugfix/*`.

### 1.2 Các nhánh tạm thời (Temporary Branches)

* **`feature/*` (Nhánh phát triển tính năng):**
  * Tách ra từ: `develop`.
  * Mục đích: Dùng để làm các tính năng mới hoặc thay đổi kiến trúc của từng phân hệ (Backend, Frontend, AI).
  * Đích merge: `develop`.
  * Sẽ bị xóa sau khi merge thành công vào `develop`.

* **`bugfix/*` hoặc `hotfix/*` (Nhánh sửa lỗi):**
  * `bugfix/*`: Tách từ `develop` để sửa các lỗi phát sinh trong quá trình code hàng ngày giữa các thành viên. Sau khi sửa xong merge ngược lại `develop`.
  * `hotfix/*`: Tách từ `master` để sửa lỗi khẩn cấp khi hệ thống đang live/demo. Sau khi sửa xong, bắt buộc merge ngược lại vào **cả `master` và `develop`** để đồng bộ.

---

## 2. Quy Chuẩn Đặt Tên (Naming Conventions)

Sự chặt chẽ bắt đầu từ việc đặt tên nhánh và nội dung commit để mọi thành viên đều nắm rõ đồng đội đang phụ trách module nào.

### 2.1 Quy tắc đặt tên nhánh

**Cú pháp:**
```
<loại_nhánh>/<tên-module>-<mô-tả-ngắn>
```
*(Viết thường, không dấu, cách nhau bằng dấu gạch ngang - kebab-case)*

**Ví dụ cụ thể trong dự án:**
* **Tính năng mới (`feature/`):**
  * `feature/quiz-ui` *(Frontend: làm giao diện bài trắc nghiệm)*
  * `feature/bkt-python-model` *(AI: xây dựng thuật toán BKT dự đoán độ hiểu bài)*
  * `feature/auth-jwt-nestjs` *(Backend: hoàn thiện JWT session và guards)*
* **Sửa lỗi phát triển (`fix/` hoặc `bugfix/`):**
  * `fix/cors-error-api` *(Backend: sửa lỗi CORS khi gọi từ Vite)*
  * `fix/zustand-state-reset` *(Frontend: sửa lỗi mất state khi reload)*
  * `fix/exam-timer-expired` *(Frontend: sửa logic timer nộp bài thi)*
* **Tối ưu / Đổi cấu trúc (`refactor/`):**
  * `refactor/typeorm-entities` *(Backend: cấu trúc lại quan hệ giữa các bảng)*
  * `refactor/split-ui-components` *(Frontend: tách nhỏ các component trong CourseView)*

---

### 2.2 Quy tắc viết Commit Message (Conventional Commits)

**Cú pháp:**
```
<type>(<scope>): <mô tả ngắn bằng tiếng Anh hoặc tiếng Việt>
```

#### Các `type` chuẩn:
* **`feat`**: Thêm tính năng mới
* **`fix`**: Sửa lỗi logic, sửa bug
* **`chore`**: Việc lặt vặt (cập nhật dependency, cài đặt công cụ, cấu hình file build)
* **`refactor`**: Tái cấu trúc code (không làm đổi tính năng hiện tại)
* **`test`**: Bổ sung hoặc chỉnh sửa unit test, integration test, E2E
* **`docs`**: Sửa đổi tài liệu, Markdown, README

#### Các `scope` phổ biến trong nhóm:
* `(frontend)` hoặc `(ui)`: Các phần liên quan đến giao diện React 19
* `(backend)` hoặc `(api)`: Các phần liên quan đến NestJS API
* `(bkt)` hoặc `(ai)`: Các phần liên quan đến mô hình Bayesian Knowledge Tracing
* `(db)` hoặc `(entities)`: Các phần liên quan đến PostgreSQL / TypeORM
* `(auth)`: Xác thực người dùng, Google OAuth, JWT

#### Ví dụ commit message chuẩn:
```text
feat(bkt): tích hợp pyBKT để dự đoán điểm năng lực
fix(frontend): sửa lỗi đếm ngược thời gian bài thi
chore(db): cập nhật 43 bảng entity vào TypeORM
refactor(api): chuyển đổi interface sang class cho DTO
test(backend): bổ sung unit test cho refresh token service
```

---

## 3. Luồng Làm Việc Trực Tiếp (Step-by-Step Workflow)

Dưới đây là các thao tác Git chi tiết mỗi khi một thành viên bắt tay vào làm một task (ví dụ: Xây dựng module BKT hoặc làm UI bài kiểm tra).

```
[develop] ──────────────────────────── (Đồng bộ: git pull)
     \
      └── [feature/bkt-model] ─────── (Code & Commit)
               \
                └── (Đồng bộ ngược: git pull origin develop & giải quyết conflict)
                     \
                      └── (Tạo PR lên develop ──> Review ──> Squash & Merge)
```

### Bước 1: Đồng bộ mã nguồn mới nhất
Trước khi làm tính năng mới, luôn phải lấy code mới nhất từ `develop` về máy tính cá nhân để tránh conflict (xung đột).

```bash
git checkout develop
git pull origin develop
```

### Bước 2: Tạo nhánh làm việc riêng
Tạo một nhánh `feature` mới từ `develop` và chuyển sang nhánh đó:

```bash
git checkout -b feature/bkt-model
```

### Bước 3: Code và Commit
Thực hiện viết code trên máy tính. Hãy chia nhỏ các commit để dễ kiểm soát và rollback nếu cần:

```bash
git add .
git commit -m "feat(bkt): khởi tạo script huấn luyện mô hình BKT"
```

### Bước 4: Đồng bộ ngược (Rebase/Pull) trước khi đẩy code
Trong lúc bạn làm việc (có thể mất vài ngày), đồng đội có thể đã merge code của họ vào `develop`. Bạn cần kéo những thay đổi đó về nhánh của mình để xử lý xung đột (nếu có) ngay trên máy cá nhân, đảm bảo code của bạn tương thích với hệ thống hiện tại:

```bash
git pull origin develop
# (Nếu Git báo conflict, mở VS Code giải quyết xung đột, lưu file và commit lại)
```

### Bước 5: Đẩy nhánh lên Remote (GitHub / GitLab)

```bash
git push -u origin feature/bkt-model
```

### Bước 6: Tạo Pull Request (PR) và Code Review
1. Truy cập giao diện GitHub / GitLab, tạo Pull Request yêu cầu merge `feature/bkt-model` vào **`develop`**.
2. **Luật cứng:** Người code **không được tự bấm Merge**. Phải tag ít nhất 1 (hoặc cả 2) thành viên còn lại vào xem code.
3. Người review có trách nhiệm kiểm tra logic (ví dụ: biến môi trường path của Python trên Windows đã có `if __name__ == '__main__':` chưa, API có trả đúng format chuẩn chưa, UI có bị vỡ responsive không).
4. Khi có **ít nhất 1 lượt "Approve"**, PR mới được gộp theo hình thức **Squash and Merge** vào `develop`.
5. Xóa nhánh `feature/bkt-model` trên remote sau khi merge xong.

### Bước 7: Release (Merge sang `master`)
Khi nhánh `develop` đã tích lũy đủ các tính năng cho một cột mốc (ví dụ: Hoàn thành Sprint, chuẩn bị Demo giữa kỳ/cuối kỳ) và tất cả bài test (Frontend và Backend) đều chạy trơn tru:

1. Tạo Pull Request từ **`develop`** sang **`master`**.
2. Cả team cùng tham gia review và Approve.
3. Gộp vào `master`. Đánh tag phiên bản phát hành:
   ```bash
   git checkout master
   git pull origin master
   git tag -a v1.0.0 -m "Release v1.0.0: Hoàn thành Sprint tích hợp NestJS + React + BKT"
   git push origin v1.0.0
   ```

---

## 4. Quy Tắc Kỷ Luật Nhóm (Team Discipline Rules)

Để tránh mất code và đảm bảo tiến độ, cả 3 thành viên cam kết thực hiện nghiêm túc 4 điều kỷ luật:

1. **Không push thẳng (No Direct Push):**
   * **Khóa hoàn toàn quyền push trực tiếp lên nhánh `master` và `develop`**.
   * Mọi thay đổi bắt buộc phải đi qua Pull Request và có review.

2. **Kiểm tra cục bộ trước khi mở PR (Local Testing):**
   * Trước khi tạo PR, thành viên bắt buộc phải chạy thử code trên máy mình.
   * Nếu là **UI (React)**: Giao diện không được vỡ, responsive cơ bản chạy tốt, không sinh ra lỗi runtime ở Developer Tools.
   * Nếu là **API (NestJS)**: Ứng dụng phải khởi động thành công (`pnpm start:dev`), không bị văng lỗi biên dịch TypeScript, các module phụ thuộc không bị đứt kết nối.
   * Nếu là **AI (Python/BKT)**: Script phải chạy được độc lập và sinh ra output mẫu kiểm tra được.

3. **Môi trường độc lập (Bảo mật file `.env`):**
   * Tuyệt đối không commit file `.env` chứa chuỗi kết nối database (PostgreSQL credentials, API secret keys, Google Client Secret).
   * File `.env` phải luôn nằm trong `.gitignore`.
   * Khi thêm biến môi trường mới, cập nhật vào `.env.example` để 2 thành viên còn lại biết và tự cấu hình trên máy của họ.

4. **Merge theo hình thức Squash and Merge:**
   * Khi gộp PR từ `feature/*` vào `develop`, sử dụng **Squash and Merge** để gom toàn bộ các commit nhỏ nhặt (như `fix typo`, `wip`, `update code`) thành 1 commit duy nhất có ý nghĩa. Điều này giúp lịch sử nhánh `develop` và `master` luôn rõ ràng, sạch đẹp, dễ tra cứu và dễ rollback nếu có sự cố.

---

## 5. Cổng Chất Lượng Trước Khi Merge (Quality Gates)

> [!IMPORTANT]
> **NGUYÊN TẮC BẤT DI BẤT DỊCH (ZERO-TOLERANCE QUALITY GATE):**
> Nhánh `develop` và `master` là nơi hội tụ toàn bộ sản phẩm. Mọi Pull Request vi phạm **bất kỳ tiêu chí nào** dưới đây sẽ bị **hệ thống tự động từ chối (Block Merge)**. Tuyệt đối không có ngoại lệ "merge tạm rồi sửa sau".

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        QUY TRÌNH 5 CHỐT CHẶN CHẤT LƯỢNG (5-TIER GATES)                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
     │
     ├── 1. STATIC GATE     ➔ Typecheck 100% + Linter 0 warning/error
     │
     ├── 2. ARCH GATE       ➔ Không có import cycle + Đúng bảng phân tầng kiến trúc
     │
     ├── 3. TEST GATE       ➔ 100% Tests Pass + Coverage lõi ≥ 70%
     │
     ├── 4. SECURITY GATE   ➔ 0 file .env, 0 token, 0 credential lọt vào Git
     │
     └── 5. REVIEW GATE     ➔ Tối thiểu 1 Approve từ đồng đội + 0 Critical Bug
             │
             ▼
     [ SQUASH AND MERGE ] ➔ develop
```

### 5.1 Bảng ma trận tiêu chuẩn chi tiết theo từng phân hệ

| Chốt chặn kiểm soát | Phân hệ Frontend (`lms-frontend`) | Phân hệ Backend (`lms-backend`) | Phân hệ AI Engine (BKT) | Hậu quả khi vi phạm |
|---|---|---|---|:---:|
| **1. Biên dịch (Build / Typecheck)** | `pnpm typecheck`<br>*(0 type error)* | `pnpm build`<br>*(0 compilation error)* | `python -m py_compile`<br>*(0 syntax error)* | ❌ **Block PR** |
| **2. Mã sạch (Linting & Code Style)** | `pnpm lint`<br>*(0 error qua ESLint)* | `pnpm lint`<br>*(0 error qua oxlint)* | Tuân thủ chuẩn PEP8, đặt tên hàm rõ nghĩa | ❌ **Block PR** |
| **3. Kiểm soát kiến trúc (Architecture)** | `pnpm check:arch`<br>*(0 dependency cycle, đúng layer)* | Tuân thủ Modular Monolith (chỉ giao tiếp qua Facade) | Tách biệt logic thuật toán và I/O dữ liệu | ❌ **Block PR** |
| **4. Kiểm thử tự động (Automated Tests)** | `pnpm test`<br>*(100% unit & component test pass)* | `pnpm test` & `pnpm test:e2e`<br>*(100% unit & API test pass)* | Script test thuật toán sinh kết quả chuẩn xác | ❌ **Block PR** |
| **5. Độ phủ mã nguồn (Code Coverage)** | Coverage các hook/util cốt lõi **≥ 70%** | Coverage các service lõi (`auth`, `exam`,...) **≥ 70%** | Kiểm tra đầy đủ ca biên và dữ liệu bất thường | ❌ **Block PR** |
| **6. An toàn bảo mật (Security & Secrets)** | Không chứa API Key, Client Secret hoặc hardcoded IP | Không chứa connection string Postgres, secret JWT | Không chứa đường dẫn tuyệt đối cục bộ máy cá nhân | ❌ **Block PR & Revoke** |
| **7. Phê duyệt bắt buộc (Peer Review)** | Tối thiểu 1 thành viên review và Approve | Tối thiểu 1 thành viên review và Approve | Tối thiểu 1 thành viên review và Approve | ❌ **Không thể Merge** |

---

### 5.2 Các lệnh kiểm tra bắt buộc trước khi tạo PR (Self-Check Commands)

Trước khi bấm tạo Pull Request hoặc tag đồng đội vào review, lập trình viên **bắt buộc chạy bộ lệnh tự kiểm tra cục bộ** tương ứng trên máy mình:

#### 🎨 Phía Frontend:
```bash
# 1. Kiểm tra toàn bộ type TypeScript
pnpm typecheck

# 2. Quét lỗi cú pháp, quy chuẩn và import
pnpm lint

# 3. Quét kiến trúc (chống vòng lặp module, cấm import sai tầng)
pnpm check:arch

# 4. Chạy toàn bộ test suite
pnpm test
```
> *(Tất cả các lệnh trên phải hoàn thành trơn tru và trả về mã thoát `exit code 0`)*

#### ⚙️ Phía Backend:
```bash
# 1. Quét lỗi nhanh với oxlint
pnpm lint

# 2. Biên dịch NestJS TypeScript sang JavaScript
pnpm build

# 3. Chạy toàn bộ Unit & API Integration Tests
pnpm test
pnpm test:e2e
```

---

### 5.3 Quy chuẩn xử lý khi bị từ chối (Rejection & Resolution)

1. **Khi CI báo đỏ (Failed Checks):**
   * Người tạo PR chủ động xem log trên GitHub Actions / CI runner để xác định chính xác file và dòng code gây lỗi.
   * Tiến hành sửa lỗi ngay trên nhánh `feature/...` cá nhân ở máy local.
   * Commit và đẩy code tiếp tục: `git push origin feature/...`. PR sẽ tự động kích hoạt kiểm tra lại mà không cần mở PR mới.

2. **Khi Reviewer yêu cầu chỉnh sửa (Request Changes):**
   * Đọc kỹ phản hồi và giải quyết triệt để từng thread nhận xét.
   * Sau khi sửa xong, phản hồi lại trên GitHub để Reviewer kiểm tra lại và bấm **Approve**.

> [!CAUTION]
> **Tuyệt đối cấm:** Sử dụng quyền Admin để bypass Quality Gate hoặc bấm "Merge without review". Mọi vi phạm làm hỏng nhánh `develop` sẽ khiến cả nhóm phải dừng việc để rollback!
