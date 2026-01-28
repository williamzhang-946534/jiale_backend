// 服务器端诊断脚本 - 在宝塔服务器上运行
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.production' });

async function serverDebug() {
    console.log('=== 服务器端诊断 ===\n');
    
    // 1. 检查环境变量
    console.log('1. 环境变量检查:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已配置' : '未配置');
    console.log('REDIS_HOST:', process.env.REDIS_HOST);
    console.log('REDIS_PORT:', process.env.REDIS_PORT);
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '已配置' : '未配置');
    
    // 2. 测试数据库连接
    console.log('\n2. 数据库连接测试:');
    const prisma = new PrismaClient();
    
    try {
        await prisma.$connect();
        console.log('✅ 数据库连接成功');
        
        // 3. 检查管理员用户
        console.log('\n3. 检查管理员用户:');
        const adminUsers = await prisma.adminUser.findMany();
        console.log(`管理员用户数量: ${adminUsers.length}`);
        
        adminUsers.forEach(admin => {
            console.log(`- 用户名: ${admin.username}, 姓名: ${admin.name}, 创建时间: ${admin.createdAt}`);
        });
        
        // 4. 测试密码验证
        if (adminUsers.length > 0) {
            console.log('\n4. 测试密码验证:');
            const bcrypt = require('bcrypt');
            
            for (const admin of adminUsers) {
                const isMatch = await bcrypt.compare('admin123', admin.password);
                console.log(`用户 ${admin.username} 密码验证: ${isMatch ? '✅ 正确' : '❌ 错误'}`);
            }
        }
        
        // 5. 测试Redis连接
        console.log('\n5. Redis连接测试:');
        const redis = require('redis');
        const redisClient = redis.createClient({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD || undefined
        });
        
        redisClient.on('connect', () => {
            console.log('✅ Redis连接成功');
        });
        
        redisClient.on('error', (err) => {
            console.log('❌ Redis连接失败:', err.message);
        });
        
        redisClient.ping((err, reply) => {
            if (err) {
                console.log('❌ Redis ping失败:', err.message);
            } else {
                console.log('✅ Redis ping成功:', reply);
            }
            redisClient.quit();
        });
        
    } catch (error) {
        console.log('❌ 数据库连接失败:', error.message);
    } finally {
        await prisma.$disconnect();
    }
    
    console.log('\n=== 建议修复步骤 ===');
    console.log('1. 如果数据库连接失败，检查DATABASE_URL配置');
    console.log('2. 如果密码验证失败，检查密码加密方式');
    console.log('3. 如果Redis连接失败，检查Redis服务状态');
    console.log('4. 检查PM2进程日志: pm2 logs jiale-backend --lines 100');
}

// 如果直接运行此脚本
if (require.main === module) {
    serverDebug().catch(console.error);
}

module.exports = serverDebug;
