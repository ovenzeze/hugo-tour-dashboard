# Dockerfile for Nuxt App with ffmpeg ✅

# 第一阶段：构建 Nuxt 应用
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /src

# 声明用于 Git token 的构建参数
ARG GIT_CLONE_URL

# 安装 git
RUN apk add --no-cache git

# 克隆代码仓库
# 注意：您需要在构建时通过 --build-arg GIT_CLONE_URL="https://oauth2:YOUR_TOKEN@github.com/ovenzeze/hugo-tour-dashboard.git" 传递
RUN git clone ${GIT_CLONE_URL} /app
WORKDIR /app

# package.json 和 pnpm-lock.yaml 现在应该在 /app 目录中

# 安装编译原生依赖所需的构建工具
RUN apk add --no-cache python3 make g++

# 安装依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 强制重新编译原生依赖 (例如 better-sqlite3) 以确保架构匹配
RUN pnpm rebuild better-sqlite3

# 构建应用 (确保构建时需要的 public runtimeConfig 环境变量已设置)
# Nuxt 会自动从 process.env 读取 NUXT_PUBLIC_ 开头的变量
RUN nuxi build

# 第二阶段：运行 Nuxt 应用 (包含 ffmpeg) ✅
FROM node:18-alpine

WORKDIR /app

# 安装 ffmpeg
RUN apk update && \
    apk add --no-cache \
        ffmpeg \
    && rm -rf /var/cache/apk/*

# 从构建阶段复制构建产物 (现在应该是标准的 .output 目录)
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# 如果您有 .npmrc 或 pnpm specific files like .pnpmfile.cjs, copy them too
# COPY --from=builder /app/.npmrc ./.npmrc
# COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml # if applicable

# 设置 Node.js 服务器监听地址
# Nitro 会自动监听 $PORT 环境变量 (由 Cloud Run 提供) 或默认端口 (3000)
ENV HOST=0.0.0.0
# EXPOSE 指令主要用于文档和本地 Docker 交互，Cloud Run 不使用它
# 我们保留 3000 作为本地/默认参考
EXPOSE 3000

# 设置 NODE_ENV 为 production ✅
ENV NODE_ENV=production

# 启动 Nuxt 服务器 (使用标准的 Nitro 服务器入口点)
# 使用 npx 来执行项目本地安装的 nuxi 命令
# nuxi start 默认会监听 HOST 和 PORT 环境变量
CMD ["npx", "nuxi", "start"]