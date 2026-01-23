#!/bin/bash

# 部署脚本
echo "开始部署家乐后端服务..."

# 1. 停止现有服务
pm2 stop jiale-backend || true
pm2 delete jiale-backend || true

# 2. 安装依赖
npm install --production

# 3. 构建项目
npm run build

# 4. 运行数据库迁移
npx prisma migrate deploy

# 5. 生成 Prisma 客户端
npx prisma generate

# 6. 创建日志目录
mkdir -p logs

# 7. 启动服务
pm2 start ecosystem.config.json --env production

# 8. 保存 PM2 配置
pm2 save

# 9. 设置开机自启
pm2 startup

echo "部署完成！"
echo "服务状态："
pm2 status
echo "查看日志：pm2 logs jiale-backend"
