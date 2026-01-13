家乐家政 (JiaLe Home Services) - 后端接口文档 v1.0
1. 基础说明
基础路径 (Base URL): /api/v1
请求格式: application/json
响应格式:
code
JSON
{
  "code": 200,      // 200: 成功, 4xx/5xx: 错误
  "message": "success",
  "data": { ... }   // 具体业务数据
}
鉴权: 请求头需携带 Authorization: Bearer <token> (登录/注册接口除外)。

1.1 数据模型定义
ProviderStatus (服务者状态):
- UNVERIFIED: 未认证
- PENDING: 待审核
- VERIFIED: 已认证
- REJECTED: 已拒绝

ProviderType (服务者类型):
- MATERNITY_NURSE: 月嫂
- CHILD_CARE_NURSE: 育儿嫂
- LIVE_IN_NANNY: 住家保姆
- CLEANING: 保洁
- HOUSEKEEPING: 清洁
- HOURLY_WORKER: 钟点工
- LAUNDRY_CARE: 洗护
- HOSPITAL_CARE: 医院看护
- ELDERLY_CARE: 老人护理
- COOKING: 烹饪
- TUTORING: 家教

2. 用户端 (Customer App)
2.1 首页 (HomeView)
1. 获取首页轮播图
描述: 获取首页顶部的营销活动轮播图。
接口: GET /home/banners
响应:
code
JSON
{
  "data": [
    { "id": 1, "imageUrl": "https://...", "linkUrl": "..." },
    ...
  ]
}
2. 获取首页金刚区分类
描述: 获取首页中部的快捷入口（金牌月嫂、育儿嫂、日常保洁等）。
接口: GET /home/quick-entries
响应:
code
JSON
{
  "data": [
    { "id": "gold_matron", "name": "金牌月嫂", "icon": "👑", "targetCategoryId": "nanny" },
    ...
  ]
}
3. 获取限时特惠/推荐服务
描述: 获取首页“限时特惠”区域的服务列表。
接口: GET /home/special-offers
响应: List of Service (见 types.ts 定义)
export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  rating: number;
  image: string;
  description: string;
  providerCount: number;
  tags?: string[];
}

