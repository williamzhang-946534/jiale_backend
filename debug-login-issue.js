const axios = require('axios');

// 测试登录接口的详细诊断
async function debugLoginIssue() {
    const baseUrl = 'http://112.124.35.142';
    
    console.log('=== 登录接口诊断 ===\n');
    
    try {
        // 1. 测试健康检查（确认服务正常）
        console.log('1. 测试健康检查...');
        const healthResponse = await axios.get(`${baseUrl}/api/v1/public/health`);
        console.log('✅ 健康检查:', healthResponse.data);
        
        // 2. 测试登录接口（不传参数）
        console.log('\n2. 测试登录接口（空请求）...');
        try {
            const emptyLoginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, {});
            console.log('空登录响应:', emptyLoginResponse.data);
        } catch (error) {
            console.log('❌ 空登录错误:', error.response?.data || error.message);
        }
        
        // 3. 测试登录接口（传错误参数）
        console.log('\n3. 测试登录接口（错误参数）...');
        try {
            const wrongLoginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, {
                username: 'wrong',
                password: 'wrong'
            });
            console.log('错误参数登录响应:', wrongLoginResponse.data);
        } catch (error) {
            console.log('❌ 错误参数登录:', error.response?.data || error.message);
        }
        
        // 4. 测试登录接口（传正确格式的参数）
        console.log('\n4. 测试登录接口（测试账号）...');
        try {
            const testLoginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, {
                username: 'admin',
                password: 'admin123'
            });
            console.log('✅ 测试登录响应:', testLoginResponse.data);
        } catch (error) {
            console.log('❌ 测试登录错误:', error.response?.data || error.message);
            if (error.response?.status === 500) {
                console.log('🔍 500错误详情 - 服务器内部错误');
            }
        }
        
        // 5. 检查请求头
        console.log('\n5. 检查请求头信息...');
        try {
            const headersResponse = await axios.get(`${baseUrl}/api/v1/public/health`);
            console.log('响应头:', headersResponse.headers);
        } catch (error) {
            console.log('请求头检查失败:', error.message);
        }
        
    } catch (error) {
        console.error('诊断失败:', error.message);
    }
}

// 检查常见问题
function checkCommonIssues() {
    console.log('\n=== 常见问题检查 ===');
    console.log('🔍 可能的问题点:');
    console.log('1. 数据库连接失败');
    console.log('2. Redis连接失败'); 
    console.log('3. JWT密钥配置问题');
    console.log('4. 用户表不存在或数据为空');
    console.log('5. 环境变量配置错误');
    console.log('6. PM2进程配置问题');
    
    console.log('\n📋 建议检查项:');
    console.log('- 查看PM2日志: pm2 logs jiale-backend');
    console.log('- 检查数据库连接: psql -h localhost -U postgres -d jiale_backend');
    console.log('- 检查Redis连接: redis-cli ping');
    console.log('- 验证环境变量: cat .env.production');
}

// 运行诊断
debugLoginIssue().then(() => {
    checkCommonIssues();
}).catch(console.error);
