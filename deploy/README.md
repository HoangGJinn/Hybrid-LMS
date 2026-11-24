# Production Deployment Guide (AWS EC2 + CloudFront + Cloudflare)

This directory contains the production infrastructure configurations and templates for running the Hybrid LMS Backend on an AWS EC2 instance.

---

## Production Domains

| Service | Domain | Hosting / Edge |
| --- | --- | --- |
| **Frontend** (Student & Lecturer) | `https://adalms.tech` | AWS S3 + CloudFront |
| **Admin** | `https://admin.adalms.tech` | AWS S3 + CloudFront |
| **Backend API** | `https://api.adalms.tech` | Cloudflare Proxied → AWS EC2 (`Nginx` → `Docker :9595`) |

---

## Directory Structure

```text
deploy/
├── docker-compose.prod.yml   # Production Docker Compose for EC2
├── nginx/
│   └── api.adalms.tech.conf  # Nginx reverse proxy configuration
├── .env.production.example   # Template for production environment variables
└── README.md                 # This guide
```

---

## 1. Initial EC2 Setup

### Directory structure on EC2
Create the application directory under the home folder:
```bash
mkdir -p ~/hybrid-lms/logs
chmod 777 ~/hybrid-lms/logs
```

### Place configuration files on EC2
- Copy `deploy/docker-compose.prod.yml` to `~/hybrid-lms/docker-compose.yml`
- Copy `deploy/.env.production.example` to `~/hybrid-lms/.env` and fill in real production credentials (including `ZALO_BOT_TOKEN`, `ZALO_MODE`, `ZALO_BOT_WEBHOOK_SECRET`, `ZALO_DEBUG` — Docker Compose also maps them directly in `environment:`).
- Ensure `ca.pem` certificate is placed at `~/hybrid-lms/ca.pem`.

---

## 2. Nginx Reverse Proxy & SSL Setup

1. Copy the configuration (and remove any old `api.hoanggiap.id.vn` symlink if migrating):
   ```bash
   sudo cp deploy/nginx/api.adalms.tech.conf /etc/nginx/sites-available/api.adalms.tech
   sudo ln -s /etc/nginx/sites-available/api.adalms.tech /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/api.hoanggiap.id.vn
   ```
2. Test configuration and reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. Issue free SSL certificate via Certbot (with Cloudflare SSL/TLS set to **Full (Strict)**; if Certbot HTTP validation is blocked behind orange-cloud proxy, temporarily switch `api` DNS record to DNS-only during issuance, or use a Cloudflare Origin Certificate):
   ```bash
   sudo certbot --nginx -d api.adalms.tech
   ```

---

## 3. Zalo Bot Configuration

- **Polling mode (`ZALO_MODE=polling`)**: Default. Backend calls `getUpdates` directly; only `ZALO_BOT_TOKEN` is required.
- **Webhook mode (`ZALO_MODE=webhook`)**: Set `ZALO_MODE=webhook` and a strong `ZALO_BOT_WEBHOOK_SECRET`, then register `https://api.adalms.tech/api/zalo/webhook` with Zalo Bot API `setWebhook`.

---

## 4. GitHub Actions Continuous Deployment (CD)

### Repository Variables (`Settings -> Secrets and variables -> Actions -> Variables`)
- `VITE_API_URL`: `https://api.adalms.tech`
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID (add `https://adalms.tech` and `https://admin.adalms.tech` to Authorized JavaScript origins)
- `VITE_ZALO_BOT_NAME`: Display name of the Zalo bot shown on the account-link card
- `VITE_ZALO_BOT_LINK`: Direct link to open the Zalo bot

### Backend CD (`.github/workflows/cd-backend.yml`)
1. Builds the Docker image from `lms-backend/Dockerfile`.
2. Pushes the image to GitHub Container Registry (`ghcr.io/hoanggjinn/hybrid-lms-backend:latest`).
3. Connects to EC2 via SSH and runs:
   ```bash
   cd ~/hybrid-lms
   docker compose pull backend
   docker compose up -d backend
   docker image prune -f
   ```

---

## 5. AWS S3 IAM Role, Bucket CORS & Metadata Hop Limit

1. **IAM Role**: Attach an IAM role to the EC2 instance with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, and `s3:ListBucket` permissions on `lms-dev-files-hoanggjinn`.
2. **S3 Bucket CORS**: Ensure `lms-dev-files-hoanggjinn` allows `https://adalms.tech` and `https://admin.adalms.tech` for direct browser presigned uploads and PDF previews.
3. **Docker IMDSv2 Hop Limit**: In AWS EC2 Console, modify instance metadata options:
   - Set **Metadata response hop limit** to **2** so the Docker container can retrieve credentials from IMDSv2.
