# 部署指南

## 概述

本文档详细介绍了 Hugo Tour Dashboard 的各种部署方式，包括开发环境、测试环境和生产环境的配置。

## 环境要求

### 基础要求
- **Node.js**: 18.0.0 或更高版本
- **pnpm**: 8.0.0 或更高版本
- **内存**: 最少 2GB RAM
- **存储**: 最少 10GB 可用空间

### 生产环境推荐
- **Node.js**: 20.x LTS
- **内存**: 4GB+ RAM
- **CPU**: 2+ 核心
- **存储**: 50GB+ SSD

## 环境变量配置

### 必需环境变量

```bash
# Supabase 配置
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_KEY="your_supabase_service_key"

# 存储配置
NUXT_PUBLIC_STORAGE_PROVIDER="supabase"
SUPABASE_STORAGE_BUCKET_NAME="guide-voices"
```

### 可选环境变量

```bash
# AI 服务
OPENROUTER_API_KEY="your_openrouter_key"
GROQ_API_KEY="your_groq_key"
ELEVENLABS_API_KEY="your_elevenlabs_key"
GEMINI_API_KEY="your_gemini_key"

# 火山引擎 TTS
NUXT_VOLCENGINE_APPID="your_app_id"
NUXT_VOLCENGINE_ACCESS_TOKEN="your_access_token"
NUXT_VOLCENGINE_SECRET_KEY="your_secret_key"
NUXT_VOLCENGINE_CLUSTER="volcano_tts"
NUXT_VOLCENGINE_INSTANCE_ID="your_instance_id"

# Git 配置
GIT_CLONE_URL="https://token@github.com/user/repo.git"
```

## 本地开发部署

### 1. 克隆项目
```bash
git clone https://github.com/ovenzeze/hugo-tour-dashboard.git
cd hugo-tour-dashboard
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
```bash
cp .env .env.local
# 编辑 .env.local 文件，填入实际的 API 密钥
```

### 4. 启动开发服务器
```bash
pnpm dev
```

应用将在 http://localhost:3000 启动。

## Vercel 部署

### 1. 准备工作
- 确保代码已推送到 GitHub
- 注册 Vercel 账号

### 2. 连接项目
1. 登录 Vercel Dashboard
2. 点击 "New Project"
3. 选择 GitHub 仓库
4. 选择 `hugo-tour-dashboard` 项目

### 3. 配置构建设置
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".output/public",
  "installCommand": "pnpm install",
  "devCommand": "pnpm dev"
}
```

### 4. 环境变量配置
在 Vercel 项目设置中添加以下环境变量：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
NUXT_PUBLIC_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET_NAME=guide-voices
```

### 5. 部署
点击 "Deploy" 按钮，Vercel 将自动构建和部署应用。

### 6. 自定义域名（可选）
1. 在项目设置中点击 "Domains"
2. 添加自定义域名
3. 配置 DNS 记录

## Netlify 部署

### 1. 构建配置
创建 `netlify.toml` 文件：

```toml
[build]
  command = "pnpm build"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "20"
  PNPM_VERSION = "8"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  directory = ".output/server"
```

### 2. 部署步骤
1. 登录 Netlify
2. 连接 GitHub 仓库
3. 配置构建设置
4. 添加环境变量
5. 部署

## Docker 部署

### 1. Dockerfile
```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建产物
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

USER nuxtjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
```

### 2. Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

### 3. 构建和运行
```bash
# 构建镜像
docker build -t hugo-tour-dashboard .

# 运行容器
docker run -p 3000:3000 \
  -e SUPABASE_URL="your_url" \
  -e SUPABASE_KEY="your_key" \
  hugo-tour-dashboard

# 使用 Docker Compose
docker-compose up -d
```

## VPS 部署

### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PM2
npm install -g pm2
```

### 2. 部署脚本
创建 `deploy.sh`：

```bash
#!/bin/bash

# 设置变量
APP_DIR="/var/www/hugo-tour-dashboard"
REPO_URL="https://github.com/ovenzeze/hugo-tour-dashboard.git"

# 克隆或更新代码
if [ -d "$APP_DIR" ]; then
  cd $APP_DIR
  git pull origin main
else
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR
fi

# 安装依赖
pnpm install --frozen-lockfile

# 构建应用
pnpm build

# 重启 PM2 进程
pm2 restart hugo-tour-dashboard || pm2 start ecosystem.config.js
```

### 3. PM2 配置
创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'hugo-tour-dashboard',
    script: '.output/server/index.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### 4. Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 云平台部署

### AWS EC2
1. 启动 EC2 实例（推荐 t3.medium）
2. 配置安全组（开放 80, 443, 22 端口）
3. 按照 VPS 部署步骤进行配置
4. 配置 Application Load Balancer（可选）

### Google Cloud Platform
1. 创建 Compute Engine 实例
2. 配置防火墙规则
3. 使用 Cloud Build 进行 CI/CD
4. 配置 Cloud Load Balancing

### Azure
1. 创建 Virtual Machine
2. 配置 Network Security Group
3. 使用 Azure DevOps 进行部署
4. 配置 Application Gateway

## 监控和日志

### 1. 应用监控
```bash
# PM2 监控
pm2 monit

# 查看日志
pm2 logs hugo-tour-dashboard

# 重启应用
pm2 restart hugo-tour-dashboard
```

### 2. 系统监控
```bash
# 安装监控工具
sudo apt install htop iotop nethogs

# 查看系统资源
htop
```

### 3. 日志管理
```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/hugo-tour-dashboard

# 内容：
/var/www/hugo-tour-dashboard/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

## SSL 证书配置

### Let's Encrypt
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 性能优化

### 1. 构建优化
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    compressPublicAssets: true,
    minify: true
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'nuxt'],
            ui: ['@headlessui/vue', '@heroicons/vue']
          }
        }
      }
    }
  }
})
```

### 2. 缓存配置
```nginx
# Nginx 缓存配置
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.(html)$ {
    expires 1h;
    add_header Cache-Control "public";
}
```

## 故障排除

### 常见问题

1. **构建失败**
```bash
# 清除缓存
rm -rf .nuxt .output node_modules
pnpm install
pnpm build
```

2. **内存不足**
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

3. **端口冲突**
```bash
# 查找占用端口的进程
sudo lsof -i :3000
# 杀死进程
sudo kill -9 <PID>
```

### 日志分析
```bash
# 查看应用日志
pm2 logs hugo-tour-dashboard --lines 100

# 查看系统日志
sudo journalctl -u nginx -f

# 查看错误日志
tail -f /var/log/nginx/error.log
```

## 备份和恢复

### 1. 数据备份
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/hugo-tour-dashboard"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份应用代码
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/hugo-tour-dashboard

# 备份环境变量
cp /var/www/hugo-tour-dashboard/.env.local $BACKUP_DIR/env_$DATE.backup

# 清理旧备份（保留 30 天）
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 2. 自动备份
```bash
# 添加到 crontab
0 2 * * * /path/to/backup.sh
```

---

*部署指南版本：1.0.0*  
*最后更新：2025-05-22*