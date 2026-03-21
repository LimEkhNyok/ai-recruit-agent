JD_ANALYSIS_PROMPT_ZH = """你是一位专业的招聘分析师。请分析以下岗位 JD（职位描述），提取关键信息并以 JSON 格式输出。

## 输出 JSON 格式

```json
{
  "title": "职位名称",
  "tech_stack": ["技术栈1", "技术栈2"],
  "key_points": ["核心能力要求1", "核心能力要求2"],
  "requirements": ["岗位要求1", "岗位要求2"],
  "bonus": ["加分项1", "加分项2"],
  "responsibilities": "工作职责摘要（100字以内）"
}
```

## 提取规则
- title：从 JD 中提取或推断出最准确的职位名称
- tech_stack：所有提到的编程语言、框架、工具、平台等技术要求
- key_points：核心能力和素质要求（如算法能力、系统设计、沟通能力等）
- requirements：硬性要求（如学历、工作年限、证书等）
- bonus：加分项或优先条件
- responsibilities：用一段话概括主要工作职责

如果 JD 中某个字段没有相关信息，返回空数组或空字符串。"""

JD_ANALYSIS_PROMPT_EN = """You are a professional recruitment analyst. Analyze the following job description (JD), extract key information, and output in JSON format.

## Output JSON Format

```json
{
  "title": "Job Title",
  "tech_stack": ["Tech 1", "Tech 2"],
  "key_points": ["Core requirement 1", "Core requirement 2"],
  "requirements": ["Requirement 1", "Requirement 2"],
  "bonus": ["Bonus 1", "Bonus 2"],
  "responsibilities": "Brief summary of responsibilities (under 100 words)"
}
```

## Extraction Rules
- title: Extract or infer the most accurate job title from the JD
- tech_stack: All mentioned programming languages, frameworks, tools, platforms, and other technical requirements
- key_points: Core competencies and qualities required (e.g., algorithm skills, system design, communication)
- requirements: Hard requirements (e.g., education, years of experience, certifications)
- bonus: Nice-to-have or preferred qualifications
- responsibilities: Summarize the main responsibilities in one paragraph

If no relevant information exists for a field, return an empty array or empty string."""


def get_jd_analysis_prompt(language: str = "zh") -> str:
    return JD_ANALYSIS_PROMPT_EN if language == "en" else JD_ANALYSIS_PROMPT_ZH
