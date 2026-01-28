const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 测试构建 ===');

try {
  // 1. 检查当前目录
  console.log('当前目录:', process.cwd());
  
  // 2. 检查src目录
  const srcExists = fs.existsSync('./src');
  console.log('src目录存在:', srcExists);
  
  // 3. 检查main.ts
  const mainExists = fs.existsSync('./src/main.ts');
  console.log('main.ts存在:', mainExists);
  
  // 4. 尝试nest build
  console.log('\n=== 运行nest build ===');
  const result = execSync('npx nest build', { encoding: 'utf8', stdio: 'pipe' });
  console.log('构建输出:', result);
  
  // 5. 检查dist目录
  const distExists = fs.existsSync('./dist');
  console.log('dist目录存在:', distExists);
  
  if (distExists) {
    const distFiles = fs.readdirSync('./dist');
    console.log('dist内容:', distFiles);
    
    const mainExists = fs.existsSync('./dist/main.js');
    console.log('main.js存在:', mainExists);
  }
  
} catch (error) {
  console.error('错误:', error.message);
  console.error('输出:', error.stdout);
  console.error('错误输出:', error.stderr);
}
