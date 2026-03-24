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
| 基础镜像 | `node:22-alpine` |
| 构建方式 | `npm ci --production` |
| 镜像大小 | ~150MB |
| 暴露端口 | 18800 |
| 工作目录 | `/app` |

::: info 为什么这么小？
虾饺只有 6 个 npm 依赖，Alpine 基础镜像只有 ~50MB。没有 Python、Java 等额外运行时。
:::

## 持久化存储

两个 Volume 确保数据不丢失：

| Volume | 容器路径 | 内容 | 重要性 |
|--------|---------|------|--------|
| `xiajiao-data` | `/app/data` | SQLite 数据库、Agent 工作区、SOUL 模板、记忆库 | **核心数据** |
| `xiajiao-uploads` | `/app/public/uploads` | 用户上传的文件（图片等） | 用户文件 |

::: danger 必须挂载 Volume
如果不挂载 Volume，容器删除后所有数据（消息、Agent 配置、记忆）将永久丢失。
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

### better-sqlite3 编译失败

如果构建镜像时 `better-sqlite3` 编译失败：

```dockerfile
# 确保 Dockerfile 中有 build 依赖
RUN apk add --no-cache python3 make g++
```

通常 Alpine 镜像已经处理了这个问题。

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

## 下一步

- [云服务器部署](/deployment/cloud) — 公网访问 + HTTPS + 域名
- [本地运行](/deployment/local) — 不想用 Docker？直接 npm start
