import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始生成测试数据...');

  // 1. 清空现有数据
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.userCoupon.deleteMany();
  await prisma.orderReview.deleteMany();
  await prisma.orderOperationLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.providerSchedule.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.couponTemplate.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.address.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.user.deleteMany();

  // 2. 创建管理员用户
  const adminUsers = await Promise.all([
    prisma.adminUser.create({
      data: {
        username: 'admin',
        password: 'admin123',
        name: '超级管理员',
      },
    }),
    prisma.adminUser.create({
      data: {
        username: 'operator',
        password: 'operator123',
        name: '运营专员',
      },
    }),
  ]);

  // 3. 创建普通用户
  const users = await Promise.all([
    prisma.user.create({
      data: {
        phone: '13800138001',
        password: 'password123',
        nickname: '张三',
        role: 'CUSTOMER',
        level: 1,
        walletBalance: 100.00,
      },
    }),
    prisma.user.create({
      data: {
        phone: '13800138002',
        password: 'password123',
        nickname: '李四',
        role: 'CUSTOMER',
        level: 2,
        walletBalance: 200.00,
      },
    }),
    prisma.user.create({
      data: {
        phone: '13800138003',
        password: 'password123',
        nickname: '王五',
        role: 'CUSTOMER',
        level: 3,
        walletBalance: 300.00,
      },
    }),
    prisma.user.create({
      data: {
        phone: '13800138004',
        password: 'password123',
        nickname: '赵六',
        role: 'PROVIDER',
        level: 1,
        walletBalance: 0.00,
      },
    }),
    prisma.user.create({
      data: {
        phone: '13800138005',
        password: 'password123',
        nickname: '钱七',
        role: 'PROVIDER',
        level: 1,
        walletBalance: 0.00,
      },
    }),
  ]);

  // 4. 创建服务分类
  const categories = await Promise.all([
    // 一级分类
    prisma.serviceCategory.create({
      data: {
        name: '保洁清洗',
        icon: '🧹',
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '母婴护理',
        icon: '👶',
        sortOrder: 2,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '搬家运输',
        icon: '🚚',
        sortOrder: 3,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '维修安装',
        icon: '🔧',
        sortOrder: 4,
      },
    }),
  ]);

  // 获取一级分类ID
  const cleaningCategory = categories[0];
  const babyCategory = categories[1];
  const movingCategory = categories[2];
  const repairCategory = categories[3];

  // 二级分类
  const subCategories = await Promise.all([
    // 保洁清洗子分类
    prisma.serviceCategory.create({
      data: {
        name: '日常保洁',
        parentId: cleaningCategory.id,
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '深度保洁',
        parentId: cleaningCategory.id,
        sortOrder: 2,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '开荒保洁',
        parentId: cleaningCategory.id,
        sortOrder: 3,
      },
    }),
    // 母婴护理子分类
    prisma.serviceCategory.create({
      data: {
        name: '月嫂服务',
        parentId: babyCategory.id,
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '育儿嫂',
        parentId: babyCategory.id,
        sortOrder: 2,
      },
    }),
    // 搬家运输子分类
    prisma.serviceCategory.create({
      data: {
        name: '小型搬家',
        parentId: movingCategory.id,
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '大型搬家',
        parentId: movingCategory.id,
        sortOrder: 2,
      },
    }),
    // 维修安装子分类
    prisma.serviceCategory.create({
      data: {
        name: '家电维修',
        parentId: repairCategory.id,
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: '水电安装',
        parentId: repairCategory.id,
        sortOrder: 2,
      },
    }),
  ]);

  // 5. 创建服务
  const services = await Promise.all([
    // 保洁服务
    prisma.service.create({
      data: {
        name: '2小时日常保洁',
        categoryId: subCategories[0].id,
        price: 80.00,
        unit: '次',
        images: ['https://example.com/cleaning1.jpg'],
        description: '专业保洁人员上门服务，2小时深度清洁',
        tags: ['热门', '好评'],
        status: 'active',
      },
    }),
    prisma.service.create({
      data: {
        name: '4小时深度保洁',
        categoryId: subCategories[1].id,
        price: 180.00,
        unit: '次',
        images: ['https://example.com/cleaning2.jpg'],
        description: '全屋深度清洁，包括厨房卫生间深度清洁',
        tags: ['特价', '推荐'],
        status: 'active',
      },
    }),
    // 母婴服务
    prisma.service.create({
      data: {
        name: '金牌月嫂26天',
        categoryId: subCategories[3].id,
        price: 8000.00,
        unit: '月',
        images: ['https://example.com/maternal1.jpg'],
        description: '专业月嫂服务，24小时贴心照顾',
        tags: ['金牌', '专业'],
        status: 'active',
      },
    }),
    prisma.service.create({
      data: {
        name: '育儿嫂服务',
        categoryId: subCategories[4].id,
        price: 150.00,
        unit: '天',
        images: ['https://example.com/baby1.jpg'],
        description: '专业育儿嫂，科学育儿指导',
        tags: ['经验丰富'],
        status: 'active',
      },
    }),
    // 搬家服务
    prisma.service.create({
      data: {
        name: '小型搬家',
        categoryId: subCategories[5].id,
        price: 300.00,
        unit: '车',
        images: ['https://example.com/moving1.jpg'],
        description: '适合一室一厅小户型搬家',
        tags: ['经济实惠'],
        status: 'active',
      },
    }),
    // 维修服务
    prisma.service.create({
      data: {
        name: '空调维修',
        categoryId: subCategories[7].id,
        price: 120.00,
        unit: '次',
        images: ['https://example.com/repair1.jpg'],
        description: '专业空调维修，上门服务',
        tags: ['快速响应'],
        status: 'active',
      },
    }),
  ]);

  // 6. 创建服务者
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        userId: users[3].id,
        name: '王阿姨',
        phone: '13900139001',
        status: 'VERIFIED',
        intro: '从事家政服务8年，经验丰富，做事认真负责',
        avatarUrl: 'https://example.com/avatar1.jpg',
        rating: 4.8,
        todayEarnings: 120.00,
        walletBalance: 2500.00,
        idCardNumber: '110101199001011234',
        certFiles: ['身份证.jpg', '健康证.jpg'],
      },
    }),
    prisma.provider.create({
      data: {
        userId: users[4].id,
        name: '李师傅',
        phone: '13900139002',
        status: 'VERIFIED',
        intro: '专业维修师傅，技术过硬，服务态度好',
        avatarUrl: 'https://example.com/avatar2.jpg',
        rating: 4.9,
        todayEarnings: 200.00,
        walletBalance: 1800.00,
        idCardNumber: '110101199002022345',
        certFiles: ['身份证.jpg', '电工证.jpg'],
      },
    }),
    prisma.provider.create({
      data: {
        userId: users[0].id, // 张三也申请成为服务者
        name: '张月嫂',
        phone: '13900139003',
        status: 'PENDING',
        intro: '专业月嫂，有高级母婴护理师证书',
        avatarUrl: 'https://example.com/avatar3.jpg',
        rating: 0,
        todayEarnings: 0,
        walletBalance: 0,
        idCardNumber: '110101199003033456',
        certFiles: ['身份证.jpg', '母婴护理证.jpg'],
      },
    }),
  ]);

  // 7. 创建用户地址
  const addresses = await Promise.all([
    prisma.address.create({
      data: {
        userId: users[0].id,
        contactName: '张三',
        phone: '13800138001',
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        detail: '三里屯SOHO A座 1201室',
        latitude: 39.9042,
        longitude: 116.4074,
        isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[1].id,
        contactName: '李四',
        phone: '13800138002',
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        detail: '陆家嘴金融中心 B座 808室',
        latitude: 31.2304,
        longitude: 121.4737,
        isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[2].id,
        contactName: '王五',
        phone: '13800138003',
        province: '广州市',
        city: '广州市',
        district: '天河区',
        detail: '珠江新城 CBD 1506室',
        latitude: 23.1291,
        longitude: 113.2644,
        isDefault: true,
      },
    }),
  ]);

  // 8. 创建轮播图
  const banners = await Promise.all([
    prisma.banner.create({
      data: {
        imageUrl: 'https://example.com/banner1.jpg',
        linkUrl: '/services',
        sortOrder: 1,
      },
    }),
    prisma.banner.create({
      data: {
        imageUrl: 'https://example.com/banner2.jpg',
        linkUrl: '/providers',
        sortOrder: 2,
      },
    }),
    prisma.banner.create({
      data: {
        imageUrl: 'https://example.com/banner3.jpg',
        linkUrl: '/special-offers',
        sortOrder: 3,
      },
    }),
  ]);

  // 9. 创建优惠券模板
  const couponTemplates = await Promise.all([
    prisma.couponTemplate.create({
      data: {
        name: '新用户专享券',
        amount: 20.00,
        minSpend: 100.00,
        totalQuantity: 1000,
        validDays: 30,
      },
    }),
    prisma.couponTemplate.create({
      data: {
        name: '保洁服务券',
        amount: 50.00,
        minSpend: 200.00,
        totalQuantity: 500,
        validDays: 60,
      },
    }),
    prisma.couponTemplate.create({
      data: {
        name: '双11大促券',
        amount: 100.00,
        minSpend: 300.00,
        totalQuantity: 200,
        validDays: 15,
      },
    }),
  ]);

  // 10. 创建用户优惠券
  const userCoupons = await Promise.all([
    prisma.userCoupon.create({
      data: {
        userId: users[0].id,
        templateId: couponTemplates[0].id,
        expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.userCoupon.create({
      data: {
        userId: users[1].id,
        templateId: couponTemplates[1].id,
        expireAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.userCoupon.create({
      data: {
        userId: users[2].id,
        templateId: couponTemplates[2].id,
        expireAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // 11. 创建订单
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        orderNo: 'ORD20231201001',
        userId: users[0].id,
        providerId: providers[0].id,
        serviceId: services[0].id,
        addressId: addresses[0].id,
        status: 'COMPLETED',
        serviceDate: new Date('2023-12-01'),
        serviceTime: '14:00',
        duration: 2,
        originalPrice: 80.00,
        discount: 0,
        totalPrice: 80.00,
        paidAmount: 80.00,
        paidAt: new Date('2023-12-01T10:00:00'),
        specialRequests: '请重点清洁厨房',
        timeline: {
          created: '2023-12-01T09:00:00',
          accepted: '2023-12-01T09:30:00',
          arrived: '2023-12-01T13:55:00',
          started: '2023-12-01T14:00:00',
          completed: '2023-12-01T16:00:00',
        },
      },
    }),
    prisma.order.create({
      data: {
        orderNo: 'ORD20231201002',
        userId: users[1].id,
        providerId: providers[1].id,
        serviceId: services[5].id,
        addressId: addresses[1].id,
        status: 'STARTED',
        serviceDate: new Date('2023-12-02'),
        serviceTime: '10:00',
        duration: 1,
        originalPrice: 120.00,
        discount: 20.00,
        totalPrice: 100.00,
        paidAmount: 100.00,
        paidAt: new Date('2023-12-02T08:00:00'),
        specialRequests: '空调不制冷，需要检查',
        timeline: {
          created: '2023-12-02T07:00:00',
          accepted: '2023-12-02T07:30:00',
          arrived: '2023-12-02T09:55:00',
          started: '2023-12-02T10:00:00',
          completed: null,
        },
      },
    }),
    prisma.order.create({
      data: {
        orderNo: 'ORD20231201003',
        userId: users[2].id,
        providerId: null, // 待接单
        serviceId: services[1].id,
        addressId: addresses[2].id,
        status: 'PENDING',
        serviceDate: new Date('2023-12-03'),
        serviceTime: '15:00',
        duration: 4,
        originalPrice: 180.00,
        discount: 30.00,
        totalPrice: 150.00,
        paidAmount: 0,
        paidAt: null,
        specialRequests: '新房开荒，需要彻底清洁',
        timeline: {
          created: '2023-12-02T16:00:00',
          accepted: null,
          arrived: null,
          started: null,
          completed: null,
        },
      },
    }),
  ]);

  // 12. 创建订单操作日志
  await Promise.all([
    prisma.orderOperationLog.create({
      data: {
        orderId: orders[0].id,
        operatorId: users[0].id,
        operatorRole: 'CUSTOMER',
        oldStatus: 'PENDING',
        newStatus: 'ACCEPTED',
        remark: '用户下单',
        createdAt: new Date('2023-12-01T09:30:00'),
      },
    }),
    prisma.orderOperationLog.create({
      data: {
        orderId: orders[0].id,
        operatorId: providers[0].id,
        operatorRole: 'PROVIDER',
        oldStatus: 'ACCEPTED',
        newStatus: 'ARRIVED',
        remark: '服务者到达',
        createdAt: new Date('2023-12-01T13:55:00'),
      },
    }),
    prisma.orderOperationLog.create({
      data: {
        orderId: orders[0].id,
        operatorId: providers[0].id,
        operatorRole: 'PROVIDER',
        oldStatus: 'STARTED',
        newStatus: 'COMPLETED',
        remark: '服务完成',
        createdAt: new Date('2023-12-01T16:00:00'),
      },
    }),
  ]);

  // 13. 创建订单评价
  await Promise.all([
    prisma.orderReview.create({
      data: {
        orderId: orders[0].id,
        rating: 5,
        content: '王阿姨服务很好，打扫得很干净，下次还找她！',
        createdAt: new Date('2023-12-01T18:00:00'),
      },
    }),
  ]);

  // 14. 创建交易记录
  await Promise.all([
    prisma.transaction.create({
      data: {
        type: 'INCOME',
        amount: 80.00,
        beforeBalance: 2420.00,
        afterBalance: 2500.00,
        providerId: providers[0].id,
        orderId: orders[0].id,
      },
    }),
    prisma.transaction.create({
      data: {
        type: 'INCOME',
        amount: 100.00,
        beforeBalance: 1700.00,
        afterBalance: 1800.00,
        providerId: providers[1].id,
        orderId: orders[1].id,
      },
    }),
  ]);

  // 15. 创建提现记录
  await Promise.all([
    prisma.withdrawal.create({
      data: {
        providerId: providers[0].id,
        amount: 500.00,
        status: 'PENDING',
        bankInfo: '工商银行 ****1234',
        applyTime: new Date('2023-12-01T20:00:00'),
      },
    }),
  ]);

  // 16. 创建服务者排班
  const today = new Date();
  const schedules = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    schedules.push(
      prisma.providerSchedule.create({
        data: {
          providerId: providers[0].id,
          date: date,
          slots: ['09:00', '10:00', '14:00', '15:00', '16:00'],
        },
      }),
      prisma.providerSchedule.create({
        data: {
          providerId: providers[1].id,
          date: date,
          slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00'],
        },
      })
    );
  }
  await Promise.all(schedules);

  // 17. 创建审计日志
  await Promise.all([
    prisma.auditLog.create({
      data: {
        module: 'ORDER_MANAGEMENT',
        action: 'CREATE',
        operatorId: adminUsers[0].id,
        operatorRole: 'ADMIN',
        entityId: orders[0].id,
        detail: { orderNo: orders[0].orderNo },
      },
    }),
    prisma.auditLog.create({
      data: {
        module: 'USER_MANAGEMENT',
        action: 'GIVE_COUPON',
        operatorId: adminUsers[1].id,
        operatorRole: 'ADMIN',
        entityId: users[0].id,
        detail: { couponId: couponTemplates[0].id },
      },
    }),
  ]);

  console.log('测试数据生成完成！');
  console.log(`生成了 ${users.length} 个用户`);
  console.log(`生成了 ${categories.length + subCategories.length} 个分类`);
  console.log(`生成了 ${services.length} 个服务`);
  console.log(`生成了 ${providers.length} 个服务者`);
  console.log(`生成了 ${orders.length} 个订单`);
  console.log(`生成了 ${couponTemplates.length} 个优惠券模板`);
  console.log(`生成了 ${banners.length} 个轮播图`);
}

main()
  .catch((e) => {
    console.error('生成测试数据时出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

