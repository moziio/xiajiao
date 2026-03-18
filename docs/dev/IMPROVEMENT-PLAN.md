# 虾饺 IM 改进计划

> 生成时间：2026-03-11  
> 状态标记：⬜ 待确认 | 🔲 已确认待实施 | 🔄 实施中 | ✅ 已完成 | ❌ 跳过

---

## 第一阶段：安全加固（P0）

### 1.1 ❌ 首次启动强制修改管理密钥（暂跳过，方便调试）

- **现状**：`OWNER_KEY` 默认硬编码为 `'openclaw-admin'`，部署后不改等于裸奔
- **目标**：首次启动时自动生成随机密钥，写入配置文件，控制台打印一次提示
- **涉及文件**：`server/config.js`, `server/routes/auth.js`

### 1.2 ✅ 移除不必要的 CORS 头

- **现状**：~~`Access-Control-Allow-Origin: '*'`~~（已移除）
- **结论**：前端与 API 同源，无跨域请求场景，CORS 头完全多余。直接删除 3 行 CORS header + OPTIONS 预检，比白名单更简洁安全
- **涉及文件**：`server/index.js`

### 1.3 ✅ HTTP + WebSocket 速率限制

- **现状**：~~无任何限流~~（已实现）
- **实现**：新建 `server/middleware/rate-limit.js`，基于内存滑动窗口，按 IP 限流 — HTTP 120 次/分钟，WebSocket 60 条/分钟；超限 HTTP 返回 429，WS 静默丢弃；自动清理过期桶防止内存泄漏
- **涉及文件**：新建 `server/middleware/rate-limit.js`, `server/index.js`

### 1.4 ✅ API 错误信息脱敏

- **现状**：~~500 错误直接返回 `e.message`~~（已修复）
- **实现**：`router.js` 的 catch 块改为返回通用 `"服务器内部错误"`，原始错误写入 `console.error` 服务端日志；增加 `res.writableEnded` 防护
- **涉及文件**：`server/router.js`

### 1.5 ✅ CSRF 防护

- **现状**：~~写操作无 CSRF 校验~~（已实现）
- **实现**：`auth.js` 新增 `checkOrigin(req)` — 对 POST/PUT/DELETE 校验 `Origin` 或 `Referer` 头必须与 `Host` 一致；无 Origin/Referer 的请求放行（兼容非浏览器客户端）；`index.js` HTTP 入口统一拦截，403 拒绝
- **涉及文件**：`server/middleware/auth.js`, `server/index.js`

---

## 第二阶段：通信可靠性（P0）

### 2.1 ✅ WebSocket 心跳检测

- **现状**：~~无 ping/pong~~（已实现双层心跳）
- **实现**：服务端每 30s 发 `ws.ping()`（协议层），65s 无 pong 则 `terminate()` 断开并清理用户；客户端同时处理应用层 `{"type":"ping"}` 并回复 `{"type":"pong"}` 作为兜底；`wss.close` 时清理心跳定时器
- **涉及文件**：`server/index.js`, `public/js/app.js`

### 2.2 ✅ 断线消息增量补发

- **现状**：~~断线期间消息丢失、重连全量替换造成 UI 闪烁~~（已修复）
- **实现**：基于时间戳增量查询（比内存队列更可靠，不怕服务器重启）。客户端 `join` 时带上 `lastTs`（本地最新消息时间戳）；服务端检测到 `lastTs > 0` 则用 `getMessagesSince(lastTs, 200)` 只返回新增消息，响应标记 `incremental: true`；客户端按 ID 去重后增量合并，不再全量替换
- **涉及文件**：`server/services/storage.js`（新增 `getMessagesSince`），`server/index.js`（join handler），`public/js/app.js`（增量合并逻辑）

### 2.3 ✅ 可见性感知重连

- **现状**：~~标签页切回来不检测连接~~（已实现）
- **实现**：监听 `visibilitychange`，页面变为 visible 时：若 WebSocket 已关闭（`readyState >= 2`）立即 `reconnect()`（重置延迟 1s）；若连接存活则发一个 pong 探测，send 失败也触发重连
- **涉及文件**：`public/js/app.js`

---

## 第三阶段：前端性能（P1）

### 3.1 ✅ 消息限量渲染 + DOM 裁剪

