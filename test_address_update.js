const axios = require('axios');

// 测试地址更新接口
async function testAddressUpdate() {
  try {
    // 首先需要登录获取token
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      phone: '13800138000',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('登录成功，token:', token);
    
    // 测试更新地址
    const updateData = {
      contactName: "李四",
      phone: "13800138002", 
      province: "上海市",
      city: "上海市",
      district: "浦东新区",
      detail: "陆家嘴金融中心 B座 808室",
      fullAddress: "上海市上海市浦东新区陆家嘴金融中心 B座 808室",
      postalCode: "200120",
      tag: "家",
      latitude: 31.2304,
      longitude: 121.4737,
      isDefault: false
    };
    
    const updateResponse = await axios.put(
      'http://localhost:3001/api/v1/user/addresses/cmkdmie11003smj814nifzkba',
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('地址更新成功:', updateResponse.data);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testAddressUpdate();
