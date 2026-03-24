---
title: 安装指南 — 虾饺 IM
description: 在 Windows、macOS、Linux 上安装虾饺 IM 的详细步骤，包括 Node.js 环境配置。
---

# 安装指南

虾饺支持所有主流操作系统。唯一的前置要求是 **Node.js >= 22.0.0**。

## Windows

### 1. 安装 Node.js

**方式 A：官网下载（推荐新手）**

前往 [nodejs.org](https://nodejs.org/) 下载 LTS 版本（>= 22），运行安装程序，一路 Next。

**方式 B：winget**

```powershell
winget install OpenJS.NodeJS.LTS
```

**方式 C：nvm-windows**

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

```powershell
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
npm install
npm start
```

::: tip Windows 防火墙
首次启动时，Windows 可能弹出防火墙提示，选择"允许访问"即可。
:::

## macOS

### 1. 安装 Node.js

**方式 A：Homebrew（推荐）**

```bash
brew install node@22
```

**方式 B：nvm**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
nvm use 22
```

**方式 C：官网下载**

前往 [nodejs.org](https://nodejs.org/) 下载 macOS 安装包。

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

### 使用 nvm（通用方法）

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

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `IM_PORT` | 服务端口 | `18800` |
| `OWNER_KEY` | 管理员密码 | `admin` |
| `LLM_MODE` | LLM 模式（`direct` / `gateway`） | `direct` |

示例：

```bash
IM_PORT=3000 OWNER_KEY=my-secret npm start
```

## 数据存储

虾饺的所有数据存储在项目目录下：

| 路径 | 内容 |
|------|------|
| `data/` | SQLite 数据库、Agent 工作区、SOUL 模板 |
| `public/uploads/` | 用户上传的文件 |

备份只需复制这两个目录。

## 验证安装

启动后，浏览器打开 `http://localhost:18800`：

1. 看到登录页 → 安装成功
2. 输入默认密码 `admin` 登录
3. 进入 **设置 → 模型管理** 添加 API Key
4. 回到首页，和 Agent 聊天

## 下一步

- [快速开始](/guide/quick-start) — 配置模型，开始聊天
- [多 Agent 群聊](/features/multi-agent-chat) — 创建群组，体验协作