4. 获取首页推荐服务者 (附近的人)
描述: 获取首页底部的精选服务者列表，支持按标签筛选。
接口: GET /home/providers
参数:
filter: string (可选, e.g., '月嫂', '保姆')
latitude: number
longitude: number
响应:
code
JSON
{
  "data": [
    {
      "id": 101,
      "name": "王金凤",
      "role": "金牌月嫂",
      "avatar": "...",
      "rating": 5.0,
      "distance": "2.5km",
      "tags": ["中医调理", "营养师"]
    },
    ...
  ]
}
2.2 分类页 (CategorySplitView)
1. 获取分类树
描述: 获取左侧一级分类及右侧对应的二级分类列表。
接口: GET /categories/tree
响应:
code
JSON
{
  "data": [
    {
      "id": "cleaning",
      "name": "保洁清洗",
      "items": [
        { "id": "daily_clean", "name": "日常保洁" },
        { "id": "deep_clean", "name": "深度保洁" }
      ]
    },
    ...
  ]
}
2.3 服务/服务者列表页 (ServiceListView / ProviderListView)
1. 获取服务商品列表
描述: 根据二级分类获取标准化服务商品（如：保洁套餐、维修服务）。
接口: GET /services
参数:
categoryId: string (一级分类ID)
subCategoryId: string (二级分类ID)
sort: string ('comprehensive' | 'sales' | 'price_asc' | 'price_desc')
filter: tags (如：自带工具)
响应: List of Service
2. 获取服务者列表
描述: 根据二级分类获取入驻的服务人员列表（如：月嫂、宠物托管师）。
接口: GET /providers/list
参数:
categoryId: string
subCategoryId: string
sort: string
响应:
code
JSON
{
  "data": [
    {
      "id": "p1",
      "name": "王阿姨",
      "score": 4.9,
      "price": 45,
      "unit": "小时",
      "orders": 1204,
      "description": "专注家庭保洁5年...",
      "tags": ["经验丰富"],
      "isVerified": true
    },
    ...
  ]
}
2.4 服务详情页 (ServiceDetailView)
1. 获取服务/服务者详情
描述: 获取单个服务或服务人员的详细信息（包含相册、评价、资质、履历）。
接口: GET /services/{id}/detail
响应:
code
JSON
{
  "data": {
    "baseInfo": { ...Service Object... },
    "providerDetail": {
      "attributes": { "age": "47岁", "hometown": "辽宁" },
      "stats": { "households": 88, "reviews": 51 },
      "certs": ["母婴护理高级证", ...],
      "intro": "...",
      "gallery": [ ... ], // 视频和图片
      "workHistory": [ ... ] // 工作经历 timeline
    },
    "standardDetail": {
         "processSteps": [ ... ], // 标准化流程步骤
         "comparisonImages": [ ... ] // 对比图
    }
  }
}
2.5 预约下单页 (BookingView)
1. 计算订单价格
描述: 根据选择的日期、时长或周期，动态计算订单金额。
接口: POST /orders/calculate
请求:
code
JSON
{
  "serviceId": "...",
  "dates": ["2023-10-01", ...],
  "duration": 2
}
响应:
code
JSON
{
  "data": {
    "originalPrice": 200,
    "discount": 20,
    "totalPrice": 180,
    "priceBreakdown": "..."
  }
}
2. 创建订单
描述: 提交预约订单。
接口: POST /orders
请求:
code
JSON
{
  "serviceId": "...",
  "addressId": "...",
  "serviceDate": "2023-10-25",
  "serviceTime": "14:00",
  "specialRequests": "..."
}
响应: { "data": { "orderId": "ORD-123", "payToken": "..." } }
3. 获取可用时间槽/日历
根据服务类型（小时工/长期）返回不同的可用性数据。
URL: /services/{id}/availability
Method: GET
Query: ?date=2023-10-25
Response:
code
JSON
{
  "type": "slots", // 或 'calendar_range'
  "slots": ["09:00", "10:00", "14:00"]
}
2.6 订单列表/详情页 (OrdersView / OrderDetailView)
1. 获取订单列表
描述: 获取用户的订单列表，支持状态筛选。
接口: GET /user/orders
参数: status ('all' | 'pending' | 'in_service' | 'completed')
响应: List of Order
2. 获取订单详情
描述: 获取单个订单的详细信息，包含时间轴。
接口: GET /orders/{id}
响应:
code
JSON
{
  "data": {
    ...Order Object...,
    "timeline": {
      "created": "2023-10-25 10:00",
      "accepted": "2023-10-25 10:05",
      "arrived": "2023-10-25 13:55",
      "started": "2023-10-25 14:00",
      "completed": null
    }
  }
}
3. 订单操作
支付: POST /orders/{id}/pay
取消: POST /orders/{id}/cancel
评价: POST /orders/{id}/review (参数: rating, content)
2.7 服务日历 (ServiceCalendarView)
1. 获取服务日程
描述: 获取指定月份的所有服务安排（用于日历打点）。
接口: GET /user/schedule
参数: year, month
响应: List of Order (简化版，仅包含日期、状态、服务名)
2.8 个人中心 (ProfileView & Sub-pages)
1. 获取用户个人信息
描述: 获取头像、余额、积分、会员等级及统计数据。
接口: GET /user/profile
响应: UserProfile Object (见 types.ts)
2. 地址管理
列表: GET /user/addresses
新增: POST /user/addresses
修改: PUT /user/addresses/{id}
删除: DELETE /user/addresses/{id}
3. 获取收藏列表
接口: GET /user/favorites
4. 获取优惠券列表
接口: GET /user/coupons
3. 服务端 (Provider App)
3.1 认证与注册 (AuthViews)
1. 服务者注册
描述: 提交实名认证信息。
接口: POST /provider/register
请求: { "name": "...", "idCard": "...", "phone": "...", "certFiles": [...] }
2. 获取审核状态
接口: GET /provider/verification-status
3.2 工作台 (DashboardView)
1. 获取工作台概览
描述: 获取今日收入、评分、接单状态。
接口: GET /provider/dashboard/stats
响应: { "rating": 4.9, "todayEarnings": 320, "isOnline": true }
2. 切换在线/离线状态
接口: POST /provider/status/toggle
3. 获取当前进行中的订单
接口: GET /provider/orders/active
响应: 返回当前状态不是 completed 的最近一笔订单。
4. 获取新订单池 (抢单列表)
接口: GET /provider/orders/incoming
响应: List of Order (包含距离、价格、备注)
5. 订单流转操作
抢单: POST /orders/{id}/accept
确认到达: POST /orders/{id}/arrive
开始服务: POST /orders/{id}/start (可能需要上传照片)
完成服务: POST /orders/{id}/complete
3.3 日程与钱包 (ScheduleView / WalletView)
1. 获取服务者排班/日程
接口: GET /provider/schedule
参数: month
2. 获取钱包信息
接口: GET /provider/wallet
响应: { "balance": 2150.00, "history": [...] }
3. 获取收入图表数据
接口: GET /provider/wallet/chart
参数: period ('week' | 'month')
响应: { "labels": ["周一", ...], "values": [100, 200, ...] }
3.4 个人资料 (ProfileView)
1. 获取服务者资料
接口: GET /provider/profile
响应: ProviderProfile Object
2. 更新资料 (简介等)
接口: PUT /provider/profile
请求: `{ "intro": "..." }



这份文档的设计目标是赋能运营人员和管理员，使其能够维护用户端和服务端产生的数据，管理业务流程（如审核、派单、退款）以及配置基础服务信息。
家乐家政 - 后台管理系统 (Admin Panel) 接口文档 v1.0
1. 基础说明
基础路径 (Base URL): /api/admin/v1
请求格式: application/json
鉴权方式: Header 中携带 Authorization: Bearer <admin_token>
通用分页参数:
page: 页码 (默认 1)
pageSize: 每页数量 (默认 20)
通用响应结构:
code
JSON
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
2. 控制台 (Dashboard)
1. 获取全局统计数据
描述: 获取顶部核心指标卡片数据（总销售额、今日订单量、待审核阿姨数、活跃用户数）。
接口: GET /dashboard/stats
响应:
code
JSON
{
  "data": {
    "totalGmv": 125800.00,
    "todayOrders": 45,
    "pendingProviders": 12,
    "activeUsers": 340
  }
}
2. 获取订单/收入趋势图
描述: 获取折线图数据。
接口: GET /dashboard/charts
参数: range ('week' | 'month' | 'year')
响应:
code
JSON
{
  "data": {
    "labels": ["周一", "周二", ...],
    "orderValues": [12, 19, ...],
    "revenueValues": [1200, 1900, ...]
  }
}
3. 服务与分类管理 (Service Catalog)
该模块用于维护用户端“首页”和“分类页”展示的数据。
3.1 分类管理
1. 获取分类树
接口: GET /categories
响应: 返回完整的多级分类树结构。
2. 新增/编辑分类
接口: POST /categories (新增) | PUT /categories/{id} (编辑)
请求:
code
JSON
{
  "name": "深度保洁",
  "parentId": "cleaning", // 一级分类ID，如果是顶层则为 null
  "icon": "http://...",
  "sortOrder": 1
}
3. 删除分类
接口: DELETE /categories/{id}
3.2 服务商品管理
1. 服务列表 (分页)
接口: GET /services
参数: page, pageSize, categoryId, keyword (搜索服务名)
响应: List of Service (包含上下架状态)
2. 新增/编辑服务
接口: POST /services | PUT /services/{id}
描述: 创建新的SKU（如“4小时保洁套餐”）。
请求:
code
JSON
{
  "name": "家庭深度保洁",
  "categoryId": "cleaning",
  "price": 45,
  "unit": "小时",
  "images": ["..."],
  "description": "...",
  "tags": ["深度", "除螨"],
  "status": "active" // active: 上架, inactive: 下架
}
3. 上下架服务
接口: PATCH /services/{id}/status
请求: { "status": "inactive" }
4. 服务者管理 (Provider Management)
该模块对应服务端 App 的注册与审核流程。
1. 服务者列表
接口: GET /providers
参数:
status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'banned' (重点关注 pending)
keyword: 姓名/手机号
page: 页码 (默认1)
pageSize: 每页数量 (默认20)
响应:
code
JSON
{
  "data": {
    "list": [
      {
        "id": "p1",
        "name": "王师傅",
        "phone": "13900139001",
        "status": "pending",
        "isBanned": false,
        "createTime": "2023-12-01T09:00:00.000Z",
        "rating": 4.8,
        "intro": "专业维修师傅，技术过硬",
        
        // 统计信息
        "totalOrders": 156,
        "totalRevenue": 45680.50,
        "walletBalance": 2340.00,
        "withdrawableBalance": 2000.00,
        
        // 个人信息
        "age": 35,
        "experience": 8,
        "zodiac": "天秤座",
        "chineseZodiac": "兔",
        "hometown": "河南郑州",
        "homeAddress": "河南省郑州市金水区...",
        "expectedSalary": 8000.00,
        "actualSalary": 7500.00,
        
        // 服务信息
        "providerTypes": ["月嫂", "育儿嫂", "保洁"],
        "serviceArea": "河南漯河",
        "isOnline": true,
        "isRecommended": true,
        
        // 当前订单信息
        "currentOrder": null
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
2. 获取服务者详情 (审核视图)
描述: 查看服务者提交的身份证、证书照片等敏感信息。
接口: GET /providers/{id}/detail
响应:
code
JSON
{
  "data": {
    "id": "p1",
    "name": "王师傅",
    "phone": "13900139001",
    "status": "pending",
    "idCardImageUrl": "https://example.com/idcard.jpg?watermark=1",
    "certFiles": [
      "https://example.com/cert1.jpg?watermark=1",
      "https://example.com/cert2.jpg?watermark=1"
    ],
    "workExperience": [
      {
        "company": "某某家政公司",
        "position": "月嫂",
        "startDate": "2020-01",
        "endDate": "2023-12",
        "description": "负责新生儿护理和产妇照料"
      }
    ],
    // ... 其他字段
  }
}
3. 审核服务者
接口: POST /providers/{id}/audit
请求:
code
JSON
{
  "action": "approve", // 或 "reject"
  "rejectReason": "身份证照片模糊" // 拒绝时必填
}
4. 封禁/解封服务者
描述: 处理违规账号。
接口: PATCH /providers/{id}/account-status
请求: { "isBanned": true }
5. 服务者统计管理
1. 获取服务者每日统计
接口: GET /providers/{id}/daily-stats
参数:
startDate: 开始日期 (可选)
endDate: 结束日期 (可选)
响应:
code
JSON
{
  "data": [
    {
      "date": "2023-12-01",
      "orderCount": 5,
      "orderAmount": 850.00,
      "earnings": 850.00,
      "orderTypes": {
        "月嫂": 2,
        "保洁": 3
      }
    }
  ]
}
2. 获取服务者月度统计
接口: GET /providers/{id}/monthly-stats
参数:
year: 年份 (必需)
month: 月份 (必需)
响应:
code
JSON
{
  "data": {
    "year": 2023,
    "month": 12,
    "totalOrders": 156,
    "totalRevenue": 45680.50,
    "totalEarnings": 45680.50,
    "workingDays": 22,
    "dailyStats": [...]
  }
}
3. 更新服务者统计
描述: 订单完成时自动调用，更新服务者统计数据
接口: POST /providers/{id}/update-stats
请求:
code
JSON
{
  "orderAmount": 850.00,
  "orderType": "月嫂"
}
6. 订单中心 (Order Management)
1. 订单列表
接口: GET /orders
参数:
status: 订单状态
orderNo: 订单号
dateRange: start, end
响应: List of Order
2. 订单详情
接口: GET /orders/{id}
响应: 包含订单基本信息、支付信息、服务时间轴、双方评价。
3. 订单指派 (调度)
描述: 某些订单可能需要后台管理员手动指派给特定阿姨。
接口: POST /orders/{id}/assign
请求: { "providerId": "p101" }
4. 强制取消/退款
描述: 处理纠纷订单。
接口: POST /orders/{id}/refund
请求:
code
JSON
{
  "amount": 100.00, // 退款金额
  "reason": "用户投诉服务未完成",
  "type": "full" // full: 全额, partial: 部分
}
6. 用户管理 (User Management)
1. 用户列表
接口: GET /users
参数: keyword (手机号/昵称), level (会员等级)
2. 用户详情
接口: GET /users/{id}
响应: 包含用户信息、地址列表、订单记录、钱包余额。
3. 赠送优惠券
描述: 客服手动补偿或营销。
接口: POST /users/{id}/coupons
请求: { "couponId": "c1" }
7. 财务与营销 (Finance & Marketing)
7.1 提现管理
1. 提现申请列表
接口: GET /finance/withdrawals
参数: status (pending | approved | rejected)
响应:
code
JSON
{
  "data": [
    { "id": 1, "providerName": "...", "amount": 500, "applyTime": "...", "bankInfo": "..." }
  ]
}
2. 审核提现
接口: POST /finance/withdrawals/{id}/audit
请求: { "action": "approve" }
7.2 营销配置
1. 轮播图管理
接口: GET /marketing/banners | POST /marketing/banners | DELETE /marketing/banners/{id}
描述: 管理用户端首页顶部的 Banner。
2. 优惠券模板管理
接口: POST /marketing/coupons
描述: 创建新的优惠券活动（如“双11大促券”）。
请求:
code
JSON
{
  "name": "新客立减",
  "amount": 20,
  "minSpend": 100,
  "totalQuantity": 1000,
  "validDays": 7
}
3. 限时特惠管理
接口: 
- GET /marketing/special-offers (获取列表)
- POST /marketing/special-offers (新增)
- PUT /marketing/special-offers/{id} (编辑)
- DELETE /marketing/special-offers/{id} (删除)
- PATCH /marketing/special-offers/{id}/status (上下架)
描述: 管理用户端首页"限时特惠"区域的服务列表。
请求 (新增/编辑):
code
JSON
{
  "name": "深度保洁套餐",
  "category": "保洁清洗",
  "price": 99.00,
  "unit": "次",
  "rating": 4.8,
  "image": "https://...",
  "description": "专业深度保洁服务...",
  "providerCount": 25,
  "tags": ["深度清洁", "除螨"],
  "status": "active", // active: 上架, inactive: 下架
  "sortOrder": 1
}
8. 系统设置 (Settings)
1. 获取/更新会员配置
接口: GET /settings/membership | PUT /settings/membership
描述: 调整会员价格和权益文案。
2. 管理员账号管理
接口: GET /settings/admins | POST /settings/admins
描述: 添加新的后台操作员。

9. 功能特性说明
9.1 服务者统计系统
系统自动记录服务者的每日、每月统计数据，包括：
- 订单数量和金额
- 订单类型分布
- 收入统计
- 工作天数

统计更新时机：
- 订单完成时自动更新当日统计
- 每日凌晨0点重置今日收入
- 每日凌晨1点生成前一日统计报告

9.2 服务者信息扩展
服务者档案包含完整的个人信息和服务信息：
- 基础统计：总订单数、总收入、钱包余额
- 个人信息：年龄、经验、星座、属相、籍贯
- 工作信息：期望工资、实际工资、工作经历
- 服务信息：服务类型、服务区域、在线状态
- 推荐设置：是否在首页推荐展示

9.3 数据库设计
新增表结构：
- ProviderDailyStats: 服务者每日统计表
- Provider 模型扩展：新增20+字段
- ProviderType 枚举：11种服务类型

9.4 定时任务
- 每日0点：重置服务者今日收入
- 每日1点：生成统计报告
- 订单完成时：实时更新统计数据

10. 未实现接口清单
以下接口在后台管理系统中尚未实现，需要后续开发：

10.1 服务者统计相关接口
- GET /providers/{id}/daily-stats - 获取服务者每日统计
  描述: 获取指定服务者在指定时间范围内的每日统计数据
  参数:
    - startDate: string (可选) - 开始日期，格式: YYYY-MM-DD
    - endDate: string (可选) - 结束日期，格式: YYYY-MM-DD
  请求示例: GET /providers/p123/daily-stats?startDate=2023-12-01&endDate=2023-12-31
  响应:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "date": "2023-12-01",
        "orderCount": 5,
        "orderAmount": 850.00,
        "earnings": 850.00,
        "orderTypes": {
          "月嫂": 2,
          "保洁": 3
        }
      },
      {
        "date": "2023-12-02",
        "orderCount": 3,
        "orderAmount": 450.00,
        "earnings": 450.00,
        "orderTypes": {
          "育儿嫂": 1,
          "保洁": 2
        }
      }
    ]
  }
  ```

