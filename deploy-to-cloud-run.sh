Nuxz#!/bin/bash
# 部署应用到Cloud Run的脚本

# 确保脚本在错误时退出
set -e

# 变量设置
PROJECT_ID=$(gcloud config get-value project)
IMAGE_NAME="hugo-tour-dashboard"
REGION="us-west1" # 美国西部俄勒冈区域
SERVICE_NAME="hugo-tour-dashboard"
GCR_IMAGE="gcr.io/$PROJECT_ID/$IMAGE_NAME"

# 显示当前设置
echo "当前配置:"
echo "项目ID: $PROJECT_ID"
echo "镜像名称: $IMAGE_NAME"
echo "区域: $REGION"
echo "服务名称: $SERVICE_NAME"
echo "GCR镜像: $GCR_IMAGE"
echo

# 确认项目 ID
if [ -z "$PROJECT_ID" ]; then
    echo "未设置 Google Cloud 项目。请运行："
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# 使用docker-compose构建镜像
echo "正在使用docker-compose构建Docker镜像..."
# 使用当前目录作为构建上下文，而不是git clone
echo "请输入您的GitHub仓库URL（例如：https://github.com/yourusername/hugo-tour-dashboard.git）："
read -p "Git仓库URL: " input_git_url
GIT_CLONE_URL=${input_git_url:-"https://github.com/yourusername/hugo-tour-dashboard.git"}
echo "将使用Git仓库URL: $GIT_CLONE_URL"
docker-compose build app

# 标记为GCR镜像并推送到Google Container Registry
echo "正在标记并推送Docker镜像到Google Container Registry..."
docker tag hugo-tour-dashboard-app:latest $GCR_IMAGE
docker push $GCR_IMAGE

# 部署到Cloud Run
echo "正在部署到Cloud Run..."

# 从.env文件直接读取环境变量
if [ -f .env ]; then
  ENV_VARS=""
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # 跳过以#开头的注释行和空行
    if [[ $key =~ ^#.*$ || -z $key ]]; then
      continue
    fi
    
    # 移除引号
    value=${value//\"/}
    value=${value//\'/}
    
    # 追加到环境变量字符串
    if [ -z "$ENV_VARS" ]; then
      ENV_VARS="$key=$value"
    else
      ENV_VARS="$ENV_VARS,$key=$value"
    fi
  done < .env
  
  echo "已从.env文件读取以下环境变量："
  echo "$ENV_VARS" | tr ',' '\n'
  
  # 部署到Cloud Run，包含环境变量
  gcloud run deploy $SERVICE_NAME \
    --image $GCR_IMAGE \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port=3000 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --set-env-vars="NODE_ENV=production" \
    --update-env-vars="$ENV_VARS"
else
  echo "未找到.env文件，只设置NODE_ENV=production"
  
  # 部署到Cloud Run，不包含额外环境变量
  gcloud run deploy $SERVICE_NAME \
    --image $GCR_IMAGE \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port=3000 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --set-env-vars="NODE_ENV=production"
fi

echo "部署完成！您的应用已经在Cloud Run上运行。"
echo "您可以在Google Cloud Console中查看您的服务："
echo "https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
