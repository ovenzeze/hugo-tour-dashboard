#!/bin/sh
# 启动脚本，在容器启动时执行

# 环境变量检查
if [ -z "$GIT_REPO_URL" ]; then
  echo "错误: 未设置GIT_REPO_URL环境变量"
  exit 1
fi

echo "开始从Git仓库拉取最新代码..."
# 如果是首次启动，则克隆仓库
if [ ! -d "/app/.git" ]; then
  echo "首次启动，克隆Git仓库..."
  # 删除之前可能存在的文件
  rm -rf /app/*
  rm -rf /app/.* 2>/dev/null || true
  
  # 克隆仓库
  git clone $GIT_REPO_URL /app
else
  # 如果已经存在，则执行pull
  echo "Git仓库已存在，拉取最新更改..."
  git fetch
  git reset --hard origin/main  # 假设使用main分支，可以通过环境变量设置
fi

# 安装依赖
echo "安装依赖..."
pnpm install --frozen-lockfile

# 重新编译native模块以确保兼容性
echo "重新编译native模块..."
pnpm rebuild better-sqlite3

# 构建应用
echo "构建应用..."
pnpm exec nuxi build

# 启动应用
echo "启动应用..."
exec npx nuxi start
