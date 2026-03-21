# 模拟面试：支持语音输入

## 背景和要求

### 背景
当前模拟面试只支持文字输入，与真实面试体验差距大。接入浏览器原生语音识别 API（Web Speech API），让用户可以语音作答，接近真实面试场景。Web Speech API 免费、零后端成本，是最轻量的实现方案。

### 要求
- 功能要求：
  - 面试页输入框旁增加麦克风按钮，点击开始/停止语音识别
  - 语音识别结果实时填入文本框，用户可在提交前编辑修正
  - 支持中文识别（`lang: 'zh-CN'`）
  - 录音状态有明确的视觉反馈（如按钮变色、脉冲动画）
- 技术约束：
  - 使用浏览器原生 `Web Speech API`（`webkitSpeechRecognition` / `SpeechRecognition`）
  - 纯前端实现，不涉及后端改动
  - 浏览器不支持时优雅降级：隐藏麦克风按钮，不影响现有文字输入功能
- 兼容性说明：
  - Chrome / Edge 支持最好
  - Safari 部分支持
  - Firefox 不支持，降级为纯文字输入
  - 依赖 Google 语音服务，国内网络可能不稳定（远期可考虑讯飞/阿里语音 API 备选）

## 实施步骤

### Phase 1: 语音识别 Hook 封装

- [ ] 创建自定义 Hook `useSpeechRecognition`
  - [ ] 在 `frontend/src/hooks/` 下新建 `useSpeechRecognition.js`
  - [ ] 封装 `webkitSpeechRecognition` / `SpeechRecognition` 的创建和配置
  - [ ] 配置参数：`lang='zh-CN'`、`continuous=true`、`interimResults=true`
  - [ ] 暴露的状态：
    - `isListening: boolean` — 是否正在录音
    - `isSupported: boolean` — 当前浏览器是否支持
    - `transcript: string` — 当前识别到的文本
    - `interimTranscript: string` — 临时识别结果（正在说的部分）
  - [ ] 暴露的方法：
    - `startListening()` — 开始录音
    - `stopListening()` — 停止录音
    - `resetTranscript()` — 清空识别文本
  - [ ] 事件处理：
    - `onresult` — 区分 `isFinal` 和 interim 结果，拼接到 transcript
    - `onerror` — 错误处理（网络错误、权限拒绝等），通过回调通知调用方
    - `onend` — 录音意外结束时，如果 `isListening` 仍为 true 则自动重启（处理浏览器超时断开的情况）
  - [ ] 组件卸载时自动调用 `recognition.stop()` 清理资源

### Phase 2: 面试页集成语音输入

- [ ] 修改 `InterviewPage.jsx` 输入区域
  - [ ] 引入 `useSpeechRecognition` Hook
  - [ ] 在输入框（TextArea / Input）右侧添加麦克风图标按钮
  - [ ] 按钮逻辑：
    - `isSupported` 为 false 时不渲染按钮
    - 点击按钮切换 `startListening()` / `stopListening()`
    - 录音中按钮变为红色并带有脉冲动画（CSS `@keyframes pulse`）
    - 非录音状态按钮为默认灰色
  - [ ] 文本同步逻辑：
    - 语音识别产生文本时，追加到输入框现有内容后面（不覆盖用户已输入的文字）
    - `interimTranscript` 以浅色/斜体样式临时显示在输入框中，`isFinal` 后替换为正式文本
    - 用户可以在语音输入的同时手动编辑文本
  - [ ] 提交行为：
    - 用户点击发送或按 Enter 时，自动停止录音
    - 发送后清空 transcript 状态
- [ ] 添加语音状态提示
  - [ ] 录音中在输入框上方显示小提示条："正在录音..." + 时长计时
  - [ ] 如果因网络或权限问题录音失败，显示友好的错误提示（如"语音识别不可用，请使用文字输入"）

### Phase 3: 样式与动画

- [ ] 麦克风按钮样式
  - [ ] 使用 Ant Design 的 `AudioOutlined` 图标（或类似的麦克风图标）
  - [ ] 适配暗黑/亮色主题（从 `themeStore` 读取当前主题）
  - [ ] 按钮大小与输入框高度对齐
- [ ] 录音脉冲动画
  - [ ] CSS `@keyframes` 实现按钮外围脉冲光圈效果
  - [ ] 动画颜色：录音中红色脉冲，与 Ant Design 色彩体系一致
- [ ] 响应式适配
  - [ ] 移动端：按钮不能挤压输入框宽度，必要时使用 Tooltip 替代文字提示
