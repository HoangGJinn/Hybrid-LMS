# 🎓 Hybrid LMS

A modern, enterprise-grade Learning Management System (LMS) built with a strict **Modular Monolith** architecture. This project provides a scalable foundation for managing courses, users, and enrollments using the latest technologies in the TypeScript ecosystem.

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS + Shadcn UI
- **Routing**: React Router DOM v6
- **Authentication**: `@react-oauth/google`

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (via TypeORM)
- **Architecture**: Modular Monolith & Facade Pattern
- **Logging**: Winston (Daily Rotate File)
- **Authentication**: JWT & Passport (Google OAuth2)

---

## 🏗️ Architecture & Design Patterns

This project enforces strict architectural guidelines to ensure maintainability and scalability:

1. **Modular Monolith**: The backend is divided into distinct business domains (e.g., `Auth`, `User`, `Course`). Each module is isolated and self-contained.
2. **Facade Pattern**: Modules communicate with each other exclusively through Facades (e.g., `UserFacade`). Services are kept strictly private to their respective modules to prevent tight coupling.
3. **Global Exception & Response Handling**:
   - `AllExceptionsFilter`: Catches all unhandled errors and normalizes them into a consistent JSON error format.
   - `ResponseInterceptor`: Wraps all successful responses in a standard `{ success, statusCode, data, timestamp }` envelope.
4. **Database Factory**: Database initialization is abstracted via a Factory pattern, allowing seamless switching between PostgreSQL, MySQL, and SQLite.
5. **Centralized Logging**: Replaces the default NestJS logger with Winston, automatically routing all system and business logs into rotating local files (`logs/application-YYYY-MM-DD.log`).

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- `pnpm` (preferred) or `npm`
- PostgreSQL instance (local or cloud)

### 1. Setup Backend
```bash
cd lms-backend
pnpm install
```

Create a `.env` file in `lms-backend/`:
```env
PORT=9595
FRONTEND_URL=http://localhost:3000

# Database Configuration (PostgreSQL)
DB_HOST=your_db_host
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name

# Authentication
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

Start the backend server:
```bash
pnpm run dev
```

### 2. Setup Frontend
```bash
cd lms-frontend
npm install
```

Create a `.env` file in `lms-frontend/`:
```env
VITE_API_URL=http://localhost:9595
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Start the frontend development server:
```bash
npm run dev
```

---

## ✨ Features (Current Status)
- [x] **Core Architecture Setup**
- [x] **PostgreSQL Integration** (with SSL/CA Support)
- [x] **Global Logging System** (Winston Daily Rotate)
- [x] **API Standardization** (Global Interceptors & Filters)
- [x] **Google OAuth2 Authentication**
- [x] **JWT Session Management & Logout**
- [ ] **Course Management Module** (WIP)
- [ ] **Enrollment System** (WIP)

---

## 📜 License
This project is proprietary and confidential.
