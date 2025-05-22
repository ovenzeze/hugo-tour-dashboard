#!/bin/bash
set -e

# Azure 容器部署配置
RESOURCE_GROUP="my-aci-group"
CONTAINER_NAME="my-aci-container"
LOCATION="eastus"
IMAGE_NAME="myacr.azurecr.io/my-app-image:latest"
DNS_NAME_LABEL="my-aci-dns"
CPU=1
MEMORY=1.5

# 登录 Azure
echo "登录 Azure..."
az login

# 创建资源组
echo "创建资源组: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location $LOCATION

# 从ACR获取登录凭据
ACR_NAME=$(echo $IMAGE_NAME | cut -d/ -f1)
if [[ $ACR_NAME == *".azurecr.io" ]]; then
  echo "登录到 Azure Container Registry..."
  az acr login --name ${ACR_NAME%.azurecr.io}
fi

# 部署容器实例
echo "部署 Azure 容器实例..."
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image $IMAGE_NAME \
  --cpu $CPU \
  --memory $MEMORY \
  --dns-name-label $DNS_NAME_LABEL \
  --ports 80

# 获取容器实例状态
echo "获取部署状态..."
az container show \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --query "{FQDN:ipAddress.fqdn,ProvisioningState:provisioningState}" \
  --output table

echo "部署完成！访问地址: http://${DNS_NAME_LABEL}.${LOCATION}.azurecontainer.io"
