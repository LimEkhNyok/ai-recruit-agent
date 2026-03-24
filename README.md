# CodeToWork — AI-powered all-in-one career platform   AI 驱动的一站式智能求职平台

已上线！It's live！https://codetowork.net

Career Assessment | Job Recommendation | Career Planning | Mock Interview | Coding Practice | Resume Analysis
职业测评 | 岗位推荐 | 生涯规划 | 模拟面试 | 刷题练习 | 简历分析
---

## 项目简介

**CodeToWork** 是一个 AI 驱动的一站式求职平台，核心理念是 **"从匹配到发现"** —— 不仅帮助用户匹配已知的职业方向，更通过 AI 发现你从未想过但非常适合的职业可能。

面向所有求职者：应届生、转码人士、职业转型者，无论你的背景如何，CodeToWork 都能为你提供个性化的求职支持。

## 核心功能

### 1. AI 职业测评
对话式智能测评，AI 通过 10-15 轮自然对话全面分析你的性格、能力、兴趣和价值观，生成包含 MBTI、核心能力雷达图等多维度的人才画像。

### 2. 智能岗位推荐
向量相似度初筛 + AI 深度评分双引擎匹配，不仅推荐高匹配岗位，还支持 **"突破认知推荐"** —— 发现你可能忽略但非常适合的方向。

### 3. 生涯规划
结合人才画像和匹配结果，AI 为你生成短期/中期/长期职业目标、技能提升路径和简历优化建议。

### 4. AI 模拟面试
针对目标岗位的 AI 面试官，支持 SSE 流式实时对话和语音输入，面试结束后生成详细评估报告和过程点评。支持粘贴心仪岗位 JD 进行针对性面试。

### 5. 刷题练习
知识点驱动的 AI 出题/判题系统，覆盖数据结构、算法、操作系统、计算机网络等领域共 31+ 知识点，内置掌握度追踪和薄弱点分析，答错自动举一反三。

### 6. 简历分析
上传 PDF / DOCX / TXT 格式简历，AI 生成结构化分析报告，指出优劣势和改进建议。

### 更多特性

- **成就系统** — 20+ 成就徽章，含隐藏成就，激励持续学习
- **中英双语** — 全站 i18n 支持，AI 生成内容跟随语言设置
- **明暗切换** — 暗色亮色主题支持手动切换
- **使用统计** — 调用次数、Token 消耗、按功能分类统计

## 技术架构

### 后端

| 技术 | 用途 |
|------|------|
| **Python 3.12 + FastAPI** | Web 框架，异步高性能 |
| **SQLAlchemy 2.0 (async) + aiomysql** | 异步 ORM + MySQL 驱动 |
| **Alembic** | 数据库版本迁移 |
| **OpenAI SDK** | 兼容任意 OpenAI compatible API |
| **JWT + Refresh Token** | 双令牌认证体系 |
| **Fernet 对称加密** | 用户 API Key 加密存储 |
| **Redis** | 速率限制持久化、验证码存储 |
| **NumPy** | 向量相似度计算 |

### 前端

| 技术 | 用途 |
|------|------|
| **React 19 + Vite 7** | 构建框架 |
| **Ant Design 6 + TailwindCSS 4** | UI 组件 + 原子化样式 |
| **Zustand** | 轻量状态管理 |
| **ECharts** | 雷达图等数据可视化 |
| **Motion** | 页面过渡动画 |
| **Web Speech API + Whisper** | 语音输入（浏览器原生 + API 回退） |

### 部署

| 组件 | 说明 |
|------|------|
| **AWS EC2** | 云服务器 |
| **Nginx** | 反向代理 + 静态文件 |
| **Let's Encrypt** | HTTPS 证书自动续期 |
| **Systemd** | 后端进程管理 |

## 项目结构

```
CodeToWork/
├── backend/
│   ├── alembic/                 # 数据库迁移
│   │   └── versions/            #   12 个迁移版本
│   ├── app/
│   │   ├── api/                 # API 路由（12 个模块）
│   │   │   ├── auth.py          #   注册 / 登录 / 刷新令牌 / 重置密码
│   │   │   ├── assessment.py    #   职业测评
│   │   │   ├── matching.py      #   岗位推荐
│   │   │   ├── interview.py     #   模拟面试（SSE 流式）
│   │   │   ├── career.py        #   生涯规划
│   │   │   ├── resume.py        #   简历上传 / 分析
│   │   │   ├── quiz.py          #   刷题出题 / 判题
│   │   │   ├── speech.py        #   语音识别
│   │   │   ├── model_config.py  #   模型配置 / 能力检测
│   │   │   ├── achievement.py   #   成就系统
│   │   │   ├── usage.py         #   使用统计
│   │   │   └── billing.py       #   账户积分
│   │   ├── models/              # ORM 模型（16 张表）
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   ├── services/            # 业务逻辑层（17 个服务）
│   │   ├── prompts/             # AI Prompt 模板
│   │   ├── middleware/          # 中间件（速率限制、安全响应头）
│   │   ├── utils/               # 工具（加解密、翻译）
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   └── main.py              # FastAPI 入口
│   ├── requirements.txt
│   └── .env.example             # 环境变量模板
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios 请求封装（含自动刷新 Token）
│   │   ├── components/          # 通用组件（30+）
│   │   ├── pages/               # 页面组件（13 个页面）
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── store/               # Zustand 状态管理（5 个 Store）
│   │   ├── i18n/                # 国际化（中 / 英）
│   │   ├── App.jsx              # 路由定义
│   │   └── main.jsx             # 入口
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 环境要求

- **Python** 3.12+
- **Node.js** 18+
- **MySQL** 8.0+
- **Redis**（可选，用于持久化速率限制）
- **API Key** — 任何 OpenAI 兼容协议的 provider（Google AI Studio、OpenRouter 等）

## 本地启动

### 1. 数据库准备

```sql
CREATE DATABASE ai_recruit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 后端启动

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库连接串、API Key 等（见下方环境变量说明）

