---
title: "Docker Deployment — Xiajiao (虾饺) IM"
description: "Deploy Xiajiao (虾饺) IM with Docker—build images, volumes, Docker Compose, and health checks."
---

# Docker deployment

Xiajiao (虾饺) is designed so you **don’t need Docker**—`npm start` is enough. If you prefer containers, this path is fully supported.

## When to use Docker

| Scenario | Docker? |
|------|----------------|
| Personal / local dev | ❌ faster with `npm start` |
| Shared team / reproducible env | ✅ |
| Co-deploy with other services | ✅ Docker Compose |
| CI/CD | ✅ build + push |
| Avoid local Node install | ✅ image includes runtime |

## Quick start

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao

docker build -t xiajiao .

docker run -d -p 18800:18800 \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  -e OWNER_KEY=my-secret \
  --name xiajiao \
  --restart unless-stopped \
  xiajiao
```

Open `http://localhost:18800`.

## Image facts

| Property | Value |
|------|------|
| Base | `node:22-alpine` |
| Build | `npm ci --production` |
| Size | Small (Alpine) |
| Port | 18800 |
| Workdir | `/app` |

::: info Small image
Six npm deps + Alpine—no Python/Java runtimes bundled.
:::

## Persistent volumes

Two volumes matter:

| Volume | Mount | Contents | Critical |
|--------|---------|------|--------|
| `xiajiao-data` | `/app/data` | SQLite, workspaces, SOUL templates, memory | **yes** |
| `xiajiao-uploads` | `/app/public/uploads` | uploads | user files |

::: danger Mount volumes
Without volumes, removing the container **deletes** messages, Agents, and memory.
:::

### Bind mounts (host paths)

For direct file access (backup, edit SOUL.md):

```bash
mkdir -p /opt/xiajiao-data /opt/xiajiao-uploads

docker run -d -p 18800:18800 \
  -v /opt/xiajiao-data:/app/data \
  -v /opt/xiajiao-uploads:/app/public/uploads \
  -e OWNER_KEY=my-secret \
  --name xiajiao xiajiao
```

Edit `/opt/xiajiao-data/workspace-xxx/SOUL.md` on the host.

## Docker Compose (recommended)

`docker-compose.yml`:

```yaml
services:
  xiajiao:
    build: .
    ports:
      - "18800:18800"
    volumes:
      - ./volumes/data:/app/data
      - ./volumes/uploads:/app/public/uploads
    environment:
      - OWNER_KEY=${OWNER_KEY:-admin}
      - IM_PORT=18800
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:18800"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

`.env`:

```bash
OWNER_KEY=your-strong-password
```

```bash
docker compose up -d

docker compose ps
docker compose logs -f xiajiao

docker compose down
```

## Environment variables

| Variable | Purpose | Default |
|------|------|--------|
| `IM_PORT` | Port | `18800` |
| `OWNER_KEY` | Admin password | `admin` |
| `LLM_MODE` | LLM mode | `direct` |
| `NODE_ENV` | Node env | `production` |

## Common tasks

### Logs

```bash
docker logs -f xiajiao
docker logs --tail 100 xiajiao
```

### Shell in container

```bash
docker exec -it xiajiao sh

ls /app/data/
cat /app/data/workspace-xxx/SOUL.md
```

### Upgrade

```bash
cd xiajiao
git pull
docker build -t xiajiao .
docker stop xiajiao
docker rm xiajiao
docker run -d -p 18800:18800 \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  -e OWNER_KEY=my-secret \
  --name xiajiao xiajiao
```

With Compose:

```bash
git pull
docker compose up -d --build
```

### Backup

```bash
docker cp xiajiao:/app/data ./backup-data
docker cp xiajiao:/app/public/uploads ./backup-uploads

docker run --rm -v xiajiao-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/xiajiao-data-backup.tar.gz -C /data .
```

## Nginx reverse proxy + HTTPS

`docker-compose.yml` excerpt (Xiajiao only exposes internally):

```yaml
services:
  xiajiao:
    build: .
    expose:
      - "18800"
    volumes:
      - ./volumes/data:/app/data
      - ./volumes/uploads:/app/public/uploads
    environment:
      - OWNER_KEY=${OWNER_KEY:-admin}
    restart: unless-stopped
    networks:
      - web

networks:
  web:
    external: true
```

Host Nginx:

```nginx
server {
    listen 80;
    server_name im.yourdomain.com;

    location / {
        proxy_pass http://xiajiao:18800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

::: warning WebSockets
`Upgrade` and `Connection` are required. Long `proxy_read_timeout` avoids dropping WS.
:::

## FAQ

### Cannot reach container

1. `docker ps` — port mapping  
2. Firewall: `sudo ufw allow 18800`  
3. `docker logs xiajiao`  

### Data gone after restart

Confirm mounts: `docker inspect xiajiao` → Mounts.

### Permissions

```bash
sudo chown -R 1000:1000 /opt/xiajiao-data
```

## Docker Compose + Ollama (fully private)

```yaml
# docker-compose.ollama.yml
services:
  xiajiao:
    build: .
    ports:
      - "18800:18800"
    volumes:
      - ./volumes/data:/app/data
      - ./volumes/uploads:/app/public/uploads
    environment:
      - OWNER_KEY=${OWNER_KEY:-admin}
    restart: unless-stopped
    depends_on:
      ollama:
        condition: service_healthy

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  ollama-models:
```

```bash
docker compose -f docker-compose.ollama.yml up -d

docker exec ollama ollama pull qwen2.5

# In Xiajiao (虾饺) UI:
# API Base: http://ollama:11434/v1
# API Key: ollama
# Model: qwen2.5
```

::: tip No GPU?
Remove `deploy.resources`; Ollama falls back to CPU (slower).
:::

## Logging

### Structured log output

```bash
# JSON logs (ELK / Loki friendly)
docker logs xiajiao 2>&1 | jq '.'

docker logs --since "2026-03-19T00:00:00" xiajiao

# Limit log file size (see docker-compose.yml below)
```

Limit log size in Compose:

```yaml
services:
  xiajiao:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Production checklist

```
✅ OWNER_KEY changed (not admin)
✅ Volumes mounted (docker inspect)
✅ restart: unless-stopped
✅ Healthcheck configured
✅ Log rotation limits
✅ Firewall minimal exposure
✅ Public: Nginx + HTTPS
✅ Backups scheduled
```

## Related docs

- [Cloud deployment](/deployment/cloud) — public URL, HTTPS, DNS
- [Run locally](/deployment/local) — without Docker
- [Performance](/guide/performance)
- [Security & privacy](/guide/security)
- [Troubleshooting](/guide/troubleshooting)
