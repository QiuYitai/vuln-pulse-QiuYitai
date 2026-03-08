# VulnPulse - Vulnerability Intelligence Platform

> AI 驱动的漏洞情报平台，实时监控 CVE/NVD/GitHub Advisory 等多源漏洞数据，AI 智能评估严重度与影响范围，WebSocket 实时推送告警。

---

## 一、项目简介

**VulnPulse** 是一款面向开发者的漏洞情报监控工具。你只需注册自己的技术栈（如 React 18.2、PostgreSQL 15），系统便会从 NVD（美国国家漏洞数据库）、GitHub Security Advisories、CVE.org、安全博客等多个数据源自动聚合相关漏洞信息，通过 AI 评估 CVSS 严重度、可利用性以及是否影响你的具体版本，最后通过 WebSocket 实时推送 + 邮件告警。

**解决的问题：** 大多数开发者依赖手动查阅 CVE 列表或等安全团队通知，信息滞后且噪声大。VulnPulse 自动完成"发现 → 分析 → 匹配 → 告警"全链路，让你第一时间知道自己的项目依赖是否存在高危漏洞。

### 核心功能

| 功能 | 说明 |
|------|------|
| 技术栈注册 | 输入名称 + 版本 + 分类，系统针对每个栈定向监控 |
| 多源漏洞聚合 | NVD / GitHub Advisory / CIRCL CVE / 安全博客 RSS，全部免费 API |
| AI 漏洞分析 | CVSS 评分、严重度、可利用性、版本匹配、修复建议 |
| 实时告警 | WebSocket 推送 + 邮件通知（Critical/High 漏洞） |
| 可视化仪表盘 | CVSS 进度条、严重度色标、Impact/Remediation 展开面板 |
| 定时巡检 | 每 30 分钟自动扫描，也可手动触发 |

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 19 + TypeScript + Vite | SPA 仪表盘 |
| | TailwindCSS 4 + Framer Motion | 暗色科技风 UI |
| | Socket.io Client | WebSocket 实时通信 |
| **后端** | Express 5 + TypeScript | REST API + WebSocket 服务 |
| | Prisma ORM + SQLite | 数据库层 |
| | Socket.io + node-cron | 实时推送 + 定时任务 |
| | Nodemailer | 邮件告警 |
| **AI** | OpenRouter / OpenAI / DeepSeek | 可配置任意 OpenAI 兼容 API |
| **数据源** | NVD API | 美国国家漏洞数据库 |
| | GitHub Advisory API | GitHub 安全公告 |
| | CIRCL CVE API | 欧洲 CVE 检索 |
| | RSS Parser | 安全博客（Krebs/Schneier/THN） |

### 架构图

```
┌──────────────────────────────────────────────────────────┐
│                     VulnPulse Frontend                    │
│              React 19 + TailwindCSS + Framer Motion       │
│                    http://localhost:5173                  │
└──────────────────────────┬───────────────────────────────┘
                           │ REST API + WebSocket
┌──────────────────────────▼───────────────────────────────┐
│                   Express 5 Server (:3001)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ REST API │  │Socket.io │  │  Cron Job (30min)    │   │
│  │/tech-stacks│ │vuln:new  │  │  vulnerabilityChecker│   │
│  │/vulns     │  │notify    │  └──────────┬───────────┘   │
│  └──────────┘  └──────────┘             │               │
│                                          │               │
│  ┌───────────────────────────────────────▼────────────┐  │
│  │              Data Pipeline                          │  │
│  │  load stacks → search sources → dedup → AI analyze  │  │
│  │  → persist → notify (WS + Email)                   │  │
│  └───────────────────────────────────────┬────────────┘  │
│                                          │               │
│  ┌───────────────────────────────────────▼────────────┐  │
│  │           Data Sources (Promise.allSettled)         │  │
│  │  ┌──────┐ ┌───────┐ ┌────────┐ ┌──────────┐       │  │
│  │  │ NVD  │ │GitHub │ │ CIRCL  │ │ Security │       │  │
│  │  │ API  │ │Advisory│ │  CVE   │ │  Blogs   │       │  │
│  │  └──────┘ └───────┘ └────────┘ └──────────┘       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐                             │
│  │ Prisma   │  │  AI      │ (OpenAI-compatible API)     │
│  │ (SQLite) │  │ Service  │                             │
│  └──────────┘  └──────────┘                             │
└──────────────────────────────────────────────────────────┘
```

---

## 三、快速启动

### 前置条件

- Node.js >= 18
- AI API Key（OpenRouter / DeepSeek / OpenAI 任选一个）

### 1. 安装依赖

```bash
cd server && npm install
cd ../client && npm install
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入 AI 配置：

```env
# AI 模型配置
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.deepseek.com          # 或其他 OpenAI 兼容地址
AI_MODEL=deepseek-v4-flash                     # 模型名

# 数据库与服务器（默认即可）
DATABASE_URL="file:./dev.db"
PORT=3001
```

### 3. 初始化数据库

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 4. 启动服务

```bash
# 终端 1：后端 (端口 3001)
cd server && npm run dev

