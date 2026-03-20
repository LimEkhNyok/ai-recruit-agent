# CodeToWork（码到工成）前端重构计划

## 背景和要求

### 背景
CodeToWork（码到工成）是一个 AI 驱动的求职招聘平台，提供职业测评、岗位匹配、模拟面试、职业规划、刷题练习、简历分析等功能。当前前端基于 React 19 + Ant Design 6 + Tailwind CSS 4 构建，共 12 个页面和 6 个通用组件。现有 UI 存在严重的"AI 生成感"：过度使用饱和渐变、颜色过于规则化（一个功能一个颜色）、布局完全机械对称、卡片样式千篇一律、Progress 组件过度复用等问题。本次重构目标是以 Vercel 官网为设计参考，打造极简、现代、专业的视觉风格，同时新增暗色模式和中英文切换能力。

### 要求
- **设计风格**：参考 Vercel 官网——黑白为主色调、极简排版、大量留白、微妙的渐变和动效、强烈的对比度、专业感
- **品牌体系**：英文名 CodeToWork，中文名"码到工成"，需设计完整的品牌色、Logo、视觉语言
- **技术栈**：React 19 + Ant Design 6 + Tailwind CSS 4，不更换框架
- **新增能力**：亮色/暗色主题切换、中文/英文语言切换（i18n）
- **核心约束**：所有现有功能（API 调用、状态管理、路由、业务逻辑）保持不变，仅重构 UI 层
- **重构范围**：全部 12 个页面 + 6 个通用组件 + 布局组件 + 全局样式

### 增量迁移策略
- 每个 Phase 完成后必须保持应用可运行、可独立部署，不允许出现"半成品"状态
- 新旧样式通过 CSS 变量共存——Phase 1 定义变量后，后续页面逐步迁移
- 新设计系统的组件与旧页面可并行存在，不要求一次性全部切换
- 每个 Phase 末尾标注 **[部署检查点]**，表示此时应可部署验证

---

## 设计方向宣言

### 美学定位：Precision Craft（精密工艺）
CodeToWork 不是又一个"AI 工具"——它是求职者的**专业武器**。视觉语言应传达：**精准、可信赖、冷静的力量感**。借鉴 Vercel 的极简哲学，但融入 CodeToWork 自己的个性——代码与职场的交汇点。

### 记忆点（Signature Element）
- **"代码光标"动效**：品牌标志性的闪烁光标 `|`，出现在 Hero 标题、加载状态、对话输入框中，象征"代码→工作"的转化过程
- **Terminal 风格点缀**：关键数据展示借鉴终端/代码编辑器的排版美学——等宽字体的数字、`>_` 提示符、微妙的语法高亮色

### 字体方案
- **Display 字体（标题/Hero）**：`Sora`（Google Fonts）— 几何感强、现代、技术感但不冰冷，支持中英文混排时视觉和谐
- **Body 字体（正文）**：`DM Sans`（Google Fonts）— 清晰可读、几何骨架但有人文温度，比 Inter 更有辨识度
- **Mono 字体（数据/代码）**：`JetBrains Mono`（Google Fonts）— 程序员群体的审美认同，用于数字展示、分数、技术标签
- **中文字体**：`Alibaba PuHuiTi 3.0`（阿里巴巴普惠体）— 现代几何风格与 Sora/DM Sans 匹配，免费开源，通过 CDN 加载并启用 `unicode-range` 子集化控制体积，避免 Noto Sans SC 的"AI 标配感"

### 品牌色体系
- **品牌主色**：`#0066FF`（Electric Blue）— 比 Vercel 的蓝更深沉有力，代表"精准"和"可信"
- **品牌辅色**：`#00D4AA`（Mint Cyan）— 用于成功状态和关键 CTA 的渐变配对，代表"成长"和"通过"
- **黑白基底**：亮色模式 `#FAFAFA` 背景 / `#0A0A0A` 文字；暗色模式 `#0A0A0A` 背景 / `#EDEDED` 文字
- **强调渐变**：`linear-gradient(135deg, #0066FF, #00D4AA)` — 仅用于最重要的 CTA 和 Hero 光晕，克制使用
- **灰度梯度**：10 级灰度（50-950），亮暗模式各一套，用于构建层次感
- **语义色**：成功 `#00D4AA`、警告 `#F5A623`、错误 `#EF4444`，均保持低饱和度
- **暗色模式表面层级**：
  - Level 0（底层背景）：`#0A0A0A`
  - Level 1（卡片/区块）：`#141414`
  - Level 2（悬浮层/Modal）：`#1C1C1C`
  - Level 3（Dropdown/Popover）：`#242424`
  - 暗色模式边框统一使用 `rgba(255, 255, 255, 0.08)` 而非硬编码灰色值

### 动效哲学
- **入场动效**：每个页面首次加载时，内容块从下方淡入（staggered reveal），间隔 80-120ms，持续 400-600ms
- **退场动效**：路由切换时当前页面 `opacity 1→0` + `translateY(0→-8px)`，200ms ease-in，确保切换流畅不突兀
- **交互反馈**：按钮 hover 时 `scale(1.02)` + 背景色过渡 200ms；卡片 hover 时边框发光 + `translateY(-2px)`
- **状态切换动效**：数据状态变化时使用平滑过渡（如刷题页答对→答错的视觉反馈：背景色渐变 300ms + 图标 scale 弹跳 `0→1.2→1`，200ms ease-out）
- **品牌动效**：光标闪烁使用 `step-end` 动画，频率 530ms（接近真实光标节奏）
- **过渡**：页面切换使用 `opacity` + `translateY(8px)` 的简洁 fade-up，300ms ease-out
- **技术选择**：使用 `motion`（framer-motion v11+ 轻量版，`import { motion } from "motion/react"`，体积约 16KB gzipped）处理入场/退场动画和布局动画；简单 hover/focus 用 CSS transition
- **无障碍**：`prefers-reduced-motion` 媒体查询下禁用所有非必要动画

