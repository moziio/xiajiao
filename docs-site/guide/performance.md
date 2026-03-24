---
title: 性能调优 — 虾饺 IM
description: 虾饺 IM 性能基准、LLM 响应优化、SQLite 调优、内存管理、生产环境配置。
---

# 性能调优

虾饺本身很轻，性能瓶颈几乎都在 LLM API 调用上。这篇聚焦于如何让整体体验更快。

::: tip
以下性能数据为参考值，实际表现取决于硬件配置、数据量和并发情况。建议在自己的环境中实测。
:::

## LLM 调用优化

LLM API 调用是最大的延迟来源。一次 GPT-4o 调用通常需要 2-15 秒。

### 1. 选对模型

| 场景 | 推荐模型 | 平均延迟 | 成本 |
|------|---------|---------|------|
| 日常对话 | GPT-4o-mini / Qwen Turbo | 1-3s | 极低 |
| 复杂推理 | GPT-4o / Claude Sonnet | 3-8s | 中等 |
| 代码生成 | Claude Sonnet / DeepSeek Coder | 3-10s | 中等 |
| 极致性价比 | DeepSeek Chat / Qwen Plus | 2-5s | 低 |
| 完全免费 | Ollama 本地 | 取决于硬件 | 免费 |

**原则**：不是每个 Agent 都需要最强模型。翻译、润色、格式化用小模型够了。

### 2. 精简 System Prompt

System Prompt = SOUL.md + 自动注入的记忆 + RAG 检索结果。

总长度直接影响：
- **首 token 延迟**（TTFT）：prompt 越长，LLM 思考越久
- **API 费用**：按 token 计费
- **Context 空间**：prompt 越长，留给对话的空间越少

优化手段：

| 优化 | 做法 |
|------|------|
| 精简 SOUL.md | 控制在 500-1000 字（足够定义人格） |
| 限制记忆注入 | 只注入 top-5 最相关记忆 |
| 控制 RAG 结果 | top-3 就够，不需要 top-10 |
| 减少历史消息 | 系统自动截断，但频繁对话积累很快 |

### 3. 本地模型优化

使用 Ollama 时，硬件配置直接决定速度：

| 模型大小 | 推荐 VRAM | 推荐 CPU | 推理速度 |
|---------|----------|---------|---------|
| 7B | 8GB GPU | 8 核 | ~30 tok/s |
| 13B | 16GB GPU | 8 核 | ~20 tok/s |
| 33B | 24GB GPU | 16 核 | ~10 tok/s |
| 70B | 48GB GPU | 16 核 | ~5 tok/s |

```bash
# 检查 Ollama 推理速度
time ollama run llama3 "Hello world" --verbose
```

## SQLite 优化

### WAL 模式

虾饺默认开启 WAL（Write-Ahead Logging）模式，这是 SQLite 性能的关键：

- 允许并发读写（读不阻塞写，写不阻塞读）
- 写入性能提升 2-5 倍

```bash
# 验证 WAL 模式已开启
sqlite3 data/im.db "PRAGMA journal_mode;"
# 应输出：wal
```

### 定期维护

```bash
# 回收空间，优化查询性能
sqlite3 data/im.db "VACUUM;"

# 分析表统计信息，优化查询计划
sqlite3 data/im.db "ANALYZE;"

# 检查数据库完整性
sqlite3 data/im.db "PRAGMA integrity_check;"
```

建议：数据量超过 100MB 时，每月执行一次 VACUUM。

### 监控数据库大小

```bash
# 查看各表大小分布
sqlite3 data/im.db "
SELECT
  name,
  SUM(pgsize) as size_bytes,
  ROUND(SUM(pgsize)/1024.0/1024.0, 2) as size_mb
FROM dbstat
GROUP BY name
ORDER BY size_bytes DESC;
"
```

## 内存管理

### Node.js 内存监控

```bash
# 查看 V8 堆使用情况
node -e "
const m = process.memoryUsage();
console.log({
  heapUsed: (m.heapUsed/1024/1024).toFixed(1) + ' MB',
  heapTotal: (m.heapTotal/1024/1024).toFixed(1) + ' MB',
  rss: (m.rss/1024/1024).toFixed(1) + ' MB'
});
"
```

### 内存泄漏排查

如果内存持续增长不释放：

```bash
# PM2 监控
pm2 monit

# 设置内存限制，超过自动重启
pm2 start server/index.js --max-memory-restart 500M
```

## 生产环境配置

### PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'xiajiao',
    script: 'server/index.js',
    instances: 1,           // 单实例（SQLite 限制）
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

