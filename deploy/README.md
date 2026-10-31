# Production Deployment Guide (AWS EC2)

This directory contains the production infrastructure configurations and templates for running the Hybrid LMS Backend on an AWS EC2 instance.

---

## Directory Structure

```text
deploy/
├── docker-compose.prod.yml       # Production Docker Compose for EC2
├── nginx/
│   └── api.hoanggiap.id.vn.conf  # Nginx reverse proxy configuration
├── .env.production.example       # Template for production environment variables
└── README.md                     # This guide
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
- Copy `deploy/.env.production.example` to `~/hybrid-lms/.env` and fill in real production credentials.
- Ensure `ca.pem` certificate is placed at `~/hybrid-lms/ca.pem`.

---

## 2. Nginx Reverse Proxy & SSL Setup

1. Copy the configuration:
   ```bash
   sudo cp deploy/nginx/api.hoanggiap.id.vn.conf /etc/nginx/sites-available/api.hoanggiap.id.vn
   sudo ln -s /etc/nginx/sites-available/api.hoanggiap.id.vn /etc/nginx/sites-enabled/
   ```
2. Test configuration and reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. Issue free SSL certificate via Certbot:
   ```bash
   sudo certbot --nginx -d api.hoanggiap.id.vn
   ```

---

## 3. GitHub Actions Continuous Deployment (CD)

The backend CD workflow (`.github/workflows/cd-backend.yml`) automatically:
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

## 4. AWS S3 IAM Role & Metadata Hop Limit

1. **IAM Role**: Attach an IAM role to the EC2 instance with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, and `s3:ListBucket` permissions on `lms-dev-files-hoanggjinn`.
2. **Docker IMDSv2 Hop Limit**: In AWS EC2 Console, modify instance metadata options:
   - Set **Metadata response hop limit** to **2** so the Docker container can retrieve credentials from IMDSv2.