- **现状**：聊天记录全量渲染到 DOM，数千条消息后界面严重卡顿
- **方案**：限量渲染（初始 50 条）+ 内存优先加载 + DOM 节点裁剪（上限 200）
- **改动**：
  - `renderMessages()` 只渲染最后 50 条，秒开频道
  - `loadOlderMessages()` 优先从 `allMessages` 内存取未渲染消息（30 条/批），耗尽后才走 API
  - `_trimDom()` 当 DOM 子节点超过 200 时自动裁剪顶部旧消息
  - `renderNewMessage()` 追加后触发 DOM 裁剪
  - `_clearChannel()` 清空时重置偏移量
  - 多选模式下加载更多消息时自动应用复选框和事件绑定
- **涉及文件**：`public/js/chat.js`

### 3.2 ✅ 图片/附件懒加载优化

- **现状**：已有 `loading="lazy"`，但无 IntersectionObserver 精细控制
- **方案**：基于 IntersectionObserver + MutationObserver 的自动懒加载
- **改动**：
  - 所有图片/视频渲染改用 `data-lazy-src` + `class="lazy-media"` 替代 `src` + `loading="lazy"`
  - `chat.js` 末尾新增 `IntersectionObserver`（rootMargin 300px 提前加载）
  - `MutationObserver` 自动监听 `messagesEl` 子树变化，无需手动调用 observe
  - 可视区域外的媒体显示 shimmer 骨架屏动画占位
  - 进入视口 300px 缓冲区时自动将 `data-lazy-src` → `src` 触发加载
  - `openLightbox` 调用增加 `this.dataset.lazySrc` 降级，防止极端时序问题
- **涉及文件**：`public/js/chat.js`, `public/js/core/format.js`, `public/js/rich-cards.js`, `public/css/style.css`

---

## 第四阶段：体验优化（P1-P2）

### 4.1 ✅ 消息发送状态指示

- **现状**：消息发送后无状态反馈，用户不知道是否成功
- **方案**：乐观渲染 + `_tempId` 关联 + 超时检测
- **改动**：
  - `server/index.js`：透传客户端 `_tempId`（≤30 字符）到广播消息
  - `chat.js sendMessage()`：生成 `_tempId`，立即乐观渲染消息（状态=sending），12s 超时转 failed
  - `chat.js renderMsg()`：自己的消息根据 `_status` 显示 ⏳发送中 / ✓已送达 / ⚠失败
  - `chat.js _updateMsgStatus()`：动态更新 DOM 状态指示器，delivered 3s 后自动隐藏
  - `chat.js retrySend()`：点击失败图标重发，复用原始 payload
  - `app.js handleMessage`：收到服务端回显时匹配 `_tempId`，合并服务端数据，更新状态为 delivered
  - `app.js joined`：重连时清理残留 sending 状态的乐观消息，由历史同步补回
  - i18n 新增 `chat.sending` / `chat.retryHint`
- **涉及文件**：`server/index.js`, `public/js/chat.js`, `public/js/app.js`, `public/js/lang/zh.js`, `public/js/lang/en.js`, `public/css/style.css`

### 4.2 ✅ 断线消息本地暂存

- **现状**：~~断线时发送的消息直接丢失~~（已修复）
- **实现**：断线时消息以乐观渲染方式显示（`_status: 'queued'`），payload 存入 localStorage 队列（`im-offline-queue`），重连后 `joined` 处理器自动恢复队列条目到 `allMessages` 并按顺序重发；`retrySend` 断线时也自动入队而非仅显示提示；队列条目按 `tempId` 去重防止重复发送
- **涉及文件**：`public/js/chat.js`（队列管理 + sendMessage/retrySend 改造 + 状态指示），`public/js/app.js`（joined 处理器恢复+drain），`public/js/lang/zh.js`，`public/js/lang/en.js`，`public/css/style.css`

### 4.3 ✅ 移动端手势增强