---

## 实施步骤

### Phase 1a: Design Tokens 与样式基础设施

> 建立设计基础的核心部分：色彩、字体、间距、阴影等视觉令牌。

- [ ] **安装新依赖**
  - [ ] 安装 `motion` — 轻量版 framer-motion，入场/退场动画和布局动画

- [ ] **引入字体**
  - [ ] 在 `frontend/index.html` 中通过 Google Fonts 引入：`Sora`（标题，weights: 400/600/700）、`DM Sans`（正文，weights: 400/500/600）、`JetBrains Mono`（数据/代码，weights: 400/500），均使用 `display=swap`
  - [ ] 通过 CDN 引入 `Alibaba PuHuiTi 3.0` 中文字体，启用 `unicode-range` 子集化，仅加载常用中文字符集（约 6000 字），控制总体积在 1-2MB 以内
  - [ ] 在 CSS 中定义 `--font-display`、`--font-body`、`--font-mono` 三个字体栈变量

- [ ] **品牌设计与 Design Tokens**
  - [ ] 创建 `frontend/src/theme/tokens.js`，定义完整的设计令牌系统：
    - **色彩**：品牌蓝 `#0066FF`、品牌青 `#00D4AA`、强调渐变 `#0066FF → #00D4AA`
    - **灰度**：light 模式 10 级（`gray-50: #FAFAFA` 到 `gray-950: #0A0A0A`）；dark 模式反转
    - **语义色**：success `#00D4AA`、warning `#F5A623`、error `#EF4444`、info `#0066FF`
    - **表面色**：亮色模式（背景 `#FAFAFA`、卡片 `#FFFFFF`、悬浮层 `#FFFFFF`、输入框 `#FFFFFF`）；暗色模式（Level 0 `#0A0A0A`、Level 1 `#141414`、Level 2 `#1C1C1C`、Level 3 `#242424`）
    - **边框色**：亮色 default/hover/focus 三态；暗色统一使用 `rgba(255,255,255,0.08)` 基底，hover `rgba(255,255,255,0.15)`，focus 品牌蓝
    - **文字色**：primary、secondary、tertiary、disabled 四级，亮/暗两套
  - [ ] 定义 Typography Scale：
    - Hero: `Sora` 56px/700, H1: 40px/700, H2: 32px/600, H3: 24px/600, H4: 20px/600
    - Body: `DM Sans` 16px/400, Body Small: 14px/400, Caption: 12px/400
    - Mono: `JetBrains Mono` 用于数字、分数、技术标签
  - [ ] 定义 Spacing Scale：4/8/12/16/20/24/32/40/48/64/80/96/128
  - [ ] 定义 Border Radius：sm: 6px, md: 8px, lg: 12px, xl: 16px, 2xl: 24px
  - [ ] 定义 Shadow（亮色/暗色各一套）：
    - subtle: 用于卡片静态
    - medium: 用于卡片 hover
    - strong: 用于 Modal/Dropdown
    - glow: 品牌色发光效果，用于重要 CTA hover（`0 0 20px rgba(0,102,255,0.3)`）
  - [ ] 设计 Logo — 创建 `frontend/src/components/LogoMark.jsx`（React 组件，非静态 SVG）：
    - 文字 Logo "CodeToWork"，其中 "Code" 使用 `JetBrains Mono` 风格，"To" 小写弱化，"Work" 使用 `Sora` 风格
    - 配合一个抽象的 `>_` 光标符号作为 icon mark，光标使用品牌闪烁动效
    - 通过 props 接收 `theme` 参数，自动切换亮色版（黑字）/ 暗色版（白字），无需维护两个文件
    - 支持 `size` prop 控制响应式尺寸（sm/md/lg）

- [ ] **Ant Design 主题配置**
  - [ ] 创建 `frontend/src/theme/antdTheme.js`，定义亮色和暗色两套 Ant Design Theme Config：
    - 全局 Token：`colorPrimary: #0066FF`、`fontFamily: 'DM Sans', 'Alibaba PuHuiTi 3.0', sans-serif`、`borderRadius: 8`、`colorBgContainer`（亮：`#fff` / 暗：`#141414`）、`colorText`、`colorBorder`
    - Button Token：默认按钮为黑底白字（亮色）/ 白底黑字（暗色），border-radius: 8px，hover 时 `scale(1.02)` 效果通过 CSS 实现
    - Card Token：无默认阴影，使用 1px 边框（`colorBorderSecondary`），hover 时边框变为品牌色
    - Input Token：1px 边框，focus 时边框品牌蓝 + 微弱 glow shadow
    - Table Token：无内部竖线，行 hover 高亮使用极淡品牌色底色
    - Modal Token：暗色模式下背景 `#1C1C1C`（Level 2），无阴影改用 `rgba(255,255,255,0.08)` 边框
    - Menu Token：透明背景，选中项使用底部 2px 品牌色下划线而非背景色
  - [ ] 修改 `frontend/src/main.jsx` — 引入 ThemeProvider 包裹 ConfigProvider，根据 useThemeStore 动态切换主题和语言 locale

