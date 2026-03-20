QUIZ_GENERATE_PROMPT_ZH = """你是一位专业的技术面试出题官。请根据以下要求生成一道题目。

## 要求
- 考察内容：{topic}
- 题型：{question_type}
- 难度：中等偏上，贴近实际面试/笔试水平

{memory_context}

## 题型说明
- 判断题：给出一个技术陈述，用户判断对或错
- 选择题：给出题目和 A/B/C/D 四个选项，只有一个正确答案
- 简答题：给出一个开放性技术问题，需要用文字回答
- 编程题：给出一个编程问题，需要用代码实现（不要求运行，考察思路和代码能力）

## 输出 JSON 格式

```json
{{
  "question": "题目文本（编程题包含输入输出示例）",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
  "knowledge_point": "该题考察的具体知识点（如：列表推导式、TCP三次握手、二叉树遍历）",
  "difficulty": "简单/中等/困难",
  "correct_answer": "正确答案（判断题填'对'或'错'，选择题填'A/B/C/D'，简答题和编程题填参考答案）",
  "explanation": "详细解析，解释为什么这个答案是正确的，涉及的核心知识点"
}}
```

注意：
- options 字段仅选择题需要，其他题型设为空数组 []
- knowledge_point 要具体到细分知识点，不要只写大类
- 不要出和已掌握知识点列表中重复的题目
- 优先考察薄弱知识点列表中的内容，但要换不同的角度或题型"""

QUIZ_GENERATE_PROMPT_EN = """You are a professional technical interview question designer. Please generate one question based on the following requirements.

## Requirements
- Topic: {topic}
- Question Type: {question_type}
- Difficulty: Upper-intermediate, close to real interview/exam level

{memory_context}

## Question Type Descriptions
- True/False: Provide a technical statement for the user to judge as true or false
- Multiple Choice: Provide a question with A/B/C/D four options, only one correct answer
- Short Answer: Provide an open-ended technical question requiring a written response
- Coding: Provide a programming problem requiring code implementation (no execution needed — tests logic and coding ability)

## Output JSON Format

```json
{{
  "question": "Question text (coding questions include input/output examples)",
  "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
  "knowledge_point": "Specific knowledge point tested (e.g., list comprehension, TCP three-way handshake, binary tree traversal)",
  "difficulty": "Easy/Medium/Hard",
  "correct_answer": "Correct answer (True/False for true/false questions, A/B/C/D for multiple choice, reference answer for short answer and coding)",
  "explanation": "Detailed explanation of why this answer is correct and the core knowledge points involved"
}}
```

Notes:
- The options field is only needed for multiple choice questions; set to empty array [] for other types
- knowledge_point should be specific to a sub-topic, not just a broad category
- Do not repeat questions on already mastered knowledge points
- Prioritize testing weak knowledge points, but use different angles or question types"""

QUIZ_JUDGE_PROMPT_ZH = """你是一位严谨的技术评判官。请根据题目和用户的回答判断是否正确。

## 题目信息
- 题型：{question_type}
- 题目：{question}
- 正确答案：{correct_answer}
- 知识点：{knowledge_point}

## 用户回答
{user_answer}

## 判断规则
- 判断题和选择题：答案必须完全匹配才算正确
- 简答题：核心要点答对即可，不要求措辞完全一致，但关键概念不能遗漏
- 编程题：代码逻辑正确即可，不要求和参考答案完全一致，允许不同的实现方式

## 输出 JSON 格式

```json
{{
  "is_correct": true,
  "explanation": "详细解析：解释正确答案是什么、为什么，以及用户回答的对错分析",
  "correct_answer": "正确答案的完整内容"
}}
```"""

QUIZ_JUDGE_PROMPT_EN = """You are a rigorous technical judge. Please determine whether the user's answer is correct based on the question and the correct answer.

## Question Information
- Question Type: {question_type}
- Question: {question}
- Correct Answer: {correct_answer}
- Knowledge Point: {knowledge_point}

## User's Answer
{user_answer}

## Judging Rules
- True/False and Multiple Choice: The answer must match exactly to be considered correct
- Short Answer: Core points must be correct — exact wording is not required, but key concepts must not be missing
- Coding: Code logic must be correct — does not need to match the reference answer exactly, different implementations are allowed

## Output JSON Format

```json
{{
  "is_correct": true,
  "explanation": "Detailed analysis: explain what the correct answer is, why, and analyze the user's answer",
  "correct_answer": "Full content of the correct answer"
}}
```"""


def get_quiz_generate_prompt(language: str = "zh") -> str:
    return QUIZ_GENERATE_PROMPT_EN if language == "en" else QUIZ_GENERATE_PROMPT_ZH


def get_quiz_judge_prompt(language: str = "zh") -> str:
    return QUIZ_JUDGE_PROMPT_EN if language == "en" else QUIZ_JUDGE_PROMPT_ZH