- GET /providers/{id}/monthly-stats - 获取服务者月度统计
  描述: 获取指定服务者在指定年月的详细统计数据
  参数:
    - year: number (必需) - 年份，如: 2023
    - month: number (必需) - 月份，如: 12
  请求示例: GET /providers/p123/monthly-stats?year=2023&month=12
  响应:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "year": 2023,
      "month": 12,
      "totalOrders": 156,
      "totalRevenue": 45680.50,
      "totalEarnings": 45680.50,
      "workingDays": 22,
      "dailyStats": [
        {
          "date": "2023-12-01",
          "orderCount": 5,
          "orderAmount": 850.00,
          "earnings": 850.00,
          "orderTypes": {
            "月嫂": 2,
            "保洁": 3
          }
        }
      ]
    }
  }
  ```

- POST /providers/{id}/update-stats - 更新服务者统计
  描述: 订单完成时自动调用，实时更新服务者统计数据
  请求体:
  ```json
  {
    "orderAmount": 850.00,
    "orderType": "月嫂"
  }
  ```
  请求示例: POST /providers/p123/update-stats
  响应:
  ```json
  {
    "code": 200,
    "message": "统计更新成功",
    "data": {
      "todayOrders": 5,
      "todayRevenue": 850.00,
      "monthlyOrders": 156,
      "monthlyRevenue": 45680.50
    }
  }
  ```

10.2 营销管理补充接口
- POST /marketing/coupons - 创建优惠券模板
  描述: 创建新的优惠券活动，用于营销推广
  请求体:
  ```json
  {
    "name": "新客立减",
    "amount": 20,
    "minSpend": 100,
    "totalQuantity": 1000,
    "validDays": 7,
    "description": "新用户专享优惠券",
    "userLimit": 1,
    "categoryIds": ["cleaning", "nanny"]
  }
  ```
  请求示例: POST /marketing/coupons
  响应:
  ```json
  {
    "code": 200,
    "message": "优惠券创建成功",
    "data": {
      "id": "coupon_123",
      "name": "新客立减",
      "amount": 20,
      "minSpend": 100,
      "totalQuantity": 1000,
      "remainingQuantity": 1000,
      "validDays": 7,
      "status": "active",
      "createTime": "2023-12-06T10:00:00.000Z",
      "expireTime": "2023-12-13T10:00:00.000Z"
    }
  }
  ```

10.3 系统设置补充接口
- GET /settings/system - 获取系统设置
  描述: 获取系统基础配置信息
  请求示例: GET /settings/system
  响应:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "systemName": "家乐家政管理系统",
      "systemVersion": "v1.0.0",
      "contactPhone": "400-123-4567",
      "contactEmail": "support@jiale.com",
      "businessHours": "09:00-18:00",
      "orderTimeout": 30,
      "autoAssign": false,
      "minOrderAmount": 50,
      "serviceRadius": 50,
      "maintenanceMode": false,
      "announcement": "系统将于今晚22:00-23:00进行维护"
    }
  }
  ```

