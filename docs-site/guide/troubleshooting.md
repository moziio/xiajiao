---
title: 故障排查 — 虾饺 IM
description: 虾饺 IM 常见错误的诊断与修复——启动失败、Agent 不回复、记忆丢失、RAG 无结果、WebSocket 断连。
---

# 故障排查

按"症状 → 原因 → 修复"组织，快速定位问题。

## 启动类

### 启动时报 `SyntaxError` 或 `ERR_UNKNOWN_BUILTIN_MODULE`

**原因**：Node.js 版本低于 22。虾饺使用 `node:sqlite`（Node.js 22 新增内置模块）。

```bash
node -v
# 如果显示 v18.x 或 v20.x，需要升级
```

**修复**：

```bash
# nvm 用户
nvm install 22
nvm use 22

# 全新安装
# Windows: https://nodejs.org 下载 LTS
# macOS: brew install node@22
# Linux: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install nodejs
```

### 端口 18800 被占用

```
Error: listen EADDRINUSE: address already in use :::18800
```

**修复**：

```bash
# 找出占用进程
# Linux/macOS
lsof -i :18800
# Windows
netstat -ano | findstr :18800

# 杀掉进程，或换端口
PORT=18801 npm start
```

### `npm install` 失败

**修复**：

```bash
# 清理缓存重装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 如果是网络问题（中国大陆）
npm config set registry https://registry.npmmirror.com
npm install
```

### 启动后无法从外部访问

**原因**：默认监听 `0.0.0.0:18800`，但可能被防火墙拦截。

```bash
# 检查是否正在运行
curl http://localhost:18800

# 如果本地能访问但外部不行，检查防火墙
sudo ufw status
sudo ufw allow 18800

# 云服务器还要检查安全组规则
```

## Agent 类

### Agent 不回复消息

**症状**：@Agent 后没有任何反应。

**排查步骤**：

1. **检查模型配置**：设置 → 模型管理 → 确认 API Key 有效

```bash
# 测试 API Key 是否有效
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer your-api-key"
```

2. **检查 Agent 是否在群组中**：群组设置 → 确认 Agent 已被拉入

3. **检查控制台日志**：

```bash
# 查看服务端日志
# 如果用 PM2
pm2 logs xiajiao

# 如果直接运行
# 终端会输出错误信息
```

4. **常见 API 错误**：

| 错误 | 原因 | 修复 |
|------|------|------|
| `401 Unauthorized` | API Key 无效或过期 | 更换 Key |
| `429 Too Many Requests` | 超过速率限制 | 等待或升级计划 |
| `503 Service Unavailable` | Provider 服务中断 | 等待恢复或切换模型 |
| `timeout` | 网络不通 | 检查代理设置 |

### Agent 回复很慢

**可能原因**：

1. **模型太大**：GPT-4 / Claude Opus 比 GPT-3.5 / Qwen Turbo 慢很多
2. **Prompt 太长**：SOUL.md 太长 + 记忆太多 + 历史消息太长
3. **网络延迟**：海外 API 从中国访问慢

**优化建议**：

| 策略 | 做法 |
|------|------|
| 换轻量模型 | 日常任务用 GPT-4o-mini / Qwen Turbo / DeepSeek Chat |
| 精简 SOUL.md | 控制在 500-1500 字 |
| 减少历史消息 | 系统会自动截断，但 Agent 越活跃积累越快 |
| 用国内模型 | 通义千问 / DeepSeek / Kimi 延迟更低 |

### Agent 输出格式不对

**修复**：在 SOUL.md 中明确要求输出格式。

```markdown
## 输出格式
- 代码用 markdown 代码块，标注语言
- 不超过 500 字
- 不要使用 emoji
- 不要说"当然可以"等废话，直接给内容
```

### Agent 不使用工具

**排查**：

1. 确认 Agent 配置中 `tools` 列表包含对应工具
2. 确认模型支持 Tool Calling（小模型如 `mistral:7b` 可能不支持）
3. 在 SOUL.md 中引导使用工具：

```markdown
## 工具使用
- 遇到不确定的事实，使用 web_search 搜索
- 需要查找项目文档时，使用 rag_query
```

## 记忆类

### Agent 不记住之前的对话

**可能原因**：

1. **记忆功能未开启**：确认 Agent 配置中包含 `memory_write` 和 `memory_search` 工具
2. **Agent 没主动写记忆**：在 SOUL.md 中引导：

```markdown
## 记忆规则
- 用户提到的偏好、技术栈、工作环境，用 memory_write 记下来
- 重要的决定和结论，用 memory_write 记下来
```

3. **模型能力不够**：小模型可能不擅长主动调用工具

### 记忆数据库损坏

**极少发生**，但如果遇到：

