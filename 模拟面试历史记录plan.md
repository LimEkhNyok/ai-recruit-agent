# 模拟面试历史记录 + 面试过程点评

## 背景和要求

### 背景
当前模拟面试模块在面试结束后可以查看评估结果，但关闭页面后就无法再回看。后端已有 `GET /api/interview/history` 接口和 `get_history()` 服务方法，但前端没有对应的历史记录 UI。同时，面试过程中用户的每条回答缺乏即时反馈，面试结束后也无法回顾和复盘。需要新增两大功能：（1）面试历史记录的查看、重新面试、删除；（2）面试过程中 AI 对用户每条回答的实时点评，以及面试结束后的过程回顾与点评展示。此外，面试中暴露的薄弱知识点需要和刷题系统打通，形成"面试暴露弱点 → 刷题针对性练习 → 面试能力提升"的完整闭环。

### 要求
- 功能要求：
  - **历史记录**：
    - 面试页面内新增"历史记录"按钮，点击打开历史记录面板
    - 历史列表简要展示：面试日期、岗位名称（预设岗位或 JD 自定义岗位）
    - 点击某条记录展示完整面试评估结果（总分、5 维度评分、优势、不足、改进建议、是否推荐）
    - 支持对同一岗位发起重新面试
    - 支持删除某条面试记录
  - **面试过程点评**：
    - 面试对话过程中，AI 在后台异步对用户的每条回答进行点评
    - 点评时机：模型输出新问题后，利用用户回答新问题的间隙，后台异步调用 AI 点评用户上一条回答
    - 点评粒度：每条回答都点评；寒暄/自我介绍等简要点评，技术问题深度点评
    - 点评内容：简要评价、改进建议、关联知识点、缺失的知识点
    - 点评风格：礼貌、建设性，不挖苦不苛刻
    - 面试结束时生成评估报告，同时提供"查看面试过程点评"按钮
    - 点评展示：以聊天气泡形式回放面试对话，用户回答气泡旁显示 AI 点评批注
  - **跨模块数据打通**：
    - 新建 `UserWeaknessProfile` 表，汇总用户在面试和刷题中暴露的薄弱知识点
    - 面试结束时：从点评中提取 `missing_knowledge` 写入薄弱档案
    - 刷题答错时：将对应知识点写入薄弱档案
    - 刷题连续答对 ≥2 次时：将该知识点从薄弱档案移除（已掌握）
    - 刷题页面新增"查看知识薄弱点"按钮，展示面试 + 刷题中暴露的知识漏洞
    - 刷题出题时 AI 优先针对薄弱知识点出题
- 技术约束：
  - 复用现有后端 `GET /api/interview/history` 接口（已返回 id、job_id、job_title、status、created_at、evaluation）
  - 点评数据存储在 `Interview.chat_history` 的每条用户消息上，扩展现有 JSON 结构，新增 `review` 字段
  - 后台点评通过异步协程实现，在 `chat_stream` 流式返回完成后触发，不阻塞对话流
  - 历史记录面板使用 Ant Design 的 Drawer 组件
  - 需兼容 JD 面试类型（`job_id` 为空，从 `jd_context` 读取岗位名称）

## 实施步骤

### Phase 1: 后端 — 历史记录接口补充

- [ ] 修改历史记录接口，兼容 JD 面试
  - [ ] 在 `backend/app/services/interview_service.py` 的 `get_history()` 中：
    - 当 `interview.job_id` 为空时，从 `interview.jd_context` 中提取 `title` 作为 `job_title`
    - 返回数据中新增 `interview_type` 字段：`preset`（预设岗位）或 `custom_jd`（自定义 JD）
  - [ ] 修改 `backend/app/schemas/interview.py` 的 `InterviewHistoryItem`，新增 `interview_type: str` 字段
- [ ] 新增删除面试记录接口
  - [ ] 在 `backend/app/api/interview.py` 中新增 `DELETE /api/interview/{interview_id}` 端点
  - [ ] 权限校验：只能删除当前用户自己的面试记录
  - [ ] 在 `backend/app/services/interview_service.py` 中新增 `delete_interview(interview_id, user_id, db)` 方法
  - [ ] 物理删除 Interview 记录

### Phase 2: 后端 — 面试过程点评机制

- [ ] 新增点评提示词
  - [ ] 在 `backend/app/prompts/interview.py` 中新增 `get_review_prompt()` 函数
  - [ ] 提示词输入：岗位信息、面试官的问题、用户的回答、对话上下文
  - [ ] 提示词输出 JSON 格式：
    ```json
    {
      "summary": "简要评价（1-2句话）",
      "suggestions": ["改进建议1", "改进建议2"],
      "related_knowledge": ["回答涉及的知识点"],
      "missing_knowledge": ["回答缺失/薄弱的知识点"],
      "depth": "deep 或 brief"
    }
    ```
  - [ ] 提示词要求：
    - 根据回答内容自动判断 depth：寒暄/自我介绍等用 `brief`，技术问题用 `deep`
    - `brief` 模式：只给 summary，其余字段可为空数组
    - `deep` 模式：完整填写所有字段，suggestions 要具体、有建设性
    - 语气礼貌友好，指出不足的同时肯定做得好的地方
  - [ ] 支持中英文双语