- PUT /settings/system - 更新系统设置
  描述: 更新系统基础配置参数
  请求体:
  ```json
  {
    "contactPhone": "400-123-4567",
    "contactEmail": "support@jiale.com",
    "businessHours": "09:00-18:00",
    "orderTimeout": 30,
    "autoAssign": false,
    "minOrderAmount": 50,
    "serviceRadius": 50,
    "maintenanceMode": false,
    "announcement": "系统将于今晚22:00-23:00进行维护"
  }
  ```
  请求示例: PUT /settings/system
  响应:
  ```json
  {
    "code": 200,
    "message": "系统设置更新成功",
    "data": {
      "systemName": "家乐家政管理系统",
      "systemVersion": "v1.0.0",
      "contactPhone": "400-123-4567",
      "contactEmail": "support@jiale.com",
      "businessHours": "09:00-18:00",
      "orderTimeout": 30,
      "autoAssign": false,
      "minOrderAmount": 50,
      "serviceRadius": 50,
      "maintenanceMode": false,
      "announcement": "系统将于今晚22:00-23:00进行维护",
      "updateTime": "2023-12-06T10:00:00.000Z"
    }
  }
  ```

10.4 实现优先级建议
1. **高优先级**: 服务者统计相关接口（对服务者管理功能至关重要）
2. **中优先级**: 优惠券模板管理（营销功能的重要组成部分）
3. **低优先级**: 系统设置（基础配置功能，可后续实现）

---
文档版本: v1.3
最后更新: 2025-01-13
新增: 重复接口删除与统一接口实现

# 家乐家政 (JiaLe Home Services) - 后端接口文档 v1.3

## 1. 基础说明
基础路径 (Base URL): /api/v1
请求格式: application/json
响应格式:
```json
{
  "code": 200,      // 200: 成功, 4xx/5xx: 错误
  "message": "success",
  "data": { ... }   // 具体业务数据
}
```
鉴权: 请求头需携带 Authorization: Bearer <token> (登录/注册接口除外)。

## 2. 接口状态说明

### ✅ 已删除的重复接口
以下接口已被删除，功能已合并到统一接口中：

