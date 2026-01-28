// 简化的服务器诊断脚本 - 无需外部依赖
const fs = require('fs');
const path = require('path');

function simpleDebug() {
    console.log('=== 简化服务器诊断 ===\n');
    
    // 1. 检查文件结构
    console.log('1. 检查项目文件:');
    const files = [
        '.env.production',
        'package.json',
        'dist/main.js',
        'node_modules'
    ];
    
    files.forEach(file => {
        const exists = fs.existsSync(file);
        console.log(`${file}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    });
    
    // 2. 检查环境变量文件
    console.log('\n2. 环境变量配置:');
    if (fs.existsSync('.env.production')) {
        const envContent = fs.readFileSync('.env.production', 'utf8');
        const lines = envContent.split('\n');
        
        lines.forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                if (line.includes('PASSWORD') || line.includes('SECRET')) {
                    const [key] = line.split('=');
                    console.log(`${key}: ***已配置***`);
                } else {
                    console.log(line);
                }
            }
        });
    } else {
        console.log('❌ .env.production 文件不存在');
    }
    
    // 3. 检查PM2状态
    console.log('\n3. PM2进程状态:');
    try {
        const { execSync } = require('child_process');
        const pm2List = execSync('pm2 list', { encoding: 'utf8' });
        console.log(pm2List);
    } catch (error) {
        console.log('无法获取PM2状态:', error.message);
    }
    
    // 4. 检查PM2日志
    console.log('\n4. PM2最近日志:');
    try {
        const { execSync } = require('child_process');
        const logs = execSync('pm2 logs jiale-backend --lines 20 --nostream', { encoding: 'utf8' });
        console.log(logs);
    } catch (error) {
        console.log('无法获取PM2日志:', error.message);
    }
    
    // 5. 检查数据库连接
    console.log('\n5. 数据库连接测试:');
    try {
        const { execSync } = require('child_process');
        const dbTest = execSync('psql -h localhost -U postgres -d jiale_backend -c "SELECT COUNT(*) FROM AdminUser;" 2>&1', { encoding: 'utf8' });
        console.log('数据库查询结果:', dbTest);
    } catch (error) {
        console.log('数据库连接失败:', error.message);
    }
    
    // 6. 检查Redis连接
    console.log('\n6. Redis连接测试:');
    try {
        const { execSync } = require('child_process');
        const redisTest = execSync('redis-cli ping 2>&1', { encoding: 'utf8' });
        console.log('Redis响应:', redisTest.trim());
    } catch (error) {
        console.log('Redis连接失败:', error.message);
    }
    
    console.log('\n=== 快速修复建议 ===');
    console.log('1. 如果缺少依赖包，运行: npm install --production');
    console.log('2. 如果数据库连接失败，检查PostgreSQL服务: systemctl status postgresql');
    console.log('3. 如果Redis连接失败，检查Redis服务: systemctl status redis');
    console.log('4. 重启PM2服务: pm2 restart jiale-backend');
    console.log('5. 查看完整错误日志: pm2 logs jiale-backend --lines 100');
}

simpleDebug();
