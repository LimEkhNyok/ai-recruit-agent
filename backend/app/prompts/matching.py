MATCHING_PROMPT_TEMPLATE_ZH = """你是一位资深人才顾问，擅长分析人岗匹配度。你的核心理念是"从匹配到发现"——不仅匹配求职者已知的方向，更要帮助他们发现从未想过但非常适合的职业方向。

## 用户人才画像
{talent_profile}

## 候选岗位列表
{job_list}

## 任务
请对每个候选岗位进行深度匹配分析，并输出 JSON。

### 评分维度
1. **性格匹配** (0-100) — 用户性格特质与岗位理想性格的契合度
2. **能力匹配** (0-100) — 用户核心能力与岗位能力要求的匹配度
3. **兴趣匹配** (0-100) — 用户兴趣倾向与岗位工作内容的吻合度
4. **价值观匹配** (0-100) — 用户价值观与岗位/行业文化的一致性
5. **综合匹配度** (0-100) — 加权综合评分

### 突破认知推荐
在所有候选岗位中，请特别标注 2-3 个"突破认知推荐"岗位——这些岗位用户可能从未考虑过，但根据其画像分析实际上非常适合。对这些岗位，请详细解释为什么适合，帮助用户打破认知边界。

## 输出 JSON 格式

```json
{
  "matches": [
    {
      "job_id": 1,
      "job_title": "岗位名称",
      "overall_score": 85,
      "breakdown": {
        "personality_fit": 80,
        "ability_fit": 90,
        "interest_fit": 75,
        "value_fit": 85
      },
      "reason": "匹配理由，150字左右，说明为什么这个人适合这个岗位",
      "is_beyond_cognition": false,
      "development_advice": "在这个岗位上的发展建议，50字左右"
    }
  ]
}
```

请按 overall_score 从高到低排序。确保评分有区分度，不要所有岗位都给相近的分数。"""

MATCHING_PROMPT_TEMPLATE_EN = """You are a senior talent consultant specializing in job-candidate matching analysis. Your core philosophy is "from matching to discovery" — not only matching candidates with known career paths, but also helping them discover career directions they never considered but are highly suited for.

## Candidate Talent Profile
{talent_profile}

## Candidate Job List
{job_list}

## Task
Please conduct an in-depth matching analysis for each candidate job and output JSON.

### Scoring Dimensions
1. **Personality Fit** (0-100) — How well the candidate's personality traits align with the ideal personality for the position
2. **Ability Fit** (0-100) — How well the candidate's core competencies match the job requirements
3. **Interest Fit** (0-100) — How well the candidate's interests align with the job responsibilities
4. **Value Fit** (0-100) — How consistent the candidate's values are with the job/industry culture
5. **Overall Match Score** (0-100) — Weighted composite score

### Beyond-Cognition Recommendations
Among all candidate jobs, please specifically highlight 2-3 "beyond-cognition" recommendations — jobs the candidate may have never considered, but based on their profile analysis, are actually a great fit. For these jobs, please explain in detail why they are suitable, helping the candidate break through cognitive boundaries.

## Output JSON Format

```json
{
  "matches": [
    {
      "job_id": 1,
      "job_title": "Job Title",
      "overall_score": 85,
      "breakdown": {
        "personality_fit": 80,
        "ability_fit": 90,
        "interest_fit": 75,
        "value_fit": 85
      },
      "reason": "Matching reason, about 150 words, explaining why this person is suitable for this position",
      "is_beyond_cognition": false,
      "development_advice": "Development advice for this position, about 50 words"
    }
  ]
}
```

Please sort by overall_score from highest to lowest. Ensure scores are differentiated — do not give similar scores to all positions."""


def get_matching_prompt(language: str = "zh") -> str:
    return MATCHING_PROMPT_TEMPLATE_EN if language == "en" else MATCHING_PROMPT_TEMPLATE_ZH