#### 2.1 首页模块 (旧接口 - 已删除)
- ❌ `GET /api/v1/home/banners` - 已合并到 `/api/v1/home/init`
- ❌ `GET /api/v1/home/quick-entries` - 已合并到 `/api/v1/home/init`
- ❌ `GET /api/v1/home/special-offers` - 已合并到 `/api/v1/home/init`
- ❌ `GET /api/v1/home/providers` - 已合并到 `/api/v1/home/init`

#### 2.2 服务模块 (旧接口 - 已删除)
- ❌ `GET /api/v1/services` - 已合并到 `/api/v1/services/detail/{id}`
- ❌ `POST /api/v1/orders` - 已修改为 `/api/v1/orders/create`

#### 2.3 订单模块 (旧接口 - 已删除)
- ❌ `GET /api/v1/orders` - 已合并到 `/api/v1/orders/calendar`

### 🎯 保留的统一接口
以下接口为当前使用的统一接口，已实现并正常工作：

#### 3.1 新增统一接口 (14个)
- ✅ `GET /api/v1/home/init` - 首页综合数据
- ✅ `POST /api/v1/services/match` - 智能匹配服务者
- ✅ `GET /api/v1/services/recommendations` - 推荐配套服务
- ✅ `GET /api/v1/services/detail/{id}` - 服务详情(含规格)
- ✅ `POST /api/v1/orders/create` - 创建订单(支持规格)
- ✅ `GET /api/v1/market/flash-sales` - 闪购秒杀
- ✅ `POST /api/v1/market/newcomer/claim` - 新人礼包
- ✅ `GET /api/v1/orders/calendar` - 服务日历
- ✅ `GET /api/v1/users/favorites/providers` - 收藏服务者
- ✅ `PATCH /api/v1/users/addresses/{id}/default` - 设置默认地址

#### 3.2 后台管理新增接口 (6个)
- ✅ `GET /api/admin/v1/providers/{id}/daily-stats` - 服务者日统计
- ✅ `GET /api/admin/v1/providers/{id}/monthly-stats` - 服务者月统计
- ✅ `POST /api/admin/v1/providers/{id}/update-stats` - 更新统计
- ✅ `POST /api/admin/v1/marketing/coupons` - 创建优惠券
- ✅ `GET /api/admin/v1/settings/system` - 获取系统设置
- ✅ `PUT /api/admin/v1/settings/system` - 更新系统设置

## 3. 数据库优化状态

### ✅ 已完成的新增表
- `ServiceSpecification` - 服务规格表
- `UserFavoriteProvider` - 用户收藏服务者表
- `FlashSale` - 闪购活动表
- `SystemSettings` - 系统设置表

### ✅ 已更新的模型关联
- `User.favoriteProviders` - 用户收藏关联
- `Provider.favoritedBy` - 被收藏关联
- `Service.specifications` - 服务规格关联
- `Service.flashSales` - 闪购关联

## 4. API文档状态

### ✅ Swagger自动生成
- **访问地址**: http://localhost:3000/api/docs
- **功能**: 完整的API文档自动生成
- **分类**: 用户端、服务端、后台管理、统一接口

## 5. 当前系统状态

### 🚀 服务器状态
- **状态**: ✅ 正在运行
- **端口**: 3000
- **API文档**: http://localhost:3000/api/docs
- **基础路径**: http://localhost:3000/api

### 📋 可用接口
所有接口已实现并可通过Swagger文档查看和测试。

---

**总结**: 重复接口已删除，统一接口已实现，数据库结构已优化，权限控制已完善。系统架构更加清晰，为生产环境部署做好准备。

## 1. 基础说明
基础路径 (Base URL): /api/v1
请求格式: application/json
响应格式:
```json
{
  "code": 200,      // 200: 成功, 4xx/5xx: 错误
  "message": "success",
  "data": { ... }   // 具体业务数据
}
```
鉴权: 请求头需携带 Authorization: Bearer <token> (登录/注册接口除外)。

## 2. 统一接口规范

### 2.1 首页模块 (Unified Home API)

#### GET /api/v1/home/init
**功能说明**: 一次性获取首页所需的广告位、金刚区分类、限时特惠、推荐服务等所有数据。

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "banners": [
      {
        "id": "banner_1",
        "imageUrl": "https://example.com/banner1.jpg",
        "linkUrl": "https://example.com/promo1",
        "sortOrder": 1
      }
    ],
    "categories": [
      {
        "id": "cleaning",
        "name": "保洁清洗",
        "icon": "🧹",
        "color": "bg-emerald-50"
      },
      {
        "id": "maternity",
        "name": "母婴护理",
        "icon": "👶",
        "color": "bg-pink-50"
      }
    ],
    "specialOffers": [
      {
        "id": "offer_1",
        "name": "标准保洁",
        "price": 45,
        "originalPrice": 60,
        "image": "https://example.com/clean.jpg",
        "discount": 0.75,
        "unit": "次",
        "tags": ["限时特惠", "深度清洁"]
      }
    ],
    "featuredServices": [
      {
        "id": "service_1",
        "isFeatured": true,
        "name": "金牌月嫂",
        "rating": 5.0,
        "price": 12800,
        "image": "https://example.com/matrons.jpg"
      }
    ]
  }
}
```

#### POST /api/v1/services/match
**功能说明**: 根据用户填写的需求（日期、预算等）智能匹配合适的阿姨/师傅。

**请求参数**:
```json
{
  "serviceId": "svc_matron",
  "startDate": "2023-12-20",
  "budgetRange": "8000-12000",
  "specialRequirements": "需要会做南方菜"
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "provider_1",
      "name": "王阿姨",
      "avatar": "https://example.com/avatar1.jpg",
      "rating": 4.9,
      "experience": 8,
      "intro": "专业月嫂，有丰富的新生儿护理经验",
      "expectedSalary": 10000,
      "serviceTypes": ["MATERNITY_NURSE", "CHILD_CARE_NURSE"],
      "hometown": "河南郑州"
    }
  ]
}
```

#### GET /api/v1/services/recommendations
**功能说明**: 获取推荐配套服务，用于详情页底部的"推荐配套服务"版块。

**请求参数**:
- `serviceId`: string (必需) - 当前服务ID
- `limit`: number (可选) - 返回数量限制，默认5个

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "service_2",
      "name": "深度保洁",
      "categoryName": "保洁清洗",
      "price": 85,
      "unit": "次",
      "image": "https://example.com/deep-clean.jpg",
      "rating": 4.8,
      "tags": ["深度清洁", "除螨"]
    }
  ]
}
```

