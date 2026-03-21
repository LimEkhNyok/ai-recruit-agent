# 刷题练习：知识点题库 + AI 生成题目

## 背景和要求

### 背景
现有刷题模块完全由 AI 随机出题，用户选择一个编程语言科目后 AI 随机生成任意题目，知识点覆盖不可控、学习路径不成体系。改进方向是摒弃 AI 随机出题模式，全面转向知识点驱动的系统化刷题。将现有的 17 个编程语言科目升级为带有结构化知识点的领域，同时新增数据结构与算法、计算机基础等通用领域。用户体验从"选语言 → 随机出题"变为"选领域 → 选知识点 → 精准出题"。

### 要求
- 功能要求：
  - 从 GitHub 开源项目（如 `azl397985856/leetcode`、`CyC2018/CS-Notes` 等）提取知识点标签体系
  - 建立知识点分类索引：知识点名称、所属领域、难度分级、关联考点、典型解题思路
  - 领域分为两类：
    - **通用领域**：数据结构与算法、前端、后端、计算机基础、DevOps/云计算、人工智能/机器学习、软件工程、计算机数学
    - **语言/工具领域**：Python、Java、JavaScript、C/C++、Go、TypeScript、React、Vue、SQL/数据库、Shell/Bash、Linux、Nginx 等（继承现有科目，每个语言/工具下拆分为具体知识点）
  - 用户选择知识点后，AI 根据该知识点原创生成题目（不搬运原题，规避版权）
  - 答错或跳过时，AI 基于同一知识点举一反三，生成相似但不同的变体题
  - 知识点掌握程度可视化（进度条/雷达图等）
  - 摒弃现有 AI 随机出题模式，全部转向知识点刷题
- 技术约束：
  - 只提取知识点分类和解题思路，不复制原题描述
  - 知识点数据以 JSON 文件形式存储在后端 `backend/app/data/knowledge_points.json`
  - 复用现有的 `model_service.generate_json()` 调用 AI
  - 复用现有的 `QuizRecord` 表记录答题历史
  - 现有的 `topic` 字段语义从"科目"变为"领域"，`knowledge_point` 字段继续记录具体知识点
- 兼容性要求：
  - 现有历史答题数据保留，`topic` 字段中旧的科目名称在统计时向后兼容
  - 现有题型（判断题、选择题、简答题、编程题）保留不变
  - 现有统计逻辑（准确率、掌握/薄弱知识点、MASTERY_THRESHOLD=2）保留不变

## 实施步骤

### Phase 1: 知识点体系整理

