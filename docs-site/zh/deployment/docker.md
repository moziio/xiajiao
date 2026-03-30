---
title: Docker 部署 — 虾饺 IM
description: 使用 Docker 部署虾饺 IM，包括构建镜像、持久化存储、Docker Compose、健康检查。
---

# Docker 部署

虾饺的设计理念是"不需要 Docker"——`npm start` 就能跑。但如果你更喜欢容器化部署，我们提供了完整的 Docker 方案。

## 为什么用 Docker？

| 场景 | 是否推荐 Docker |
|------|----------------|
| 个人使用 / 本地开发 | ❌ 直接 `npm start` 更快 |
| 团队共享 / 统一环境 | ✅ 容器封装一切 |
| 和其他服务一起部署 | ✅ Docker Compose |
| CI/CD 自动部署 | ✅ 镜像构建 + 推送 |
| 不想安装 Node.js | ✅ 容器自带 |

## 快速开始

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao

# 构建镜像
docker build -t xiajiao .

# 运行容器
docker run -d -p 18800:18800 \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  -e OWNER_KEY=my-secret \
  --name xiajiao \
  --restart unless-stopped \
  xiajiao
```

浏览器打开 `http://localhost:18800`。

## 镜像信息

| 属性 | 值 |
|------|------|
| 基础镜像 | `node:22-slim` |
| 构建 | `npm ci --omit=dev` |
| COPY 策略 | 选择性复制——仅 `server/`、`public/`、模板、预设、配置等生产所需目录 |
| 镜像大小 | 较小（Debian slim，无开发依赖） |
| 暴露端口 | 18800 |
| 工作目录 | `/app` |
| NODE_ENV | `production`（镜像内已设置） |
| 数据卷 | `/app/data`（**单一**挂载点，承载全部持久化数据） |

::: info 优化后的构建
Dockerfile 使用选择性 `COPY`，而非 `COPY . .`——仅将生产必需文件打入镜像。配合 `node:22-slim` 基础镜像与 `NODE_ENV=production`，镜像更小、更安全。
:::

## 持久化存储

**主数据卷**为一个：

| Volume | 挂载路径 | 内容 | 是否关键 |
|--------|---------|------|----------|
| `xiajiao-data` | `/app/data` | SQLite、工作区、SOUL 模板、记忆、HTTP 工具定义、自定义工具等 | **是** |

上传文件位于 `public/uploads/`（不在 `data/` 下）。若需在重建容器后保留上传文件，请像上文「快速开始」那样为 `/app/public/uploads` **单独**挂载一个卷。

::: danger 必须挂载 Volume
不挂载卷时，删除容器会**丢失**消息、Agent、记忆等数据。
:::

### 使用 Bind Mount（映射到宿主机目录）

如果你想直接在宿主机上访问数据文件（方便备份、编辑 SOUL.md）：

```bash
mkdir -p /opt/xiajiao-data /opt/xiajiao-uploads

docker run -d -p 18800:18800 \
  -v /opt/xiajiao-data:/app/data \
  -v /opt/xiajiao-uploads:/app/public/uploads \
  -e OWNER_KEY=my-secret \
  --name xiajiao xiajiao
```

这样你可以直接在宿主机编辑 `/opt/xiajiao-data/workspace-xxx/SOUL.md`。

## Docker Compose（推荐）

创建 `docker-compose.yml`：

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

创建 `.env` 文件：

```bash
OWNER_KEY=your-strong-password
```

启动：

```bash
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f xiajiao

# 停止
docker compose down
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `IM_PORT` | 服务端口 | `18800` |
| `OWNER_KEY` | 管理员密码 | `admin` |
| `LLM_MODE` | LLM 模式 | `direct` |
| `NODE_ENV` | Node.js 环境 | `production` |

## 常用操作

### 查看日志

```bash
# 实时日志
docker logs -f xiajiao

# 最近 100 行
docker logs --tail 100 xiajiao
```

### 进入容器

```bash
docker exec -it xiajiao sh

# 查看数据
ls /app/data/
cat /app/data/workspace-xxx/SOUL.md
```

### 更新版本

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

Docker Compose 更新更简单：

```bash
git pull
docker compose up -d --build
```

### 备份数据

```bash
# 使用 docker cp
docker cp xiajiao:/app/data ./backup-data
docker cp xiajiao:/app/public/uploads ./backup-uploads

# 或者直接备份 Volume
docker run --rm -v xiajiao-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/xiajiao-data-backup.tar.gz -C /data .
```

## 与 Nginx 配合（反向代理 + HTTPS）

如果你在同一台服务器上用 Docker 跑虾饺，并且想用 Nginx 做反向代理：

```yaml
# docker-compose.yml
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

Nginx 配置（宿主机上的 Nginx）：

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

        # WebSocket 超时设置
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

::: warning WebSocket 支持
`Upgrade` 和 `Connection` 头是必须的，否则 WebSocket 连接会失败。`proxy_read_timeout` 设置得足够长，避免 WebSocket 长连接被 Nginx 断开。
:::

## 常见问题

### 容器启动后无法访问

1. 检查端口映射：`docker ps` 查看 PORTS 列
2. 检查防火墙：`sudo ufw allow 18800`
3. 检查日志：`docker logs xiajiao`

### 容器重启后数据丢失

确保挂载了 Volume。运行 `docker inspect xiajiao` 查看 Mounts 部分。

### 权限问题

如果 Volume 目录的权限不对：

```bash
# 修改宿主机目录权限
sudo chown -R 1000:1000 /opt/xiajiao-data
```

## Docker Compose + Ollama（完全私有方案）

一键部署虾饺 + Ollama，零外部 API 依赖：

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
# 启动
docker compose -f docker-compose.ollama.yml up -d

# 下载模型
docker exec ollama ollama pull qwen2.5

# 在虾饺中配置
# API Base URL: http://ollama:11434/v1
# API Key: ollama
# 模型名: qwen2.5
```

::: tip 无 GPU？
去掉 `deploy.resources` 段，Ollama 会用 CPU 运行（较慢但可用）。
:::

## 日志管理

### 结构化日志输出

```bash
# JSON 格式日志（方便接入 ELK/Loki）
docker logs xiajiao 2>&1 | jq '.'

# 按时间范围查看
docker logs --since "2026-03-19T00:00:00" xiajiao

# 限制日志文件大小（docker-compose.yml）
```

在 `docker-compose.yml` 中限制日志大小防止磁盘爆满：

```yaml
services:
  xiajiao:
    # ... 其他配置 ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 生产环境检查清单

部署到生产环境前，确认以下事项：

```
✅ OWNER_KEY 已修改（不是默认的 admin）
✅ Volume 已挂载（docker inspect 确认 Mounts）
✅ restart: unless-stopped 已设置
✅ 健康检查已配置
✅ 日志大小限制已设置
✅ 防火墙只开放必要端口
✅ 如需公网访问，Nginx 反向代理 + HTTPS
✅ 定期备份脚本已配置
```

## 相关文档

- [云服务器部署](/zh/deployment/cloud) — 公网访问 + HTTPS + 域名
- [本地运行](/zh/deployment/local) — 不想用 Docker？直接 npm start
- [性能调优](/zh/guide/performance) — 生产环境优化
- [安全与隐私](/zh/guide/security) — 数据安全、API Key 保护、攻击面分析
- [故障排查](/zh/guide/troubleshooting) — 遇到问题看这里