#### GET /api/v1/market/flash-sales
**功能说明**: 获取当前时段及未来时段的秒杀服务。

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "currentTime": "12:00",
    "items": [
      {
        "id": "flash_1",
        "flashPrice": 9.9,
        "stock": 50,
        "totalStock": 200,
        "startTime": "10:00",
        "endTime": "12:00"
      }
    ]
  }
}
```

#### POST /api/v1/market/newcomer/claim
**功能说明**: 新用户点击领取按钮，后端验证资格并下发优惠券。

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "couponAmount": 50,
    "message": "新人礼包领取成功"
  }
}
```

#### GET /api/v1/orders/calendar
**功能说明**: 按月/地址获取已预约的服务分布，用于日历视图。

**请求参数**:
- `year`: number (必需) - 年份
- `month`: number (必需) - 月份
- `addressId`: string (可选) - 地址ID，"all"表示所有地址

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "date": "2023-11-25",
      "orderId": "ORD-7782",
      "status": "pending",
      "serviceName": "标准保洁"
    }
  ]
}
```

#### GET /api/v1/users/favorites/providers
**功能说明**: 获取用户收藏的服务者列表。

**请求参数**:
- `page`: number (可选) - 页码，默认1
- `pageSize`: number (可选) - 每页数量，默认10
- `sortBy`: string (可选) - 排序字段，默认createdAt
- `sortOrder`: string (可选) - 排序方向，asc/desc，默认desc

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "provider_1",
      "name": "王阿姨",
      "avatar": "https://example.com/avatar1.jpg",
      "rating": 4.9,
      "experience": 8,
      "intro": "专业月嫂",
      "expectedSalary": 10000,
      "serviceTypes": ["MATERNITY_NURSE"],
      "hometown": "河南郑州",
      "isOnline": true,
      "totalOrders": 156,
      "totalRevenue": 45680.50
    }
  ]
}
```

#### PATCH /api/v1/users/addresses/{addrId}/default
**功能说明**: 设置/取消用户的默认服务地址。

**请求参数**:
```json
{
  "isDefault": true
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "addr_1",
    "isDefault": true,
    "contactName": "张三",
    "phone": "13800138000",
    "address": "河南省郑州市金水区..."
  }
}
```

### 2.2 服务与规格模块 (Unified Service API)

#### GET /api/v1/services/detail/{serviceId}
**功能说明**: 获取服务详细信息、SKU规格列表及详情介绍图。

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "svc_daily_clean",
    "name": "标准日常保洁",
    "categoryId": "cat_1",
    "categoryName": "保洁清洗",
    "price": 45,
    "unit": "小时",
    "images": ["https://example.com/service1.jpg"],
    "description": "专业家庭日常保洁服务",
    "tags": ["日常保洁", "基础清洁"],
    "specifications": [
      {
        "id": "sp1",
        "label": "2小时",
        "desc": "基础除尘，适合小户型",
        "price": 45,
        "originalPrice": 60
      },
      {
        "id": "sp2",
        "label": "4小时",
        "desc": "深度除垢，适合大户型",
        "price": 85,
        "originalPrice": 100
      }
    ],
    "details": [
      "https://example.com/detail1.jpg",
      "https://example.com/detail2.jpg"
    ],
    "promises": ["不满意重新做", "财产险保障", "迟到赔付"],
    "process": [
      {
        "title": "准时上门",
        "desc": "服饰整齐，携带专业工具"
      },
      {
        "title": "工具准备",
        "desc": "准备清洁用品和设备"
      },
      {
        "title": "清洁服务",
        "desc": "按标准流程进行全面清洁"
      },
      {
        "title": "验收确认",
        "desc": "客户确认满意后完成服务"
      }
    ],
    "providerCount": 25,
    "rating": 4.8,
    "status": "active"
  }
}
```

#### POST /api/v1/orders/create
**功能说明**: 用户选择规格、地址和时间后提交订单。

**请求参数**:
```json
{
  "serviceId": "svc_daily_clean",
  "specId": "sp2",
  "addressId": "addr_1",
  "serviceDate": "2023-11-25",
  "serviceTime": "10:00",
  "duration": 4,
  "couponId": "coupon_1",
  "specialRequests": "请重点清洁厨房和卫生间"
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "orderId": "ORD-202311250001",
    "payToken": "mock_pay_token_12345",
    "order": {
      "id": "order_1",
      "orderNo": "ORD-202311250001",
      "serviceName": "标准日常保洁",
      "serviceDate": "2023-11-25T00:00:00.000Z",
      "serviceTime": "10:00",
      "totalPrice": 85,
      "address": {
        "id": "addr_1",
        "contactName": "张三",
        "phone": "13800138000",
        "detail": "河南省郑州市金水区..."
      }
    }
  }
}
```

#### GET /api/v1/services
**功能说明**: 获取服务商品列表，支持分页和分类过滤。

**请求参数**:
- `page`: number (可选) - 页码，默认1
- `pageSize`: number (可选) - 每页数量，默认20
- `categoryId`: string (可选) - 一级分类ID
- `subCategoryId`: string (可选) - 二级分类ID
- `sort`: string (可选) - 排序方式：comprehensive/sales/price_asc/price_desc
- `filter`: string (可选) - 标签筛选
- `keyword`: string (可选) - 关键词搜索

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "service_1",
      "name": "标准日常保洁",
      "categoryName": "保洁清洗",
      "price": 45,
      "unit": "小时",
      "image": "https://example.com/service1.jpg",
      "tags": ["日常保洁", "基础清洁"],
      "rating": 4.8,
      "providerCount": 25,
      "description": "专业家庭日常保洁服务"
    }
  ]
}
```

#### GET /api/v1/providers
**功能说明**: 获取服务者列表，支持地理位置筛选。