# 生成 ENCRYPTION_KEY（用于加密用户 API Key）
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# 将输出的 key 填入 .env 的 ENCRYPTION_KEY

# 数据库迁移
alembic upgrade head

# 导入岗位种子数据（仅首次）
python seed_jobs.py

# 启动
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. 前端启动

```bash
cd frontend

npm install
npm run dev
```

访问 http://localhost:5173 即可使用。

> Vite 已配置 proxy，`/api` 请求自动转发到后端 `http://localhost:8000`。

## 环境变量说明

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | MySQL 异步连接串，如 `mysql+aiomysql://root:password@localhost:3306/ai_recruit` | 是 |
| `JWT_SECRET_KEY` | JWT 签名密钥，生产环境务必使用强随机值 | 是 |
| `ENCRYPTION_KEY` | 用户 API Key 加密密钥（Fernet），生成方式见上方 | 是 |
| `GEMINI_API_KEY` | 默认模型 API Key | 是 |
| `GEMINI_BASE_URL` | 默认模型 API 地址 | 是 |
| `GEMINI_MODEL` | 默认模型名称 | 是 |
| `REDIS_URL` | Redis 连接串，如 `redis://localhost:6379/0` | 否 |
| `SMTP_HOST` | 邮件服务地址（用于验证码） | 否 |
| `SMTP_PORT` | 邮件服务端口 | 否 |
| `SMTP_USERNAME` | 邮件账户 | 否 |
| `SMTP_PASSWORD` | 邮件密码 | 否 |

> **注意**：`ENCRYPTION_KEY` 一旦设定不可更改，否则已存储的用户 API Key 将无法解密。

## API 端点

启动后端后访问 http://localhost:8000/docs 查看完整 Swagger 文档。

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/auth/register` | 邮箱验证码注册 |
| 认证 | `POST /api/auth/login` | 登录 |
| 认证 | `POST /api/auth/refresh` | 刷新令牌 |
| 认证 | `POST /api/auth/reset-password` | 重置密码 |
| 测评 | `POST /api/assessment/start` | 开始测评 |
| 测评 | `POST /api/assessment/chat` | 测评对话 |
| 测评 | `POST /api/assessment/finish` | 生成画像 |
| 推荐 | `POST /api/matching/match` | 触发岗位匹配 |
| 推荐 | `GET /api/matching/results` | 获取匹配结果 |
| 面试 | `POST /api/interview/start` | 开始面试 |
| 面试 | `POST /api/interview/chat` | 面试对话（SSE） |
| 面试 | `POST /api/interview/end` | 结束并生成报告 |
| 规划 | `POST /api/career/generate` | 生成职业规划 |
| 简历 | `POST /api/resume/upload` | 上传简历 |
| 简历 | `POST /api/resume/analyze` | AI 分析简历 |
| 刷题 | `POST /api/quiz/generate` | AI 出题 |
| 刷题 | `POST /api/quiz/judge` | AI 判题 |
| 语音 | `POST /api/speech/transcribe` | 语音转文字 |
| 设置 | `GET /api/model-config/features` | 功能可用状态 |
| 统计 | `GET /api/usage/stats` | 使用统计 |

## 使用流程

1. **注册账号** → 邮箱验证码注册
2. **配置模型** → 填写 API Key（支持任意 OpenAI 兼容 API）
3. **AI 测评** → 与 AI 进行 10-15 轮对话
4. **查看画像** → 雷达图 + 多维度分析
5. **岗位推荐** → 匹配推荐 + 突破认知推荐
6. **模拟面试** → 选择岗位或粘贴 JD，语音/文字作答
7. **生涯规划** → 个性化职业路径
8. **简历分析** → 上传简历获取改进建议
9. **刷题练习** → 知识点驱动，掌握度追踪

## License

MIT
