# 使用官方Nginx Alpine镜像作为基础
FROM nginx:1.25-alpine

# 设置维护者信息
LABEL maintainer="your-email@example.com"

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的Nginx欢迎页面
RUN rm -rf /usr/share/nginx/html/*

# 复制静态文件
COPY ./html .

# 暴露80端口
EXPOSE 80

# 设置健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# 以非root用户运行
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

USER nginx

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
