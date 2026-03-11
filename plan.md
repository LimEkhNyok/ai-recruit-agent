# AI Recruit Agent — 商业化工程实施计划

## 目录

- [背景和要求](#背景和要求)
- [实施步骤](#实施步骤)

---

## 背景和要求

### 项目现状

AI Recruit Agent 已完成 MVP 开发，包含以下功能模块：

- 用户认证（注册/登录/JWT）
- AI 职业测评（对话式测评 → 人才画像）
- 岗位匹配（向量相似度 + AI 深度评分，含突破认知推荐）
- AI 模拟面试（SSE 流式对话 → 评估报告）
- 职业规划（结合画像 + 匹配 + 刷题数据）
- 简历分析（上传 PDF/DOCX/TXT → AI 分析报告）
- 刷题练习（AI 出题/判题 + 记忆系统）

技术栈：后端 FastAPI + MySQL + OpenAI SDK（兼容接口）；前端 React + Vite + Ant Design + TailwindCSS。

### 商业化目标

将 MVP 升级为可商用的 BYOK（Bring Your Own Key）+ 平台托管双模式产品：

- **BYOK 模式**：用户自带 `api_key / base_url / model`，免费使用全部平台功能，模型费用户自己承担
- **平台 key 模式**：用户使用平台提供的默认模型配置，平台后续可收费（预充值/订阅/按量，先设计成可扩展）
- 两种模式全局二选一，不自动回退

### 核心改造需求

**1. 模型调用从全局单例改为用户级配置**

当前 `GeminiService` 是全局单例，读取 `.env` 中的 `GEMINI_API_KEY / GEMINI_BASE_URL / GEMINI_MODEL`。商用后每个用户有自己的配置，需要按用户实例化模型客户端。

关键文件：
- `backend/app/config.py` — 当前全局 Settings
- `backend/app/services/gemini_service.py` — 当前全局单例 GeminiService
- `backend/app/api/deps.py` — 当前只有 `get_db()` 和 `get_current_user()`

**2. API Key 加密存储**

用户的 API Key 必须服务端加密后存入数据库，前端只显示掩码，日志中不打印。加密使用 `cryptography.fernet` 对称加密，密钥从环境变量 `ENCRYPTION_KEY` 读取。

**3. 能力检测**

用户保存模型配置时，先检测该 provider/model 支持哪些能力（chat / stream / json / embedding）。不同功能对能力的依赖：
- 测评：`chat + json`
- 匹配：`chat + json + embedding`
- 面试：`chat + stream + json`
- 规划：`chat + json + embedding`
- 简历分析：`chat + json`
- 刷题：`chat + json`

如果不支持某能力，对应功能禁用并提示用户更换 provider/model，**不自动回退到平台 key**。

**4. 调用计量**

每次模型调用写入 `usage_records` 表，记录 user_id / mode / feature / model / tokens / latency / success。BYOK 只做统计不做代收，平台 key 模式的计费后续扩展。

**5. 基础安全加固**

- 接口频率限制（反滥用）
- 简历从内存 dict 改为数据库持久化
- 数据库迁移从 `create_all` 改为 Alembic
- 认证增强（refresh token）

**6. 前端新增页面**

- 模型设置页 `/settings`：填写/测试/保存模型配置，BYOK 与平台 key 切换
- 使用统计页 `/usage`：展示调用次数、tokens 数、花费
- 各功能页增加能力状态提示

### 关键约束

- 只支持 OpenAI-compatible 协议
- 每个用户只保存 1 套默认模型配置
- BYOK 仅做基础反滥用限制（并发、文件大小、异常频率），不做严格次数封顶
- embedding 不可用时，匹配和规划功能直接禁用
- 第一版不做团队账号、复杂账单系统、广告

---

## 实施步骤

### Phase 1: 数据库迁移基础设施

> 依赖：无。这是后续所有数据库 schema 变更的基础。

- [ ] 安装 Alembic：`pip install alembic`，加入 `requirements.txt`
- [ ] 初始化 Alembic：`alembic init alembic`，配置 `alembic.ini` 读取 `.env` 中的 `DATABASE_URL`
- [ ] 配置 `alembic/env.py` 支持 async engine，导入 `app.database.Base` 和所有 models
- [ ] 生成初始迁移脚本：`alembic revision --autogenerate -m "initial"`
- [ ] 验证 `alembic upgrade head` 能正常执行
- [ ] 修改 `main.py` lifespan：从 `run_sync(Base.metadata.create_all)` 改为启动时打印提示"请使用 alembic upgrade head 迁移数据库"

### Phase 2: 密钥加密工具

> 依赖：无。纯工具模块，不依赖其他改动。

- [ ] 在 `backend/app/config.py` 的 `Settings` 中新增 `ENCRYPTION_KEY: str = ""`
- [ ] 在 `.env` 和 `.env.example` 中添加 `ENCRYPTION_KEY`（32字节 base64 编码的 Fernet key）
- [ ] 创建 `backend/app/utils/crypto.py`
  - [ ] `encrypt_key(plain_text: str) -> str` — 使用 `cryptography.fernet.Fernet` 加密，返回密文字符串
  - [ ] `decrypt_key(cipher_text: str) -> str` — 解密，返回明文
  - [ ] `mask_key(plain_text: str) -> str` — 返回掩码字符串，如 `sk-xxxx...xxxx`（只显示前4后4位）
- [ ] 编写简单测试验证加解密正确性

### Phase 3: 用户模型配置（后端）

> 依赖：Phase 1（Alembic）、Phase 2（crypto 工具）

- [ ] 创建 `backend/app/models/model_config.py` — `UserModelConfig` ORM
  - [ ] 字段：id, user_id (unique), mode (`byok`/`platform`), base_url, model, api_key_encrypted, supports_chat, supports_stream, supports_json, supports_embedding, last_test_status, last_test_error, created_at, updated_at
  - [ ] 默认 mode 为 `platform`
- [ ] 在 `models/__init__.py` 中导入 `UserModelConfig`
- [ ] 生成 Alembic 迁移并执行
- [ ] 创建 `backend/app/schemas/model_config.py`
  - [ ] `ModelConfigSaveRequest`：mode, base_url, model, api_key（明文，仅传输用）
  - [ ] `ModelConfigResponse`：mode, base_url, model, api_key_masked, supports_chat/stream/json/embedding, last_test_status, last_test_error
  - [ ] `ModelConfigTestResponse`：supports_chat, supports_stream, supports_json, supports_embedding, errors
- [ ] 创建 `backend/app/api/model_config.py` — 模型配置路由
  - [ ] `GET /api/model-config` — 返回当前用户的模型配置（key 掩码显示）
  - [ ] `POST /api/model-config` — 保存配置（先测试再保存，key 加密后入库）
  - [ ] `POST /api/model-config/test` — 只测试不保存，返回能力检测结果
- [ ] 在 `main.py` 中挂载 model_config 路由

### Phase 4: 能力检测服务

> 依赖：Phase 3（UserModelConfig 模型和 API）

- [ ] 创建 `backend/app/services/capability_test.py`
  - [ ] `test_chat(client, model) -> bool` — 发送一条简单消息，检查是否能正常返回
  - [ ] `test_stream(client, model) -> bool` — 发送流式请求，检查是否能收到 chunk
  - [ ] `test_json(client, model) -> bool` — 要求返回 JSON，检查是否能正确解析
  - [ ] `test_embedding(client, model) -> bool` — 尝试调用 embedding 接口
  - [ ] `run_all_tests(base_url, api_key, model) -> dict` — 运行所有测试，返回 `{supports_chat, supports_stream, supports_json, supports_embedding, errors}`
- [ ] 所有测试带超时保护（10s），捕获所有异常不影响其他测试项
- [ ] 定义功能-能力映射常量 `FEATURE_REQUIREMENTS`：
  ```python
  FEATURE_REQUIREMENTS = {
      "assessment": ["chat", "json"],
      "matching": ["chat", "json", "embedding"],
      "interview": ["chat", "stream", "json"],
      "career": ["chat", "json", "embedding"],
      "resume": ["chat", "json"],
      "quiz": ["chat", "json"],
  }
  ```
- [ ] `get_available_features(config: UserModelConfig) -> dict[str, bool]` — 根据能力检测结果，返回每个功能是否可用

### Phase 5: 重构模型服务为用户级实例化

> 依赖：Phase 3（UserModelConfig）、Phase 4（能力检测）。这是最核心的改动。

- [ ] 重命名 `backend/app/services/gemini_service.py` 为 `backend/app/services/model_service.py`
  - [ ] 类名从 `GeminiService` 改为 `ModelService`
  - [ ] `__init__(self, base_url, api_key, model)` — 不再从全局 Settings 读取，而是接收参数
  - [ ] 保留所有方法签名不变：`chat()`, `chat_stream()`, `generate_json()`, `get_embedding()`
- [ ] 删除全局单例 `_instance` 和 `get_gemini_service()`
- [ ] 创建工厂函数 `get_model_service_for_user(user: User, db: AsyncSession) -> ModelService`
  - [ ] 查询 `UserModelConfig`，如果是 `byok` 模式则解密 key 创建实例
  - [ ] 如果是 `platform` 模式则使用 `.env` 中的平台默认配置创建实例
  - [ ] 如果用户没有配置，使用平台默认配置
- [ ] 在 `backend/app/api/deps.py` 中新增依赖 `get_model_service(user, db) -> ModelService`
- [ ] 批量更新所有 service 文件，将 `get_gemini_service()` 替换为从依赖注入获取 `ModelService`：
  - [ ] `assessment_service.py` — `start_assessment / chat / finish_assessment` 增加 `model_service` 参数
  - [ ] `matching_service.py` — `match` 增加 `model_service` 参数
  - [ ] `interview_service.py` — `start_interview / chat_stream / end_interview` 增加 `model_service` 参数
  - [ ] `career_service.py` — `generate_plan` 增加 `model_service` 参数
- [ ] 批量更新所有 API 路由文件，注入 `ModelService` 依赖并传递给 service 层：
  - [ ] `api/assessment.py`
  - [ ] `api/matching.py`
  - [ ] `api/interview.py`
  - [ ] `api/career.py`
  - [ ] `api/resume.py`
  - [ ] `api/quiz.py`
- [ ] 全局搜索确认无任何残留的 `get_gemini_service` 或 `GeminiService` 引用
- [ ] 重启后端，验证所有现有功能正常工作（先用 .env 的平台默认配置走完全流程）

### Phase 6: 调用计量系统

> 依赖：Phase 5（ModelService 重构完成后，才能在模型调用层统一插入计量逻辑）

- [ ] 创建 `backend/app/models/usage.py` — `UsageRecord` ORM
  - [ ] 字段：id, user_id, mode, feature, base_url, model, request_tokens, response_tokens, total_tokens, estimated_cost (nullable), success, error_message (nullable), latency_ms, created_at
- [ ] 在 `models/__init__.py` 中导入，生成 Alembic 迁移并执行
- [ ] 在 `ModelService` 中增加计量钩子：
  - [ ] 每次 `chat() / chat_stream() / generate_json() / get_embedding()` 调用结束后，收集 usage 数据（从 OpenAI response 中提取 `usage.prompt_tokens / completion_tokens`，如无则为 null）
  - [ ] 返回 `(result, usage_info)` 元组，或通过回调方式记录
- [ ] 创建 `backend/app/services/usage_service.py`
  - [ ] `log_usage(user_id, mode, feature, base_url, model, tokens_info, latency_ms, success, error)` — 写入 `usage_records`
  - [ ] `get_user_stats(user_id, db) -> dict` — 返回总调用次数、总 tokens、估算花费、按功能分类统计
  - [ ] `get_user_recent(user_id, db, limit) -> list` — 返回最近 N 条调用明细
- [ ] 创建 `backend/app/api/usage.py` — 使用统计路由
  - [ ] `GET /api/usage/stats` — 返回当前用户的使用统计摘要
  - [ ] `GET /api/usage/recent` — 返回最近调用明细
- [ ] 在 `main.py` 中挂载 usage 路由
- [ ] 验证：执行一次测评对话，检查 `usage_records` 表是否正确写入记录

### Phase 7: 功能可用性网关

> 依赖：Phase 4（能力检测结果）、Phase 5（用户级 ModelService）

- [ ] 创建 `backend/app/api/deps.py` 中的功能守卫依赖：
  - [ ] `require_feature(feature_name: str)` — 返回一个 FastAPI Depends，检查当前用户的模型配置是否支持该功能，不支持则返回 `403 + 明确错误信息`（如"当前模型不支持 embedding，无法使用匹配功能，请在模型设置中更换 provider/model"）
- [ ] 在各 API 路由中注入功能守卫：
  - [ ] `api/assessment.py` 的所有端点：`Depends(require_feature("assessment"))`
  - [ ] `api/matching.py`：`Depends(require_feature("matching"))`
  - [ ] `api/interview.py`：`Depends(require_feature("interview"))`
  - [ ] `api/career.py`：`Depends(require_feature("career"))`
  - [ ] `api/resume.py`：`Depends(require_feature("resume"))`
  - [ ] `api/quiz.py`：`Depends(require_feature("quiz"))`
- [ ] 新增 `GET /api/model-config/features` — 返回当前用户各功能的可用状态 `{assessment: true, matching: false, ...}`
- [ ] 验证：模拟一个不支持 embedding 的配置，确认匹配/规划返回 403 + 正确提示

### Phase 8: 简历持久化

> 依赖：Phase 1（Alembic）。独立于模型重构，可并行开发。

- [ ] 创建 `backend/app/models/resume.py` — `Resume` ORM
  - [ ] 字段：id, user_id, filename, text_content (TEXT), file_size, analysis (JSON, nullable), created_at
- [ ] 在 `models/__init__.py` 中导入，生成 Alembic 迁移并执行
- [ ] 重写 `backend/app/api/resume.py`：
  - [ ] `upload` — 从内存 `_resume_store` 改为写入 `resumes` 表
  - [ ] `analyze` — 从数据库读取简历文本，分析结果也写回 `analysis` 字段
  - [ ] 删除全局 `_resume_store` dict
- [ ] 验证上传 + 分析流程仍正常工作

### Phase 9: 基础安全加固

> 依赖：Phase 1（Alembic，用于 refresh_token 表）。独立于模型重构。

- [ ] 安装 `slowapi`，加入 `requirements.txt`
- [ ] 在 `main.py` 中配置全局频率限制：
  - [ ] 默认限制：每分钟 60 次请求
  - [ ] AI 相关接口限制：每分钟 10 次
  - [ ] 文件上传限制：每分钟 5 次
- [ ] 认证增强 — Refresh Token：
  - [ ] 创建 `backend/app/models/refresh_token.py` — `RefreshToken` ORM（id, user_id, token, expires_at, created_at）
  - [ ] 修改 `api/auth.py`：
    - [ ] `POST /api/auth/login` 和 `POST /api/auth/register` 返回 `{access_token, refresh_token}`
    - [ ] 新增 `POST /api/auth/refresh` — 用 refresh_token 换新 access_token
  - [ ] 修改 `schemas/auth.py`：`TokenResponse` 增加 `refresh_token` 字段
- [ ] 修改前端 `src/api/client.js`：401 时先尝试用 refresh_token 换新 token，失败才跳登录
- [ ] 修改前端 `src/store/useAuthStore.js`：存储和管理 refresh_token

### Phase 10: 前端 — 模型设置页

> 依赖：Phase 3（后端模型配置 API）、Phase 4（能力检测 API）

- [ ] 创建 `frontend/src/api/modelConfig.js`
  - [ ] `getConfig()` — 获取当前配置
  - [ ] `saveConfig(data)` — 保存配置
  - [ ] `testConfig(data)` — 测试配置
  - [ ] `getFeatures()` — 获取功能可用状态
- [ ] 创建 `frontend/src/pages/SettingsPage.jsx` — 模型设置页
  - [ ] 顶部：模式切换（Radio：`使用自己的 API Key` / `使用平台提供的服务`）
  - [ ] BYOK 模式下显示表单：Base URL 输入框、Model 输入框、API Key 输入框（password 类型）
  - [ ] "测试连接"按钮 — 调用 test 接口，实时展示 4 项能力检测结果（chat/stream/json/embedding 的通过/失败状态）
  - [ ] "保存配置"按钮 — 测试通过后才允许保存
  - [ ] 底部：功能可用性矩阵 — 根据能力检测结果显示每个功能（测评/匹配/面试/规划/简历/刷题）是否可用
  - [ ] 平台 key 模式下：显示"使用平台默认模型，无需配置"提示，所有功能默认可用
- [ ] 更新 `frontend/src/components/Layout.jsx` — 导航栏新增"设置"菜单项
- [ ] 更新 `frontend/src/App.jsx` — 添加 `/settings` 路由

### Phase 11: 前端 — 使用统计页

> 依赖：Phase 6（后端使用统计 API）

- [ ] 创建 `frontend/src/api/usage.js`
  - [ ] `getStats()` — 获取统计摘要
  - [ ] `getRecent(limit)` — 获取最近调用明细
- [ ] 创建 `frontend/src/pages/UsagePage.jsx` — 使用统计页
  - [ ] 顶部统计卡片：总调用次数、总 Tokens 消耗、估算花费、当前模式
  - [ ] 按功能分类统计表（测评/匹配/面试/规划/简历/刷题各多少次）
  - [ ] 最近调用明细列表（时间、功能、模型、tokens、耗时、成功/失败）
- [ ] 更新 `Layout.jsx` — 导航栏新增"统计"菜单项
- [ ] 更新 `App.jsx` — 添加 `/usage` 路由

### Phase 12: 前端 — 功能能力提示

> 依赖：Phase 7（后端功能可用性 API）、Phase 10（前端模型设置页已存在）

- [ ] 创建 `frontend/src/hooks/useFeatureGuard.js` — 自定义 Hook
  - [ ] 调用 `GET /api/model-config/features` 获取功能可用状态
  - [ ] 如果当前功能不可用，显示友好提示卡片并引导用户前往设置页
- [ ] 在以下页面的顶部引入 `useFeatureGuard`：
  - [ ] `AssessmentPage.jsx` — `useFeatureGuard("assessment")`
  - [ ] `MatchingPage.jsx` — `useFeatureGuard("matching")`
  - [ ] `InterviewPage.jsx` — `useFeatureGuard("interview")`
  - [ ] `CareerPlanPage.jsx` — `useFeatureGuard("career")`
  - [ ] `QuizPage.jsx` — `useFeatureGuard("quiz")`
- [ ] 当功能不可用时，页面显示提示卡片：
  - [ ] 提示文字："当前模型配置不支持此功能（缺少 xxx 能力），请前往设置页更换 provider/model"
  - [ ] 提供"前往设置"按钮

### Phase 13: 新用户引导流程

> 依赖：Phase 10（模型设置页）、Phase 12（功能能力提示）

- [ ] 修改 `frontend/src/pages/HomePage.jsx`：
  - [ ] 检查用户是否已配置模型（调用 `GET /api/model-config`）
  - [ ] 未配置时：首页顶部显示引导卡片"请先配置模型以使用平台功能"，带"前往设置"按钮
  - [ ] 已配置时：显示当前模式（BYOK / 平台托管）和功能可用状态
- [ ] 修改 `frontend/src/components/ProtectedRoute.jsx`：
  - [ ] 登录后如果用户没有模型配置，自动跳转到 `/settings`（仅首次）

### Phase 14: 集成测试与收尾

> 依赖：Phase 1-13 全部完成

- [ ] 全流程联调测试（BYOK 模式）：
  - [ ] 注册 → 首次引导到设置页 → 填写 BYOK 配置 → 测试通过 → 保存
  - [ ] 测评对话 → 生成画像 → 触发匹配 → 查看结果 → 选岗面试 → 面试评估 → 生成规划
  - [ ] 上传简历 → 简历分析
  - [ ] 刷题 → 查看刷题统计
  - [ ] 查看使用统计页
- [ ] 全流程联调测试（平台 key 模式）：
  - [ ] 设置页切换到平台 key 模式 → 所有功能正常可用
- [ ] 边界情况测试：
  - [ ] 不支持 embedding 的配置 → 匹配/规划被禁用 → 提示正确
  - [ ] 不支持 stream 的配置 → 面试被禁用 → 提示正确
  - [ ] 配置无效 key → 测试失败 → 不允许保存
  - [ ] 高频请求 → 触发限流 → 返回 429
- [ ] 更新 `README.md`：补充模型设置、BYOK/平台 key 双模式说明
- [ ] 更新 `.env.example`：补充 `ENCRYPTION_KEY` 说明
- [ ] Git 提交："第二版 — BYOK 商业化"
