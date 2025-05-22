#!/bin/bash
set -e

# Azure 容器镜像配置
ACR_NAME="myacr"
IMAGE_NAME="my-app-image"
IMAGE_TAG="latest"
DOCKERFILE_PATH="./Dockerfile"
APP_DIR="."

# 登录 Azure
echo "登录 Azure..."
az login

# 创建 Azure Container Registry (如果不存在)
echo "检查 ACR 是否存在..."
az acr show --name $ACR_NAME || \
  az acr create --resource-group my-aci-group --name $ACR_NAME --sku Basic

# 获取 ACR 登录服务器地址
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)

# 构建 Docker 镜像
echo "构建 Docker 镜像..."
docker build -t $IMAGE_NAME:$IMAGE_TAG -f $DOCKERFILE_PATH $APP_DIR

# 标记镜像
echo "标记镜像为: $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"
docker tag $IMAGE_NAME:$IMAGE_TAG $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG

# 推送镜像到 ACR
echo "推送镜像到 ACR..."
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG

echo "镜像构建并推送完成: $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"
