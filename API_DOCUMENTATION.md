# 📘 Hybrid LMS - API Documentation

Tài liệu tổng hợp toàn bộ các RESTful API của hệ thống Backend (`lms-backend`) tính đến thời điểm hiện tại.

---

## 📌 1. Thông tin chung (General Information)

- **Base URL**: `http://localhost:9595/api`
- **Global Prefix**: `/api`
- **Cơ chế xác thực (Authentication)**:
  - Header: `Authorization: Bearer <access_token>`
  - Refresh Token: Tự động lưu và truyền qua `httpOnly cookie` (`refresh_token`).
- **Phân quyền (Roles)**:
  - `STUDENT`: Sinh viên
  - `LECTURER`: Giảng viên
  - `ADMIN`: Quản trị viên
- **Cấu trúc Response chuẩn (Standard Envelope)**:
  Tất cả request thành công đều được chuẩn hóa qua `ResponseInterceptor`:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Success",
    "data": { ... },
    "timestamp": "2026-10-18T16:00:00.000Z"
  }
  ```
- **Cấu trúc Error chuẩn (Error Envelope)**:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "message": "Chi tiết lỗi",
    "error": "Bad Request",
    "timestamp": "2026-10-18T16:00:00.000Z",
    "path": "/api/..."
  }
  ```

---

## 🔐 2. Auth Module (`/api/auth`)

Xử lý đăng nhập Google OAuth2, cấp phát và refresh JWT token, quản lý phiên đăng nhập.

### 2.1. Kiểm tra trạng thái Module
- **Endpoint**: `GET /api/auth/test`
- **Auth**: Public
- **Response**: `"Auth module OK"`

### 2.2. Đăng nhập bằng Google
- **Endpoint**: `POST /api/auth/google`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```
- **Response `200 OK`**:
  *(Kèm cookie `refresh_token` httpOnly)*
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "2ebff8e4-d19b-411b-977a-3e0cbf617253",
      "email": "nguyenhoanggiap2005@gmail.com",
      "fullName": "Giáp Hoàng",
      "role": "STUDENT",
      "avatarUrl": "https://lh3.googleusercontent.com/...",
      "code": "SV2005001"
    }
  }
  ```

### 2.3. Làm mới Access Token (Refresh)
- **Endpoint**: `POST /api/auth/refresh`
- **Auth**: Public (Cần cookie `refresh_token`)
- **Response `200 OK`**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "user": { ... }
  }
  ```

### 2.4. Lấy thông tin phiên hiện tại
- **Endpoint**: `GET /api/auth/me`
- **Auth**: `STUDENT`, `LECTURER`, `ADMIN`
- **Response `200 OK`**: Trả về thông tin `SessionUser` kèm mã số `code` (SV... hoặc GV...).

### 2.5. Đăng xuất (Logout)
- **Endpoint**: `POST /api/auth/logout`
- **Auth**: Public (Thu hồi token family và xóa cookie `refresh_token`)
- **Response `200 OK`**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

## 👥 3. User Module (`/api/users`)

Quản lý thông tin tài khoản người dùng và hồ sơ tương ứng.

### 3.1. Lấy thông tin tài khoản hiện tại từ Token
- **Endpoint**: `GET /api/users/me`
- **Auth**: `STUDENT`, `LECTURER`, `ADMIN`
- **Response `200 OK`**:
  ```json
  {
    "id": "2ebff8e4-d19b-411b-977a-3e0cbf617253",
    "email": "nguyenhoanggiap2005@gmail.com",
    "role": "STUDENT"
  }
  ```

### 3.2. Danh sách người dùng (Hỗ trợ lọc theo Role)
- **Endpoint**: `GET /api/users`
- **Auth**: `ADMIN`
- **Query Params**:
  - `role` *(optional)*: `LECTURER` | `STUDENT` | `ADMIN`
- **Mục đích**: Admin dùng để lấy danh sách giảng viên (`?role=LECTURER`) khi tạo/phân công lớp học.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "email": "lecturer.an@hcmute.edu.vn",
      "fullName": "TS. Nguyễn Văn An",
      "role": "LECTURER",
      "isActive": true
    }
  ]
  ```

---

## 🎓 4. Academic - Classes / Courses Module (`/api/classes`)

Quản lý lớp học môn học, danh sách khóa học của sinh viên và giảng viên.

