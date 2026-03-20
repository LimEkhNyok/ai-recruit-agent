"""Chinese-to-English translation map for job titles and categories."""

TITLE_EN = {
    "前端工程师": "Frontend Engineer",
    "后端工程师": "Backend Engineer",
    "产品经理": "Product Manager",
    "UI 设计师": "UI Designer",
    "数据分析师": "Data Analyst",
    "运营经理": "Operations Manager",
    "测试工程师": "QA Engineer",
    "算法工程师": "Algorithm Engineer",
    "项目经理": "Project Manager",
    "技术总监": "Technical Director",
    "增长黑客": "Growth Hacker",
    "DevOps 工程师": "DevOps Engineer",
    "安全工程师": "Security Engineer",
    "内容运营": "Content Operations",
    "用户研究员": "User Researcher",
    "市场营销经理": "Marketing Manager",
    "全栈工程师": "Full-Stack Engineer",
    "商业分析师": "Business Analyst",
}

CATEGORY_EN = {
    "技术": "Technology",
    "产品": "Product",
    "设计": "Design",
    "数据": "Data",
    "运营": "Operations",
    "管理": "Management",
    "市场": "Marketing",
}


def translate_title(title: str, language: str) -> str:
    if language == "en":
        return TITLE_EN.get(title, title)
    return title


def translate_category(category: str, language: str) -> str:
    if language == "en":
        return CATEGORY_EN.get(category, category)
    return category