```bash
# 检查数据库完整性
sqlite3 data/workspace-xxx/memory.db "PRAGMA integrity_check;"

# 如果损坏，尝试恢复
sqlite3 data/workspace-xxx/memory.db ".recover" | sqlite3 data/workspace-xxx/memory-recovered.db
mv data/workspace-xxx/memory-recovered.db data/workspace-xxx/memory.db
```

## RAG 类

### 上传文档后搜索没结果

**排查**：

1. **确认文档已上传**：检查 `data/workspace-xxx/rag/` 目录是否有文件
2. **等待索引完成**：大文档索引需要时间
3. **检查搜索关键词**：尝试用文档中的原文搜索
4. **确认 Agent 有 `rag_query` 工具**

### PDF 解析失败

**原因**：`pdf-parse` 库对某些 PDF 格式支持有限（扫描版、加密、特殊编码）。

**修复**：

1. 尝试用其他工具转换 PDF 为文本后重新上传
2. 改用 `.txt` 或 `.md` 格式

### RAG 检索结果不相关

**优化**：

| 策略 | 做法 |
|------|------|
| 文档质量 | 确保文档内容清晰、结构化 |
| 分块大小 | 默认分块通常够用，过短的段落可以合并 |
| 搜索方式 | BM25 擅长关键词匹配，向量擅长语义匹配 |
| LLM 重排 | 确保模型能力足够做重排序 |

## WebSocket 类

### 消息不实时显示

**症状**：发送消息后需要刷新才能看到 Agent 回复。

**排查**：

1. **检查 WebSocket 连接**：浏览器开发者工具 → Network → WS → 确认连接正常
2. **检查 Nginx 配置**：WebSocket 需要特殊配置

```nginx
location / {
    proxy_pass http://127.0.0.1:18800;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # 关键：超时设置要足够长
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

3. **检查 CDN/负载均衡器**：Cloudflare、阿里云 SLB 等需要开启 WebSocket 支持

### WebSocket 频繁断连

**可能原因**：

| 原因 | 修复 |
|------|------|
| Nginx `proxy_read_timeout` 太短 | 设为 `86400s` |
| 网络不稳定 | 虾饺有自动重连机制，检查网络 |
| 浏览器休眠 | PWA 模式下浏览器可能休眠 WebSocket |

## Docker 类

### 容器启动后访问不了

```bash
# 确认容器在运行
docker ps

# 检查端口映射
docker port xiajiao

# 查看容器日志
docker logs xiajiao
```

### 数据丢失（重启后）

**原因**：没有挂载 volume。

```bash
# 正确的启动方式（挂载数据目录）
docker run -d \
  -p 18800:18800 \
  -v $(pwd)/xiajiao-data:/app/data \
  -v $(pwd)/xiajiao-uploads:/app/public/uploads \
  --name xiajiao \
  xiajiao
```

### 权限问题

```bash
# 容器内 Node.js 以非 root 用户运行
# 确保挂载目录的权限正确
chown -R 1000:1000 ./xiajiao-data ./xiajiao-uploads
```

## 性能类

### 内存占用高

**正常范围**：100-300MB。如果超过 500MB：

```bash
# 检查 Node.js 内存使用
node -e "console.log(process.memoryUsage())"

# 重启释放内存
pm2 restart xiajiao
```

### SQLite 锁等待

**症状**：高并发时出现 `SQLITE_BUSY`。

**修复**：虾饺已启用 WAL 模式减少锁冲突。如果仍然出现：

```bash
# 检查 WAL 模式是否开启
sqlite3 data/im.db "PRAGMA journal_mode;"
# 应该显示 "wal"
```

## 诊断命令速查

```bash
# Node.js 版本
node -v

# 虾饺是否在运行
curl -s http://localhost:18800 | head -c 100

# 端口占用
lsof -i :18800          # Linux/macOS
netstat -ano | findstr :18800  # Windows

# SQLite 数据库大小
ls -lh data/im.db

# 依赖漏洞扫描
npm audit

# PM2 状态
pm2 status

# Docker 日志
docker logs xiajiao --tail 50

# 系统资源
free -h && df -h
```

## 还是解决不了？

1. 搜索 [GitHub Issues](https://github.com/moziio/xiajiao/issues)
2. 提交新 Issue（附上错误日志、Node.js 版本、操作系统）
3. 加入 [GitHub Discussions](https://github.com/moziio/xiajiao/discussions) 讨论

## 下一步

- [快速开始](/guide/quick-start) — 确认安装步骤
- [安全与隐私](/guide/security) — 生产环境安全加固
- [Docker 部署](/deployment/docker) — 容器化部署
- [模型配置](/guide/model-config) — 模型相关问题
- [常见问题](/guide/faq) — 更多 Q&A
