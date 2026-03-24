---
title: 云服务器部署 — 虾饺 IM
description: 在阿里云、AWS 等云服务器上部署虾饺 IM，配置 Nginx 反向代理和 HTTPS。
---

# 云服务器部署

将虾饺部署到云服务器，实现公网访问。

## 服务器要求

| 配置 | 最低要求 | 推荐 |
|------|---------|------|
| CPU | 1 核 | 2 核 |
| 内存 | 512MB | 1GB |
| 硬盘 | 5GB | 20GB |
| 系统 | Ubuntu 22.04+ | Ubuntu 24.04 |
| Node.js | 22+ | 22 LTS |

虾饺非常轻量，$5/月的 VPS 就能跑。

## 安装步骤

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 部署虾饺

```bash
cd /opt
sudo git clone https://github.com/moziio/xiajiao.git
cd xiajiao
sudo npm install

# 修改密码
export OWNER_KEY="your-strong-password"
```

### 3. 使用 PM2 守护进程

```bash
sudo npm install -g pm2
pm2 start server/index.js --name xiajiao
pm2 save
pm2 startup
```

### 4. 配置 Nginx 反向代理

```bash
sudo apt install nginx
```

创建配置文件 `/etc/nginx/sites-available/xiajiao`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:18800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/xiajiao /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

::: warning WebSocket 支持
Nginx 配置中 `Upgrade` 和 `Connection` 头是必须的，否则 WebSocket 连接会失败。
:::

### 5. HTTPS（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot 会自动修改 Nginx 配置并设置证书自动续期。

## 防火墙

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 更新

```bash
cd /opt/xiajiao
git pull
npm install
pm2 restart xiajiao
```

## 下一步

- [Docker 部署](/deployment/docker) — 更喜欢容器？
- [本地运行](/deployment/local) — 本地开发调试
