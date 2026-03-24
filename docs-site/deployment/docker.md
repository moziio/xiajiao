---
title: Docker 部署 — 虾饺 IM
description: 使用 Docker 部署虾饺 IM，包括构建镜像、持久化存储、环境变量配置。
---

# Docker 部署

虾饺的设计理念是"不需要 Docker"，但如果你更喜欢容器化部署，我们也提供了 Dockerfile。

## 构建和运行

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao

# 构建镜像
docker build -t xiajiao .

# 运行容器
docker run -d -p 18800:18800 \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  --name xiajiao xiajiao
```

## 持久化存储

两个 Volume 确保数据不丢失：

| Volume | 容器路径 | 内容 |
|--------|---------|------|
| `xiajiao-data` | `/app/data` | SQLite 数据库、Agent 工作区、SOUL 模板 |
| `xiajiao-uploads` | `/app/public/uploads` | 用户上传的文件 |

## 环境变量

```bash
docker run -d -p 18800:18800 \
  -e IM_PORT=18800 \
  -e OWNER_KEY=my-secret \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  --name xiajiao xiajiao
```

## Docker Compose

```yaml
version: '3.8'
services:
  xiajiao:
    build: .
    ports:
      - "18800:18800"
    volumes:
      - xiajiao-data:/app/data
      - xiajiao-uploads:/app/public/uploads
    environment:
      - OWNER_KEY=my-secret
    restart: unless-stopped

volumes:
  xiajiao-data:
  xiajiao-uploads:
```

## 镜像信息

- 基础镜像：`node:22-alpine`
- 构建方式：`npm ci --production`（只安装生产依赖）
- 镜像大小：约 150MB

## 下一步

- [云服务器部署](/deployment/cloud) — 公网访问 + HTTPS
- [本地运行](/deployment/local) — 不想用 Docker？
