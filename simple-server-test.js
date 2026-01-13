// 简单的服务器测试
console.log('🔍 检查服务器状态...\n');

const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(3000, () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, 'localhost', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  try {
    const isPortOpen = await checkPort(3000);
    
    if (isPortOpen) {
      console.log('✅ 服务器正在端口 3000 上运行');
      console.log('📚 API文档地址: http://localhost:3000/api/docs');
      console.log('🔧 API基础地址: http://localhost:3000/api');
      
      console.log('\n=== 测试建议 ===');
      console.log('1. 在浏览器中打开 http://localhost:3000/api/docs');
      console.log('2. 使用 Swagger UI 测试接口');
      console.log('3. 验证 JWT 认证功能');
      console.log('4. 测试新增的统一接口');
      
      console.log('\n=== 可用的测试端点 ===');
      console.log('GET  /api/v1/home/init - 首页综合数据');
      console.log('POST /api/v1/services/match - 智能匹配');
      console.log('GET  /api/v1/services/detail/{id} - 服务详情');
      console.log('POST /api/v1/orders/create - 创建订单');
      console.log('GET  /api/admin/v1/settings/system - 系统设置');
      
    } else {
      console.log('❌ 服务器未在端口 3000 上运行');
      console.log('💡 请运行: npm run start:dev');
    }
  } catch (error) {
    console.log('❌ 检查过程中出错:', error.message);
  }
}

main();
