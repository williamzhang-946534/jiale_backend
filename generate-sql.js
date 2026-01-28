const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function generateSQL() {
    const prisma = new PrismaClient();
    
    try {
        console.log('正在生成 SQL 文件...');
        
        // 获取所有表名
        const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`;
        
        let sqlContent = '-- 家乐家政数据库导出\n';
        sqlContent += `-- 导出时间: ${new Date().toLocaleString()}\n`;
        sqlContent += '-- 生成工具: Prisma\n\n';
        
        for (const table of tables) {
            const tableName = table.tablename;
            console.log(`导出表: ${tableName}`);
            
            try {
                const records = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
                
                if (records.length > 0) {
                    sqlContent += `-- 表: ${tableName} (${records.length} 条记录)\n`;
                    sqlContent += `DELETE FROM "${tableName}";\n`;
                    
                    for (const record of records) {
                        const columns = Object.keys(record);
                        const values = columns.map(col => {
                            const value = record[col];
                            if (value === null) return 'NULL';
                            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
                            if (value instanceof Date) return `'${value.toISOString()}'`;
                            return value;
                        });
                        
                        sqlContent += `INSERT INTO "${tableName}" ("${columns.join('", "')}") VALUES (${values.join(', ')});\n`;
                    }
                    sqlContent += '\n';
                }
            } catch (error) {
                console.warn(`跳过表 ${tableName}:`, error.message);
            }
        }
        
        // 写入文件
        const fileName = './jiale_backend_data.sql';
        fs.writeFileSync(fileName, sqlContent, 'utf8');
        
        console.log(`✅ SQL 文件已生成: ${fileName}`);
        console.log(`📊 文件大小: ${(fs.statSync(fileName).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('生成失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateSQL();
