const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exportDatabase() {
    try {
        console.log('正在导出数据库...');
        
        // 创建备份目录
        const backupDir = './backups';
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sqlFile = `${backupDir}/jiale_backend_${timestamp}.sql`;
        
        // 使用 pg_dump 导出
        const command = `pg_dump --host=localhost --port=5432 --username=postgres --dbname=jiale_backend --no-owner --no-privileges --exclude-table=_prisma_migrations --clean --if-exists > "${sqlFile}"`;
        
        console.log('执行命令:', command);
        execSync(command, { stdio: 'inherit' });
        
        // 检查文件是否生成
        if (fs.existsSync(sqlFile)) {
            const stats = fs.statSync(sqlFile);
            console.log(`✅ 导出成功！`);
            console.log(`📄 文件路径: ${sqlFile}`);
            console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        } else {
            console.error('❌ 导出失败，文件未生成');
        }
        
    } catch (error) {
        console.error('❌ 导出失败:', error.message);
        
        // 如果 pg_dump 不可用，提供替代方案
        console.log('\n💡 如果 pg_dump 命令不可用，请：');
        console.log('1. 安装 PostgreSQL 客户端工具');
        console.log('2. 或者使用以下命令手动导出：');
        console.log('   pg_dump -h localhost -p 5432 -U postgres -d jiale_backend --no-owner --no-privileges --exclude-table=_prisma_migrations --clean --if-exists > backup.sql');
    }
}

exportDatabase();
