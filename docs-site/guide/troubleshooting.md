---
title: "Troubleshooting — Xiajiao IM"
description: "Fix startup failures, silent agents, memory/RAG issues, and WebSocket problems in Xiajiao IM."
---

# Troubleshooting

Symptom → cause → fix.

## Startup

### `SyntaxError` or `ERR_UNKNOWN_BUILTIN_MODULE`

**Cause:** Node.js is below version 22. Xiajiao uses built-in `node:sqlite` (Node 22+).

```bash
node -v
```

**Fix:** Install Node 22 (nvm, nodejs.org, brew, nodesource, etc.).

### Port 18800 in use

```
Error: listen EADDRINUSE: address already in use :::18800
```

```bash
lsof -i :18800
netstat -ano | findstr :18800
PORT=18801 npm start
```

### `npm install` fails

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

If mirrors help (e.g. China):

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### Cannot reach from another machine

Default bind is `0.0.0.0:18800`; check firewall / cloud security groups.

```bash
curl http://localhost:18800
sudo ufw status
sudo ufw allow 18800
```

## Agents

### No reply after @mention

1. **Models:** Settings → Model management → valid API key  
2. **Group membership:** Agent must be in the channel  
3. **Logs:** `pm2 logs xiajiao` or terminal output  
4. **Common API errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `401` | Bad key | Rotate key |
| `429` | Rate limit | Wait / upgrade |
| `503` | Provider outage | Retry / switch model |
| `timeout` | Network | Proxy / region |

### Slow replies

- Smaller/faster models for routine work  
- Shorten SOUL.md and memory injection  
- High latency to overseas APIs → regional providers  

### Wrong format

Add explicit rules in SOUL.md:

```markdown
## Output format
- Fenced code blocks with language tags
- Under 500 words
- No filler phrases; answer directly
```

### Tools not used

1. Enable tools on the agent  
2. Model must support tool calling  
3. Nudge in SOUL.md to call `web_search` / `rag_query` when appropriate  

## Memory

### Forgets context

1. Enable `memory_write` / `memory_search`  
2. Instruct the model to persist preferences and decisions  
3. Smaller models may skip tool calls  

### Corrupt `memory.db` (rare)

```bash
sqlite3 data/workspace-xxx/memory.db "PRAGMA integrity_check;"
sqlite3 data/workspace-xxx/memory.db ".recover" | sqlite3 data/workspace-xxx/memory-recovered.db
mv data/workspace-xxx/memory-recovered.db data/workspace-xxx/memory.db
```

## RAG

### No hits after upload

1. Files present under `data/workspace-xxx/rag/`  
2. Large docs need indexing time  
3. Try exact phrases from the doc  
4. Agent has `rag_query`  

### PDF parse failures

Scanned/encrypted PDFs may fail—convert to text or use `.txt` / `.md`.

### Irrelevant chunks

Improve source quality, chunking (defaults usually OK), and reranker model strength.

## WebSocket

### Updates only after refresh

1. DevTools → Network → WS — connection alive?  
2. Nginx must proxy upgrades:

```nginx
location / {
    proxy_pass http://127.0.0.1:18800;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

3. CDN / LB must allow WebSocket.

### Frequent disconnects

| Cause | Fix |
|-------|-----|
| Short `proxy_read_timeout` | Use `86400s` |
| Unstable network | Client reconnects; fix network |
| Browser sleep / PWA | Expected on some devices |

## Docker

### Cannot open after start

```bash
docker ps
docker port xiajiao
docker logs xiajiao
```

### Data gone after restart

Mount volumes:

```bash
docker run -d \
  -p 18800:18800 \
  -v $(pwd)/xiajiao-data:/app/data \
  -v $(pwd)/xiajiao-uploads:/app/public/uploads \
  --name xiajiao \
  xiajiao
```

### Permissions

```bash
chown -R 1000:1000 ./xiajiao-data ./xiajiao-uploads
```

## Performance

### High memory

Normal ~100–300 MB. Above ~500 MB:

```bash
pm2 restart xiajiao
```

### `SQLITE_BUSY`

WAL should mitigate. Verify:

```bash
sqlite3 data/im.db "PRAGMA journal_mode;"
```

## Diagnostic cheat sheet

```bash
node -v
curl -s http://localhost:18800 | head -c 100
lsof -i :18800
ls -lh data/im.db
npm audit
pm2 status
docker logs xiajiao --tail 50
free -h && df -h
```

## Decision tree

```
Can you open Xiajiao?
├── No
│   ├── Port conflict? → IM_PORT=3000 npm start
│   ├── Node < 22? → upgrade
│   └── npm install failed? → build tools (python3/make/g++)
├── Yes, login fails
│   └── Reset → OWNER_KEY=new-password npm start
└── Yes, agents silent
    ├── API key OK?
    ├── Agent has a model?
    ├── Browser console errors?
    └── WebSocket connected?
```

## Still stuck?

1. Search [GitHub Issues](https://github.com/moziio/xiajiao/issues)  
2. Open a new issue with `node -v`, OS, logs, repro steps  
3. [GitHub Discussions](https://github.com/moziio/xiajiao/discussions)  

## Related docs

- [Quick start](/guide/quick-start)
- [Security](/guide/security)
- [Docker deployment](/deployment/docker)
- [Performance](/guide/performance)
- [Model configuration](/guide/model-config)
- [API reference](/guide/api-reference)
- [FAQ](/guide/faq)
