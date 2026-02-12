# 正确的数据库迁移指南

## 🚨 核心原则

**本地有真实数据后，永远不要使用：**
```bash
❌ npx prisma migrate dev
```

**始终使用：**
```bash
✅ npx prisma migrate deploy
✅ npx prisma generate
```

## 📋 新字段添加规则

### ✅ 正确写法（不会reset）
```prisma
# 1. 可空字段
newField String?

# 2. 有默认值
newField Boolean @default(false)

# 3. 数组字段
newField String[] @default([])
```

### ❌ 错误写法（必reset）
```prisma
# 非空且无默认值
newField String
newField Boolean
```

## 🌱 Seed文件原则

只做系统必需数据的幂等插入：
```typescript
await prisma.serviceCategory.upsert({
  where: { name: '保洁清洗' },
  update: {},
  create: { name: '保洁清洗' },
});
```

## 🔄 正确工作流

1. 修改 schema.prisma
2. 运行 `npx prisma migrate deploy`
3. 运行 `npx prisma generate`
4. 测试新功能

## ⚠️ 绝对禁止

- ❌ 用 `db push` 替代 migration
- ❌ 用 Node 脚本备份数据库
- ❌ 让 seed 承担业务数据构造
- ❌ 在有真实数据后用 `migrate dev`

记住：让 Prisma 不 reset，而不是 reset 后补救。