- **现状**：~~仅 768px 一个断点，无手势支持，禁用了缩放~~（已修复）
- **实现**：
  - **Viewport 修复**：移除 `user-scalable=no` 和 `maximum-scale=1.0`，改为 `viewport-fit=cover` 支持安全区和用户缩放
  - **安全区适配**：sidebar 顶部、chat-header 顶部、input-area 底部均使用 `env(safe-area-inset-*)` 适配刘海屏/底部横条
  - **下拉加载历史**：在消息列表顶部（`scrollTop <= 5`）触摸下拉触发 `loadOlderMessages()`，带文字提示（下拉/松手/加载中/没有更多）和旋转加载动画，水平滑动自动取消 PTR
  - **左滑/右滑消息快速回复**：他人消息向左滑、自己消息向右滑，超过 60px 阈值松手触发 `setReplyTarget()`；方向锁定（先判断横向/纵向）防止误触；回复箭头「↩」以绝对定位独立于 `.messages` 容器显示在消息原位侧边
  - **移动端 CSS 优化**：`overscroll-behavior-y: contain` 禁止浏览器原生下拉刷新；消息操作按钮默认可见（`opacity: 1`）；附件删除按钮默认可见；`-webkit-overflow-scrolling: touch` 平滑滚动
  - **手势安全**：`touchcancel` 事件清理残留状态；`passive` 标记正确设置（PTR 为 passive，swipe 为 non-passive 以支持 `preventDefault`）
- **涉及文件**：`public/js/chat.js`（PTR + 左滑回复手势），`public/css/style.css`（安全区 + 响应式 + 手势样式），`public/index.html`（viewport），`public/js/lang/zh.js`，`public/js/lang/en.js`

---

## 第五阶段：工程化（P2）

### 5.1 ✅ 结构化日志 + Request ID

- **现状**：~~无请求 ID，日志为 `console.log` 散打，排查问题困难~~（已实现）
- **实现**：
  - 新建 `server/middleware/logger.js`：统一日志模块，格式 `[2026-03-11 14:30:05.123] [INFO] [模块] [reqId] 内容`；支持 `debug/info/warn/error` 四个级别（通过 `LOG_LEVEL` 环境变量控制）；`error` 级别输出到 `stderr`，其余输出到 `stdout`；提供 `createLogger(mod, reqId)` 工厂和 `child()` 派生；`genReqId()` 生成基于时间戳的唯一请求 ID
  - `server/index.js`：HTTP 请求入口分配 `req.reqId` 和 `req.log`，所有 19 处 `console.*` 替换为结构化 logger
  - `server/router.js`：catch 块使用 `req.log` 带 reqId 记录 API 错误
  - 全部 8 个 routes/services 文件（`auth.js`, `agents.js`, `rag.js`, `llm.js`, `gateway.js`, `database.js`, `workflow.js`, `image-gen.js`）的 ~55 处 `console.*` 替换为模块级 `log.info/warn/error`
  - 唯一保留的 `console.error`：Node.js 版本检查（在 `require` 前执行，logger 尚不可用）
- **涉及文件**：新建 `server/middleware/logger.js`；改造 `server/index.js`, `server/router.js`, `server/routes/auth.js`, `server/routes/agents.js`, `server/services/rag.js`, `server/services/llm.js`, `server/services/gateway.js`, `server/services/database.js`, `server/services/workflow.js`, `server/services/image-gen.js`

### 5.2 ✅ 数据库迁移机制

- **现状**：~~表结构变更靠手写 SQL，无版本管理~~（已实现）
- **实现**：
  - `server/services/database.js`：新增 `_migrations` 表（`version INTEGER PK, name TEXT, appliedAt INTEGER`）；新增 `runMigrations()` 迁移执行器，在 `initDB()` 末尾自动运行
  - 迁移执行器：扫描 `server/migrations/` 目录中 `NNN_*.js` 文件，按版本号排序；比对 `_migrations` 表已执行记录，跳过已完成的；每个迁移在独立事务中运行，失败自动回滚并阻止启动
  - 防御性校验：`isNaN` 版本号跳过、`up()` 非函数检测、`duplicate column` 容错
  - `getMigrationStatus()` 导出函数可查询已应用迁移列表
  - `001_baseline.js`：基线迁移（no-op），标记初始 schema 为版本 1
  - `002_add_messages_editedAt.js`：示例迁移，为 `messages` 表添加 `editedAt` 列（消息编辑功能预留）
- **涉及文件**：`server/services/database.js`；新建 `server/migrations/001_baseline.js`, `server/migrations/002_add_messages_edited.js`

### 5.3 ✅ Token 主动撤销