- [ ] **Tailwind CSS 配置**
  - [ ] 在 `frontend/src/index.css` 中配置：
    - 通过 `@theme` 注册自定义颜色（`--color-brand`、`--color-surface-*`、`--color-border-*` 等语义命名）
    - 定义 `:root`（亮色）和 `.dark`（暗色）两套 CSS 变量，暗色模式的表面色严格对应 Level 0-3
    - 注册自定义字体栈变量
    - 定义全局 `body` 样式：`font-family: var(--font-body)`，`background: var(--color-surface-base)`，`color: var(--color-text-primary)`
    - 定义品牌光标闪烁动画 `@keyframes cursor-blink`
    - 定义入场动画基础 `@keyframes fade-up`
    - 定义退场动画 `@keyframes fade-out-up`
  - [ ] 确保 Tailwind 语义色与 Ant Design Theme Token 引用相同 CSS 变量，保持一致

**[部署检查点]** — 应用可正常运行，新字体和 CSS 变量已生效但不影响现有页面

---

### Phase 1b: 主题切换、国际化与动效组件

> 建立主题切换、语言切换和通用动效组件，为后续页面重构提供基础设施。

- [ ] **主题切换机制**
  - [ ] 创建 `frontend/src/store/useThemeStore.js` — Zustand store：
    - 状态：`theme`（'light' | 'dark'）、`language`（'zh' | 'en'）
    - 方法：`toggleTheme()`、`setLanguage(lang)`
    - 持久化：localStorage key `ctw-theme` 和 `ctw-language`
    - 初始化：优先读 localStorage，fallback 到 `prefers-color-scheme` 和浏览器语言
  - [ ] 切换逻辑：同步更新 `<html class="dark">`、Ant Design ConfigProvider theme 对象、i18n 语言、Ant Design locale（zhCN / enUS）

- [ ] **国际化（i18n）基础设施**（轻量自研方案）
  - [ ] 创建 `frontend/src/i18n/index.js` — 自写 i18n 模块（约 50 行），基于 React Context：
    - 导出 `I18nProvider` 组件和 `useTranslation` hook
    - `t(key)` 函数支持点号路径取值（如 `t('nav.home')`）
    - 语言切换时同步更新 Context，触发重渲染
    - 不引入 react-i18next / i18next / i18next-browser-languagedetector，避免不必要的依赖
  - [ ] 创建 `frontend/src/i18n/zh.json` — 中文翻译，按模块组织：`common`、`nav`、`home`、`auth`、`assessment`、`matching`、`interview`、`career`、`quiz`、`settings`、`usage`、`resume`、`profile`
  - [ ] 创建 `frontend/src/i18n/en.json` — 英文翻译，结构与中文一致
  - [ ] 在 `frontend/src/main.jsx` 中用 `I18nProvider` 包裹应用

- [ ] **通用动效组件**
  - [ ] 创建 `frontend/src/components/motion/FadeIn.jsx` — 基于 motion 的入场动画包裹组件：
    - 支持 `delay`、`duration`、`direction`（up/down/left/right）参数
    - 默认 fade-up 效果（opacity 0→1, translateY 8px→0）
    - 自动检测 `prefers-reduced-motion`，减弱或禁用动画
  - [ ] 创建 `frontend/src/components/motion/StaggerContainer.jsx` — 子元素依次入场的容器组件：
    - 支持 `staggerDelay`（默认 100ms）参数
    - 子元素自动获得递增的 delay

**[部署检查点]** — 主题切换和语言切换可在控制台手动触发验证，动效组件可在任意页面引用测试

---

### Phase 2: 布局与导航重构

> 重构应用的整体框架——用户对产品的第一感知。Header 是品牌一致性的核心载体。

- [ ] **Layout.jsx 重构** — `frontend/src/components/Layout.jsx`
  - [ ] Header 重新设计（Vercel 风格的极简导航栏）：
    - **结构**：左侧 `LogoMark` 组件 + 分隔线 `|` + 导航链接；右侧工具区
    - **导航链接**：不使用 Ant Menu，改为自定义的 `<nav>` + `<a>` 文字链接，`DM Sans` 字体 14px/500
    - **Hover 效果**：文字颜色从 `text-tertiary` 过渡到 `text-primary`，下方出现 2px 品牌色下划线（CSS transition 200ms）
    - **右侧工具区**：主题切换（太阳/月亮图标按钮，切换时图标旋转动画）+ 语言切换（`ZH` / `EN` 文字按钮，当前语言加粗）+ 简历上传（ghost 按钮 + 上传图标）+ 用户头像 Dropdown
    - **背景**：`backdrop-filter: blur(12px) saturate(180%)`，亮色 `rgba(255,255,255,0.8)` / 暗色 `rgba(10,10,10,0.8)`，底部 1px 边框
    - **固定**：`position: sticky; top: 0; z-index: 100`
    - **高度**：64px，内容垂直居中
    - **无障碍**：主题切换按钮添加 `aria-label="切换主题"` / `"Toggle theme"`，语言切换按钮添加 `aria-label`，所有图标按钮有 `focus-visible` 样式（品牌蓝 outline 2px offset 2px）
  - [ ] Content 区域：
    - 移除 `#f5f5f5` 灰色背景，使用 `var(--color-surface-base)` 纯色
    - 内容区最大宽度 1200px，水平居中，左右 padding 24px（移动端 16px）
    - 顶部留 32px padding（给 sticky header 腾空间）
  - [ ] 移动端响应式（< 768px）：
    - 导航链接隐藏，显示 hamburger 图标按钮
    - 点击打开 Drawer 抽屉式导航，全屏半透明背景 + 左侧滑入导航列表
    - 导航项使用大字号 24px，垂直排列，间距 24px
    - Drawer 内的链接支持键盘导航（Tab 循环、Escape 关闭）
  - [ ] 简历分析 Modal：适配新设计系统的 Modal 风格（细边框、圆角 12px、暗色模式适配，暗色背景使用 Level 2 `#1C1C1C`）
  - [ ] **入场动效**：Header 首次加载从上方滑入（translateY -20px → 0, opacity 0 → 1, 400ms）