- [x] 从 GitHub 开源项目提取知识点标签体系
  - [x] 搜索并分析 `azl397985856/leetcode`、`CyC2018/CS-Notes`、`halfrost/LeetCode-Go` 等项目的标签分类
  - [x] 整理通用领域知识点：
    - **数据结构与算法**：数组、链表、栈、队列、哈希表、树、图、堆、字典树、并查集；排序、搜索、双指针、滑动窗口、递归、回溯、贪心、动态规划、分治、位运算
    - **前端**：HTML/CSS 布局、DOM 操作、事件机制、浏览器渲染、性能优化、Webpack/Vite 构建工具
    - **后端**：RESTful API 设计、数据库设计/SQL 优化、缓存策略、消息队列、微服务、认证授权、并发处理
    - **计算机基础**：操作系统（进程/线程、内存管理、文件系统）、计算机网络（TCP/IP、HTTP/HTTPS、DNS）、设计模式
    - **DevOps / 云计算**：Docker 容器化、Kubernetes 编排、CI/CD 流水线、云服务（AWS/阿里云核心服务）、基础设施即代码(IaC)、监控与日志、服务网格
    - **人工智能 / 机器学习**：监督/无监督学习、神经网络基础、CNN/RNN/Transformer、损失函数与优化器、特征工程、模型评估、NLP 基础、计算机视觉基础
    - **软件工程**：敏捷开发/Scrum、Git 工作流、代码审查、单元测试/集成测试、需求分析、UML 建模、CI/CD 实践、技术文档编写
    - **计算机数学**：离散数学（集合/图论/逻辑）、线性代数（矩阵/向量空间）、概率统计（贝叶斯/分布/假设检验）、数值计算、信息论基础
  - [x] 整理语言领域知识点（将现有 17 个科目升级为带知识点的领域）：
    - **Python**：装饰器、生成器/迭代器、GIL、列表推导式、上下文管理器、元类、协程/asyncio、类型提示、包管理、数据模型（魔术方法）
    - **Java**：JVM 内存模型、垃圾回收、多线程/并发、集合框架、泛型、反射、Spring IoC/AOP、Stream API、异常处理、设计模式实践
    - **JavaScript**：闭包/作用域、原型链、this 指向、异步编程（Promise/async-await）、事件循环、ES6+ 新特性、模块系统、类型转换、内存管理
    - **TypeScript**：类型系统、泛型、类型推断、装饰器、接口与类型别名、联合/交叉类型、类型守卫、工具类型（Partial/Pick 等）
    - **C/C++**：指针/内存管理、结构体/类、模板、STL 容器、智能指针、多线程、编译链接、预处理器、RAII
    - **Go**：goroutine/channel、接口、切片/map、错误处理、context、反射、包管理(go mod)、内存模型、垃圾回收
    - **React**：组件生命周期、Hooks 原理、虚拟 DOM/Diff 算法、状态管理、性能优化（memo/useMemo/useCallback）、路由、服务端渲染
    - **Vue**：响应式原理、组合式 API、虚拟 DOM、组件通信、Vuex/Pinia、Vue Router、生命周期、指令系统
    - **SQL/数据库**：SQL 语法、索引原理与优化、事务/ACID、锁机制、表设计/范式、查询优化、存储引擎、分库分表
    - **Shell/Bash**：管道与重定向、正则表达式、sed/awk 文本处理、脚本编写（变量/循环/条件）、进程管理、cron 定时任务、环境变量
    - **Linux**：文件系统与权限、进程管理（ps/top/kill）、网络配置（iptables/ss/netstat）、用户与权限管理、磁盘与存储、系统日志、包管理（apt/yum）、systemd 服务管理
    - **Nginx**：反向代理配置、负载均衡策略、location 匹配规则、HTTPS/SSL 配置、性能调优、日志分析、upstream 配置、缓存策略
    - **其他语言**（Rust、Kotlin、Swift、PHP、Ruby、C#）：按需补充核心知识点
  - [x] 每个知识点整理为结构化数据：`{ "id", "name", "domain", "difficulty_levels", "related_topics", "description", "typical_approach" }`
- [x] 生成知识点数据文件
  - [x] 在 `backend/app/data/` 目录下创建 `knowledge_points.json`
  - [x] 按领域（domain）分组，区分通用领域和语言领域
  - [x] 数据格式：
    ```json
    {
      "domains": [
        {
          "id": "dsa",
          "name": "数据结构与算法",
          "type": "general",
          "icon": "CodeOutlined",
          "topics": [
            {
              "id": "dp",
              "name": "动态规划",
              "difficulty_levels": ["简单", "中等", "困难"],
              "related_topics": ["递归", "贪心"],
              "description": "将问题分解为重叠子问题，通过记忆化或自底向上的方式避免重复计算",
              "typical_approach": "状态定义 → 转移方程 → 初始化 → 遍历顺序"
            }
          ]
        },
        {
          "id": "python",
          "name": "Python",
          "type": "language",
          "icon": "PythonOutlined",
          "topics": [
            {
              "id": "py_decorator",
              "name": "装饰器",
              "difficulty_levels": ["简单", "中等", "困难"],
              "related_topics": ["闭包", "函数式编程"],
              "description": "使用 @ 语法在不修改函数代码的前提下扩展函数功能",
              "typical_approach": "理解闭包 → 函数作为参数 → @语法糖 → 带参数装饰器 → functools.wraps"
            }
          ]
        }
      ]
    }
    ```

### Phase 2: 后端接口改造

- [x] 新增知识点查询接口
  - [x] 在 `backend/app/api/quiz.py` 中新增 `GET /api/quiz/knowledge-points` 端点
  - [x] 读取 `knowledge_points.json`，返回知识点分类树
  - [x] 支持按领域类型筛选（`?type=general` 或 `?type=language`）
  - [x] 返回格式：领域列表 → 每个领域下的知识点列表（含 id、名称、难度等级）
- [x] 改造出题 API 端点
  - [x] 新增 `POST /api/quiz/generate-by-knowledge`，参数为 `domain_id + topic_id + question_type + difficulty`（旧接口保留兼容）
    - `domain_id`：领域 ID（如 `dsa`、`python`、`javascript`）
    - `topic_id`：知识点 ID（如 `dp`、`py_decorator`）
    - `question_type`：题型（保留现有四种）
    - `difficulty`：难度（简单/中等/困难）
  - [x] 从 `knowledge_points.json` 加载对应知识点的元数据（description、typical_approach）
  - [x] 使用新的知识点出题提示词构建 AI 请求
  - [x] 记忆上下文（`_build_knowledge_memory_context`）按 `domain_name + topic_name` 查询历史答题记录
  - [x] `QuizRecord` 保存时，`topic` 字段存领域名称，`knowledge_point` 字段存知识点名称