- **现状**：~~管理员 token 只能等 7 天 TTL 过期，无法主动吊销~~（已实现）
- **实现**：
  - `server/routes/auth.js`：新增 `DELETE /api/auth/all`（注销除当前设备外所有会话）和 `GET /api/auth/sessions`（查询活跃会话数）接口，均需主人权限鉴权
  - `public/js/settings-infra.js`：安全设置页面新增"会话管理"区块，显示活跃会话数，提供"注销全部设备"按钮（`revokeAllSessions()`），含二次确认弹窗、多重点击防护、HTTP 状态码检查
  - `renderSettingsAuth()` 改为 async，首次渲染时展示加载提示，API 返回前切换 tab 自动取消渲染
  - i18n：中英文各新增 7 个翻译字段（`sessionTitle`, `activeSessions`, `revokeAll`, `revokeAllHint`, `revokeAllConfirm`, `revokeAllDone`, `revokeAllNone`）
- **涉及文件**：`server/routes/auth.js`, `public/js/settings-infra.js`, `public/js/lang/zh.js`, `public/js/lang/en.js`

### 5.4 ✅ 多角色权限体系

- **现状**：~~只有 owner 一个角色，无普通管理员/成员概念~~（已实现）
- **实现**：
  - 四级角色：`owner`(3) > `admin`(2) > `member`(1) > `guest`(0)
  - `server/middleware/auth.js`：Session 结构从 `Map<token, ts>` 升级为 `Map<token, {ts, role}>`，含旧格式兼容迁移；新增 `ROLES` 常量、`getRole(req)`、`hasRole(req, minRole)`、`guardRole(minRole)` 工厂函数
  - `server/routes/auth.js`：登录接口匹配 ownerKey/adminKey/memberKey → 返回对应角色；verify 接口返回 `role` 字段
  - `server/routes/settings.js`：新增 `GET/PUT /api/settings/role-keys` 接口，owner 可设置/清除 admin/member 密钥（≥4 位），空串清除
  - 后端权限降级：消息管理、社区管理、群组 CRUD 从 owner-only 降为 admin+；文件上传从 owner-only 降为 member+；Agent CRUD、Workflow、系统设置保持 owner-only
  - 前端新增 `myRole` 状态变量和 `canManage()`（≥admin）、`canChat()`（≥member）辅助函数
  - 前端 UI 权限分级：40+ 处 `isOwner` 检查按权限矩阵替换为 `canManage()`（群组、社区、消息删除）或保留 `isOwner`（Agent、Workflow、KB、Settings）
  - 设置页新增「角色密钥」管理区块，并行加载 session count 和 role key 状态
  - 在线用户面板、消息 badge 显示对应角色名称
  - i18n：中英文各新增角色名称（4个）+ 角色密钥管理（10 个）翻译字段
- **涉及文件**：`server/middleware/auth.js`, `server/routes/auth.js`, `server/routes/settings.js`, `server/routes/messages.js`, `server/routes/groups.js`, `server/routes/community.js`, `server/index.js`, `public/js/state.js`, `public/js/login.js`, `public/js/app.js`, `public/js/chat.js`, `public/js/rich-cards.js`, `public/js/contacts.js`, `public/js/community.js`, `public/js/manage-group.js`, `public/js/chat-sidebar.js`, `public/js/favorites.js`, `public/js/workflows.js`, `public/js/settings-infra.js`, `public/js/lang/zh.js`, `public/js/lang/en.js`

---

## 第六阶段：离线与 PWA（P3）

### 6.1 ✅ PWA Manifest

- **现状**：~~无 PWA 支持，无法添加到主屏幕~~（已实现）
- **实现**：
  - 新建 `public/manifest.json`：配置 `name`、`short_name`、`start_url`、`display: standalone`、`theme_color`、`background_color`，3 种图标（SVG any + 192px PNG + 512px PNG maskable）
  - `public/index.html`：新增 `<link rel="manifest">`、`<meta name="theme-color">`、Apple Web App 系列 meta（capable、status-bar-style、title）、apple-touch-icon 指向 192px PNG
  - 生成 `public/icons/icon-192.png` 和 `icon-512.png`（品牌渐变色 PNG）
- **涉及文件**：新建 `public/manifest.json`、`public/icons/icon-192.png`、`public/icons/icon-512.png`；改造 `public/index.html`