- [ ] **App.jsx 路由结构** — `frontend/src/App.jsx`
  - [ ] 保持路由路径和业务逻辑不变
  - [ ] 包裹页面级 `AnimatePresence`（motion），实现路由切换时的 fade 入场 + fade-out-up 退场过渡

**[部署检查点]** — 全站导航在亮/暗模式下正常显示，主题和语言切换功能可用，移动端 Drawer 导航正常

---

### Phase 3: 认证页面重构（登录/注册/忘记密码）

> 用户的第一印象页面。去除所有渐变和饱和色，用极简和精致建立信任感。

- [ ] **LoginPage.jsx 重构** — `frontend/src/pages/LoginPage.jsx`
  - [ ] **整体布局**：
    - 移除渐变背景，使用纯 `var(--color-surface-base)` 背景
    - 页面垂直居中，表单区域 max-width 380px
    - 暗色模式下背景加微妙的径向渐变光晕（品牌蓝 + 品牌青，极低透明度 3-5%，从中心向外扩散），增加深度感
  - [ ] **表单设计**：
    - 顶部：`LogoMark` 组件（居中）+ 标题 `Sora` 24px/600
    - 输入框：1px 边框（`var(--color-border-default)`），圆角 8px，高度 44px，`DM Sans` 15px
    - Focus 态：边框变品牌蓝 + `box-shadow: 0 0 0 3px rgba(0,102,255,0.1)`
    - 登录按钮：全宽，高度 44px，黑底白字（亮色）/ 白底黑字（暗色），`DM Sans` 15px/600，圆角 8px
    - 按钮 hover：`scale(1.01)` + 背景色微调（亮色 `#1a1a1a`，暗色 `#e5e5e5`），transition 200ms
    - 底部链接：`text-secondary` 色，hover 变 `text-primary`，14px
    - 所有交互元素支持 `focus-visible` 样式，Tab 键可在输入框和按钮间导航
  - [ ] **入场动效**：Logo 先出现（fade-in 300ms），表单区域随后 stagger 进入（每个字段延迟 80ms）
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **RegisterPage.jsx 重构** — `frontend/src/pages/RegisterPage.jsx`
  - [ ] 与 LoginPage 完全一致的设计语言和布局
  - [ ] 验证码发送按钮：ghost 风格，与输入框同高，品牌蓝文字，hover 微妙背景色
  - [ ] 倒计时状态：按钮变 disabled，文字变 `text-tertiary`
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **ForgotPasswordPage.jsx 重构** — `frontend/src/pages/ForgotPasswordPage.jsx`
  - [ ] 与 LoginPage 完全一致的设计语言和布局
  - [ ] 所有文案替换为 i18n `t()` 调用

**[部署检查点]** — 登录/注册/忘记密码三个页面在亮暗模式 + 中英文下全部正常

---

### Phase 4: 首页重构

> 产品的"门面"——必须在 3 秒内传达 CodeToWork 的价值主张，同时展示所有功能入口。这是视觉冲击力最重要的页面。

- [ ] **HomePage.jsx 重构** — `frontend/src/pages/HomePage.jsx`
  - [ ] **Hero 区域**（视觉最重要的部分）：
    - 移除紫蓝色渐变，使用纯色背景
    - **背景氛围**：添加微妙的点阵网格背景（`background-image: radial-gradient(circle, var(--color-border-default) 1px, transparent 1px)`，size 24px），营造"精密"感
    - 在网格之上叠加品牌渐变光晕（一个蓝色模糊圆 + 一个青色模糊圆，`filter: blur(120px)`，opacity 0.15），Vercel 标志性的彩色光斑效果
    - **标题**：`Sora` 56px/700（桌面）/ 36px/700（移动），黑白配色
    - 标题中 "Code" 一词使用 `JetBrains Mono` 字体 + 品牌蓝色，形成视觉跳跃
    - 标题末尾显示闪烁光标 `|`（品牌动效）
    - **副标题**：`DM Sans` 18px/400，`text-secondary` 色，max-width 560px 居中
    - **CTA 按钮组**：主按钮（黑底白字 "开始测评" / "Get Started"）+ 次按钮（ghost 风格 "了解更多" / "Learn More"），主按钮 hover 时微妙的品牌渐变背景
    - **间距**：标题上方 120px，标题与副标题 24px，副标题与按钮 40px
  - [ ] **功能卡片区域**（Hero 下方，间距 96px）：
    - **Section 标题**：`Sora` 32px/600 居中 + 副文本 16px `text-secondary`
    - **布局**：Masonry Grid（不等高网格），保留全部 6 个功能入口，打破机械的六等分：
      - **大卡片（featured）**：职业测评 + 模拟面试，占更大面积，视觉突出
      - **标准卡片**：岗位匹配、职业规划、刷题练习
      - **上传卡片**：简历分析，使用虚线边框（`border: 2px dashed var(--color-border-default)`）+ 上传图标 + "上传简历" 文案，点击触发上传流程，hover 时虚线边框变品牌蓝
      - 桌面 3 列，平板 2 列，移动 1 列
    - **卡片风格**：
      - 背景：`var(--color-surface-card)`，1px `var(--color-border-default)` 边框，圆角 12px
      - Hover：边框色过渡到品牌蓝 `#0066FF`（200ms），`translateY(-2px)` + shadow 增强
      - 图标：使用单色线性图标（黑/白），24px，不要彩色背景框
      - 标题：`DM Sans` 18px/600，图标与标题同行
      - 描述：`DM Sans` 14px/400，`text-secondary`，最多 2 行
      - 大卡片（职业测评/模拟面试）：可加一个微妙的品牌渐变底边（2px 高 gradient border-bottom）
    - **入场动效**：卡片使用 `StaggerContainer` 依次出现，每张延迟 100ms，fade-up 效果
  - [ ] **配置状态提示**：如果未配置 API，在 Hero 下方显示一条简洁的 banner（1px 边框 + 品牌蓝文字 + 箭头链接到设置页），不使用 Ant Alert
  - [ ] 所有文案替换为 i18n `t()` 调用