- [ ] 修改 `chat_history` 数据结构
  - [ ] 在用户消息的 JSON 结构中新增 `review` 字段：
    ```json
    {
      "role": "user",
      "parts": [{"text": "用户的回答..."}],
      "review": {
        "summary": "简要评价",
        "suggestions": ["改进建议1"],
        "related_knowledge": ["知识点A"],
        "missing_knowledge": ["知识点C"],
        "depth": "deep"
      }
    }
    ```
  - [ ] `review` 字段初始为 null，由后台异步填充
- [ ] 实现后台异步点评逻辑
  - [ ] 在 `backend/app/services/interview_service.py` 中新增 `_review_last_answer()` 异步方法
    - 参数：`interview_id`、要点评的用户消息索引、岗位信息、对话上下文
    - 调用 `model_service.generate_json()` 生成点评
    - 将点评结果写入 `chat_history` 对应消息的 `review` 字段
    - 提交数据库事务
  - [ ] 修改 `chat_stream()` 方法：
    - 在流式返回完成、chat_history 保存后，判断是否存在上一条未点评的用户消息
    - 如果存在，使用 `asyncio.create_task()` 启动 `_review_last_answer()` 后台协程
    - 后台协程独立获取数据库 session（不与主请求共享），避免事务冲突
- [ ] 修改 `end_interview()` 方法
  - [ ] 面试结束时，先点评用户的最后一条回答（同步等待，确保点评完成后再生成评估）
  - [ ] 等待所有进行中的后台点评协程完成（可通过 task 列表追踪）
  - [ ] 然后调用现有的评估逻辑生成评估报告

### Phase 3: 后端 — 薄弱知识点档案（UserWeaknessProfile）

- [ ] 新建 `UserWeaknessProfile` 模型
  - [ ] 在 `backend/app/models/` 下新建 `weakness_profile.py`
  - [ ] 表结构：
    ```python
    class UserWeaknessProfile(Base):
        __tablename__ = "user_weakness_profiles"
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey("users.id"), index=True)
        knowledge_point = Column(String(100), index=True)  # 知识点名称
        source = Column(String(20))       # 来源：interview / quiz
        source_id = Column(Integer)       # 来源记录 ID（interview_id 或 quiz_record_id）
        status = Column(String(20), default="weak")  # weak / mastered
        consecutive_correct = Column(Integer, default=0)  # 连续答对次数
        created_at = Column(DateTime, server_default=func.now())
        updated_at = Column(DateTime, onupdate=func.now())
    ```
  - [ ] 在 `backend/app/models/__init__.py` 中注册模型
  - [ ] 创建 alembic 迁移脚本
- [ ] 新增薄弱知识点服务
  - [ ] 在 `backend/app/services/` 下新建 `weakness_service.py`
  - [ ] 核心方法：
    - `add_weakness(user_id, knowledge_point, source, source_id, db)` — 添加薄弱知识点（如已存在则不重复添加）
    - `add_weaknesses_from_interview(user_id, interview_id, db)` — 面试结束时，遍历 chat_history 中所有 review 的 missing_knowledge，批量写入
    - `update_on_quiz_result(user_id, knowledge_point, is_correct, db)` — 刷题答题后更新：答错则写入/重置 consecutive_correct=0；答对则 consecutive_correct+1，达到阈值(≥2)则标记 mastered
    - `get_user_weaknesses(user_id, db)` — 获取用户所有薄弱知识点（status=weak）
    - `get_weakness_summary(user_id, db)` — 按来源分组统计
- [ ] 新增薄弱知识点 API
  - [ ] 在 `backend/app/api/quiz.py` 中新增 `GET /api/quiz/weaknesses` 端点
  - [ ] 返回用户薄弱知识点列表，包含：知识点名称、来源（面试/刷题）、创建时间
  - [ ] 新增对应 schema
- [ ] 在面试结束流程中集成
  - [ ] 在 `interview_service.py` 的 `end_interview()` 中，评估完成后调用 `weakness_service.add_weaknesses_from_interview()`
- [ ] 在刷题流程中集成
  - [ ] 在 `backend/app/api/quiz.py` 的 `judge()` 端点中，答题结果保存后调用 `weakness_service.update_on_quiz_result()`
- [ ] 修改刷题出题逻辑
  - [ ] 在 `backend/app/api/quiz.py` 的 `generate()` 端点中，构建记忆上下文时查询 `UserWeaknessProfile`
  - [ ] 将用户的薄弱知识点列表注入提示词，指导 AI 优先针对这些知识点出题

### Phase 4: 前端 — 历史记录入口与列表

