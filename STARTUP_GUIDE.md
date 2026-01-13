# 🚀 家乐家政后端启动指南

## 问题诊断

当前服务器启动遇到问题，以下是完整的解决方案：

## 🔧 1. 环境检查

### 检查Node.js版本
```bash
node --version
# 应该显示 v18.x 或更高版本
```

### 检查依赖安装
```bash
npm list --depth=0
# 确保所有依赖都已正确安装
```

## 🗄️ 2. 清理和重新安装

### 清理node_modules
```bash
# 停止所有node进程
taskkill /F /IM node.exe

# 删除node_modules和package-lock.json
rmdir /s /q node_modules
del package-lock.json

# 重新安装依赖
npm install
```

## 🔐 3. 环境变量配置

### 检查.env文件
确保 `.env` 文件包含正确的配置：
```env
# 数据库连接
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/jiale_backend"

# JWT密钥
JWT_SECRET="your-super-secret-jwt-key-here"

# 其他配置
PORT=3000
NODE_ENV=development
```

## 🚀 4. 启动步骤

### 方式一：开发模式
```bash
npm run start:dev
```

### 方式二：生产模式
```bash
npm run build
npm run start:prod
```

### 方式三：调试模式
```bash
# 设置调试环境变量
set DEBUG=app:*
set NODE_OPTIONS=--inspect

# 启动调试
npm run start:dev
```

## 🧪 5. 验证启动

### 检查端口占用
```bash
netstat -ano | findstr :3000
```

### 测试服务器连接
```bash
# Windows PowerShell
curl -UseBasicParsing http://localhost:3000/api/v1/home/init

# 或者使用浏览器
# 打开 http://localhost:3000/api/docs
```

## 📚 6. API文档访问

启动成功后，访问以下地址：

- **Swagger文档**: http://localhost:3000/api/docs
- **API基础路径**: http://localhost:3000/api
- **健康检查**: http://localhost:3000

## 🔍 7. 常见问题排查

### 问题1：端口被占用
```bash
# 查找占用3000端口的进程
netstat -ano | findstr :3000

# 终止进程
taskkill /F /PID <进程ID>
```

### 问题2：数据库连接失败
- 检查PostgreSQL服务是否运行
- 验证数据库连接字符串
- 确保数据库存在

### 问题3：编译错误
```bash
# 清理编译缓存
rmdir /s /q dist
npm run build
```

### 问题4：依赖冲突
```bash
# 删除node_modules和package-lock.json
rmdir /s /q node_modules
del package-lock.json
npm install
```

## ✅ 成功启动的标志

当看到以下输出时，表示启动成功：
```
[Nest] INFO Starting Nest application...
[Nest] INFO Application module initialized successfully.
[Nest] INFO Nest application successfully started on port 3000
```

## 🎯 8. 快速测试

启动成功后，运行以下命令快速验证：

```bash
# 测试API响应
curl http://localhost:3000/api/v1/home/init

# 预期响应
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

## 📞 9. 获取帮助

如果问题仍然存在：

1. **检查日志**: 查看控制台输出的错误信息
2. **查看依赖**: 确保package.json中的依赖版本兼容
3. **环境检查**: 确认Node.js和npm版本
4. **重启服务**: 重启PostgreSQL服务

---

**最后更新**: 2025-01-13  
**状态**: 需要手动启动服务器进行最终验证
