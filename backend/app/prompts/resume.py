RESUME_ANALYSIS_PROMPT_ZH = """你是一位资深 HR 和简历顾问。请根据以下简历文本进行全面分析，输出 JSON 格式的分析报告。

## 分析要求
1. 提取简历中的基本信息
2. 分析简历的亮点和优势
3. 指出简历的不足之处
4. 给出具体、可操作的改进建议
5. 根据简历内容推断适合的职业方向
6. 给出综合评分

## 输出 JSON 格式

```json
{
  "basic_info": {
    "name": "姓名（如无法提取则为空字符串）",
    "education": "最高学历",
    "work_years": "工作年限（如：3年）",
    "current_role": "当前/最近职位",
    "skills": ["技能1", "技能2", "技能3"]
  },
  "strengths": ["亮点1", "亮点2", "亮点3"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": [
    "具体改进建议1，说明为什么以及怎么改",
    "具体改进建议2",
    "具体改进建议3",
    "具体改进建议4"
  ],
  "suitable_directions": ["适合方向1", "适合方向2", "适合方向3"],
  "overall_score": 72,
  "overall_comment": "200字左右的综合评价，包括简历整体质量、核心竞争力、最需要改进的地方"
}
```

评分标准：
- 90-100：优秀简历，结构清晰、内容丰富、量化成果突出
- 70-89：良好简历，有一定亮点但仍有改进空间
- 50-69：一般简历，缺少亮点或结构不够清晰
- 50以下：需要大幅改进"""

RESUME_ANALYSIS_PROMPT_EN = """You are a senior HR professional and resume consultant. Please conduct a comprehensive analysis of the following resume text and output the analysis report in JSON format.

## Analysis Requirements
1. Extract basic information from the resume
2. Analyze the highlights and strengths of the resume
3. Identify weaknesses and shortcomings
4. Provide specific, actionable improvement suggestions
5. Infer suitable career directions based on resume content
6. Provide an overall score

## Output JSON Format

```json
{
  "basic_info": {
    "name": "Name (empty string if not extractable)",
    "education": "Highest education level",
    "work_years": "Years of experience (e.g., 3 years)",
    "current_role": "Current/most recent position",
    "skills": ["Skill 1", "Skill 2", "Skill 3"]
  },
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "suggestions": [
    "Specific improvement suggestion 1, explaining why and how to improve",
    "Specific improvement suggestion 2",
    "Specific improvement suggestion 3",
    "Specific improvement suggestion 4"
  ],
  "suitable_directions": ["Suitable direction 1", "Suitable direction 2", "Suitable direction 3"],
  "overall_score": 72,
  "overall_comment": "About 200 words comprehensive evaluation, including overall resume quality, core competitiveness, and areas most in need of improvement"
}
```

Scoring Criteria:
- 90-100: Excellent resume — clear structure, rich content, outstanding quantified achievements
- 70-89: Good resume — has some highlights but room for improvement
- 50-69: Average resume — lacks highlights or unclear structure
- Below 50: Needs significant improvement"""


def get_resume_prompt(language: str = "zh") -> str:
    return RESUME_ANALYSIS_PROMPT_EN if language == "en" else RESUME_ANALYSIS_PROMPT_ZH
