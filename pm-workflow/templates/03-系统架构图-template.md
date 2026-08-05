# 系统架构图

> **填写说明**：系统架构图描述产品的技术架构全貌，包括前端、后端、数据层、基础设施等。架构图应清晰展示各模块的职责边界和交互关系，建议配合架构图工具（如 Excalidraw、Draw.io）绘制可视化图表。

---

## 文档信息

| 字段 | 内容 |
|------|------|
| 文档版本 | v{版本号} |
| 创建日期 | {YYYY-MM-DD} |
| 作者 | {姓名} |
| 评审人 | {姓名} |

---

## 一、架构总览

### 1.1 架构全景图

```
┌──────────────────────────────────────────────────────────────────┐
│                          客户端层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Web    │  │  Mobile  │  │  Mini    │  │  Desktop │       │
│  │   App    │  │   App    │  │ Program  │  │   App    │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼──────────────┼──────────────┼──────────────┼────────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                          │
              ┌───────────┴───────────┐
              │      CDN / 网关       │
              │  {Nginx / CloudFront} │
              └───────────┬───────────┘
                          │
┌─────────────────────────┴────────────────────────────────────────┐
│                        服务层                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  API     │  │  Webhook │  │  Web     │  │  Task    │       │
│  │  Service │  │  Service │  │  Socket  │  │  Queue   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼──────────────┼──────────────┼──────────────┼────────────┘
        │              │              │              │
┌───────┴──────────────┴──────────────┴──────────────┴────────────┐
│                        数据层                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Main    │  │  Cache   │  │  Message │  │  File    │       │
│  │  DB      │  │  Redis   │  │  Queue   │  │  Storage │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、前端架构

### 2.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | {React 18 / Vue 3 / Next.js} | {选型理由} |
| 语言 | TypeScript | 类型安全 |
| 构建工具 | {Vite / Webpack 5} | {选型理由} |
| 包管理 | {pnpm / npm / yarn} | {选型理由} |
| 路由 | {React Router / Vue Router / Next.js 文件路由} | {选型理由} |
| 状态管理 | {Zustand / Pinia / Redux} | {选型理由} |
| UI 库 | {Ant Design / Shadcn/ui} | {选型理由} |
| 样式方案 | {Tailwind CSS / CSS Modules / styled-components} | {选型理由} |
| HTTP 客户端 | {Axios / Fetch / TanStack Query} | {选型理由} |
| 表单方案 | {React Hook Form / Formik} | {选型理由} |
| 测试 | {Vitest + Testing Library / Playwright} | {选型理由} |

### 2.2 组件树

```
<App>
├── <Layout>
│   ├── <Header>
│   │   ├── <Logo />
│   │   ├── <Navigation />
│   │   ├── <SearchBar />
│   │   └── <UserMenu />
│   ├── <Sidebar>                         # 侧边栏（如适用）
│   │   ├── <Menu />
│   │   └── <CollapseToggle />
│   ├── <Main>
│   │   └── <Outlet />                    # 路由出口
│   └── <Footer />
│
├── <Pages>
│   ├── <HomePage>
│   │   ├── <HeroSection />
│   │   ├── <FeatureCards />
│   │   └── <DataOverview />
│   ├── <ListPage>
│   │   ├── <FilterBar />
│   │   ├── <DataTable />
│   │   └── <Pagination />
│   ├── <DetailPage>
│   │   ├── <DetailHeader />
│   │   ├── <DetailContent />
│   │   └── <RelatedItems />
│   └── <SettingsPage>
│       ├── <SettingsNav />
│       └── <SettingsForm />
│
└── <CommonComponents>
    ├── <Modal />
    ├── <Toast />
    ├── <Loading />
    ├── <EmptyState />
    └── <ErrorBoundary />
```

### 2.3 路由设计

| 路由路径 | 页面组件 | 权限 | 说明 |
|----------|----------|------|------|
| `/` | HomePage | 公开 | 首页 |
| `/login` | LoginPage | 公开 | 登录页 |
| `/dashboard` | DashboardPage | 登录用户 | 工作台 |
| `/{resource}` | ListPage | 登录用户 | 列表页 |
| `/{resource}/:id` | DetailPage | 登录用户 | 详情页 |
| `/{resource}/create` | CreatePage | 登录用户 | 创建页 |
| `/{resource}/:id/edit` | EditPage | 登录用户 | 编辑页 |
| `/settings` | SettingsPage | 登录用户 | 设置页 |
| `/admin/*` | AdminPages | 管理员 | 管理后台 |
| `*` | NotFoundPage | 公开 | 404 页面 |

---

## 三、后端架构（如适用）

### 3.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 运行时 | {Node.js / Python / Go} | {选型理由} |
| 框架 | {NestJS / FastAPI / Gin} | {选型理由} |
| ORM | {Prisma / Drizzle / TypeORM} | {选型理由} |
| 数据库 | {PostgreSQL / MySQL} | {选型理由} |
| 缓存 | Redis | 热点数据缓存 |
| 消息队列 | {BullMQ / RabbitMQ / Kafka} | 异步任务处理 |
| 文件存储 | {S3 / OSS / MinIO} | 文件/图片存储 |

### 3.2 模块划分

```
src/
├── modules/
│   ├── auth/               # 认证模块
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/              # 用户模块
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── {resource}/         # 业务模块
│   │   ├── {resource}.controller.ts
│   │   ├── {resource}.service.ts
│   │   └── {resource}.module.ts
│   └── common/             # 公共模块
│       ├── guards/
│       ├── interceptors/
│       ├── filters/
│       └── decorators/
├── config/                 # 配置管理
├── database/               # 数据库迁移/种子数据
└── main.ts                 # 应用入口
```

### 3.3 API 设计规范

| 规范项 | 说明 |
|--------|------|
| API 风格 | RESTful |
| 基础路径 | `/api/v1` |
| 认证方式 | JWT Bearer Token |
| 请求格式 | JSON |
| 分页规范 | `?page=1&pageSize=20` |
| 排序规范 | `?sortBy=createdAt&order=desc` |
| 错误格式 | `{ code, message, details }` |
| API 文档 | Swagger / OpenAPI |

---

## 四、部署架构

### 4.1 部署拓扑

```
                    ┌─────────────┐
                    │    DNS      │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  CDN / WAF  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │     Load Balancer       │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐
  │  Web #1   │      │  Web #2   │      │  Web #3   │
  │  {Node}   │      │  {Node}   │      │  {Node}   │
  └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐
  │  DB       │      │  Redis    │      │  Object   │
  │  Primary  │      │  Cluster  │      │  Storage  │
  └───────────┘      └───────────┘      └───────────┘
```

### 4.2 环境说明

| 环境 | 用途 | 域名 | 配置 |
|------|------|------|------|
| 开发环境 (dev) | 本地开发 | `localhost:3000` | 本地数据库 |
| 测试环境 (test) | 自动化测试 | `test.{域名}` | 独立测试库 |
| 预发布环境 (staging) | 上线前验证 | `staging.{域名}` | 与生产同配置 |
| 生产环境 (prod) | 线上服务 | `{正式域名}` | 高可用配置 |

---

## 五、关键技术决策记录

| 决策项 | 选择 | 理由 | 决策日期 | 决策人 |
|--------|------|------|----------|--------|
| {决策项} | {选择} | {理由} | {日期} | {姓名} |
| {决策项} | {选择} | {理由} | {日期} | {姓名} |