**[部署检查点]** — 首页在各分辨率下布局正确，卡片功能入口全部可点击跳转

---

### Phase 5: 对话类页面重构（测评 + 面试）

> 用户花费最多时间的页面。对话 UI 要沉浸、专注、不分散注意力。借鉴 Terminal/IDE 的视觉语言增加品牌辨识度。

- [ ] **ChatBubble.jsx 重构** — `frontend/src/components/ChatBubble.jsx`
  - [ ] **AI 气泡**：
    - 无背景色（直接在页面上），左对齐
    - 左侧小圆形 Avatar：品牌蓝背景 + 白色 `>_` 符号（brand mark），24px
    - 内容文字：`DM Sans` 15px，`text-primary`
    - AI 消息前缀（可选）：`JetBrains Mono` 小字 `CodeToWork`，`text-tertiary`
  - [ ] **用户气泡**：
    - 浅灰背景（亮色 `gray-100` / 暗色 `gray-800`），右对齐，圆角 16px（左上 4px）
    - 内容文字：`DM Sans` 15px，`text-primary`
  - [ ] **入场动效**：新消息出现时 fade-in + 从下方微移（translateY 8px → 0, 300ms）
  - [ ] 支持暗色模式的完整颜色切换

- [ ] **AssessmentPage.jsx 重构** — `frontend/src/pages/AssessmentPage.jsx`
  - [ ] **整体布局**：max-width 720px 居中，全高（`min-height: calc(100vh - 64px)`）
  - [ ] **聊天区域**：纯净背景（无灰底），消息间距 24px，底部渐变遮罩（内容滚动时底部 fade-out 到背景色）
  - [ ] **输入区域**（固定在底部）：
    - 1px 边框输入框，圆角 12px，高度 48px
    - 右侧发送按钮：圆形 36px，黑底 + 白色箭头图标（↑），hover 时 `scale(1.05)`
    - 输入框 placeholder：`text-tertiary` 色，italic
  - [ ] **完成状态**：不用 Ant Result——自定义极简完成页：
    - 绿色对勾图标（24px，`success` 色）+ `Sora` 24px 标题 "测评完成"
    - 下方按钮组：查看画像（主按钮）+ 返回首页（ghost 按钮）
    - 整体 fade-in 进入
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **InterviewPage.jsx 重构** — `frontend/src/pages/InterviewPage.jsx`
  - [ ] 与 AssessmentPage 共享相同的对话 UI 布局和风格
  - [ ] **面试控制区**：
    - 开始按钮：品牌蓝背景 + 白字，圆角 8px
    - 结束按钮：ghost 风格 + 红色文字（`error` 色），hover 时背景变淡红
    - 按钮区固定在输入框上方
  - [ ] **评估报告 Modal** 重新设计：
    - Modal 宽度 640px，圆角 16px，暗色模式背景 Level 2 `#1C1C1C`
    - **总分**：`JetBrains Mono` 72px/700 大数字 + 品牌渐变色文字（`background-clip: text`），不用圆形 Progress
    - **维度评分**：横向细条形图，高度 4px，背景 `gray-200`，填充品牌蓝，条形右侧显示 `JetBrains Mono` 分数
    - **文字建议**：标题 `DM Sans` 16px/600 + 正文 15px/400，用垂直 2px 品牌蓝竖线作为引用样式（border-left），而非卡片堆叠
    - **入场动效**：数字从 0 count-up 到实际分数（1s ease-out），维度条从 width 0 展开
  - [ ] 所有文案替换为 i18n `t()` 调用

**[部署检查点]** — 核心业务流程验证：职业测评多轮对话 → 完成跳转画像页 → 模拟面试 SSE 流式对话 → 评估报告展示，全流程端到端正常

---

### Phase 6: 结果展示类页面重构（画像 + 匹配 + 规划）

> 数据密集型页面。关键挑战是用极简的视觉语言展示丰富的数据，避免信息过载。

- [ ] **ProfilePage.jsx 重构** — `frontend/src/pages/ProfilePage.jsx`
  - [ ] **布局**：改为全宽单列布局（max-width 800px），信息从上到下流动，减少左右分栏的对称感
  - [ ] **顶部区域**：用户名 + 测评日期 + 操作按钮（重新测评 / 开始匹配），按钮使用 ghost 风格
  - [ ] **RadarChart 区域**：居中显示，max-width 480px，下方是文字总结
  - [ ] **能力评分区**：
    - 每个维度独占一行：维度名（`DM Sans` 14px/500）+ 进度条（4px 高，品牌蓝填充）+ 分数（`JetBrains Mono` 14px）
    - 进度条背景 `gray-200`（亮色）/ `gray-700`（暗色），动态从 0 展开到实际宽度
    - 维度间距 16px，不用卡片包裹
  - [ ] **入场动效**：RadarChart 绘制动画（ECharts animation）+ 进度条 stagger 展开
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **RadarChart.jsx 重构** — `frontend/src/components/RadarChart.jsx`
  - [ ] ECharts 自定义主题适配：
    - 亮色模式：网格线 `gray-200`，填充区域品牌蓝 10% opacity，边线品牌蓝 100%
    - 暗色模式：网格线 `gray-700`，填充区域品牌蓝 15% opacity
    - 字体：`DM Sans`，`text-secondary` 色
    - 形状改为 polygon（直线多边形），更有力量感（区别于默认 circle）
  - [ ] 响应式：height 随容器宽度按比例缩放

