#!/bin/bash
# 使用动态Git拉取的方式部署到Cloud Run
# 这个脚本每次部署的是同一个镜像，但容器启动时会拉取最新代码

# 确保脚本在错误时退出
set -e

# 变量设置
PROJECT_ID=$(gcloud config get-value project)
IMAGE_NAME="hugo-tour-dashboard-live"
REGION="us-west1" # 美国西部俄勒冈区域
SERVICE_NAME="hugo-tour-dashboard-live"
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

# 询问是否需要构建新镜像
read -p "是否需要构建新镜像？(首次部署或Dockerfile.live变更时选择y) [y/N]: " build_new_image
if [[ $build_new_image =~ ^[Yy]$ ]]; then
    echo "正在构建动态Git拉取的Docker镜像..."
    docker build -t $IMAGE_NAME -f Dockerfile.live .
    
    echo "正在标记并推送Docker镜像到Google Container Registry..."
    docker tag $IMAGE_NAME $GCR_IMAGE
    docker push $GCR_IMAGE
fi

# 请输入Git仓库URL
echo "请输入您的GitHub仓库URL:"
read -p "Git仓库URL: " git_repo_url
if [ -z "$git_repo_url" ]; then
    echo "错误: 未提供Git仓库URL"
    exit 1
fi

# 从.env文件直接读取环境变量
ENV_VARS="GIT_REPO_URL=$git_repo_url"
if [ -f .env ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # 跳过以#开头的注释行和空行
    if [[ $key =~ ^#.*$ || -z $key ]]; then
      continue
    fi
    
    # 移除引号
    value=${value//\"/}
    value=${value//\'/}
    
    # 追加到环境变量字符串
    ENV_VARS="$ENV_VARS,$key=$value"
  done < .env
  
  echo "已从.env文件读取以下环境变量，并添加GIT_REPO_URL:"
  echo "$ENV_VARS" | tr ',' '\n'
else
  echo "未找到.env文件，只设置GIT_REPO_URL和NODE_ENV"
  ENV_VARS="$ENV_VARS,NODE_ENV=production"
fi

# 部署到Cloud Run
echo "正在部署到Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $GCR_IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --update-env-vars="$ENV_VARS"

echo "部署完成！您的应用已经在Cloud Run上运行。"
echo "您可以在Google Cloud Console中查看您的服务："
echo "https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
echo
echo "如需更新应用，只需重新部署此服务（不需要重新构建镜像）:"
echo "gcloud run deploy $SERVICE_NAME --image $GCR_IMAGE --region $REGION"
