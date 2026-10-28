# Hướng dẫn chạy SonarQube Local

## Bước 1 — Khởi động SonarQube (chỉ cần làm 1 lần)

```bash
# Chạy từ thư mục gốc của repo
docker compose -f docker-compose.sonar.yml up -d
```

Đợi ~60 giây rồi mở trình duyệt vào: **http://localhost:9000**
- Username: `admin`
- Password: `admin` (hệ thống sẽ yêu cầu đổi mật khẩu ngay)

---

## Bước 2 — Lấy Token (chỉ cần làm 1 lần)

1. Vào **My Account** (góc phải trên cùng) → tab **Security**
2. Mục **Generate Tokens** → đặt tên bất kỳ (vd: `local-token`) → chọn loại **User Token** → bấm **Generate**
3. **Copy token lại** (chỉ hiện 1 lần!)

---

## Bước 3 — Quét Backend

```bash
cd lms-backend

# 3a. Chạy test và sinh file coverage/lcov.info
pnpm test:cov

# 3b. Chạy SonarScanner (thay <TOKEN> bằng token vừa copy ở Bước 2)
docker run --rm --network=host `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli `
  -Dsonar.host.url=http://localhost:9000 `
  -Dsonar.token=<TOKEN>
```

> **Lưu ý Windows PowerShell:** dùng backtick `` ` `` để xuống dòng lệnh dài (như trên).
> **Lưu ý WSL/Git Bash:** thay backtick bằng `\`.

---

## Bước 4 — Quét Frontend

```bash
cd lms-frontend

# 4a. Chạy test và sinh file coverage/lcov.info
pnpm test:cov
# 4a.1

$env:SONAR_TOKEN = "TOKEN_MOI_CUA_BAN"
# 4b. Chạy SonarScanner
docker run --rm `
  -e "SONAR_HOST_URL=http://host.docker.internal:9000" `
  -e "SONAR_TOKEN=$env:SONAR_TOKEN" `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli
```

---

## Bước 5 — Xem kết quả

Vào **http://localhost:9000** → chọn project **Hybrid LMS - Backend** hoặc **Frontend**

Dashboard sẽ hiển thị:
- ✅ **Quality Gate: Passed** (nếu coverage ≥ 70% và 0 Critical Bug)
- ❌ **Quality Gate: Failed** (nếu chưa đạt — cần viết thêm test)

---

## Tắt SonarQube khi không dùng (để giải phóng RAM)

```bash
docker compose -f docker-compose.sonar.yml down
```

Data vẫn được lưu trong Docker volumes — lần sau `up` lại là còn nguyên kết quả cũ.
