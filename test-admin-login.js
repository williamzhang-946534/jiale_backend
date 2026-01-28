const http = require('http');

// 测试管理员登录接口
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

async function testAdminLogin() {
    const baseUrl = '112.124.35.142';
    
    console.log('=== 管理员登录接口测试 ===\n');
    
    try {
        // 1. 测试管理员登录接口 - 空请求
        console.log('1. 测试管理员登录接口（空请求）...');
        const emptyOptions = {
            hostname: baseUrl,
            port: 80,
            path: '/api/v1/auth/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': 2
            }
        };
        
        try {
            const emptyResponse = await makeRequest(emptyOptions, {});
            console.log('空登录状态:', emptyResponse.statusCode);
            console.log('空登录响应:', emptyResponse.body);
        } catch (error) {
            console.log('❌ 空登录错误:', error.message);
        }
        
        // 2. 测试管理员登录 - 测试账号
        console.log('\n2. 测试管理员登录（测试账号）...');
        const testData = { username: 'admin', password: 'admin123' };
        const testOptions = {
            hostname: baseUrl,
            port: 80,
            path: '/api/v1/auth/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': JSON.stringify(testData).length
            }
        };
        
        try {
            const testResponse = await makeRequest(testOptions, testData);
            console.log('测试登录状态:', testResponse.statusCode);
            console.log('测试登录响应:', testResponse.body);
            
            if (testResponse.statusCode === 500) {
                console.log('🔍 发现500错误！这是我们需要解决的问题。');
            }
        } catch (error) {
            console.log('❌ 测试登录错误:', error.message);
        }
        
        // 3. 测试其他可能的账号
        console.log('\n3. 测试其他管理员账号...');
        const otherAccounts = [
            { username: 'administrator', password: '123456' },
            { username: 'root', password: 'root' },
            { username: 'admin', password: '123456' }
        ];
        
        for (const account of otherAccounts) {
            const accountOptions = {
                hostname: baseUrl,
                port: 80,
                path: '/api/v1/auth/admin/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': JSON.stringify(account).length
                }
            };
            
            try {
                const response = await makeRequest(accountOptions, account);
                console.log(`账号 ${account.username}:`, response.statusCode);
                if (response.statusCode !== 404 && response.statusCode !== 401) {
                    console.log('响应:', response.body);
                }
            } catch (error) {
                console.log(`账号 ${account.username} 错误:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
    
    console.log('\n=== 下一步建议 ===');
    console.log('如果看到500错误，请：');
    console.log('1. 在服务器上查看PM2日志: pm2 logs jiale-backend --lines 50');
    console.log('2. 检查AdminUser表是否有数据');
    console.log('3. 验证数据库连接是否正常');
    console.log('4. 检查Redis连接状态');
}

testAdminLogin().catch(console.error);
