const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 启动开发模式...');

try {
  // 1. 构建项目
  console.log('📦 构建项目...');
  execSync('node build-simple.js', { stdio: 'inherit' });
  
  // 2. 检查main.js是否存在
  if (!fs.existsSync('./dist/main.js')) {
    console.error('❌ 构建失败：main.js未找到');
    process.exit(1);
  }
  
  console.log('✅ 构建完成，启动应用...');
  
  // 3. 启动应用
  execSync('node dist/main.js', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
}