**请求参数**:
- `page`: number (可选) - 页码，默认1
- `pageSize`: number (可选) - 每页数量，默认20
- `categoryId`: string (可选) - 分类ID
- `subCategoryId`: string (可选) - 子分类ID
- `sort`: string (可选) - 排序方式：comprehensive/rating/price_asc/price_desc
- `latitude`: number (可选) - 纬度
- `longitude`: number (可选) - 经度
- `radius`: number (可选) - 搜索半径(km)，默认50
- `filter`: string (可选) - 标签筛选
- `keyword`: string (可选) - 关键词搜索

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "provider_1",
      "name": "王阿姨",
      "avatar": "https://example.com/avatar1.jpg",
      "rating": 4.9,
      "experience": 8,
      "intro": "专业月嫂，有丰富的新生儿护理经验",
      "expectedSalary": 10000,
      "serviceTypes": ["MATERNITY_NURSE"],
      "hometown": "河南郑州",
      "isOnline": true,
      "totalOrders": 156,
      "totalRevenue": 45680.50,
      "distance": "2.5km"
    }
  ]
}
```

### 2.3 后台管理新增接口 (Admin API)

#### GET /api/admin/v1/providers/{id}/daily-stats
**功能说明**: 获取指定服务者在指定时间范围内的每日统计数据。

**请求参数**:
- `startDate`: string (可选) - 开始日期，格式: YYYY-MM-DD
- `endDate`: string (可选) - 结束日期，格式: YYYY-MM-DD

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "date": "2023-12-01",
      "orderCount": 5,
      "orderAmount": 850.00,
      "earnings": 850.00,
      "orderTypes": {
        "月嫂": 2,
        "保洁": 3
      }
    },
    {
      "date": "2023-12-02",
      "orderCount": 3,
      "orderAmount": 450.00,
      "earnings": 450.00,
      "orderTypes": {
        "育儿嫂": 1,
        "保洁": 2
      }
    }
  ]
}
```

#### GET /api/admin/v1/providers/{id}/monthly-stats
**功能说明**: 获取指定服务者在指定年月的详细统计数据。

**请求参数**:
- `year`: number (必需) - 年份，如: 2023
- `month`: number (必需) - 月份，如: 12

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "year": 2023,
    "month": 12,
    "totalOrders": 156,
    "totalRevenue": 45680.50,
    "totalEarnings": 45680.50,
    "workingDays": 22,
    "orderTypesSummary": {
      "月嫂": 80,
      "育儿嫂": 40,
      "保洁": 36
    },
    "dailyStats": [
      {
        "date": "2023-12-01",
        "orderCount": 5,
        "orderAmount": 850.00,
        "earnings": 850.00,
        "orderTypes": {
          "月嫂": 2,
          "保洁": 3
        }
      }
    ]
  }
}
```

#### POST /api/admin/v1/providers/{id}/update-stats
**功能说明**: 订单完成时自动调用，实时更新服务者统计数据。

**请求参数**:
```json
{
  "orderAmount": 850.00,
  "orderType": "月嫂"
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "todayOrders": 5,
    "todayRevenue": 850.00,
    "monthlyOrders": 156,
    "monthlyRevenue": 45680.50,
    "totalOrders": 1250,
    "totalRevenue": 234500.00
  }
}
```

#### POST /api/admin/v1/marketing/coupons
**功能说明**: 创建新的优惠券活动，用于营销推广。

**请求参数**:
```json
{
  "name": "新客立减",
  "amount": 20,
  "minSpend": 100,
  "totalQuantity": 1000,
  "validDays": 7,
  "description": "新用户专享优惠券",
  "userLimit": 1,
  "categoryIds": ["cleaning", "nanny"]
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "coupon_123",
    "name": "新客立减",
    "amount": 20,
    "minSpend": 100,
    "totalQuantity": 1000,
    "remainingQuantity": 1000,
    "validDays": 7,
    "status": "active",
    "createTime": "2023-12-06T10:00:00.000Z",
    "expireTime": "2023-12-13T10:00:00.000Z"
  }
}
```

#### GET /api/admin/v1/settings/system
**功能说明**: 获取系统基础配置信息。

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "systemName": "家乐家政管理系统",
    "systemVersion": "v1.0.0",
    "contactPhone": "400-123-4567",
    "contactEmail": "support@jiale.com",
    "businessHours": "09:00-18:00",
    "orderTimeout": 30,
    "autoAssign": false,
    "minOrderAmount": 50,
    "serviceRadius": 50,
    "maintenanceMode": false,
    "announcement": "系统正常运行中"
  }
}
```

#### PUT /api/admin/v1/settings/system
**功能说明**: 更新系统基础配置参数。

**请求参数**:
```json
{
  "contactPhone": "400-123-4567",
  "contactEmail": "support@jiale.com",
  "businessHours": "09:00-18:00",
  "orderTimeout": 30,
  "autoAssign": false,
  "minOrderAmount": 50,
  "serviceRadius": 50,
  "maintenanceMode": false,
  "announcement": "系统将于今晚22:00-23:00进行维护"
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "systemName": "家乐家政管理系统",
    "systemVersion": "v1.0.0",
    "contactPhone": "400-123-4567",
    "contactEmail": "support@jiale.com",
    "businessHours": "09:00-18:00",
    "orderTimeout": 30,
    "autoAssign": false,
    "minOrderAmount": 50,
    "serviceRadius": 50,
    "maintenanceMode": false,
    "announcement": "系统将于今晚22:00-23:00进行维护",
    "updateTime": "2023-12-06T10:00:00.000Z"
  }
}
```

## 3. 数据库优化

### 3.1 新增数据表

#### ServiceSpecification (服务规格表)
```sql
CREATE TABLE "ServiceSpecification" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(18,2) NOT NULL,
  "originalPrice" DECIMAL(18,2),
  "duration" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceSpecification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceSpecification_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

#### UserFavoriteProvider (用户收藏服务者表)
```sql
CREATE TABLE "UserFavoriteProvider" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserFavoriteProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserFavoriteProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserFavoriteProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserFavoriteProvider_userId_providerId_key" ON "UserFavoriteProvider"("userId", "providerId");
```

#### FlashSale (闪购活动表)
```sql
CREATE TABLE "FlashSale" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "specId" TEXT,
  "flashPrice" DECIMAL(18,2) NOT NULL,
  "originalPrice" DECIMAL(18,2) NOT NULL,
  "totalStock" INTEGER NOT NULL,
  "currentStock" INTEGER NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FlashSale_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

#### SystemSettings (系统设置表)
```sql
CREATE TABLE "SystemSettings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
```

### 3.2 更新Prisma Schema

在现有schema.prisma中添加以下模型：

