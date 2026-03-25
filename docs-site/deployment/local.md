---
title: "Local Run — Xiajiao (虾饺) IM"
description: "Run Xiajiao (虾饺) IM on your machine for development and personal use—three commands to start."
---

# Local run

The simplest path—great for personal use and development.

<p align="center">
  <img src="/images/login.png" alt="Xiajiao (虾饺) login screen" style="max-width: 400px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>After start, open http://localhost:18800 to see the login page.</em>
</p>

## Quick start (three commands)

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

Open `http://localhost:18800`. Default admin password: `admin`.

::: tip Install speed
Six npm dependencies—`npm install` usually finishes in 5–10 seconds.
:::

## Environment variables

| Variable | Purpose | Default | Required in prod? |
|----------|---------|---------|-------------------|
| `IM_PORT` | HTTP port | `18800` | No |
| `OWNER_KEY` | Admin login password | `admin` | **Change in production** |
| `LLM_MODE` | LLM mode | `direct` | No |

### How to set

**Linux / macOS**

```bash
IM_PORT=3000 OWNER_KEY=my-secret npm start
```

**Windows CMD**

```batch
set IM_PORT=3000
set OWNER_KEY=my-secret
node server/index.js
```

**Windows PowerShell**

```powershell
$env:IM_PORT = "3000"
$env:OWNER_KEY = "my-secret"
node server/index.js
```

::: warning Change the default password
`admin` is for local dev only. On LAN or the public internet, set a strong `OWNER_KEY`.
:::

## First login and setup

### 1. Log in

Open `http://localhost:18800` and enter the admin password (default `admin`).

### 2. Configure LLM

After login, add a model under **Settings**:

```
Settings → LLM configuration
```

| Provider | Example API base | Notes |
|----------|------------------|-------|
| OpenAI | `https://api.openai.com/v1` | Needs API key |
| Anthropic | `https://api.anthropic.com` | Needs API key |
| Qwen (DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Alibaba key |
| Ollama | `http://localhost:11434/v1` | Local, no key |
| OpenRouter | `https://openrouter.ai/api/v1` | Aggregator |

::: tip Ollama locally
Free option: run Llama 3, Qwen 2, etc. via Ollama. Base URL `http://localhost:11434/v1`, no API key.
:::

### 3. Chat

Pick an Agent in Contacts (e.g. Code assistant) and send a message.

## Run in the background

### Option 1: nohup

```bash
nohup npm start > xiajiao.log 2>&1 &
echo $!   # save PID
```

Stop:

```bash
kill <PID>
```

### Option 2: PM2 (recommended)

```bash
npm install -g pm2
pm2 start server/index.js --name xiajiao
pm2 save
pm2 startup

pm2 status
pm2 logs xiajiao
pm2 restart xiajiao
pm2 stop xiajiao
```

### Option 3: systemd (Linux)

Create `/etc/systemd/system/xiajiao.service`:

```ini
[Unit]
Description=Xiajiao IM
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/xiajiao
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5
Environment=OWNER_KEY=your-secret

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable xiajiao
sudo systemctl start xiajiao
sudo systemctl status xiajiao
```

### Option 4: Windows batch

`start-xiajiao.bat`:

```batch
@echo off
title Xiajiao IM
cd /d "C:\path\to\xiajiao"
set OWNER_KEY=your-secret
node server/index.js
pause
```

Double-click or add to Startup.

## Data layout

All state lives under `data/` and `public/uploads/`:

```
xiajiao/
├── data/
│   ├── im.db              # Messages, channels, Agent config
│   ├── agents.json
│   ├── workspace-xxx/
│   │   ├── SOUL.md
│   │   ├── memory.db
│   │   └── rag/
│   └── _soul-templates/
├── public/uploads/
└── ...
```

## Backup

```bash
tar czf xiajiao-backup-$(date +%Y%m%d).tar.gz data/ public/uploads/
tar xzf xiajiao-backup-20260319.tar.gz
```

::: tip Cron backup
```bash
0 3 * * * cd /opt/xiajiao && tar czf /backups/xiajiao-$(date +\%Y\%m\%d).tar.gz data/ public/uploads/
```
:::

## Common issues

### Port in use

```
Error: listen EADDRINUSE :::18800
```

Use another port: `IM_PORT=3000 npm start`

### Node too old

```
SyntaxError: Unexpected token
```

Requires Node.js 22+. Check `node -v`.

### SQLITE_BUSY

Another process is locking `data/im.db`.

### Windows `npm install` fails

Install build tools:

```powershell
npm install --global windows-build-tools
```

Prebuilt binaries usually install without this.

### LAN access

By default the server listens on `0.0.0.0:18800`. Other devices: `http://YOUR_IP:18800`.

```bash
# IP
ip addr | grep "inet "    # Linux/macOS
ipconfig                    # Windows
```

Open the port in the firewall.

### Windows autostart

**Task Scheduler** — trigger at startup; program `node`, args `server/index.js`, start in project folder.

**Startup folder** — shortcut to `start-xiajiao.bat` in  
`C:\Users\<you>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

### macOS background — launchd

`~/Library/LaunchAgents/com.xiajiao.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.xiajiao</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/path/to/xiajiao/server/index.js</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>/path/to/xiajiao</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OWNER_KEY</key>
    <string>your-secret</string>
  </dict>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.xiajiao.plist
```

## Upgrade

```bash
cd xiajiao
git pull
npm install
pm2 restart xiajiao          # or systemctl restart xiajiao
```

`data/` is untouched by `git pull`.

## Related docs

- [Docker deployment](/deployment/docker)  
- [Cloud deployment](/deployment/cloud)  
- [Model configuration](/guide/model-config)  
- [Performance tuning](/guide/performance)  
- [Security & privacy](/guide/security)  
- [Troubleshooting](/guide/troubleshooting)  