### 6.2 ✅ Service Worker 离线缓存

- **现状**：~~断网直接白屏不可用~~（已实现）
- **实现**：
  - 新建 `public/sw.js`：三级缓存策略
    - **navigation 请求**（页面导航）→ network-first，网络失败回退缓存，最终 fallback 到预缓存的 offline.html
    - **静态资源**（JS/CSS/PNG/SVG 等）→ cache-first，缓存命中直接返回，miss 时从网络获取并缓存
    - **其他同源 GET**（manifest.json 等）→ network-first，保持最新
    - API / WebSocket / 跨域 / 非 GET 请求不拦截
  - install 阶段预缓存 5 个关键资源（`/`、`/offline.html`、favicon.svg、2 个 PNG 图标），`skipWaiting()` 即时激活
  - activate 阶段清理旧版本缓存，`clients.claim()` 接管已有页面
  - 新建 `public/offline.html`：独立友好离线页面，暗色主题，内联样式（不依赖外部 CSS/JS），一键刷新重连
  - `public/js/app.js`：页面 load 后注册 SW，`updatefound` 检测更新时 toast 通知用户
  - `server/index.js`：`sw.js` 和 `manifest.json` 设置 `Cache-Control: no-cache`（避免浏览器过度缓存）
  - i18n：中英文新增 `app.swUpdated`、`app.offline` 翻译
- **涉及文件**：新建 `public/sw.js`、`public/offline.html`；改造 `public/js/app.js`、`server/index.js`、`public/js/lang/zh.js`、`public/js/lang/en.js`

---

## 实施记录

