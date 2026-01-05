## 家乐家政后端服务（jiale-backend）

基于 **NestJS + TypeScript + Prisma + PostgreSQL + Redis** 的后端项目，实现用户端、服务端（阿姨端）、管理员后台的核心接口。

### 1. 环境依赖

- Node.js 18+
- PostgreSQL 13+
- Redis 5+

### 2. 安装依赖

```bash
npm install
```

### 3. 配置数据库 & Redis

在项目根目录创建 `.env` 文件（参考）：

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/jiale_backend"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="please_change_me"
PORT=3000
```

### 4. 初始化数据库

```bash
npx prisma migrate dev --name init
```

### 5. 运行服务

```bash
npm run start:dev
```

启动后：

- 用户/服务端接口：`http://localhost:3000/api/v1/...`
- 后台接口：`http://localhost:3000/api/admin/v1/...`


