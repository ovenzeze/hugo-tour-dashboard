# Dockerfile for Nuxt App with ffmpeg, using git clone

# 第一阶段：构建 Nuxt 应用
FROM node:18-alpine AS builder

# 声明用于 Git 克隆 URL 的构建参数
ARG GIT_CLONE_URL

# 设置初始工作目录 (用于克隆)
WORKDIR /src

# 安装 git
RUN apk add --no-cache git

# 克隆代码仓库到 /app 目录
# GIT_CLONE_URL 应为 "https://oauth2:YOUR_TOKEN@github.com/user/repo.git"
RUN git clone ${GIT_CLONE_URL} /app

# 设置后续操作的工作目录为克隆下来的仓库
WORKDIR /app

# package.json 和 pnpm-lock.yaml 现在位于 /app 目录中

# 安装编译原生依赖所需的构建工具
RUN apk add --no-cache python3 make g++

# 安装 pnpm 并安装项目依赖
# npm install -g pnpm 确保 pnpm 命令可用
# pnpm install 使用 /app/package.json 和 /app/pnpm-lock.yaml
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 强制重新编译原生依赖 (例如 better-sqlite3) 以确保架构匹配
RUN pnpm rebuild better-sqlite3

# 构建应用
# nuxt.config.ts 中应设置 preset: 'node-server'，输出到 .output
RUN pnpm exec nuxi build

# 第二阶段：运行 Nuxt 应用
FROM node:18-alpine

WORKDIR /app

# 安装 ffmpeg
RUN apk update && \
    apk add --no-cache \
        ffmpeg \
    && rm -rf /var/cache/apk/*

# 从构建阶段复制构建产物和必要的运行时文件
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# 如果您有 .npmrc 或 pnpm specific files like .pnpmfile.cjs, 它们应该在 git clone 时已包含
# 如果它们是构建过程生成的，并且运行时需要，则需要从 /app 复制

# 设置 Node.js 服务器监听地址和环境变量
ENV HOST=0.0.0.0
ENV NODE_ENV=production
# Nitro (nuxi start) 会自动监听 $PORT (由 Cloud Run 提供) 或默认端口 (3000)
EXPOSE 3000

# 启动 Nuxt 服务器
CMD ["npx", "nuxi", "start"]