### 4.1. Lớp học của tôi (My Classes)
- **Endpoint**: `GET /api/classes/my`
- **Auth**: `STUDENT`, `LECTURER`, `ADMIN`
- **Mục đích**:
  - Dành cho màn hình **My Courses** & **Dashboard** ở Frontend.
  - Tự động nhận diện role từ JWT:
    - `STUDENT`: Trả về các lớp đã ghi danh trong `class_students`.
    - `LECTURER`: Trả về các lớp giảng viên phụ trách (`lecturer_id = user.id`).
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "415cb5b1-216d-4c5e-8a78-2a3f043ab638",
      "classCode": "WEB26",
      "name": "WEB-java26",
      "isActive": true,
      "endedAt": null,
      "subjectId": "cd933a4d-fa9e-4790-aa34-6cc75f89c4f5",
      "subjectCode": "CS101",
      "subjectName": "Nhập môn lập trình",
      "semesterId": "003d1302-0867-4199-a37c-2a6663564bfb",
      "semesterCode": "HK1-2026",
      "semesterName": "Học kỳ 1 - 2026",
      "lecturerId": "b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e",
      "lecturerName": "ThS. Trần Thị Bình",
      "studentCount": 3,
      "progress": 0
    }
  ]
  ```

### 4.2. Chi tiết lớp học
- **Endpoint**: `GET /api/classes/:id`
- **Auth**: `STUDENT`, `LECTURER`, `ADMIN`
- **Param**: `:id` (UUID của lớp)
- **Response `200 OK`**: Trả về `ClassView` chi tiết của lớp học kèm sĩ số học sinh và progress.

### 4.3. Danh sách toàn bộ lớp học (Admin)
- **Endpoint**: `GET /api/classes`
- **Auth**: `ADMIN`
- **Query Params**:
  - `isActive` *(boolean, optional)*: `true` | `false`
  - `semesterId` *(uuid, optional)*: Lọc theo học kỳ
  - `search` *(string, optional)*: Tìm kiếm theo tên hoặc mã lớp
- **Response `200 OK`**: Mảng `ClassView[]` kèm `studentCount`.

### 4.4. Tạo lớp học mới
- **Endpoint**: `POST /api/classes`
- **Auth**: `ADMIN`
- **Request Body**:
  ```json
  {
    "classCode": "CS102.N01",
    "name": "Lập trình hướng đối tượng - N01",
    "subjectId": "5e1cffcb-d69a-443c-bfe4-a99790287888",
    "semesterId": "003d1302-0867-4199-a37c-2a6663564bfb",
    "lecturerId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
  }
  ```
- **Validation**:
  - `classCode`: Không được trùng lặp.
  - `subjectId`, `semesterId`: Phải tồn tại trong hệ thống.
  - `lecturerId`: Phải tồn tại và tài khoản phải có role `LECTURER`.
- **Response `201 Created`**: Trả về `ClassView` mới tạo.

### 4.5. Cập nhật thông tin lớp học
- **Endpoint**: `PATCH /api/classes/:id`
- **Auth**: `ADMIN`
- **Request Body**: (Mọi trường đều optional)
  ```json
  {
    "name": "Lập trình hướng đối tượng - N01 (Cập nhật)",
    "lecturerId": "b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e"
  }
  ```
- **Response `200 OK`**: `ClassView` sau khi cập nhật.

### 4.6. Đóng / Hủy kích hoạt lớp học
- **Endpoint**: `PATCH /api/classes/:id/deactivate`
- **Auth**: `ADMIN`
- **Chức năng**: Đổi `isActive = false`, gán `endedAt = now()`.
- **Response `200 OK`**: `ClassView` với trạng thái `isActive: false`.

---

## 📚 5. Academic - Subjects Module (`/api/subjects`)

Quản lý danh mục môn học (phục vụ chọn môn học khi tạo lớp).

| Method | Endpoint | Auth | Chức năng | Request Body |
|---|---|---|---|---|
| `GET` | `/api/subjects` | `ADMIN` | Danh sách tất cả môn học | Không |
| `GET` | `/api/subjects/:id` | `ADMIN` | Chi tiết 1 môn học | Không |
| `POST` | `/api/subjects` | `ADMIN` | Tạo môn học mới | `{"subjectCode": "CS105", "name": "Web Dev", "description": "..."}` |
| `PATCH` | `/api/subjects/:id` | `ADMIN` | Sửa môn học | `{"name": "...", "description": "..."}` |
| `DELETE` | `/api/subjects/:id` | `ADMIN` | Xóa môn học | Không |

---

## 📅 6. Academic - Semesters Module (`/api/semesters`)

Quản lý danh mục học kỳ (phục vụ chọn học kỳ khi tạo lớp).

| Method | Endpoint | Auth | Chức năng | Request Body |
|---|---|---|---|---|
| `GET` | `/api/semesters` | `ADMIN` | Danh sách tất cả học kỳ | Không |
| `GET` | `/api/semesters/:id` | `ADMIN` | Chi tiết 1 học kỳ | Không |
| `POST` | `/api/semesters` | `ADMIN` | Tạo học kỳ mới | `{"semesterCode": "HK1-2027", "name": "HK1 2027", "startDate": "2027-09-01", "endDate": "2027-12-31"}` |
| `PATCH` | `/api/semesters/:id` | `ADMIN` | Cập nhật học kỳ | `{"name": "...", "endDate": "..."}` |
| `DELETE` | `/api/semesters/:id` | `ADMIN` | Xóa học kỳ | Không |

---

## 🧪 7. Dữ liệu mẫu kiểm thử nhanh (Seed Data)

### Tài khoản sinh viên đã gán sẵn vào lớp `WEB26`:
1. `nguyenhoanggiap2005@gmail.com` (Mã SV: `SV2005001`)
2. `thanhtratik@gmail.com` (Mã SV: `SV2005002`)
3. `ngochuynh150905@gmail.com` (Mã SV: `SV2005003`)

### Tài khoản quản trị viên:
- `hoanggiap1803@gmail.com` (Role: `ADMIN`)

### Tài khoản giảng viên mẫu:
- `lecturer.an@hcmute.edu.vn` (`a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d` - TS. Nguyễn Văn An)
- `lecturer.binh@hcmute.edu.vn` (`b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e` - ThS. Trần Thị Bình)

### Khóa học đang active:
- **ID**: `415cb5b1-216d-4c5e-8a78-2a3f043ab638`
- **Class Code**: `WEB26` (`WEB-java26`)
- **Môn học**: `cd933a4d-fa9e-4790-aa34-6cc75f89c4f5` (CS101)
- **Học kỳ**: `003d1302-0867-4199-a37c-2a6663564bfb` (HK1-2026)
