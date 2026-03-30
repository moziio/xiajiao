---
title: "Cloud Server Deployment — Xiajiao (虾饺) IM"
description: "Deploy Xiajiao (虾饺) IM on a cloud VPS with Nginx reverse proxy, HTTPS, DNS, and hardening."
---

# Cloud server deployment

Host Xiajiao (虾饺) on a VPS for public access, team use, and TLS.

## Server requirements

Lightweight—a $5/month VPS is enough:

| Resource | Minimum | Recommended | Notes |
|------|---------|------|------|
| CPU | 1 core | 2 cores | LLM calls are I/O bound |
| RAM | 512MB | 1GB | SQLite + Node |
| Disk | 5GB | 20GB | Uploads + RAG docs dominate |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS | Debian / CentOS OK |
| Bandwidth | 1Mbps | 5Mbps | WebSocket is light |

### Provider ideas

| Provider | Entry | Price (indicative) | Notes |
|--------|---------|---------|------|
| Alibaba Cloud ECS | 1C1G | ¥30–50/mo | Fast in China |
| Tencent Cloud CVM | 1C1G | ¥30–50/mo | Fast in China |
| AWS Lightsail | 1C512M | $5/mo | Global regions |
| DigitalOcean | 1C1G | $6/mo | Simple |
| Hetzner | 2C4G | €4.5/mo | EU, good value |
| Vultr | 1C1G | $6/mo | Global |

::: tip China vs overseas APIs
Domestic users: Alibaba / Tencent. For OpenAI / Claude APIs, an overseas region often has better reachability.
:::

## Full setup

### Step 1: Node.js 22

**Ubuntu / Debian:**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # expect v22.x
```

**CentOS / RHEL:**

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
```

**nvm:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

### Step 2: Install Xiajiao (虾饺)

```bash
cd /opt
sudo git clone https://github.com/moziio/xiajiao.git
cd xiajiao
sudo npm install

sudo OWNER_KEY="your-strong-password" node server/index.js
# "Server running on port 18800" → OK
# Ctrl+C to stop
```

### Step 3: PM2

```bash
sudo npm install -g pm2

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

pm2 start ecosystem.config.js
pm2 save
pm2 startup
# run the printed sudo command
```

```bash
pm2 status
pm2 logs xiajiao
pm2 restart xiajiao
pm2 stop xiajiao
pm2 monit
```

### Step 4: Nginx

```bash
sudo apt install nginx -y
```

`/etc/nginx/sites-available/xiajiao`:

```nginx
server {
    listen 80;
    server_name im.yourdomain.com;

    client_max_body_size 50M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:18800;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;

        proxy_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/xiajiao /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

::: warning Critical bits
1. WebSocket: `Upgrade` + `Connection`  
2. Timeouts: long `proxy_read_timeout`  
3. Streaming: `proxy_buffering off`  
4. Uploads: `client_max_body_size` for RAG files  
:::

### Step 5: HTTPS (Let’s Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d im.yourdomain.com
```

Certbot fetches certs, updates Nginx, and sets renewal.

```bash
sudo certbot renew --dry-run
```

### Step 6: Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status
```

::: danger Do not expose 18800
Only Nginx should talk to 18800 locally. **Do not** open 18800 to the world—use 80/443.
:::

## Hardening

### 1. Strong `OWNER_KEY`

```bash
openssl rand -base64 24
```

### 2. SSH

```bash
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 3. Auto updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. fail2ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Operations

### Upgrade Xiajiao (虾饺)

```bash
cd /opt/xiajiao
git pull
npm install
pm2 restart xiajiao
```

### Disk

```bash
du -sh /opt/xiajiao/data/
du -sh /opt/xiajiao/public/uploads/
```

### Backup script

```bash
cat > /opt/backup-xiajiao.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/xiajiao"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d-%H%M)
tar czf $BACKUP_DIR/xiajiao-$DATE.tar.gz \
  -C /opt/xiajiao data/ public/uploads/
find $BACKUP_DIR -name "xiajiao-*.tar.gz" -mtime +7 -delete
echo "Backup completed: xiajiao-$DATE.tar.gz"
EOF
chmod +x /opt/backup-xiajiao.sh

(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-xiajiao.sh") | crontab -
```

### Logs

```bash
pm2 logs xiajiao --lines 100
pm2 flush

tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Monitoring

```bash
pm2 monit
pm2 describe xiajiao | grep memory
htop
```

## FAQ

### Nginx 502

```bash
pm2 status
pm2 restart xiajiao
pm2 logs xiajiao --err
```

### WebSocket fails

1. Nginx has `Upgrade` / `Connection`  
2. CDN (e.g. Cloudflare): enable WebSockets  
3. Check `proxy_read_timeout`  

### Certbot fails

1. DNS points to the server  
2. Port 80 reachable  
3. Nginx running  

### Corrupt SQLite

Rare—restore from backup:

```bash
pm2 stop xiajiao
cp /backups/xiajiao/latest/data/xiajiao.db /opt/xiajiao/data/xiajiao.db
pm2 start xiajiao
```

## Architecture

```
┌─────────────┐
│   Browser   │
│ (HTTP/WS)   │
└──────┬──────┘
       │ HTTPS :443
┌──────▼──────┐
│   Nginx     │  reverse proxy + TLS
│  (80/443)   │
└──────┬──────┘
       │ HTTP :18800
┌──────▼──────┐
│ Xiajiao (虾饺) IM │  Node (PM2)
│  (18800)    │
├─────────────┤
│  SQLite     │  data/xiajiao.db
│  Files      │  data/workspace-*
└─────────────┘
```

## One-click platforms

### Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Console:

- **Start:** `node server/index.js`  
- **Port:** `18800`  
- **Env:** `OWNER_KEY=...`  
- **Volume:** persist `/app/data`  

::: warning Railway limits
Free tier has caps; ensure a Volume for durable `data/`.
:::

### Render

1. [render.com](https://render.com) → Web Service  
2. Connect repo  
3. Build: `npm install`  
4. Start: `node server/index.js`  
5. Env: `OWNER_KEY=...`  
6. Disk mount `/app/data`  

### Fly.io

`fly.toml`:

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

### Poor fits

| Platform | Why |
|------|------|
| Vercel | Serverless; no durable WS / filesystem |
| Netlify | Static; no long-lived Node |
| AWS Lambda | Stateless; wrong for this app |

## Related docs

- [Docker deployment](/deployment/docker)
- [Run locally](/deployment/local)
- [Model configuration](/guide/model-config)
- [Performance](/guide/performance)
- [Security & privacy](/guide/security)
- [Troubleshooting](/guide/troubleshooting)
