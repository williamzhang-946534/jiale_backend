const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 开始构建项目...');

try {
  // 1. 清理dist目录
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
    console.log('✅ 清理dist目录');
  }

  // 2. 创建dist目录
  fs.mkdirSync('./dist', { recursive: true });
  console.log('✅ 创建dist目录');

  // 3. 使用TypeScript编译器直接编译
  console.log('📦 编译TypeScript文件...');
  execSync('npx tsc src/main.ts --outDir dist --target ES2019 --module commonjs --esModuleInterop --experimentalDecorators --emitDecoratorMetadata --sourceMap', { stdio: 'inherit' });
  
  // 4. 检查main.js是否存在
  if (fs.existsSync('./dist/main.js')) {
    console.log('✅ 构建成功！main.js已生成');
    console.log('📁 dist目录内容:');
    const files = fs.readdirSync('./dist');
    files.forEach(file => {
      console.log(`   - ${file}`);
    });
  } else {
    console.log('❌ 构建失败：main.js未找到');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}