- [x] 新增知识点出题提示词
  - [x] 在 `backend/app/prompts/quiz.py` 中新增 `get_knowledge_quiz_prompt()` 函数
  - [x] 提示词包含：领域名称、知识点名称、知识点描述、典型解题思路、难度要求、题型要求
  - [x] 强调原创生成，不得搬运已有题目
  - [x] 支持中英文双语
  - [x] 保留旧的 `get_quiz_generate_prompt()` 作为向后兼容的备用
- [x] 新增举一反三提示词与接口
  - [x] 在 `backend/app/prompts/quiz.py` 中新增 `get_variant_quiz_prompt()` 函数
  - [x] 接收上一题的 question、knowledge_point、user_answer、is_correct 信息
  - [x] 提示词指导 AI 生成同一知识点但变换了场景/数据/条件的变体题
  - [x] 答错时变体题难度持平，答对时难度可略有提升
  - [x] 在 `backend/app/api/quiz.py` 中新增 `POST /api/quiz/generate-variant` 端点
  - [x] 调用 `get_variant_quiz_prompt()` + `model_service.generate_json()` 生成变体题
- [x] 新增知识点掌握度统计接口
  - [x] 新增 `GET /api/quiz/knowledge-stats` 端点
  - [x] 按知识点维度统计：每个知识点的答题数、正确数、正确率、掌握状态
  - [x] 按领域维度聚合：每个领域的整体正确率、已掌握/薄弱/未开始的知识点数
  - [x] 掌握状态判定：复用现有的 `MASTERY_THRESHOLD=2` 逻辑
  - [x] 现有的 `GET /api/quiz/stats` 保留，返回全局统计（总题数、正确率、掌握/薄弱知识点）

### Phase 3: 前端刷题页面重构

- [x] 重构 `QuizPage.jsx` 顶部区域：领域选择
  - [x] 移除现有的 17 个科目选择 Tag 组件
  - [x] 替换为领域选择组件，分两组展示：
    - 第一组（通用领域）：数据结构与算法、前端、后端、计算机基础、DevOps/云计算、人工智能/机器学习、软件工程、计算机数学
    - 第二组（语言/工具领域）：Python、Java、JavaScript、TypeScript、C/C++、Go、React、Vue、SQL/数据库、Shell/Bash、Linux、Nginx、...
  - [x] 每个领域 Tag 可带图标区分
  - [x] 选中领域后进入知识点选择
- [x] 新增知识点选择面板
  - [x] 选中领域后，下方展示该领域下的知识点列表
  - [x] 每个知识点卡片/Tag 显示：名称 + 掌握进度（小型进度条或颜色标识：绿色=已掌握、橙色=薄弱、灰色=未开始）
  - [x] 选中知识点后显示：
    - 知识点描述（1-2 句话）
    - 典型解题思路
    - 难度选择（简单/中等/困难，默认中等）
    - 题型选择（保留现有四种：判断题、选择题、简答题、编程题）
  - [x] 点击"开始出题"生成第一题
- [x] 新增前端 API 调用
  - [x] 在 `frontend/src/api/quiz.js` 中：
    - 新增 `getKnowledgePoints(type?)` — 获取知识点分类树
    - 新增 `generateVariant(data)` — 生成变体题
    - 新增 `getKnowledgeStats()` — 获取知识点维度统计
    - 新增 `generateByKnowledge(domainId, topicId, questionType, difficulty)` — 知识点出题
- [x] 实现举一反三交互
  - [x] 用户答错或跳过后，在结果区域（标准答案和解析下方）显示"举一反三"按钮
  - [x] 点击后调用 `generateVariant()` 获取同知识点变体题
  - [x] 变体题带有"变体练习"标签，与普通题区分
  - [x] 答对时也可选择"继续深入"生成更高难度的变体
- [x] 知识点掌握度可视化
  - [x] 重构右侧统计面板：
    - 顶部保留：总答题数、正确率、正确数（现有全局统计）
    - 下方替换为知识点掌握度视图：
      - 当前领域下的知识点列表 + 进度条（正确率）
      - 颜色区分：绿色（已掌握，连续答对 ≥2）/ 橙色（薄弱，答过但正确率低）/ 灰色（未开始）
  - [ ] 可选增强：各领域综合掌握度雷达图（使用 Ant Design Charts 或 ECharts）