- [ ] 在面试页添加"历史记录"按钮
  - [ ] 在 `frontend/src/pages/InterviewPage.jsx` 页面顶部操作栏区域添加"历史记录"按钮（使用 `HistoryOutlined` 图标）
  - [ ] 按钮位置：与现有"结束面试"按钮同一行，靠右侧放置
  - [ ] 点击按钮打开历史记录 Drawer（从右侧滑出）
- [ ] 新增前端 API 调用
  - [ ] 在 `frontend/src/api/interview.js` 中新增：
    - `deleteInterview(interviewId)` — 调用 `DELETE /api/interview/{id}`
    - `getInterviewDetail(interviewId)` — 获取单条面试完整数据（含 chat_history 和 review）
- [ ] 创建历史记录 Drawer 组件
  - [ ] 可在 `InterviewPage.jsx` 内部实现，或抽取为 `InterviewHistoryDrawer` 组件
  - [ ] Drawer 打开时调用 `getHistory()` 加载数据
  - [ ] 加载中显示 Skeleton 骨架屏
- [ ] 历史列表项设计
  - [ ] 每条记录为一个卡片/列表项，展示：
    - 面试日期（格式化为 `YYYY-MM-DD HH:mm`）
    - 岗位名称（预设岗位显示原名，JD 面试显示从 `jd_context` 提取的 title，并带"自定义"标签）
    - 面试状态（已完成 / 进行中）
    - 总分（如果有 evaluation，显示 `overall_score` 分数徽章）
  - [ ] 操作按钮：
    - "查看结果" — 展开详细评估
    - "查看过程点评" — 打开面试过程回顾与点评展示
    - "重新面试" — 用同样的岗位（或 JD）发起新面试
    - "删除" — 删除该条记录，需二次确认（Popconfirm）
  - [ ] 空状态：无历史记录时显示空状态插图和"去面试"引导按钮

### Phase 5: 前端 — 评估结果与过程点评展示

- [ ] 创建评估结果展示组件
  - [ ] 将现有 `InterviewPage.jsx` 中的 `EvaluationModal` 渲染逻辑抽取为独立的 `EvaluationDetail` 组件（可被 Modal 和历史详情共用）
  - [ ] 展示内容：
    - 总分（带动画的圆形进度条）
    - 5 维度评分条形图（专业技能、沟通表达、问题解决、文化匹配、成长潜力）
    - 优势列表
    - 不足列表
    - 改进建议（引用样式）
    - 是否推荐录用（徽章）
  - [ ] 底部新增"查看面试过程点评"按钮
- [ ] 创建面试过程点评展示组件
  - [ ] 新建 `InterviewReviewView` 组件（或在 Drawer 内作为二级页面）
  - [ ] 调用 `getInterviewDetail(interviewId)` 获取完整 chat_history（含 review 字段）
  - [ ] 以聊天气泡形式展示面试对话：
    - 面试官消息：左侧气泡
    - 用户回答：右侧气泡
  - [ ] 用户回答气泡旁显示 AI 点评批注：
    - `depth=brief` 时：仅显示 summary，折叠展示
    - `depth=deep` 时：展开显示完整点评卡片，包含：
      - 简要评价（summary）
      - 改进建议列表（suggestions）
      - 涉及知识点标签（related_knowledge，绿色标签）
      - 缺失知识点标签（missing_knowledge，橙色标签）
  - [ ] 点评卡片样式：浅色背景卡片，挂在对应用户气泡下方或右侧，视觉上关联

### Phase 6: 前端 — 重新面试、删除与薄弱知识点展示

- [ ] 实现重新面试功能
  - [ ] 点击"重新面试"按钮：
    - 预设岗位面试：关闭 Drawer，使用相同的 `job_id` 调用 `startInterview(jobId)` 启动新面试
    - JD 面试：关闭 Drawer，使用历史记录中保存的 `jd_context` 调用 `startInterview` 启动新面试
  - [ ] 新面试启动前，如果当前有进行中的面试，弹出确认提示
- [ ] 实现删除功能
  - [ ] 点击"删除"按钮弹出 Popconfirm 确认框："确定删除这条面试记录？"
  - [ ] 确认后调用 `deleteInterview(id)`，成功后从列表中移除该项
  - [ ] 删除失败时显示错误提示
- [ ] 刷题页面新增"查看知识薄弱点"功能
  - [ ] 在 `frontend/src/pages/QuizPage.jsx` 的统计面板区域添加"查看知识薄弱点"按钮
  - [ ] 点击打开 Modal 或 Drawer，展示薄弱知识点列表：
    - 每条显示：知识点名称、来源标签（"面试中暴露" / "刷题中暴露"）、发现时间
    - 已掌握的知识点以删除线或灰色样式展示，可折叠
    - 点击某个薄弱知识点可快速跳转到对应知识点开始刷题
  - [ ] 新增前端 API：在 `frontend/src/api/quiz.js` 中新增 `getWeaknesses()` 调用 `GET /api/quiz/weaknesses`
