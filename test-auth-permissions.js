// 权限测试脚本
const jwt = require('jsonwebtoken');

// 模拟用户数据
const testUsers = {
  customer: {
    id: 'user_1',
    phone: '13800138001',
    role: 'CUSTOMER',
    nickname: '测试用户'
  },
  provider: {
    id: 'provider_1', 
    phone: '13800138002',
    role: 'PROVIDER',
    nickname: '测试服务者'
  },
  admin: {
    id: 'admin_1',
    phone: '13800138003', 
    role: 'ADMIN',
    nickname: '测试管理员'
  }
};

// 生成测试JWT令牌
const JWT_SECRET = 'your-jwt-secret-key'; // 应该与.env中的JWT_SECRET一致

function generateTestToken(user) {
  return jwt.sign(
    { 
      userId: user.id,
      phone: user.phone,
      role: user.role,
      nickname: user.nickname
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

console.log('=== 权限测试令牌生成 ===\n');

// 生成测试令牌
Object.keys(testUsers).forEach(userType => {
  const user = testUsers[userType];
  const token = generateTestToken(user);
  
  console.log(`${userType.toUpperCase()} 用户令牌:`);
  console.log(`Bearer ${token}\n`);
});

console.log('=== 测试用例 ===\n');

// 测试用例
const testCases = [
  {
    name: '客户访问首页接口',
    method: 'GET',
    path: '/api/v1/home/init',
    token: generateTestToken(testUsers.customer),
    expectedStatus: 200
  },
  {
    name: '服务者访问工作台',
    method: 'GET', 
    path: '/api/v1/provider/dashboard/stats',
    token: generateTestToken(testUsers.provider),
    expectedStatus: 200
  },
  {
    name: '管理员访问后台',
    method: 'GET',
    path: '/api/admin/v1/dashboard/stats', 
    token: generateTestToken(testUsers.admin),
    expectedStatus: 200
  },
  {
    name: '客户尝试访问后台接口',
    method: 'GET',
    path: '/api/admin/v1/dashboard/stats',
    token: generateTestToken(testUsers.customer),
    expectedStatus: 403
  },
  {
    name: '无令牌访问接口',
    method: 'GET',
    path: '/api/v1/home/init',
    token: null,
    expectedStatus: 401
  },
  {
    name: '无效令牌访问接口',
    method: 'GET',
    path: '/api/v1/home/init', 
    token: 'invalid-token-123',
    expectedStatus: 401
  }
];

console.log('测试用例详情：');
testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   方法: ${testCase.method}`);
  console.log(`   路径: ${testCase.path}`);
  console.log(`   令牌: ${testCase.token ? 'Bearer ' + testCase.token.substring(0, 20) + '...' : '无'}`);
  console.log(`   期望状态: ${testCase.expectedStatus}`);
});

console.log('\n=== 使用方法 ===');
console.log('1. 启动服务器: npm run start:dev');
console.log('2. 在另一个终端运行此脚本: node test-auth-permissions.js');
console.log('3. 使用生成的令牌测试API接口');
console.log('4. 或者使用curl命令测试:');
console.log('\n示例curl命令:');
console.log(`curl -H "Authorization: Bearer ${generateTestToken(testUsers.customer)}" http://localhost:3000/api/v1/home/init`);