- [ ] **MatchingPage.jsx + MatchCard.jsx 重构**
  - [ ] `frontend/src/pages/MatchingPage.jsx`：
    - 两个 Section 用 `Sora` 24px/600 标题区分
    - "推荐岗位"和"突破认知"之间用一条 1px 分割线 + 64px 间距
    - "突破认知"标题旁加一个小 Tag：`JetBrains Mono` 10px 全大写 "DISCOVERY"，边框品牌青色
    - Grid 布局：桌面 3 列，平板 2 列，移动 1 列
  - [ ] `frontend/src/components/MatchCard.jsx`：
    - 卡片：1px 边框，圆角 12px，padding 20px
    - **匹配度数字**：右上角 `JetBrains Mono` 28px/700 + `%` 后缀 12px（取代圆形 Progress），颜色逻辑：≥80 品牌青，≥60 品牌蓝，<60 `text-tertiary`
    - **职位名**：`DM Sans` 18px/600，下方分类 Tag 使用 ghost 小标签（1px 边框 + `text-secondary`）
    - **展开区维度条**：与 ProfilePage 的进度条风格一致（4px 高，品牌蓝）
    - Hover：边框色过渡到品牌蓝，`translateY(-2px)`，transition 200ms
    - "突破认知"卡片：左侧 3px 品牌青竖线（border-left）代替紫色全边框
  - [ ] **入场动效**：卡片 stagger fade-up，100ms 间隔
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **CareerPlanPage.jsx 重构** — `frontend/src/pages/CareerPlanPage.jsx`
  - [ ] **Timeline 重新设计**：
    - 竖线：1px `var(--color-border-default)`，左侧偏移 20px
    - 节点圆点：8px 实心圆，品牌蓝色（所有阶段统一颜色，不用多彩）
    - 当前/最近阶段的圆点：外围加一圈品牌蓝 glow（`box-shadow: 0 0 8px rgba(0,102,255,0.4)`）
    - 阶段标签：`JetBrains Mono` 12px 全大写，如 `SHORT TERM` / `MID TERM` / `LONG TERM`，`text-tertiary` 色
  - [ ] **规划内容卡片**：
    - 不使用 Ant Card，改为简洁的 `div` + 左侧 2px 品牌蓝竖线（border-left）+ padding-left 16px
    - 标题 `DM Sans` 16px/600 + 正文 15px/400
    - 不同阶段的内容用间距（40px）和阶段标签区分，不用颜色
  - [ ] **技能路径**：使用简洁的表格或列表视图，`JetBrains Mono` 显示技能名称，进度用 tag 表示
  - [ ] **入场动效**：Timeline 从上到下依次出现，每个节点延迟 150ms
  - [ ] 所有文案替换为 i18n `t()` 调用

**[部署检查点]** — 画像/匹配/规划三个数据展示页在亮暗模式下数据正确渲染

---

### Phase 7: 工具类页面重构（刷题 + 设置 + 统计）

> 功能性页面，设计重点是清晰的信息层级和舒适的操作体验。

- [ ] **QuizPage.jsx 重构** — `frontend/src/pages/QuizPage.jsx`
  - [ ] **布局**：保持左右分栏（桌面端），但比例调整为 3:1（题目区更宽），移动端改为单列
  - [ ] **题目区域**：
    - 题目编号：`JetBrains Mono` 12px `text-tertiary`，如 `#042`
    - 题目内容：`DM Sans` 18px/500
    - 选项：1px 边框卡片，圆角 8px，hover 边框品牌蓝，选中时品牌蓝背景 + 白字
  - [ ] **结果反馈**（含状态切换动效）：
    - 正确：绿色对勾 + `text-primary` 文字 "正确" + 淡绿色左侧竖线（border-left 3px `success` 色），背景色从无到 `rgba(0,212,170,0.05)` 渐变 300ms
    - 错误：红色叉 + `text-primary` 文字 "错误" + 淡红色左侧竖线，背景色从无到 `rgba(239,68,68,0.05)` 渐变 300ms
    - 图标入场：`scale(0→1.2→1)` 弹跳效果，200ms ease-out
    - 解析文字：正常 `text-secondary` 色排版，无背景色块
  - [ ] **编程/填空题输入框**：
    - Tab 键拦截：在代码输入框中按 Tab 插入 4 个空格（`\u0020\u0020\u0020\u0020`），而非跳转到下一个表单元素
    - 使用 `JetBrains Mono` 字体，模拟代码编辑器体验
  - [ ] **统计 sidebar**：
    - 正确率：`JetBrains Mono` 48px/700 大数字 + `%` 后缀 18px，取代圆形 Progress
    - 统计数据：用 label + value 的简洁列表，value 使用 `JetBrains Mono`
    - 标签：ghost 小 Tag，1px 边框，已掌握用 `success` 色边框，需加强用 `warning` 色边框
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **SettingsPage.jsx 重构** — `frontend/src/pages/SettingsPage.jsx`
  - [ ] **模式切换**：使用自定义的 Segmented 控件（两个选项），选中态黑底白字（亮色）/ 白底黑字（暗色），圆角 8px
  - [ ] **API 配置表单**：与登录页输入框完全一致的风格（1px 边框 + focus glow）
  - [ ] **能力检测结果**：Tag 使用统一的 ghost 风格（1px 边框 + `text-secondary`），通过的 Tag 前加绿色小圆点 6px
  - [ ] **定价面板**（如有）：
    - 三列卡片，1px 边框，推荐方案加粗边框 2px 品牌蓝 + 顶部 "RECOMMENDED" 小 Tag
    - 价格数字使用 `JetBrains Mono` 36px/700
    - 功能列表使用对勾图标 + 文字
  - [ ] **功能可用性**：简洁的列表替代网格，每行显示功能名 + 状态 Tag
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **UsagePage.jsx 重构** — `frontend/src/pages/UsagePage.jsx`
  - [ ] **统计卡片**：
    - 4 列网格（桌面），2 列（平板），1 列（移动）
    - 数字：`JetBrains Mono` 36px/700，`text-primary`
    - 标签：`DM Sans` 13px/400，`text-tertiary`，在数字上方
    - 卡片：1px 边框，圆角 12px，无阴影
    - **入场动效**：数字 count-up 动画（0 到实际值，800ms ease-out）
  - [ ] **表格**：
    - 去掉内部竖线，只保留行分隔线（1px `var(--color-border-default)`）
    - 表头：`DM Sans` 13px/600 全大写，`text-tertiary`
    - 行 hover：背景变 `var(--color-surface-hover)`
    - 日期/数字列使用 `JetBrains Mono`
  - [ ] 所有文案替换为 i18n `t()` 调用

