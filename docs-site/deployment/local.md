---
title: 本地运行 — 虾饺 IM
description: 在本地开发环境运行虾饺 IM，适合开发调试和个人使用。
---

# 本地运行

最简单的方式。适合个人使用和开发调试。

## 快速启动

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

浏览器打开 `http://localhost:18800`。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `IM_PORT` | 服务端口 | `18800` |
| `OWNER_KEY` | 管理员密码 | `admin` |
| `LLM_MODE` | LLM 模式 | `direct` |

```bash
IM_PORT=3000 OWNER_KEY=my-secret npm start
```

## 后台运行

### Linux / macOS

```bash
nohup npm start > xiajiao.log 2>&1 &
```

或使用 PM2：

```bash
npm install -g pm2
pm2 start server/index.js --name xiajiao
pm2 save
pm2 startup
```

### Windows

创建一个批处理文件 `start.bat`：

```batch
@echo off
cd /d "C:\path\to\xiajiao"
node server/index.js
```

或使用 Windows 服务管理工具。

## 数据备份

备份以下两个目录即可完整恢复：

```
xiajiao/
├── data/           # 数据库 + Agent 工作区
└── public/uploads/ # 用户上传文件
```

## 下一步

- [Docker 部署](/deployment/docker) — 容器化部署
- [云服务器部署](/deployment/cloud) — 公网可访问
