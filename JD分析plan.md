# JD 分析 → 针对性模拟面试

## 背景和要求

### 背景
现有岗位匹配模块基于用户人才画像推荐预设岗位，但缺少与真实招聘需求的联动。用户无法针对具体的目标岗位进行准备。新增"粘贴目标岗位 JD"功能，AI 分析 JD 提取考点后直接进入针对性模拟面试，形成"JD 分析 → 定向面试"的完整闭环。

### 要求
- 功能要求：
  - 岗位匹配页新增"粘贴目标岗位 JD"文本区域
  - AI 分析 JD 提取：技术栈要求、核心能力要求、加分项等
  - 以结构化列表展示分析结果
  - 提供"针对此岗位模拟面试"入口，跳转到面试页
  - 面试流程复用现有模块，JD 上下文通过 `jd_context` 字段传递
- 技术约束：
  - 不在 `JobPosition` 表中创建记录，JD 信息存储在 `Interview` 表的 `jd_context` JSON 字段中
  - `Interview.job_id` 允许为空（nullable），JD 面试时 `job_id=NULL`
  - 面试结束后 `jd_context` 保留，供历史记录回看
  - `interview_service` 通过 if/else 分支区分预设岗位面试和 JD 面试
- 兼容性要求：
  - 现有预设岗位面试流程不受影响
  - 面试评估、历史记录等功能对两种面试类型统一支持

## 实施步骤

### Phase 1: 后端数据库与模型变更

- [ ] 修改 `Interview` 模型，支持 JD 面试
  - [ ] 在 `backend/app/models/interview.py` 中，将 `job_id` 字段改为 nullable（`nullable=True`）
  - [ ] 新增 `jd_context` 字段（`Column(JSON, nullable=True)`），用于存储 AI 提取的 JD 结构化信息
- [ ] 创建数据库迁移脚本
  - [ ] 使用 alembic 生成迁移文件，修改 `interviews` 表：`job_id` 改为 nullable，新增 `jd_context` 列

### Phase 2: 后端 JD 分析接口

- [ ] 新增 JD 分析提示词
  - [ ] 在 `backend/app/prompts/` 下新建 `jd_analysis.py`，编写 JD 分析的 system prompt
  - [ ] 提示词指导 AI 从 JD 文本中提取：职位名称、技术栈要求（列表）、核心能力要求（列表）、加分项（列表）、工作职责摘要
  - [ ] 输出格式为 JSON：`{ "title", "tech_stack", "key_points", "requirements", "bonus", "responsibilities" }`
  - [ ] 支持中英文双语版本
- [ ] 新增 JD 分析 API 端点
  - [ ] 在 `backend/app/api/matching.py` 中新增 `POST /api/matching/analyze-jd` 端点
  - [ ] 接收参数：`{ "jd_text": "..." }`
  - [ ] 调用 `model_service.generate_json()` 解析 JD 文本
  - [ ] 返回结构化分析结果
- [ ] 新增 JD 分析的 schema
  - [ ] 在 `backend/app/schemas/matching.py` 中新增 `JDAnalyzeRequest`（jd_text: str）和 `JDAnalyzeResponse`

### Phase 3: 后端面试流程适配

- [ ] 修改面试启动逻辑，支持 JD 面试
  - [ ] 在 `backend/app/schemas/interview.py` 中修改 `InterviewStartRequest`，`job_id` 改为 `Optional[int]`，新增 `jd_context: Optional[dict]`
  - [ ] 在 `backend/app/api/interview.py` 的 `start` 端点中：当 `job_id` 为空且 `jd_context` 存在时，走 JD 面试分支
  - [ ] 在 `backend/app/services/interview_service.py` 的 `start_interview()` 中：
    - 新增参数 `jd_context: dict | None`
    - 当 `jd_context` 存在时，从中提取 title、tech_stack 等信息构建 system prompt，不查询 `JobPosition`
    - 创建 Interview 记录时 `job_id=None`，`jd_context=jd_context`
- [ ] 修改面试对话逻辑
  - [ ] 在 `interview_service.py` 的 `chat_stream()` 中：查询 Interview 后，判断 `job_id` 是否为空；为空则从 `interview.jd_context` 构建 system prompt
- [ ] 修改面试结束逻辑
  - [ ] 在 `interview_service.py` 的 `end_interview()` 中：同样从 `jd_context` 获取岗位信息用于评估 prompt
- [ ] 新增 JD 面试专用提示词
  - [ ] 在 `backend/app/prompts/interview.py` 中新增 `get_jd_interview_system_prompt()` 函数
  - [ ] 基于现有 `get_system_prompt()` 改造，将 `{job_title}` `{job_requirements}` 等占位符替换为从 `jd_context` 提取的信息
  - [ ] 评估提示词可复用现有的 `get_evaluation_prompt()`

### Phase 4: 前端 JD 分析 UI

- [ ] 在岗位匹配页新增 JD 粘贴区域
  - [ ] 在 `frontend/src/pages/MatchingPage.jsx` 顶部区域新增一个可折叠的"粘贴目标岗位 JD"卡片
  - [ ] 包含：TextArea 输入框、"分析 JD"按钮、loading 状态
  - [ ] 分析完成后展示结构化结果：职位名称、技术栈标签、考点列表、要求列表
  - [ ] 结果区域底部添加"针对此岗位模拟面试"按钮
- [ ] 新增前端 API 调用
  - [ ] 在 `frontend/src/api/matching.js` 中新增 `analyzeJD(jdText)` 方法，调用 `POST /api/matching/analyze-jd`
- [ ] 实现跳转到面试页
  - [ ] "针对此岗位模拟面试"按钮点击后，使用 `react-router` 的 `navigate('/interview', { state: { jd_context: analysisResult } })` 传递 JD 上下文
- [ ] 修改面试页接收 JD 上下文
  - [ ] 在 `frontend/src/pages/InterviewPage.jsx` 中，通过 `useLocation()` 获取 `state.jd_context`
  - [ ] 若存在 `jd_context`，调用 `startInterview` 时传入 `jd_context` 而非 `job_id`
  - [ ] 页面顶部显示"JD 定向面试：{title}"标识
- [ ] 修改前端面试 API
  - [ ] 在 `frontend/src/api/interview.js` 的 `startInterview()` 中，支持传入 `jd_context` 参数（与 `job_id` 二选一）