**[部署检查点]** — 刷题/设置/统计三个工具页功能完整可用

---

### Phase 8: 通用组件、状态设计与无障碍规范

> 辅助组件统一适配新设计系统；补充错误、空、加载等边缘状态设计；确保全站无障碍合规。

- [ ] **ResumeReport.jsx 重构** — `frontend/src/components/ResumeReport.jsx`
  - [ ] **总分**：`JetBrains Mono` 64px/700 大数字 + 品牌渐变色文字，取代圆形 Progress
  - [ ] **各 Section 统一排版**：
    - Section 标题：`DM Sans` 16px/600，上方 32px 间距
    - 优势条目：左侧 3px `success` 色竖线 + 绿色小圆点图标
    - 不足条目：左侧 3px `warning` 色竖线 + 橙色小三角图标
    - 建议条目：左侧 3px 品牌蓝竖线 + 蓝色箭头图标
    - 移除所有硬编码颜色（#389e0d、#d48806），使用语义变量
  - [ ] **适合方向**：Tag 使用统一 ghost 风格
  - [ ] **入场动效**：分数 count-up + sections stagger fade-in

- [ ] **ProtectedRoute.jsx 重构** — `frontend/src/components/ProtectedRoute.jsx`
  - [ ] 移除 Ant Result 组件，自定义极简未登录提示页：
    - 页面居中，锁形图标（24px，`text-tertiary`）+ `Sora` 20px 标题 + `DM Sans` 14px 说明
    - "去登录" 按钮：主按钮风格（黑底白字）
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **FeatureGuard.jsx 重构** — `frontend/src/components/FeatureGuard.jsx`
  - [ ] 移除 Ant Result 组件，自定义极简提示页：
    - 未配置提示：设置齿轮图标 + 标题 + "去配置" 按钮
    - 不可用提示：信息图标 + 标题 + 说明文字
    - 两种状态共用一个提示组件，通过 props 控制图标和文案
  - [ ] 所有文案替换为 i18n `t()` 调用

- [ ] **错误/空/加载状态设计**
  - [ ] 创建 `frontend/src/components/EmptyState.jsx` — 统一空状态组件：
    - 支持 `icon`、`title`、`description`、`action`（按钮）props
    - 默认布局：页面居中，图标 40px `text-tertiary` + 标题 `Sora` 18px/600 + 描述 `DM Sans` 14px `text-secondary`
    - 预设场景：暂无匹配结果、暂无刷题记录、暂无使用记录等
    - 所有文案使用 i18n
  - [ ] 创建 `frontend/src/components/ErrorState.jsx` — 统一错误状态组件：
    - API 调用失败时展示：错误图标 + 错误信息 + "重试" 按钮
    - 支持 `onRetry` 回调
    - 网络错误和服务器错误使用不同文案
  - [ ] 创建 `frontend/src/components/LoadingSkeleton.jsx` — 品牌化加载状态：
    - 替代 Ant Design 的 Spin，使用品牌光标闪烁 `>_` 作为加载标识
    - 支持 `variant` prop：`cursor`（光标闪烁，用于对话页）、`skeleton`（骨架屏，用于数据页）
    - 骨架屏使用 `var(--color-surface-hover)` 背景 + `shimmer` 动画
  - [ ] 创建 `frontend/src/components/Toast.jsx` — 轻量 Toast 通知组件：
    - 替代 Ant Design 的 message 全局提示，更符合极简设计语言
    - 从页面顶部滑入，3 秒后自动消失
    - 类型：success（品牌青边框）、error（红色边框）、info（品牌蓝边框）
    - 无背景色块，仅使用左侧 3px 色条 + 文字
  - [ ] 在各页面中集成空/错误/加载状态组件，替换现有的 Ant Spin / 硬编码提示

- [ ] **无障碍（Accessibility）规范**
  - [ ] 全局 `focus-visible` 样式：所有可交互元素获得焦点时显示 `outline: 2px solid var(--color-brand); outline-offset: 2px`，在 `index.css` 中统一定义
  - [ ] 图标按钮 `aria-label`：Header 中主题切换、语言切换、hamburger 菜单、简历上传等纯图标按钮全部添加 `aria-label`
  - [ ] 键盘导航：所有页面支持 Tab 键顺序导航，Enter/Space 触发按钮和链接，Escape 关闭 Modal/Drawer
  - [ ] 语义化 HTML：确保使用正确的 `<nav>`、`<main>`、`<section>`、`<article>` 标签