### Nginx 缓存静态资源

```nginx
# 前端静态资源缓存（Vanilla JS 不需要 hash 化文件名）
location ~* \.(js|css|png|jpg|gif|ico|svg|woff2)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# API 和 WebSocket 不缓存
location /api/ {
    proxy_pass http://127.0.0.1:18800;
    proxy_cache off;
}
```

### Gzip 压缩

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;
gzip_comp_level 6;
```

## 协作链性能

协作链中，Agent 串行执行。总时间 = 各 Agent 响应时间之和。

**优化思路**：链中非关键节点用快速模型——编辑和翻译不需要最强推理能力，换成更快更便宜的模型可以明显缩短总耗时。

## RAG 性能优化

RAG 检索是除 LLM 之外最耗时的操作。

### 文档索引优化

| 优化 | 做法 | 效果 |
|------|------|------|
| 控制单文档大小 | < 50 页 / < 100KB 文本 | 索引速度 2x |
| 删除无用文档 | 定期清理过期文档 | 减少检索噪音 |
| 精选文档格式 | 纯文本/Markdown > PDF > 扫描件 | 切片质量更高 |

### 检索参数调优

```
BM25 权重 vs 向量权重 → 默认 0.5:0.5 足够
RRF k 参数 → 默认 60，几乎不需要改
top_k → 3 条足够大多数场景，5 条适合长文档
```

### 大知识库场景

文档超过 100 个时：

```bash
# 定期重建 FTS5 索引
sqlite3 data/workspace-xxx/rag.db "INSERT INTO docs_fts(docs_fts) VALUES('rebuild');"

# 清理碎片
sqlite3 data/workspace-xxx/rag.db "VACUUM;"
```

## 负载估算

虾饺是单进程 SQLite 架构，适合个人和小团队使用。

::: tip 瓶颈在 LLM 不在虾饺
真正的并发瓶颈是 LLM API 的速率限制和响应时间，不是虾饺本身。SQLite WAL 模式的写入性能对 Agent 聊天场景来说绰绰有余——你不可能每秒发几百条消息。
:::

## 简易压测

快速验证虾饺在你的硬件上的表现：

```bash
# 测试 HTTP 响应速度（静态资源）
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{time_total}\n" http://localhost:18800/
done | awk '{sum+=$1} END {print "avg:", sum/NR, "s"}'

# 测试 API 响应速度（需要先登录获取 token）
curl -s -o /dev/null -w "%{time_total}s\n" \
  -H "Cookie: session=your-session-token" \
  http://localhost:18800/api/channels
```

## 监控建议

| 监控项 | 工具 | 告警阈值 | 处理方案 |
|--------|------|---------|---------|
| 内存使用 | PM2 / htop | > 500MB | PM2 自动重启 |
| CPU 使用 | PM2 / htop | > 80% 持续 5 分钟 | 检查是否有死循环 |
| 磁盘空间 | df -h | < 1GB | 清理日志 + VACUUM |
| 数据库大小 | ls -lh data/im.db | > 1GB | VACUUM + 归档旧消息 |
| 进程存活 | PM2 / systemd | 进程退出 | 自动重启 |
| WAL 文件大小 | ls -lh data/im.db-wal | > 100MB | 重启应用触发 checkpoint |

### PM2 监控脚本

```bash
# 创建简单监控脚本
cat > /opt/monitor-xiajiao.sh << 'SCRIPT'
#!/bin/bash
MEM=$(pm2 jlist | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['monit']['memory']//1024//1024)")
DISK=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
DB_SIZE=$(stat -f%z data/im.db 2>/dev/null || stat -c%s data/im.db)
DB_MB=$((DB_SIZE/1024/1024))

echo "Memory: ${MEM}MB | Disk: ${DISK}% | DB: ${DB_MB}MB"

[ "$MEM" -gt 500 ] && echo "WARNING: Memory > 500MB"
[ "$DISK" -gt 90 ] && echo "WARNING: Disk > 90%"
[ "$DB_MB" -gt 1024 ] && echo "WARNING: DB > 1GB"
SCRIPT
chmod +x /opt/monitor-xiajiao.sh
```

## 相关文档

- [云服务器部署](/deployment/cloud) — 生产环境部署完整指南
- [Docker 部署](/deployment/docker) — 容器化部署
- [安全与隐私](/guide/security) — 生产环境安全加固
- [架构设计](/guide/architecture) — 深入理解代码结构
- [故障排查](/guide/troubleshooting) — 性能问题诊断
- [术语表](/guide/glossary) — WAL、FTS5 等术语解释
