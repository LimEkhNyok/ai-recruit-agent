# AI Recruit Agent — AI 驱动的智能招聘平台

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
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

平台通过对话式 AI 测评生成用户的人才画像，结合向量相似度 + Gemini 深度评分进行岗位匹配，提供 AI 模拟面试和个性化职业规划。

## 核心功能

| 功能 | 说明 |
|------|------|
| **AI 职业测评** | 对话式测评，AI 通过 10-15 轮自然对话全面分析用户的性格、能力、兴趣、价值观和工作风格 |
| **人才画像** | 基于测评对话生成结构化画像，包含 MBTI 性格类型、八大核心能力、八大兴趣倾向等多维度评分 |
| **智能岗位匹配** | 向量相似度初筛 + Gemini 深度评分，支持"突破认知推荐"——发现用户从未考虑过但非常适合的岗位 |
| **AI 模拟面试** | 针对目标岗位的 AI 面试官，支持 SSE 流式对话，面试结束后生成详细评估报告 |
| **职业生涯规划** | 基于画像和匹配结果，生成短/中/长期目标、技能提升路径、简历优化建议 |

## 技术栈

**后端：**
- Python 3.12 + FastAPI + Uvicorn
- SQLAlchemy (async) + aiomysql + MySQL
- OpenAI SDK（通过兼容接口调用 Gemini）
- JWT 认证（python-jose + passlib/bcrypt）
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
├── backend/                    # 后端 (FastAPI)
│   ├── app/
│   │   ├── api/                # API 路由
│   │   │   ├── auth.py         #   认证：注册/登录/获取用户信息
│   │   │   ├── assessment.py   #   测评：开始/对话/完成/获取画像
│   │   │   ├── matching.py     #   匹配：触发匹配/获取结果
│   │   │   ├── interview.py    #   面试：开始/对话(SSE)/结束/历史
│   │   │   ├── career.py       #   规划：生成/获取
│   │   │   └── deps.py         #   依赖注入（DB session, JWT 认证）
│   │   ├── models/             # SQLAlchemy ORM 模型
│   │   ├── schemas/            # Pydantic 请求/响应模型
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── gemini_service.py    # Gemini API 封装
│   │   │   ├── vector_service.py    # 向量相似度计算
│   │   │   ├── assessment_service.py
│   │   │   ├── matching_service.py
│   │   │   ├── interview_service.py
│   │   │   └── career_service.py
│   │   ├── prompts/            # AI Prompt 模板
│   │   ├── config.py           # 配置管理
│   │   ├── database.py         # 数据库连接
│   │   └── main.py             # FastAPI 入口
│   ├── seed_jobs.py            # 岗位种子数据导入脚本
│   ├── requirements.txt
│   └── .env                    # 环境变量（不提交到 Git）
├── frontend/                   # 前端 (React + Vite)
│   ├── src/
│   │   ├── api/                # API 请求封装
│   │   ├── components/         # 通用组件
│   │   ├── pages/              # 页面组件
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
- **Gemini API Key**（通过 sophnet 代理或 Google AI Studio 获取）

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

# 启动后端（首次启动会自动建表）
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
| `GEMINI_API_KEY` | Gemini API 密钥 | 你的 API Key |
| `GEMINI_BASE_URL` | API 代理地址 | `https://www.sophnet.com/api/open-apis/v1` |
| `GEMINI_MODEL` | 使用的模型名称 | `gemini-3-pro-preview` |
| `JWT_SECRET_KEY` | JWT 签名密钥，生产环境请更换 | `your-secret-key` |

## API 文档

启动后端后，访问以下地址查看自动生成的 API 文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

主要 API 端点：

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/auth/register` | 注册 |
| 认证 | `POST /api/auth/login` | 登录 |
| 认证 | `GET /api/auth/me` | 获取当前用户 |
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

## 使用流程

1. **注册/登录** → 创建账号并登录
2. **AI 测评** → 与 AI 进行 10-15 轮对话，完成后生成人才画像
3. **查看画像** → 查看雷达图和各维度详细分析
4. **岗位匹配** → AI 分析画像与 18 个岗位的匹配度，包含"突破认知推荐"
5. **模拟面试** → 选择感兴趣的岗位进行 AI 模拟面试，获得评估报告
6. **职业规划** → 获取个性化的短/中/长期职业规划和技能提升路径
