---
title: 安装指南 — 虾饺 IM
description: 在 Windows、macOS、Linux 上安装虾饺 IM 的详细步骤，包括 Node.js 环境配置和故障排除。
---

# 安装指南

虾饺支持所有主流操作系统。唯一的前置要求是 **Node.js >= 22.0.0**。

<p align="center">
  <img src="/images/login.png" alt="安装完成后的登录界面" style="max-width: 400px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## Windows

### 1. 安装 Node.js

**方式 A：官网下载（推荐新手）**

前往 [nodejs.org](https://nodejs.org/) 下载 LTS 版本（>= 22），运行安装程序，一路 Next。

安装时确认勾选 "Add to PATH"（默认已勾选）。

**方式 B：winget（一行命令）**

```powershell
winget install OpenJS.NodeJS.LTS
```

**方式 C：nvm-windows（多版本管理）**

从 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) 下载安装 nvm，然后：

```powershell
nvm install 22
nvm use 22
```

### 2. 验证安装

```powershell
node -v   # 应显示 v22.x.x 或更高
npm -v    # 应显示 10.x.x 或更高
```

### 3. 安装虾饺

**使用 Git**：

```powershell
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
npm install
npm start
```

**没有 Git？** 直接下载 ZIP：

1. 打开 [GitHub 仓库](https://github.com/moziio/xiajiao)
2. 点击绿色 "Code" 按钮 → "Download ZIP"
3. 解压到任意目录
4. 在解压目录中打开终端，执行 `npm install && npm start`

::: tip Windows 防火墙
首次启动时，Windows 可能弹出防火墙提示，选择"允许访问"即可。这是因为 Node.js 需要监听网络端口。
:::


## macOS

### 1. 安装 Node.js

**方式 A：Homebrew（推荐）**

```bash
# 如果没装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node@22
```

**方式 B：nvm（多版本管理）**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.zshrc   # 或 source ~/.bashrc
nvm install 22
nvm use 22
```

**方式 C：官网下载**

前往 [nodejs.org](https://nodejs.org/) 下载 macOS 安装包（.pkg），双击安装。

### 2. 安装虾饺

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

## Linux

### Ubuntu / Debian

```bash
# 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v

# 安装虾饺
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

### CentOS / RHEL / Fedora

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

### Arch Linux

```bash
sudo pacman -S nodejs npm

git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

### 使用 nvm（通用方法，适用于所有 Linux 发行版）

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

## Docker

如果你更喜欢容器化部署：

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
docker build -t xiajiao .
docker run -d -p 18800:18800 \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  --name xiajiao xiajiao
```

详见 [Docker 部署](/deployment/docker)。

## 环境变量

| 变量 | 说明 | 默认值 | 何时修改 |
|------|------|--------|---------|
| `IM_PORT` | 服务端口 | `18800` | 端口冲突时 |
| `OWNER_KEY` | 管理员密码 | `admin` | **生产环境必须修改** |
| `LLM_MODE` | LLM 模式 | `direct` | 一般不需要修改 |

各平台设置方式：

::: code-group
```bash [Linux / macOS]
IM_PORT=3000 OWNER_KEY=my-secret npm start
```

```batch [Windows CMD]
set IM_PORT=3000
set OWNER_KEY=my-secret
node server/index.js
```

```powershell [Windows PowerShell]
$env:IM_PORT = "3000"
$env:OWNER_KEY = "my-secret"
node server/index.js
```
:::

## 数据存储

虾饺的所有数据存储在项目目录下，不需要外部数据库：

```
xiajiao/
├── data/
│   ├── im.db              # 主数据库（消息、频道、用户）
│   ├── agents.json         # Agent 列表配置
│   ├── workspace-xxx/      # Agent 独立工作区
│   │   ├── SOUL.md         # Agent 人格设定
│   │   ├── memory.db       # Agent 独立记忆库
│   │   └── rag/            # Agent 知识库文件
│   └── _soul-templates/    # SOUL.md 模板
└── public/uploads/         # 用户上传文件
```

备份只需复制 `data/` 和 `public/uploads/` 两个目录。

## 验证安装

启动后，浏览器打开 `http://localhost:18800`：

1. ✅ 看到登录页 → 安装成功
2. ✅ 输入默认密码 `admin` 登录
3. ✅ 进入 **设置 → 模型管理** 添加 API Key
4. ✅ 回到首页，和 Agent 聊天
5. ✅ 发送消息后收到 AI 回复 → 全部正常

## 故障排除

### `npm install` 失败

**症状**：`gyp ERR!` 或编译相关错误

**原因**：某些 npm 包的原生模块编译失败

**解决**：

```bash
# Linux
sudo apt install python3 make g++

# macOS（安装 Xcode 命令行工具）
xcode-select --install

# Windows
npm install --global windows-build-tools
```

### `npm start` 报语法错误

**症状**：`SyntaxError: Unexpected token`

**原因**：Node.js 版本太低

**解决**：升级到 Node.js 22+

```bash
node -v  # 检查版本
```

### 端口被占用

**症状**：`Error: listen EADDRINUSE :::18800`

**解决**：换个端口

```bash
IM_PORT=3000 npm start
```

### 无法从外网访问

**原因**：防火墙没开放端口

```bash
# Linux
sudo ufw allow 18800

# 云服务器还需要在控制台的安全组中开放端口
```

### 公司网络需要代理

```bash
# 设置 npm 代理
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 设置 Git 代理
git config --global http.proxy http://proxy.company.com:8080

# 安装完成后可以取消
npm config delete proxy
npm config delete https-proxy
```

### WSL2 中安装

Windows 用户可以在 WSL2 中运行虾饺：

```bash
# 确认 WSL2 版本
wsl --version

# 在 WSL2 中安装 Node.js 22
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22

# 正常安装
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install && npm start
```

从 Windows 浏览器访问 `http://localhost:18800` 即可。WSL2 自动做了端口转发。

### 离线环境安装

在无网络的机器上部署：

```bash
# 在有网络的机器上准备离线包
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
tar czf xiajiao-offline.tar.gz .

# 传到目标机器后
tar xzf xiajiao-offline.tar.gz
npm start
```

::: warning
目标机器仍需安装 Node.js 22+。可以提前下载 Node.js 二进制包一起打包。
:::

## 安装后自检清单

```
✅ node -v → v22.x 或更高
✅ npm start → 无报错
✅ 浏览器打开 http://localhost:18800 → 看到登录页
✅ 用默认密码 admin 登录成功
✅ 设置 → 模型管理 → 添加至少一个 LLM Provider
✅ 创建 Agent → 发消息 → 收到 AI 回复
✅ data/ 目录已创建且包含 im.db
```

## 相关文档

- [快速开始](/guide/quick-start) — 配置模型，开始聊天
- [模型配置](/guide/model-config) — 详细的 LLM Provider 配置教程
- [本地部署](/deployment/local) — 后台运行、开机自启、数据备份
- [Docker 部署](/deployment/docker) — 容器化部署
- [多 Agent 群聊](/features/multi-agent-chat) — 创建群组，体验协作
- [故障排查](/guide/troubleshooting) — 更多问题解决方案
