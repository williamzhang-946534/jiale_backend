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
status: 'unverified' | 'pending' | 'verified' | 'rejected' (重点关注 pending)
keyword: 姓名/手机号
响应:
code
JSON
{
  "data": {
    "list": [
      { "id": "p1", "name": "王师傅", "phone": "...", "status": "pending", "createTime": "..." }
    ],
    "total": 100
  }
}
2. 获取服务者详情 (审核视图)
描述: 查看服务者提交的身份证、证书照片等敏感信息。
接口: GET /providers/{id}/detail
响应: 包含 ProviderProfile 及上传的 certFiles 图片链接。
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
5. 订单中心 (Order Management)
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
8. 系统设置 (Settings)
1. 获取/更新会员配置
接口: GET /settings/membership | PUT /settings/membership
描述: 调整会员价格和权益文案。
2. 管理员账号管理
接口: GET /settings/admins | POST /settings/admins
描述: 添加新的后台操作员。