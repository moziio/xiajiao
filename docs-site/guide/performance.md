---
title: "Performance tuning — Xiajiao IM"
description: "Benchmarks, LLM latency tips, SQLite tuning, memory, and production settings for Xiajiao IM."
---

# Performance tuning

Xiajiao itself is lightweight; almost all perceived latency comes from LLM APIs. This page focuses on end-to-end responsiveness.

::: tip
Numbers below are indicative. Measure on your own hardware and workload.
:::

## LLM calls

A single GPT-4o round trip is often 2–15 seconds.

### 1. Pick the right model

| Use case | Suggested models | Typical latency | Cost |
|----------|------------------|-----------------|------|
| Everyday chat | GPT-4o-mini / Qwen Turbo | 1–3s | Very low |
| Hard reasoning | GPT-4o / Claude Sonnet | 3–8s | Medium |
| Code | Claude Sonnet / DeepSeek Coder | 3–10s | Medium |
| Value | DeepSeek Chat / Qwen Plus | 2–5s | Low |
| Free local | Ollama | Hardware-bound | Free |

Not every agent needs the largest model—use small models for rewrite/format tasks.

### 2. Trim the system prompt

System prompt = SOUL.md + injected memory + RAG hits.

Length drives:

- **Time to first token** — longer prompts cost more prefill  
- **Billable tokens**  
- **Remaining context** for the conversation  

| Lever | Action |
|-------|--------|
| SOUL.md | Aim for ~500–1000 words of persona/rules |
| Memory | Inject only top-5 most relevant |
| RAG | Often top-3 chunks suffice |
| History | System truncates, but busy channels grow fast |

### 3. Local models (Ollama)

| Model | VRAM | CPU | Approx. tok/s |
|-------|------|-----|---------------|
| 7B | 8 GB GPU | 8 cores | ~30 |
| 13B | 16 GB | 8 cores | ~20 |
| 33B | 24 GB | 16 cores | ~10 |
| 70B | 48 GB | 16 cores | ~5 |

```bash
time ollama run llama3 "Hello world" --verbose
```

## SQLite

### WAL

WAL (write-ahead logging) is required for good concurrency:

```bash
sqlite3 data/xiajiao.db "PRAGMA journal_mode;"
# expect: wal
```

### Maintenance

```bash
sqlite3 data/xiajiao.db "VACUUM;"
sqlite3 data/xiajiao.db "ANALYZE;"
sqlite3 data/xiajiao.db "PRAGMA integrity_check;"
```

Past ~100 MB DB size, consider monthly `VACUUM`.

### Table sizes

```bash
sqlite3 data/xiajiao.db "
SELECT name, SUM(pgsize) AS size_bytes,
  ROUND(SUM(pgsize)/1024.0/1024.0, 2) AS size_mb
FROM dbstat GROUP BY name ORDER BY size_bytes DESC;
"
```

## Node.js memory

### Node.js memory monitoring

```bash
node -e "
const m = process.memoryUsage();
console.log({
  heapUsed: (m.heapUsed/1024/1024).toFixed(1) + ' MB',
  heapTotal: (m.heapTotal/1024/1024).toFixed(1) + ' MB',
  rss: (m.rss/1024/1024).toFixed(1) + ' MB'
});
"
```

### Memory leak troubleshooting

If RSS keeps climbing:

```bash
pm2 monit
pm2 start server/index.js --max-memory-restart 500M
```

## Production

### PM2 example

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'xiajiao',
    script: 'server/index.js',
    instances: 1,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 18800,
      OWNER_KEY: 'your-strong-password'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    error_file: 'logs/error.log',
    out_file: 'logs/out.log'
  }]
};
```

### Nginx static cache

```nginx
location ~* \.(js|css|png|jpg|gif|ico|svg|woff2)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

location /api/ {
    proxy_pass http://127.0.0.1:18800;
    proxy_cache off;
}
```

### Gzip

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;
gzip_comp_level 6;
```

## Collaboration chains

Agents run **serially**. Total time ≈ sum of each hop. Use faster/cheaper models on non-critical steps (editing, translation).

## RAG

### Indexing

| Tip | Effect |
|-----|--------|
| Keep docs < ~50 pages / < ~100 KB text | Faster indexing |
| Remove stale docs | Less noise |
| Prefer TXT/MD over scanned PDF | Cleaner chunks |

### Retrieval knobs

```
BM25 vs vector weight → default 0.5 / 0.5 is fine
RRF k → default 60
top_k → 3 for most cases; 5 for long docs
```

### Large libraries (100+ docs)

```bash
sqlite3 data/workspace-xxx/rag.db "INSERT INTO docs_fts(docs_fts) VALUES('rebuild');"
sqlite3 data/workspace-xxx/rag.db "VACUUM;"
```

(Adjust table names to match your build if they differ.)

## Load expectations

Single-process SQLite fits individuals and small teams.

::: tip
Concurrency is usually capped by **LLM rate limits and latency**, not Xiajiao. WAL easily keeps up with human-paced chat.
:::

## Quick bench

```bash
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{time_total}\n" http://localhost:18800/
done | awk '{sum+=$1} END {print "avg:", sum/NR, "s"}'

curl -s -o /dev/null -w "%{time_total}s\n" \
  -H "Cookie: session=your-session-token" \
  http://localhost:18800/api/channels
```

## Monitoring

| Signal | Tool | Threshold | Action |
|--------|------|-----------|--------|
| Memory | PM2 / htop | > 500 MB | Restart policy |
| CPU | PM2 / htop | > 80% for 5 min | Inspect loops |
| Disk | `df -h` | < 1 GB free | Logs + `VACUUM` |
| Main DB | `ls -lh data/xiajiao.db` | > 1 GB | Archive + `VACUUM` |
| Process | PM2 / systemd | Exits | Auto-restart |
| WAL | `ls -lh data/xiajiao.db-wal` | > 100 MB | Restart to checkpoint |

### PM2 monitoring script

```bash
# Create a simple monitoring script
cat > /opt/monitor-xiajiao.sh << 'SCRIPT'
#!/bin/bash
MEM=$(pm2 jlist | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['monit']['memory']//1024//1024)")
DISK=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
DB_SIZE=$(stat -f%z data/xiajiao.db 2>/dev/null || stat -c%s data/xiajiao.db)
DB_MB=$((DB_SIZE/1024/1024))

echo "Memory: ${MEM}MB | Disk: ${DISK}% | DB: ${DB_MB}MB"

[ "$MEM" -gt 500 ] && echo "WARNING: Memory > 500MB"
[ "$DISK" -gt 90 ] && echo "WARNING: Disk > 90%"
[ "$DB_MB" -gt 1024 ] && echo "WARNING: DB > 1GB"
SCRIPT
chmod +x /opt/monitor-xiajiao.sh
```

## Related docs

- [Cloud deployment](/deployment/cloud)
- [Docker deployment](/deployment/docker)
- [Security](/guide/security)
- [Architecture](/guide/architecture)
- [Troubleshooting](/guide/troubleshooting)
- [Glossary](/guide/glossary)
