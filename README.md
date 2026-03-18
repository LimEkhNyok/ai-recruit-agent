# AI Recruit Agent — AI 驱动的智能招聘平台
已上线！It's live！http://13.214.147.27

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [模型配置：BYOK 与平台托管双模式](#模型配置byok-与平台托管双模式)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [本地启动步骤](#本地启动步骤)
  - [1. 数据库准备](#1-数据库准备)
  - [2. 后端启动](#2-后端启动)
  - [3. 前端启动](#3-前端启动)
- [环境变量说明](#环境变量说明)
- [API 文档](#api-文档)
- [使用流程](#使用流程)

---

## 项目简介

**AI Recruit Agent** 是一个 AI 驱动的智能招聘平台，核心理念是 **"从匹配到发现"** —— 不仅帮助用户匹配已知的职业方向，更通过 AI 帮助用户发现从未想过但非常适合的职业可能。

平台支持 **BYOK（Bring Your Own Key）** 和 **平台托管** 双模式：用户可自带 API Key 使用任意 OpenAI 兼容模型，也可使用平台提供的默认模型。

## 核心功能

| 功能 | 说明 | 依赖能力 |
|------|------|----------|
| **AI 职业测评** | 对话式测评，AI 通过 10-15 轮自然对话全面分析性格、能力、兴趣和价值观 | chat + json |
| **人才画像** | 基于测评对话生成结构化画像，含 MBTI、核心能力、兴趣倾向等多维度评分 | — |
| **智能岗位匹配** | 向量相似度初筛 + AI 深度评分，支持"突破认知推荐" | chat + json + embedding |
| **AI 模拟面试** | 针对目标岗位的 AI 面试官，SSE 流式对话，面试后生成评估报告 | chat + stream + json |
| **职业生涯规划** | 结合画像和匹配结果，生成短/中/长期目标、技能路径和简历优化建议 | chat + json + embedding |
| **简历分析** | 上传 PDF/DOCX/TXT 简历，AI 生成分析报告 | chat + json |
| **刷题练习** | AI 出题/判题 + 记忆系统 | chat + json |
| **使用统计** | 调用次数、Tokens 消耗、按功能分类统计 | — |
| **模型设置** | BYOK/平台托管模式切换、能力检测、连接测试 | — |

## 模型配置：BYOK 与平台托管双模式

平台支持两种模型使用模式，全局二选一：

### BYOK 模式（自带 API Key）

- 用户自行填写 `API Key`、`Base URL`、`Model`
- 支持任何 **OpenAI 兼容协议** 的 API 提供商
- 保存前自动检测 4 项能力：**chat / stream / json / embedding**
- API Key 服务端加密存储（Fernet 对称加密），前端仅显示掩码
- 模型费用由用户自己承担，平台只做调用统计

### 平台托管模式

- 使用平台预配置的默认模型，用户无需填写任何配置
- 所有功能开箱即用

### 能力检测与功能可用性

不同功能依赖不同的模型能力，若当前模型不支持某项能力，对应功能将被禁用并给出明确提示：

| 能力 | 影响的功能 |
|------|-----------|
| embedding 不可用 | 岗位匹配、职业规划 被禁用 |
| stream 不可用 | 模拟面试 被禁用 |
| chat 不可用 | 所有 AI 功能 被禁用 |

用户可前往 **设置页** 更换 provider/model 以获得完整功能支持。

## 技术栈

**后端：**
- Python 3.12 + FastAPI + Uvicorn
- SQLAlchemy (async) + aiomysql + MySQL
- Alembic（数据库迁移）
- OpenAI SDK（兼容接口，支持多 provider）
- cryptography（用户 API Key 加密存储）
- JWT 认证（python-jose + passlib/bcrypt，含 Refresh Token）
- slowapi（接口频率限制）
- NumPy（向量相似度计算）

**前端：**
- React 19 + Vite 7
- Ant Design 6 + TailwindCSS 4
- Zustand（状态管理）
- ECharts（雷达图等数据可视化）
- React Router 7

## 项目结构

```
ai-recruit-agent/
├── backend/
│   ├── alembic/                # Alembic 数据库迁移
│   │   └── versions/           #   迁移脚本
│   ├── alembic.ini             # Alembic 配置
│   ├── app/
│   │   ├── api/                # API 路由
│   │   │   ├── auth.py         #   认证：注册/登录/刷新令牌
│   │   │   ├── assessment.py   #   测评：开始/对话/完成/获取画像
│   │   │   ├── matching.py     #   匹配：触发匹配/获取结果
│   │   │   ├── interview.py    #   面试：开始/对话(SSE)/结束/历史
│   │   │   ├── career.py       #   规划：生成/获取
│   │   │   ├── resume.py       #   简历：上传/分析
│   │   │   ├── quiz.py         #   刷题：出题/判题/统计
│   │   │   ├── model_config.py #   模型配置：获取/保存/测试/功能状态
│   │   │   ├── usage.py        #   使用统计：摘要/明细
│   │   │   └── deps.py         #   依赖注入（DB、认证、ModelService、功能守卫）
│   │   ├── middleware/         # 中间件
│   │   │   └── rate_limit.py   #   接口频率限制
│   │   ├── models/             # SQLAlchemy ORM 模型
│   │   │   ├── user.py         #   用户
│   │   │   ├── model_config.py #   用户模型配置
│   │   │   ├── usage.py        #   调用计量记录
│   │   │   ├── resume.py       #   简历
│   │   │   ├── refresh_token.py#   刷新令牌
│   │   │   └── ...             #   测评/匹配/面试/规划/刷题等
│   │   ├── schemas/            # Pydantic 请求/响应模型
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── model_service.py     # 模型服务（用户级实例化）
│   │   │   ├── capability_test.py   # 模型能力检测
│   │   │   ├── usage_service.py     # 调用计量
│   │   │   ├── vector_service.py    # 向量相似度计算
│   │   │   ├── assessment_service.py
│   │   │   ├── matching_service.py
│   │   │   ├── interview_service.py
│   │   │   └── career_service.py
│   │   ├── utils/              # 工具模块
│   │   │   └── crypto.py       #   API Key 加解密/掩码
│   │   ├── prompts/            # AI Prompt 模板
│   │   ├── config.py           # 配置管理
│   │   ├── database.py         # 数据库连接
│   │   └── main.py             # FastAPI 入口
│   ├── seed_jobs.py            # 岗位种子数据导入脚本
│   ├── requirements.txt
│   └── .env                    # 环境变量（不提交到 Git）
├── frontend/
│   ├── src/
│   │   ├── api/                # API 请求封装
│   │   │   ├── client.js       #   Axios 实例（含 Refresh Token 拦截器）
│   │   │   ├── modelConfig.js  #   模型配置 API
│   │   │   ├── usage.js        #   使用统计 API
│   │   │   └── ...             #   认证/测评/匹配/面试等
│   │   ├── components/         # 通用组件
│   │   │   ├── Layout.jsx      #   页面布局与导航
│   │   │   ├── ProtectedRoute.jsx  # 路由守卫（含新用户引导）
│   │   │   ├── FeatureGuard.jsx    # 功能能力守卫
│   │   │   └── ...
│   │   ├── hooks/              # 自定义 Hooks
│   │   │   └── useFeatureGuard.js  # 功能可用性检测 Hook
│   │   ├── pages/              # 页面组件
│   │   │   ├── SettingsPage.jsx    # 模型设置页
│   │   │   ├── UsagePage.jsx       # 使用统计页
│   │   │   └── ...
│   │   ├── store/              # Zustand 状态管理
│   │   ├── App.jsx             # 路由定义
│   │   └── main.jsx            # 入口
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 环境要求

- **Python** 3.12+
- **Node.js** 18+
- **MySQL** 8.0+
- **API Key**（任何 OpenAI 兼容协议的 provider 均可，如 Google AI Studio、OpenRouter 等）

## 本地启动步骤

### 1. 数据库准备

确保 MySQL 服务已启动，然后创建数据库：

```sql
CREATE DATABASE ai_recruit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 安装 Python 依赖（网速慢可加清华镜像）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 配置环境变量
# 复制 .env.example 为 .env，填入你的配置（见下方环境变量说明）
cp .env.example .env

# 生成 ENCRYPTION_KEY（用于加密用户 API Key）
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# 将输出的 key 填入 .env 的 ENCRYPTION_KEY

# 执行数据库迁移
alembic upgrade head

# 启动后端
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 导入岗位种子数据（另开一个终端，只需执行一次）
python seed_jobs.py
```

后端启动后访问 http://localhost:8000/docs 可查看 Swagger API 文档。

### 3. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端启动后访问 http://localhost:5173 即可使用。

> 前端 Vite 已配置 proxy，`/api` 请求会自动转发到后端 `http://localhost:8000`。

## 环境变量说明

后端环境变量配置在 `backend/.env` 文件中：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | MySQL 异步连接串 | `mysql+aiomysql://root:password@localhost:3306/ai_recruit` |
| `REDIS_URL` | Redis 连接串（预留） | `redis://localhost:6379/0` |
| `GEMINI_API_KEY` | 平台默认模型的 API Key | 你的 API Key |
| `GEMINI_BASE_URL` | 平台默认模型的 API 地址 | `https://www.sophnet.com/api/open-apis/v1` |
| `GEMINI_MODEL` | 平台默认使用的模型名称 | `gemini-3-pro-preview` |
| `ENCRYPTION_KEY` | 用户 API Key 加密密钥（Fernet，见上方生成方式） | `base64编码的32字节密钥` |
| `JWT_SECRET_KEY` | JWT 签名密钥，生产环境请更换 | `your-secret-key` |

> **注意**：`ENCRYPTION_KEY` 一旦设定不可更改，否则已存储的用户 API Key 将无法解密。

## API 文档

启动后端后，访问以下地址查看自动生成的 API 文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

主要 API 端点：

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/auth/register` | 注册（返回 access_token + refresh_token） |
| 认证 | `POST /api/auth/login` | 登录 |
| 认证 | `POST /api/auth/refresh` | 刷新令牌 |
| 认证 | `GET /api/auth/me` | 获取当前用户 |
| 模型配置 | `GET /api/model-config` | 获取当前用户的模型配置 |
| 模型配置 | `POST /api/model-config` | 保存模型配置（自动检测能力） |
| 模型配置 | `POST /api/model-config/test` | 测试连接（不保存） |
| 模型配置 | `GET /api/model-config/features` | 获取各功能可用状态 |
| 测评 | `POST /api/assessment/start` | 开始测评 |
| 测评 | `POST /api/assessment/chat` | 测评对话 |
| 测评 | `POST /api/assessment/finish` | 生成画像 |
| 测评 | `GET /api/assessment/profile` | 获取画像 |
| 匹配 | `POST /api/matching/match` | 触发匹配 |
| 匹配 | `GET /api/matching/results` | 获取结果 |
| 面试 | `POST /api/interview/start` | 开始面试 |
| 面试 | `POST /api/interview/chat` | 面试对话（SSE） |
| 面试 | `POST /api/interview/end` | 结束面试 |
| 面试 | `GET /api/interview/history` | 面试历史 |
| 规划 | `POST /api/career/generate` | 生成规划 |
| 规划 | `GET /api/career/plan` | 获取规划 |
| 简历 | `POST /api/resume/upload` | 上传简历 |
| 简历 | `POST /api/resume/analyze` | 分析简历 |
| 刷题 | `POST /api/quiz/generate` | AI 出题 |
| 刷题 | `POST /api/quiz/judge` | AI 判题 |
| 使用统计 | `GET /api/usage/stats` | 使用统计摘要 |
| 使用统计 | `GET /api/usage/recent` | 最近调用明细 |

## 使用流程

1. **注册/登录** → 创建账号并登录
2. **模型设置**（首次登录自动引导） → 选择 BYOK 或平台托管模式，BYOK 需填写 API Key 并通过能力检测
3. **AI 测评** → 与 AI 进行 10-15 轮对话，完成后生成人才画像
4. **查看画像** → 查看雷达图和各维度详细分析
5. **岗位匹配** → AI 分析画像与岗位的匹配度，包含"突破认知推荐"
6. **模拟面试** → 选择感兴趣的岗位进行 AI 模拟面试，获得评估报告
7. **职业规划** → 获取个性化的短/中/长期职业规划和技能提升路径
8. **简历分析** → 上传简历获取 AI 分析报告
9. **刷题练习** → AI 出题练习，巩固知识
10. **使用统计** → 查看调用次数和 Tokens 消耗
