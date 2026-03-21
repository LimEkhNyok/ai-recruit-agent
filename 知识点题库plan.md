# 刷题练习：知识点题库 + AI 生成题目

## 背景和要求

### 背景
现有刷题模块完全由 AI 随机出题，题目质量和知识点覆盖不可控。改进方向是引入经典题库的知识点分类体系（如数据结构与算法、前端、后端、计算机基础等领域的细分知识点），由 AI 根据知识点原创生成题目，实现系统化刷题。同时，答错或跳过时 AI 举一反三生成变体题，强化薄弱环节。

### 要求
- 功能要求：
  - 从 GitHub 开源项目（如 `azl397985856/leetcode` 等）提取知识点标签体系
  - 建立知识点分类索引：知识点名称、所属领域、难度分级、关联考点、典型解题思路
  - 用户选择知识点后，AI 根据该知识点原创生成题目（不搬运原题，规避版权）
  - 答错或跳过时，AI 基于同一知识点举一反三，生成相似但不同的变体题
  - 知识点掌握程度可视化（进度条/雷达图等）
  - 摒弃现有 AI 随机出题模式，全部转向"知识点刷题"
- 技术约束：
  - 只提取知识点分类和解题思路，不复制原题描述
  - 知识点数据以 JSON 文件或数据库表形式存储在后端
  - 复用现有的 `model_service.generate_json()` 调用 AI
  - 复用现有的 `QuizRecord` 表记录答题历史，新增 `mode` 字段区分模式
- 兼容性要求：
  - 摒弃 AI 随机出题功能
  - 现有统计数据（准确率、掌握/薄弱知识点）兼容新模式

## 实施步骤

### Phase 1: 知识点体系整理

- [ ] 从 GitHub 开源项目提取知识点标签体系
  - [ ] 搜索并分析 `azl397985856/leetcode`、`CyC2018/CS-Notes`、`halfrost/LeetCode-Go` 等项目的标签分类
  - [ ] 提取覆盖以下领域的知识点：
    - **数据结构与算法**：数组、链表、栈、队列、哈希表、树、图、堆、字典树、并查集；排序、搜索、双指针、滑动窗口、递归、回溯、贪心、动态规划、分治、位运算
    - **前端**：HTML/CSS 布局、DOM 操作、事件机制、闭包/作用域、异步编程、React/Vue 原理、浏览器渲染、性能优化、Webpack/Vite
    - **后端**：RESTful API 设计、数据库设计/SQL 优化、缓存策略、消息队列、微服务、认证授权、并发处理
    - **计算机基础**：操作系统（进程/线程、内存管理、文件系统）、计算机网络（TCP/IP、HTTP/HTTPS、DNS）、设计模式
  - [ ] 每个知识点整理为结构化数据：`{ "id", "name", "domain", "difficulty_levels", "related_topics", "description", "typical_approach" }`
- [ ] 生成知识点数据文件
  - [ ] 在 `backend/app/data/` 目录下创建 `knowledge_points.json`
  - [ ] 按领域（domain）分组，每个知识点包含完整的元数据
  - [ ] 数据格式示例：
    ```json
    {
      "domains": [
        {
          "name": "数据结构与算法",
          "topics": [
            {
              "id": "dp",
              "name": "动态规划",
              "difficulty_levels": ["简单", "中等", "困难"],
              "related_topics": ["递归", "贪心"],
              "description": "将问题分解为重叠子问题...",
              "typical_approach": "状态定义 → 转移方程 → 初始化 → 遍历顺序"
            }
          ]
        }
      ]
    }
    ```

### Phase 2: 后端知识点 API 与出题逻辑

- [ ] 新增知识点查询接口
  - [ ] 在 `backend/app/api/quiz.py` 中新增 `GET /api/quiz/knowledge-points` 端点
  - [ ] 读取 `knowledge_points.json`，返回知识点分类树（支持按领域筛选）
  - [ ] 返回格式：领域列表 → 每个领域下的知识点列表（含 id、名称、难度等级）