```prisma
model ServiceSpecification {
  id           String   @id @default(cuid())
  service      Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  serviceId    String
  label        String
  description  String
  price        Decimal  @db.Decimal(18, 2)
  originalPrice Decimal? @db.Decimal(18, 2)
  duration     Int?
  sortOrder    Int      @default(1)
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model UserFavoriteProvider {
  id         String    @id @default(cuid())
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  provider   Provider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
  providerId String
  createdAt  DateTime  @default(now())

  @@unique([userId, providerId])
}

model FlashSale {
  id           String   @id @default(cuid())
  service      Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  serviceId    String
  specId       String?
  flashPrice   Decimal  @db.Decimal(18, 2)
  originalPrice Decimal  @db.Decimal(18, 2)
  totalStock   Int
  currentStock Int
  startTime    DateTime
  endTime      DateTime
  status       String   @default("pending")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SystemSettings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  category    String   @default("general")
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.3 更新现有模型

更新Service模型，添加规格关联：
```prisma
model Service {
  // ... 现有字段 ...
  specifications ServiceSpecification[]
  flashSales     FlashSale[]
}
```

更新User模型，添加收藏关联：
```prisma
model User {
  // ... 现有字段 ...
  favoriteProviders UserFavoriteProvider[]
}
```

更新Provider模型，添加收藏关联：
```prisma
model Provider {
  // ... 现有字段 ...
  favoritedBy UserFavoriteProvider[]
}
```

## 4. 权限控制优化

### 4.1 JWT认证增强

创建认证守卫：
```typescript
// src/shared/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private jwtService: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('无效的认证令牌');
    }
  }
}
```

### 4.2 角色权限控制

创建角色守卫：
```typescript
// src/shared/guards/role.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}

// 使用装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### 4.3 权限装饰器使用

```typescript
// 在控制器中使用
@Controller('admin/v1')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN')
export class AdminController {
  // 管理员接口
}

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  @Get('profile')
  @Roles('CUSTOMER', 'PROVIDER')
  getProfile() {
    // 用户和提供者都可访问
  }

  @Get('admin-only')
  @Roles('ADMIN')
  adminOnly() {
    // 仅管理员可访问
  }
}
```

## 5. API文档自动化

### 5.1 Swagger配置

安装依赖：
```bash
npm install @nestjs/swagger swagger-ui-express
```

配置Swagger：
```typescript
// src/main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerTheme } from 'swagger-themes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('家乐家政 API')
    .setDescription('家乐家政后端接口文档')
    .setVersion('1.2.0')
    .addBearerAuth()
    .addTag('用户端')
    .addTag('服务端')
    .addTag('后台管理')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '家乐家政 API 文档',
  });

  await app.listen(3000);
}
```

### 5.2 接口文档装饰器

```typescript
// 在控制器中添加Swagger装饰器
@ApiTags('首页')
@Controller('v1')
export class UnifiedHomeController {
  
  @Get('home/init')
  @ApiOperation({ summary: '获取首页综合数据' })
  @ApiResponse({ status: 200, description: '成功', type: HomeInitResponseDto })
  async homeInit() {
    // ...
  }

  @Post('services/match')
  @ApiOperation({ summary: '智能匹配服务者' })
  @ApiBody({ type: ServiceMatchDto })
  @ApiResponse({ status: 200, description: '匹配成功' })
  async serviceMatch(@Body() matchDto: ServiceMatchDto) {
    // ...
  }
}
```

## 6. 实现优先级建议

### 6.1 高优先级 (立即实现)
1. **数据库优化** - 添加服务规格表、收藏表等核心表结构
2. **权限控制** - 完善JWT认证和角色权限验证
3. **API文档** - 使用Swagger生成自动化API文档

### 6.2 中优先级 (后续实现)
1. **缓存策略** - 对首页数据等高频访问接口添加Redis缓存
2. **测试覆盖** - 编写单元测试和集成测试

### 6.3 低优先级 (可选实现)
1. **性能监控** - 添加接口性能监控和日志
2. **国际化** - 支持多语言接口响应

---

**文档版本**: v1.2  
**最后更新**: 2025-01-13  
**新增内容**: 统一接口实现、数据库优化、权限控制、API文档自动化  
**维护人员**: 后端开发团队
POST /api/services/v1/match
功能说明: 根据用户填写的需求（日期、预算等）匹配合适的阿姨/师傅。
请求参数:
code
JSON
{
  "serviceId": "svc_matron",
  "startDate": "2023-12-20",
  "budgetRange": "8000-12000",
  "specialRequirements": "需要会做南方菜"
}
响应内容: ProviderProfile[] (匹配到的阿姨列表)
3. 交易与订单模块 (Transaction API)
3.1 创建预约订单
POST /api/orders/v1/create
功能说明: 用户选择规格、地址和时间后提交订单。
请求参数:
code
JSON
{
  "serviceId": "svc_daily_clean",
  "specId": "sp2", // 用户选中的规格ID
  "addressId": "addr1",
  "serviceDate": "2023-11-25",
  "serviceTime": "10:00",
  "duration": 4, // 针对小时工
  "couponId": "c1" // 可选
}
响应内容: 订单摘要及预支付参数（如微信支付 prepay_id）。
3.2 获取服务日历数据
GET /api/orders/v1/calendar
功能说明: 按月/地址获取已预约的服务分布。
请求参数: ?year=2023&month=11&addressId=all
响应内容:
code
JSON
[
  { "date": "2023-11-25", "orderId": "ORD-7782", "status": "pending" }
]
4. 特色专区模块 (Specialty Zone API)
4.1 获取闪购秒杀列表
GET /api/market/v1/flash-sales
功能说明: 获取当前时段及未来时段的秒杀服务。
响应数据:
code
JSON
{
  "currentTime": "12:00",
  "items": [
    { "id": "svc_1", "flashPrice": 9.9, "stock": 50, "totalStock": 200 }
  ]
}
4.2 领取新人礼包 (优惠券)
POST /api/market/v1/newcomer/claim
功能说明: 新用户点击领取按钮，后端验证资格并下发优惠券。
响应数据: { "success": true, "couponAmount": 50 }
5. 地址与用户模块 (User API)
5.1 设置/取消默认地址
PATCH /api/user/v1/address/{addrId}/default
功能说明: 修改用户的默认服务地址。
请求参数: { "isDefault": true }
新增/删除接口清单建议：
新增: GET /api/services/v1/recommendations?serviceId=xxx
原因: 用于详情页底部的“推荐配套服务”版块。
修改: POST /api/orders/v1/create
变动: 必须增加 specId 字段，以支持前端新加的多规格切换功能。
新增: GET /api/user/v1/favorites/providers
原因: 原来只有服务收藏，现在前端增加了“我的收藏”阿姨列表，需要专门获取收藏的服务者接口。
删除/替换: 如果之前有 GET /api/services/v1/list，建议增加分页和分类过滤参数，以支持前端分类页的加载逻辑。
这些接口设计采用了 RESTful 风格，并充分考虑了前端目前的 ViewState 导航逻辑和数据过滤（如 isFeatured 和 isSpecial）的需求。