**[部署检查点]** — 所有通用组件适配完成，空/错误/加载状态在各页面正确显示

---

### Phase 9: 全局一致性检查与回归测试

> 最终阶段：全局审计视觉一致性、响应式适配、i18n 完整性，以及全部业务流程的回归测试。

- [ ] **暗色模式全面审计**
  - [ ] 逐页检查所有文字在暗色背景上的对比度是否符合 WCAG AA 标准（≥ 4.5:1）
  - [ ] 检查所有 `style={{}}` 内联样式中的硬编码颜色是否已替换为 CSS 变量
  - [ ] 检查暗色模式表面层级是否严格遵循 Level 0-3 规范（`#0A0A0A` → `#141414` → `#1C1C1C` → `#242424`）
  - [ ] 检查暗色模式边框是否统一使用 `rgba(255,255,255,0.08)` 基底
  - [ ] ECharts 图表（RadarChart）在暗色模式下的网格线、文字、填充色是否适配
  - [ ] Modal、Dropdown、Drawer 等浮层组件的暗色模式背景和边框
  - [ ] Ant Design 组件（Table、Tag、Badge 等）的暗色模式是否被主题正确覆盖
  - [ ] 品牌渐变光晕在暗色模式下的效果是否自然

- [ ] **响应式适配全面检查**
  - [ ] 移动端（< 768px）：所有页面布局、字号、间距
  - [ ] 平板（768-1024px）：网格列数、卡片布局
  - [ ] Header hamburger 菜单和 Drawer 导航功能正常
  - [ ] 对话页面输入框在移动端键盘弹出时的表现
  - [ ] Masonry Grid 在小屏幕退化为单列

- [ ] **i18n 完整性检查**
  - [ ] 所有硬编码中文文案已替换为 `t()` 调用
  - [ ] 中英文切换后所有页面文案正确显示
  - [ ] 英文模式下的排版、间距是否合理（英文通常比中文长）
  - [ ] Ant Design 组件的 locale 切换正常（日期选择器、分页器等）

- [ ] **字体加载优化**
  - [ ] Google Fonts 使用 `display=swap` 确保字体加载期间有 fallback
  - [ ] 检查所有自定义字体是否正确应用（标题 Sora、正文 DM Sans、数据 JetBrains Mono）
  - [ ] `Alibaba PuHuiTi 3.0` 中文字体的 `unicode-range` 子集化是否生效，加载体积是否在预期范围内

- [ ] **动效一致性检查**
  - [ ] 所有页面入场动画的时序和缓动函数一致（fade-up, 400-600ms, ease-out）
  - [ ] 所有页面退场动画一致（fade-out-up, 200ms, ease-in）
  - [ ] 所有卡片 hover 效果一致（translateY -2px, 边框高亮, 200ms）
  - [ ] 所有按钮 hover 效果一致（scale 1.01-1.02, 背景色过渡, 200ms）
  - [ ] 品牌光标闪烁动画在出现的所有位置节奏一致（530ms step-end）
  - [ ] 刷题页答题反馈的状态切换动效正常（背景渐变 + 图标弹跳）
  - [ ] `prefers-reduced-motion` 媒体查询：尊重用户的减少动画偏好，动画正确降级

- [ ] **无障碍检查**
  - [ ] 所有图标按钮均有 `aria-label`
  - [ ] 所有可交互元素有 `focus-visible` 样式
  - [ ] Tab 键导航顺序在所有页面合理
  - [ ] 刷题页代码输入框 Tab 键正确插入 4 空格而非跳转

- [ ] **核心业务流程回归测试**
  - [ ] 登录 / 注册（含邮箱验证码）/ 忘记密码 流程正常
  - [ ] 简历上传（PDF/DOCX/TXT）和分析结果展示正常
  - [ ] 职业测评多轮对话功能正常，消息正确显示
  - [ ] 测评完成后自动跳转画像页，画像数据正确展示
  - [ ] 岗位匹配结果展示正常，推荐岗位和突破认知正确分区
  - [ ] 模拟面试 SSE 流式对话正常，流式文字逐字显示
  - [ ] 面试评估报告 Modal 正确展示所有维度和建议
  - [ ] 职业规划 Timeline 和技能路径正确展示
  - [ ] 刷题功能正常（单选/多选/判断/填空 4 种题型），答案提交和结果反馈正常
  - [ ] 设置页面 API 配置保存和能力检测正常
  - [ ] 使用统计页面数据加载和表格展示正常
  - [ ] 各页面空状态、错误状态、加载状态正确显示

- [ ] **保护机制测试**
  - [ ] 未登录用户访问受保护页面时显示登录提示
  - [ ] 未配置 API 时 FeatureGuard 显示配置提示
  - [ ] Token 过期后自动刷新或提示重新登录
  - [ ] 钱包/积分状态跨页面同步正常

- [ ] **新功能测试**
  - [ ] 亮色 ↔ 暗色主题切换在所有 12 个页面正常，刷新后状态保持
  - [ ] 中文 ↔ 英文语言切换在所有页面正常，刷新后状态保持
  - [ ] 主题和语言偏好正确持久化到 localStorage

- [ ] **兼容性测试**
  - [ ] Chrome / Firefox / Safari / Edge 桌面浏览器
  - [ ] iOS Safari / Android Chrome 移动浏览器
  - [ ] 各分辨率（1920px / 1440px / 1024px / 768px / 375px）下布局正确

**[最终部署]** — 全部检查通过后发布
