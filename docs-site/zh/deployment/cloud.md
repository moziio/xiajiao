---
title: 云服务器部署 — 虾饺 IM
description: 在云服务器上部署虾饺 IM，配置 Nginx 反向代理、HTTPS、域名、安全加固。
---

# 云服务器部署

将虾饺部署到云服务器，实现公网访问、团队共享、HTTPS 加密。

## 服务器要求

虾饺非常轻量，$5/月的入门 VPS 就能流畅运行：

| 配置 | 最低要求 | 推荐 | 说明 |
|------|---------|------|------|
| CPU | 1 核 | 2 核 | LLM 调用是 IO 密集型，对 CPU 要求不高 |
| 内存 | 512MB | 1GB | SQLite + Node.js，512MB 足够 |
| 硬盘 | 5GB | 20GB | 主要取决于上传文件和 RAG 文档大小 |
| 系统 | Ubuntu 22.04+ | Ubuntu 24.04 LTS | Debian / CentOS 等也支持 |
| 带宽 | 1Mbps | 5Mbps | WebSocket 长连接，带宽消耗很低 |

### 云服务商推荐

| 服务商 | 入门配置 | 价格参考 | 特点 |
|--------|---------|---------|------|
| 阿里云 ECS | 1C1G | ¥30-50/月 | 国内访问快 |
| 腾讯云 CVM | 1C1G | ¥30-50/月 | 国内访问快 |
| AWS Lightsail | 1C512M | $5/月 | 全球节点 |
| DigitalOcean | 1C1G | $6/月 | 简单易用 |
| Hetzner | 2C4G | €4.5/月 | 欧洲，性价比极高 |
| Vultr | 1C1G | $6/月 | 全球节点 |

::: tip 国内用户
如果主要在国内使用，推荐阿里云 / 腾讯云。如果需要海外 LLM API（OpenAI / Claude），建议用海外节点避免网络问题。
:::

## 完整部署步骤

### 第一步：安装 Node.js 22

**Ubuntu / Debian**：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # 确认 v22.x
```

**CentOS / RHEL**：

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
```

**使用 nvm（推荐）**：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

### 第二步：部署虾饺

```bash
# 克隆到 /opt（标准的第三方软件目录）
cd /opt
sudo git clone https://github.com/moziio/xiajiao.git
cd xiajiao
sudo npm install

# 测试运行
sudo OWNER_KEY="your-strong-password" node server/index.js
# 看到 "Server running on port 18800" 说明成功
# Ctrl+C 停止
```

### 第三步：PM2 守护进程

PM2 确保虾饺在崩溃时自动重启、服务器重启后自动启动。

```bash
sudo npm install -g pm2

# 创建 PM2 ecosystem 配置
cat > /opt/xiajiao/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'xiajiao',
    script: 'server/index.js',
    cwd: '/opt/xiajiao',
    env: {
      NODE_ENV: 'production',
      OWNER_KEY: 'your-strong-password',
      IM_PORT: 18800
    },
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/xiajiao-error.log',
    out_file: '/var/log/xiajiao-out.log'
  }]
}
EOF

# 启动
pm2 start ecosystem.config.js

# 设置开机自启
pm2 save
pm2 startup
# 按提示执行输出的 sudo 命令
```

常用 PM2 命令：

```bash
pm2 status          # 查看状态
pm2 logs xiajiao    # 实时日志
pm2 restart xiajiao # 重启
pm2 stop xiajiao    # 停止
pm2 monit           # 监控面板
```

### 第四步：Nginx 反向代理

```bash
sudo apt install nginx -y
```

创建配置文件 `/etc/nginx/sites-available/xiajiao`：

```nginx
server {
    listen 80;
    server_name im.yourdomain.com;

    # 上传文件大小限制（默认 1MB 太小）
    client_max_body_size 50M;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:18800;
        proxy_http_version 1.1;

        # WebSocket 支持（必须）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 传递真实 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 超时（24 小时）
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;

        # 关闭代理缓冲（SSE 流式输出需要）
        proxy_buffering off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/xiajiao /etc/nginx/sites-enabled/
sudo nginx -t          # 测试配置
sudo systemctl reload nginx
```

::: warning 关键配置
1. **WebSocket**：`Upgrade` + `Connection` 头必须有
2. **超时**：`proxy_read_timeout 86400` 防止 WebSocket 被 Nginx 断开
3. **缓冲**：`proxy_buffering off` 确保流式输出实时到达
4. **上传限制**：`client_max_body_size 50M` 允许上传大文件到 RAG
:::

### 第五步：HTTPS（Let's Encrypt）

免费获取 SSL 证书：

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d im.yourdomain.com
```

Certbot 会自动：
1. 获取证书
2. 修改 Nginx 配置（添加 SSL 监听和证书路径）
3. 设置自动续期（证书 90 天过期，自动续期）

验证自动续期：

```bash
sudo certbot renew --dry-run
```

### 第六步：防火墙

```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw --force enable
sudo ufw status
```

::: danger 不要暴露 18800 端口
虾饺端口 18800 只需要 Nginx 内部访问，**不要**对外开放。所有流量都走 Nginx 的 80/443 端口。
:::

## 安全加固

### 1. 修改默认密码

**必须**修改 `OWNER_KEY`。使用强密码：

```bash
# 生成随机密码
openssl rand -base64 24
# 输出类似：aB3cD4eF5gH6iJ7kL8mN9oP0q
```

### 2. SSH 安全

```bash
# 禁用密码登录，只允许 Key 登录
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 3. 自动安全更新

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Fail2ban（防暴力破解）

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 日常运维