- [ ] 修改 `QuizRecord` 模型
  - [ ] 在 `backend/app/models/quiz.py` 中新增 `mode` 字段（`String(20), default='random'`），取值：`random`（AI 随机）/ `knowledge`（知识点）
  - [ ] 创建 alembic 迁移脚本
- [ ] 新增知识点出题提示词
  - [ ] 在 `backend/app/prompts/quiz.py` 中新增 `get_knowledge_quiz_prompt()` 函数
  - [ ] 提示词包含：知识点名称、知识点描述、典型解题思路、难度要求、题型要求
  - [ ] 强调原创生成，不得搬运已有题目
  - [ ] 支持中英文双语
- [ ] 新增举一反三提示词
  - [ ] 在 `backend/app/prompts/quiz.py` 中新增 `get_variant_quiz_prompt()` 函数
  - [ ] 接收上一题的 question、knowledge_point、user_answer 信息
  - [ ] 提示词指导 AI 生成同一知识点但变换了场景/数据/条件的变体题
  - [ ] 变体题难度与原题相近或略有提升
- [ ] 修改出题 API 端点
  - [ ] 修改 `POST /api/quiz/generate`，新增可选参数 `mode`（默认 `random`）和 `knowledge_point_id`
  - [ ] 当 `mode='knowledge'` 时：
    - 从 `knowledge_points.json` 加载对应知识点的元数据
    - 使用 `get_knowledge_quiz_prompt()` 构建提示词
    - 记忆上下文中针对该知识点的历史答题情况加强权重
  - [ ] 当 `mode='random'` 时：走现有逻辑不变
- [ ] 新增变体题 API 端点
  - [ ] 在 `backend/app/api/quiz.py` 中新增 `POST /api/quiz/generate-variant` 端点
  - [ ] 接收参数：上一题的 question、knowledge_point、user_answer、is_correct
  - [ ] 调用 `get_variant_quiz_prompt()` + `model_service.generate_json()` 生成变体题
- [ ] 新增知识点掌握度统计
  - [ ] 修改 `GET /api/quiz/stats` 或新增 `GET /api/quiz/knowledge-stats` 端点
  - [ ] 按知识点维度统计：每个知识点的答题数、正确数、正确率、掌握状态
  - [ ] 掌握状态判定：复用现有的 `MASTERY_THRESHOLD=2` 逻辑

### Phase 3: 前端知识点刷题 UI

- [ ] 修改 `QuizPage.jsx` 添加模式切换
  - [ ] 在科目选择区域上方新增模式切换组件（Tab 或 SegmentedControl）：`AI 随机出题` | `知识点刷题`
  - [ ] 切换模式时清空当前题目状态
- [ ] 新增知识点选择面板
  - [ ] 当模式为"知识点刷题"时，替换现有的科目选择区域
  - [ ] 左侧：领域列表（数据结构与算法、前端、后端、计算机基础），点击切换
  - [ ] 右侧：该领域下的知识点列表，每个知识点显示名称 + 难度标签 + 掌握进度条
  - [ ] 选中知识点后显示：知识点描述、典型解题思路、可选难度
  - [ ] 点击"开始出题"生成第一题
- [ ] 新增前端 API 调用
  - [ ] 在 `frontend/src/api/quiz.js` 中新增：
    - `getKnowledgePoints()` — 获取知识点分类树
    - `generateVariant(data)` — 生成变体题
    - `getKnowledgeStats()` — 获取知识点维度统计
- [ ] 实现举一反三交互
  - [ ] 用户答错或跳过后，在结果区域显示"举一反三"按钮
  - [ ] 点击后调用 `generateVariant()` 获取同知识点变体题
  - [ ] 变体题带有标识（如"变体练习"标签），与普通题区分
- [ ] 知识点掌握度可视化
  - [ ] 在右侧统计面板中，当模式为"知识点刷题"时，显示知识点掌握度视图
  - [ ] 展示形式：知识点列表 + 进度条（正确率），颜色区分掌握/薄弱/未开始
  - [ ] 可选：雷达图展示各领域的综合掌握度（使用 Ant Design Charts 或类似图表库）