| 日期 | 编号 | 改进项 | 状态 | 备注 |
|------|------|--------|------|------|
| 2026-03-11 | 1.1 | 首次启动强制修改管理密钥 | ❌ 跳过 | 暂保留默认值方便调试 |
| 2026-03-11 | 1.2 | 移除不必要的 CORS 头 | ✅ 完成 | 同源无需 CORS，直接删除比白名单更合理 |
| 2026-03-11 | 1.3 | HTTP + WebSocket 速率限制 | ✅ 完成 | HTTP 120次/分钟，WS 60条/分钟，按 IP 滑动窗口 |
| 2026-03-11 | 1.4 | API 错误信息脱敏 | ✅ 完成 | 500 错误返回通用提示，详情写日志 |
| 2026-03-11 | 1.5 | CSRF 防护 | ✅ 完成 | 写操作校验 Origin/Referer 与 Host 一致性 |
| 2026-03-11 | 2.1 | WebSocket 心跳检测 | ✅ 完成 | 协议层 ping/pong + 应用层兜底，65s 超时断开 |
| 2026-03-11 | 2.2 | 断线消息增量补发 | ✅ 完成 | 基于时间戳增量查询，重连不再全量替换 |
| 2026-03-11 | 2.3 | 可见性感知重连 | ✅ 完成 | visibilitychange + 探测 send，秒级恢复 |
| 2026-03-11 | 4.1 | 消息发送状态指示 | ✅ 完成 | 乐观渲染 + sending/delivered/failed 状态 + 重试 |
| 2026-03-11 | 4.2 | 断线消息本地暂存 | ✅ 完成 | localStorage 队列暂存，重连自动重发，去重防护 |
| 2026-03-11 | 3.1 | 有限消息渲染 | ✅ 完成 | 内存-first 滚动 + DOM Trimming + IntersectionObserver |
| 2026-03-11 | 3.2 | 图片/附件懒加载 | ✅ 完成 | IntersectionObserver + shimmer 占位符 + 延迟 class 移除 |
| 2026-03-11 | 4.3 | 移动端手势增强 | ✅ 完成 | PTR 加载历史 + 右滑回复 + 安全区适配 |
| 2026-03-11 | 5.1 | 结构化日志 + Request ID | ✅ 完成 | 统一日志模块 + 请求追踪 + 全局替换 console.* |
| 2026-03-11 | 5.2 | 数据库迁移机制 | ✅ 完成 | 自动扫描 migrations/ + 事务执行 + 版本管理 |
| 2026-03-11 | 5.3 | Token 主动撤销 | ✅ 完成 | DELETE /api/auth/all + 会话管理 UI + 二次确认 |
| 2026-03-11 | 5.4 | 多角色权限体系 | ✅ 完成 | owner/admin/member/guest 四级角色 + 20+ 文件权限分级 |
| 2026-03-11 | 5.4+ | 5.4 深度自查修复(1) | ✅ 完成 | WS 权限校验、workflow_control 权限、session 兼容性、guestCanChat 同步 |
| 2026-03-11 | 5.4++ | 5.4 深度自查修复(2) | ✅ 完成 | 删除会话权限门控、ROLES 常量复用、密钥冲突校验、stop 权限、saveRoleKeys 防抖 |
| 2026-03-11 | 5.4+3 | 5.4 深度自查修复(3) | ✅ 完成 | changeOwnerKey 密钥冲突校验、过期 token 清理、canChat 修正、guestCanChat 前端传递 |
| 2026-03-11 | 5.4+4 | 5.4 深度自查修复(4) | ✅ 完成 | guestCanChat undefined 一致性、stop 权限与 chat 对齐、guestCanChat 实时广播 |
| 2026-03-17 | 6.1 | PWA Manifest | ✅ 完成 | manifest.json + 3 种图标 + Apple Web App meta |
| 2026-03-17 | 6.2 | Service Worker 离线缓存 | ✅ 完成 | cache-first 静态 + network-first 页面 + offline.html fallback |
| 2026-03-17 | 6.1+6.2 | 两轮自查修复 | ✅ 完成 | 修复 manifest 背景色、respondWith(undefined)、fallback 策略分离 |
| 2026-03-17 | M0.1 | 前端：社区→事件流 | ✅ 完成 | 全面重写 community.js，移除发帖/评论/点赞/话题管理，改为只读事件流 + 类型过滤 |
| 2026-03-17 | M0.4 | i18n 更新 | ✅ 完成 | 新增 activity.* 14 个翻译键（中/英），移除 post.* |
| 2026-03-17 | M0.1+ | 三轮自查修复 | ✅ 完成 | loadPosts 参数修正、侧边栏 active 态、事件图标分色、空状态美化、废弃 CSS 清理 |
| 2026-03-17 | M0.2 | 后端：精简社区 API | ✅ 完成 | 移除人工发帖/评论/点赞/话题 CRUD 共 5 个写入端点，保留只读 + 管理删除 |
| 2026-03-17 | M0.2+ | 三轮自查修复 | ✅ 完成 | hydrate 简化（去掉无效 SQL）、storage 死代码清理、gateway 导出清理 |
| 2026-03-17 | M0.3 | 迁移成长看板入口 | ✅ 完成 | 看板迁入 Settings（adminOnly tab），事件流侧边栏精简为"动态+例会" |
| 2026-03-17 | M0.3+ | 三轮自查修复 | ✅ 完成 | 双重渲染修复、嵌套滚动修复、移除评论计数列 |
| 2026-03-17 | M0 | **M0 全部完成** | ✅ 完成 | 社区降级为事件流：前端重构 + 后端精简 + 看板迁移 + i18n |
| 2026-03-17 | M1.1 | 统一 Tool Event 协议 | ✅ 完成 | tool-events.js：tool_call_start/end/approval_required 三种事件类型 |
| 2026-03-17 | M1.2 | ToolRegistry 注册机制 | ✅ 完成 | tool-registry.js：全局注册表、多厂商 schema 转换、Agent 级别白黑名单 |
| 2026-03-17 | M1.3 | Direct LLM 引擎 | ✅ 完成 | llm.js 重构为工具调用循环、SSE 流中 tool_call 检测累积、循环保护 |
| 2026-03-17 | M1.5 | 内置工具 3 件套 | ✅ 完成 | rag_query + web_search(Tavily/SerpAPI) + memory_write(SQLite) |
| 2026-03-17 | M1.6 | 前端工具调用时间线 | ✅ 完成 | 实时 spinner + 状态变色 + 结果折叠展开 + 工具图标 + i18n |
| 2026-03-17 | M1+ | 四轮自查修复 | ✅ 完成 | R1-2: 冗余导入/变量清理；R3: Anthropic 消息合并BUG(数组content被拼接)、safeParse(null)BUG、stopReason 清理；R4: 6场景端到端验证通过 |
