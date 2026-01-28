const http = require('http');

// 简单的HTTP请求测试
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function debugLogin() {
    const baseUrl = '112.124.35.142';
    
    console.log('=== 登录接口诊断 ===\n');
    
    try {
        // 1. 健康检查
        console.log('1. 测试健康检查...');
        const healthOptions = {
            hostname: baseUrl,
            port: 80,
            path: '/api/v1/public/health',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const healthResponse = await makeRequest(healthOptions);
        console.log('✅ 健康检查状态:', healthResponse.statusCode);
        console.log('响应内容:', healthResponse.body);
        
        // 2. 登录测试 - 空请求
        console.log('\n2. 测试登录接口（空请求）...');
        const loginOptions = {
            hostname: baseUrl,
            port: 80,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': 2
            }
        };
        
        try {
            const emptyResponse = await makeRequest(loginOptions, {});
            console.log('空登录状态:', emptyResponse.statusCode);
            console.log('空登录响应:', emptyResponse.body);
        } catch (error) {
            console.log('❌ 空登录错误:', error.message);
        }
        
        // 3. 登录测试 - 测试账号
        console.log('\n3. 测试登录接口（测试账号）...');
        const testLoginOptions = {
            hostname: baseUrl,
            port: 80,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': JSON.stringify({username: 'admin', password: 'admin123'}).length
            }
        };
        
        try {
            const testResponse = await makeRequest(testLoginOptions, {
                username: 'admin',
                password: 'admin123'
            });
            console.log('测试登录状态:', testResponse.statusCode);
            console.log('测试登录响应:', testResponse.body);
        } catch (error) {
            console.log('❌ 测试登录错误:', error.message);
        }
        
    } catch (error) {
        console.error('诊断失败:', error.message);
    }
    
    console.log('\n=== 建议检查项 ===');
    console.log('1. 在服务器上查看PM2日志: pm2 logs jiale-backend --lines 50');
    console.log('2. 检查数据库连接: psql -h localhost -U postgres -d jiale_backend -c "SELECT COUNT(*) FROM users;"');
    console.log('3. 检查Redis连接: redis-cli ping');
    console.log('4. 检查环境变量配置');
    console.log('5. 验证用户表数据');
}

debugLogin().catch(console.error);