# 终端 2：前端 (端口 5173)
cd client && npm run dev
```

打开 **http://localhost:5173** 即可使用。

---

## 四、API 文档

### Tech Stacks

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/tech-stacks` | 获取所有技术栈（含漏洞数量） |
| POST | `/api/tech-stacks` | 创建技术栈 `{name, version?, category?}` |
| PUT | `/api/tech-stacks/:id` | 更新技术栈 |
| DELETE | `/api/tech-stacks/:id` | 删除技术栈（级联删除关联） |
| PATCH | `/api/tech-stacks/:id/toggle` | 切换激活/暂停 |

### Vulnerabilities

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/vulnerabilities` | 查询漏洞列表（分页 + 筛选） |
| GET | `/api/vulnerabilities/stats` | 统计：总数/今日/Critical/High/来源分布 |
| GET | `/api/vulnerabilities/:id` | 漏洞详情（含关联技术栈） |
| DELETE | `/api/vulnerabilities/:id` | 删除漏洞记录 |
| POST | `/api/check-vulnerabilities` | 手动触发全量扫描 |

**支持的查询参数：** `page`, `limit`, `source`（nvd/github/cve_circl/security_blog）, `severity`（critical/high/medium/low）, `techStackId`, `timeRange`（1h/today/7d/30d）, `sortBy`（cvssScore/severity/publishedAt/createdAt）, `sortOrder`（asc/desc）

### WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `vulnerability:new` | Server → Client | 发现新漏洞（按 tech-stack room 投递） |
| `notification` | Server → Client | 全局通知 |
| `subscribe` | Client → Server | 订阅 `["React", "PostgreSQL"]` |
| `unsubscribe` | Client → Server | 取消订阅 |

---

## 五、项目结构

```
vuln-pulse/
├── server/                         # Express 5 后端
│   ├── prisma/
│   │   └── schema.prisma           # 数据模型：TechStack / Vulnerability / Notification
│   └── src/
│       ├── index.ts                # 服务入口，路由挂载 + WebSocket + cron
│       ├── types.ts                # TypeScript 类型定义
│       ├── db.ts                   # Prisma 客户端单例
│       ├── routes/
│       │   ├── techStacks.ts       # 技术栈 CRUD API
│       │   ├── vulnerabilities.ts  # 漏洞查询/统计 API
│       │   ├── notifications.ts    # 通知管理 API
│       │   └── settings.ts         # 系统设置 API
│       ├── services/
│       │   ├── ai.ts               # AI 分析：CVSS 评分 + 版本匹配 + 修复建议
│       │   ├── nvd.ts              # NVD 漏洞数据库 API
│       │   ├── githubAdvisory.ts   # GitHub Security Advisories API
│       │   ├── cveOrg.ts           # CIRCL CVE 搜索 API
│       │   ├── securityBlogs.ts    # 安全博客 RSS 聚合
│       │   ├── vulnerabilitySearch.ts  # 多源聚合 + 去重
│       │   ├── twitter.ts          # 安全研究员 Twitter 监控（可选）
│       │   └── email.ts            # 邮件告警模板
│       ├── jobs/
│       │   └── vulnerabilityChecker.ts  # 定时巡检流水线
│       └── __tests__/
│           ├── vulnerabilityAnalysis.test.ts
│           └── vulnerabilitySorting.test.ts
├── client/                         # React 19 前端
│   └── src/
│       ├── App.tsx                 # 主应用：Dashboard + Tech Stacks 标签页
│       ├── services/
│       │   ├── api.ts              # REST API 客户端（TechStack / Vulnerability）
│       │   └── socket.ts           # WebSocket 客户端
│       ├── components/
│       │   ├── FilterSortBar.tsx   # 筛选/排序工具栏
│       │   └── ui/                 # UI 特效组件（Spotlight / Meteors / Beams）
│       └── utils/
│           ├── sortVulnerabilities.ts  # 客户端排序工具
│           └── relativeTime.ts         # 时间格式化
└── README.md
```

---

## 六、设计亮点

### AI 分析流水线

每条漏洞记录经过 AI 的 9 维分析：

| 维度 | 说明 |
|------|------|
| `isReal` | 是否为真实漏洞（排除误报/无关内容） |
| `relevance` | 与技术栈的相关性评分（0-100） |
| `cvssScore` | CVSS 3.1 评分（0.0-10.0） |
| `severity` | 严重度等级（none/low/medium/high/critical） |
| `exploitability` | 可利用性（none/poc/functional/high） |
| `affectedVersions` | 受影响版本范围 |
| `patchedVersion` | 修复版本 |
| `isAffected` | 是否影响用户的具体版本 |
| `matchConfidence` | AI 分析置信度（0-100） |

AI 模型与地址完全由环境变量控制，支持 OpenRouter / OpenAI / DeepSeek / Ollama 等任何 OpenAI 兼容 API。

### 多对多技术栈匹配

一个 CVE（如 OpenSSL 漏洞）可能同时影响 React、PostgreSQL、Nginx 等多个技术栈。系统使用 `TechStackVulnerability` 关联表存储每个配对的关系，包括是否受影响 + AI 匹配置信度。

---

## 七、许可证

MIT License
