---
title: 性能调优 — 虾饺 IM
description: 虾饺 IM 性能基准、LLM 响应优化、SQLite 调优、内存管理、生产环境配置。
---

# 性能调优

虾饺本身很轻（启动 < 1 秒，空闲 ~50MB），性能瓶颈几乎都在 LLM API 调用上。这篇聚焦于如何让整体体验更快。

## 性能基准

| 指标 | 数值 | 说明 |
|------|------|------|
| 冷启动 | ~800ms | 首次启动，含数据库初始化 |
| 热启动 | ~200ms | 数据库已存在 |
| 空闲内存 | ~50MB | Node.js 基础开销 |
| 峰值内存 | ~200MB | 并发对话 + RAG 索引 |
| HTTP 响应 | ~5ms | 静态资源（Vanilla JS） |
| API 响应 | ~10ms | 不含 LLM 调用 |
| WebSocket 延迟 | ~2ms | 消息转发 |
| SQLite 写入 | ~5000 QPS | WAL 模式 |
| SQLite 读取 | ~50000 QPS | 含 FTS5 搜索 |

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

| 协作链 | 模型配置 | 预计总时间 |
|--------|---------|-----------|
| 小说家→编辑→翻译 | 全用 GPT-4o | ~20s |
| 小说家→编辑→翻译 | 小说家 GPT-4o + 编辑/翻译 GPT-4o-mini | ~12s |
| 小说家→编辑→翻译 | 全用 Qwen Turbo | ~8s |

**优化**：链中非关键节点用快速模型——编辑和翻译不需要最强推理能力。

## 监控建议

| 监控项 | 工具 | 告警阈值 |
|--------|------|---------|
| 内存使用 | PM2 / htop | > 500MB |
| CPU 使用 | PM2 / htop | > 80% 持续 5 分钟 |
| 磁盘空间 | df -h | < 1GB |
| 数据库大小 | ls -lh data/im.db | > 1GB |
| 进程存活 | PM2 / systemd | 进程退出 |

## 下一步

- [云服务器部署](/deployment/cloud) — 生产环境部署完整指南
- [Docker 部署](/deployment/docker) — 容器化部署
- [安全与隐私](/guide/security) — 生产环境安全加固
- [架构设计](/guide/architecture) — 深入理解代码结构
- [故障排查](/guide/troubleshooting) — 性能问题诊断