### 更新虾饺

```bash
cd /opt/xiajiao
git pull
npm install
pm2 restart xiajiao
```

### 查看磁盘使用

```bash
du -sh /opt/xiajiao/data/          # 数据目录大小
du -sh /opt/xiajiao/public/uploads/ # 上传文件大小
```

### 数据备份

```bash
# 创建备份脚本
cat > /opt/backup-xiajiao.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/xiajiao"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d-%H%M)
tar czf $BACKUP_DIR/xiajiao-$DATE.tar.gz \
  -C /opt/xiajiao data/ public/uploads/
# 保留最近 7 天的备份
find $BACKUP_DIR -name "xiajiao-*.tar.gz" -mtime +7 -delete
echo "Backup completed: xiajiao-$DATE.tar.gz"
EOF
chmod +x /opt/backup-xiajiao.sh

# 设置每天凌晨 3 点自动备份
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-xiajiao.sh") | crontab -
```

### 日志管理

```bash
# PM2 日志
pm2 logs xiajiao --lines 100

# 清理旧日志
pm2 flush

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 监控

```bash
# PM2 内置监控
pm2 monit

# 内存使用
pm2 describe xiajiao | grep memory

# 系统资源
htop
```

## 常见问题

### Nginx 502 Bad Gateway

虾饺进程没有启动：

```bash
pm2 status
pm2 restart xiajiao
pm2 logs xiajiao --err
```

### WebSocket 连接失败

1. 检查 Nginx 配置有 `Upgrade` 和 `Connection` 头
2. 如果用了 CDN（如 Cloudflare），确认开启了 WebSocket 支持
3. 检查超时设置 `proxy_read_timeout`

### Let's Encrypt 证书获取失败

1. 确认域名已解析到服务器 IP
2. 确认 80 端口可访问
3. 确认 Nginx 正在运行

### SQLite 数据库损坏

极少出现。如果出现，从备份恢复：

```bash
pm2 stop xiajiao
cp /backups/xiajiao/latest/data/im.db /opt/xiajiao/data/im.db
pm2 start xiajiao
```

## 架构图

```
┌─────────────┐
│   浏览器     │
│ (HTTP/WS)   │
└──────┬──────┘
       │ HTTPS :443
┌──────▼──────┐
│   Nginx     │  反向代理 + SSL 终端
│  (80/443)   │
└──────┬──────┘
       │ HTTP :18800
┌──────▼──────┐
│  虾饺 IM     │  Node.js 进程 (PM2 守护)
│  (18800)    │
├─────────────┤
│  SQLite     │  数据库 (data/im.db)
│  文件系统    │  Agent 工作区 (data/workspace-*)
└─────────────┘
```

## 一键部署平台

如果不想自己管服务器，这些平台支持一键部署 Node.js 应用：

### Railway

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录并部署
railway login
railway init
railway up
```

在 Railway 控制台设置：
- **Start Command**: `node server/index.js`
- **Port**: `18800`
- **环境变量**: `OWNER_KEY=your-secret`
- **Volume**: 添加持久化存储挂载到 `/app/data`

::: warning 注意
Railway 的免费套餐有用量限制。虾饺需要持久化文件系统，确保配置了 Volume。
:::

### Render

1. 在 [render.com](https://render.com) 创建 "Web Service"
2. 连接 GitHub 仓库
3. 设置：
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Environment**: `OWNER_KEY=your-secret`
4. 添加 Disk 持久化存储（挂载路径 `/app/data`）

### Fly.io

创建 `fly.toml`：

```toml
app = "xiajiao"

[build]
  builder = "heroku/buildpacks:22"

[env]
  IM_PORT = "18800"

[[services]]
  internal_port = 18800
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[mounts]
  source = "xiajiao_data"
  destination = "/app/data"
```

```bash
flyctl launch
flyctl secrets set OWNER_KEY=your-secret
flyctl deploy
```

### 不推荐的平台

| 平台 | 原因 |
|------|------|
| Vercel | Serverless，不支持 WebSocket 和持久文件系统 |
| Netlify | 静态站点托管，不支持 Node.js 长驻服务 |
| AWS Lambda | 无状态函数，不适合有状态应用 |

## 相关文档

- [Docker 部署](/zh/deployment/docker) — 更喜欢容器化？
- [本地运行](/zh/deployment/local) — 本地开发调试
- [模型配置](/zh/guide/model-config) — 配置不同的 LLM Provider
- [性能调优](/zh/guide/performance) — 生产环境优化
- [安全与隐私](/zh/guide/security) — 数据安全、API Key 保护、攻击面分析
- [故障排查](/zh/guide/troubleshooting) — 遇到问题看这里
