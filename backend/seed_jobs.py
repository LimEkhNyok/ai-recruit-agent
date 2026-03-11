# -*- coding: utf-8 -*-
"""Seed the job_positions table with typical internet-industry roles + embeddings."""
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import engine, AsyncSessionLocal, Base
import app.models  # noqa: F401
from app.models.job import JobPosition
from app.services.model_service import ModelService
from app.config import get_settings

JOBS = [
    {
        "title": "前端工程师",
        "category": "技术",
        "description": "负责公司 Web 产品的前端开发与优化，使用 React/Vue 等框架构建高质量用户界面，与设计师和后端工程师紧密协作，确保产品体验流畅、性能优异。",
        "requirements": ["精通 HTML/CSS/JavaScript", "熟练使用 React 或 Vue", "了解前端工程化工具链", "有性能优化经验", "良好的审美和用户体验意识"],
        "culture_keywords": ["技术驱动", "用户体验", "快速迭代", "开放协作"],
        "personality_fit": {"ideal_mbti": ["ENFP", "ENTP", "INFP", "INTP"], "ei_range": [30, 80], "tf_range": [20, 60]},
        "ability_requirements": {"logical_analysis": 75, "creativity": 80, "communication": 65, "execution": 70, "learning": 85, "teamwork": 70},
        "interest_tags": ["技术研发", "产品设计", "用户研究"],
    },
    {
        "title": "后端工程师",
        "category": "技术",
        "description": "负责服务端架构设计与核心业务逻辑开发，构建高可用、高性能的后端服务，设计数据库方案，编写 API 接口，保障系统稳定运行。",
        "requirements": ["精通 Python/Java/Go 至少一门", "熟悉 MySQL/Redis 等数据库", "了解微服务架构", "有高并发系统经验", "良好的代码规范意识"],
        "culture_keywords": ["技术深度", "系统稳定", "架构思维", "持续优化"],
        "personality_fit": {"ideal_mbti": ["INTJ", "ISTJ", "INTP", "ENTJ"], "ei_range": [10, 60], "tf_range": [10, 45]},
        "ability_requirements": {"logical_analysis": 90, "creativity": 60, "communication": 55, "execution": 80, "learning": 85, "teamwork": 60},
        "interest_tags": ["技术研发", "数据分析"],
    },
    {
        "title": "产品经理",
        "category": "产品",
        "description": "负责产品规划与需求分析，通过用户调研和数据分析洞察用户需求，制定产品路线图，协调设计、开发、运营团队推动产品落地，持续优化产品体验。",
        "requirements": ["优秀的需求分析能力", "熟练使用 Axure/Figma 等工具", "数据驱动思维", "良好的跨部门沟通能力", "有完整产品从0到1经验"],
        "culture_keywords": ["用户导向", "数据驱动", "跨团队协作", "创新思维"],
        "personality_fit": {"ideal_mbti": ["ENFJ", "ENTJ", "ENFP", "ENTP"], "ei_range": [50, 95], "tf_range": [40, 80]},
        "ability_requirements": {"logical_analysis": 75, "creativity": 85, "communication": 90, "execution": 75, "learning": 80, "leadership": 70, "teamwork": 85},
        "interest_tags": ["产品设计", "用户研究", "数据分析", "商业运营"],
    },
    {
        "title": "UI 设计师",
        "category": "设计",
        "description": "负责产品的视觉设计和交互设计，制定设计规范和组件库，输出高质量的设计稿，与产品经理和前端工程师协作确保设计还原度。",
        "requirements": ["精通 Figma/Sketch 等设计工具", "扎实的视觉设计功底", "了解交互设计原则", "有设计系统搭建经验", "关注设计趋势"],
        "culture_keywords": ["审美驱动", "细节控", "创意表达", "用户体验"],
        "personality_fit": {"ideal_mbti": ["ISFP", "INFP", "ENFP", "ESFP"], "ei_range": [20, 70], "tf_range": [50, 90]},
        "ability_requirements": {"creativity": 95, "communication": 65, "execution": 70, "learning": 75, "teamwork": 70},
        "interest_tags": ["产品设计", "内容创作", "用户研究"],
    },
    {
        "title": "数据分析师",
        "category": "数据",
        "description": "通过数据采集、清洗、分析和可视化，为业务决策提供数据支撑。搭建数据指标体系，监控业务健康度，挖掘数据背后的商业洞察。",
        "requirements": ["精通 SQL 和 Python 数据分析", "熟练使用 Tableau/Power BI", "统计学基础扎实", "良好的业务理解能力", "优秀的数据可视化能力"],
        "culture_keywords": ["数据驱动", "严谨求实", "洞察力", "业务导向"],
        "personality_fit": {"ideal_mbti": ["INTJ", "ISTJ", "INTP", "ESTJ"], "ei_range": [15, 55], "tf_range": [10, 40]},
        "ability_requirements": {"logical_analysis": 95, "creativity": 60, "communication": 70, "execution": 75, "learning": 80},
        "interest_tags": ["数据分析", "技术研发", "商业运营"],
    },
    {
        "title": "运营经理",
        "category": "运营",
        "description": "负责产品的用户增长和活跃度提升，制定运营策略，策划线上线下活动，分析运营数据，优化用户生命周期管理，提升用户留存和转化。",
        "requirements": ["丰富的互联网运营经验", "数据分析能力", "活动策划能力", "用户增长方法论", "良好的文案功底"],
        "culture_keywords": ["增长思维", "用户导向", "数据敏感", "创意执行"],
        "personality_fit": {"ideal_mbti": ["ENFJ", "ESFJ", "ENFP", "ENTJ"], "ei_range": [55, 95], "tf_range": [45, 85]},
        "ability_requirements": {"logical_analysis": 65, "creativity": 80, "communication": 85, "execution": 85, "learning": 70, "teamwork": 80},
        "interest_tags": ["市场营销", "商业运营", "内容创作", "数据分析"],
    },
    {
        "title": "测试工程师",
        "category": "技术",
        "description": "负责产品质量保障，制定测试计划和用例，执行功能测试、性能测试和自动化测试，发现并跟踪缺陷，推动质量改进流程。",
        "requirements": ["熟悉测试方法论和流程", "掌握自动化测试工具", "了解 CI/CD 流程", "细致耐心", "有性能测试经验优先"],
        "culture_keywords": ["质量至上", "细致严谨", "流程规范", "持续改进"],
        "personality_fit": {"ideal_mbti": ["ISTJ", "ISFJ", "ESTJ", "INTJ"], "ei_range": [15, 55], "tf_range": [15, 50]},
        "ability_requirements": {"logical_analysis": 80, "creativity": 50, "communication": 60, "execution": 90, "learning": 70, "stress_tolerance": 75},
        "interest_tags": ["技术研发", "项目管理"],
    },
    {
        "title": "算法工程师",
        "category": "技术",
        "description": "负责机器学习和深度学习算法的研发与落地，包括推荐系统、NLP、计算机视觉等方向，优化模型效果，将算法能力转化为产品价值。",
        "requirements": ["扎实的数学和统计学基础", "精通 Python 和深度学习框架", "有模型训练和调优经验", "了解分布式计算", "良好的论文阅读能力"],
        "culture_keywords": ["技术前沿", "学术氛围", "创新突破", "追求极致"],
        "personality_fit": {"ideal_mbti": ["INTJ", "INTP", "ENTJ", "ENTP"], "ei_range": [10, 55], "tf_range": [5, 35]},
        "ability_requirements": {"logical_analysis": 95, "creativity": 85, "communication": 50, "execution": 70, "learning": 95},
        "interest_tags": ["技术研发", "数据分析"],
    },
    {
        "title": "项目经理",
        "category": "管理",
        "description": "负责项目全生命周期管理，制定项目计划，协调跨部门资源，管控进度和风险，确保项目按时按质交付，推动团队高效协作。",
        "requirements": ["丰富的项目管理经验", "熟悉敏捷/Scrum 方法", "优秀的沟通协调能力", "风险管理意识", "PMP 认证优先"],
        "culture_keywords": ["结果导向", "高效执行", "团队协作", "流程优化"],
        "personality_fit": {"ideal_mbti": ["ENTJ", "ESTJ", "ENFJ", "ESFJ"], "ei_range": [55, 95], "tf_range": [30, 70]},
        "ability_requirements": {"logical_analysis": 70, "communication": 90, "execution": 90, "leadership": 85, "teamwork": 90, "stress_tolerance": 80},
        "interest_tags": ["项目管理", "商业运营"],
    },
    {
        "title": "技术总监",
        "category": "管理",
        "description": "负责技术团队管理和技术战略制定，把控系统架构方向，推动技术创新和工程效能提升，培养技术人才，支撑业务快速发展。",
        "requirements": ["10年以上技术经验", "丰富的团队管理经验", "深厚的架构设计能力", "技术视野广阔", "优秀的战略思维"],
        "culture_keywords": ["技术领导力", "战略思维", "人才培养", "创新驱动"],
        "personality_fit": {"ideal_mbti": ["ENTJ", "INTJ", "ENTP", "ESTJ"], "ei_range": [40, 85], "tf_range": [15, 50]},
        "ability_requirements": {"logical_analysis": 85, "creativity": 75, "communication": 85, "execution": 80, "leadership": 95, "teamwork": 80, "stress_tolerance": 85},
        "interest_tags": ["技术研发", "项目管理", "商业运营"],
    },
    {
        "title": "增长黑客",
        "category": "运营",
        "description": "以数据驱动的方式探索用户增长机会，设计和执行增长实验，优化获客、激活、留存、变现各环节，用最低成本实现用户规模的快速增长。",
        "requirements": ["数据分析和 A/B 测试经验", "了解增长黑客方法论", "有编程基础优先", "创意思维", "快速执行和迭代能力"],
        "culture_keywords": ["增长驱动", "实验文化", "数据至上", "快速迭代"],
        "personality_fit": {"ideal_mbti": ["ENTP", "ENTJ", "INTP", "ENFP"], "ei_range": [40, 85], "tf_range": [15, 55]},
        "ability_requirements": {"logical_analysis": 80, "creativity": 90, "communication": 70, "execution": 85, "learning": 90},
        "interest_tags": ["市场营销", "数据分析", "技术研发", "商业运营"],
    },
    {
        "title": "DevOps 工程师",
        "category": "技术",
        "description": "负责 CI/CD 流水线搭建与维护，容器化和云原生架构实施，监控告警体系建设，保障线上服务稳定性，推动开发运维一体化。",
        "requirements": ["精通 Linux 系统管理", "熟练使用 Docker/Kubernetes", "CI/CD 工具链经验", "云平台使用经验", "脚本编程能力"],
        "culture_keywords": ["自动化", "稳定可靠", "效率优先", "持续改进"],
        "personality_fit": {"ideal_mbti": ["ISTJ", "INTJ", "ISTP", "ESTJ"], "ei_range": [10, 50], "tf_range": [10, 40]},
        "ability_requirements": {"logical_analysis": 85, "creativity": 55, "communication": 55, "execution": 90, "learning": 85, "stress_tolerance": 85},
        "interest_tags": ["技术研发"],
    },
    {
        "title": "安全工程师",
        "category": "技术",
        "description": "负责公司信息安全体系建设，进行安全漏洞扫描和渗透测试，制定安全策略和应急响应方案，保障用户数据和系统安全。",
        "requirements": ["熟悉常见安全漏洞和攻防技术", "了解网络协议和加密算法", "渗透测试经验", "安全合规知识", "持续学习安全动态"],
        "culture_keywords": ["安全第一", "攻防思维", "严谨细致", "责任担当"],
        "personality_fit": {"ideal_mbti": ["INTJ", "ISTP", "INTP", "ISTJ"], "ei_range": [5, 45], "tf_range": [5, 35]},
        "ability_requirements": {"logical_analysis": 90, "creativity": 75, "communication": 50, "execution": 80, "learning": 90, "stress_tolerance": 80},
        "interest_tags": ["技术研发"],
    },
    {
        "title": "内容运营",
        "category": "运营",
        "description": "负责内容策略制定和优质内容生产，管理内容创作者生态，通过内容驱动用户增长和品牌建设，运营社交媒体和内容社区。",
        "requirements": ["优秀的文案写作能力", "内容策划和选题能力", "社交媒体运营经验", "数据分析能力", "对内容趋势敏感"],
        "culture_keywords": ["内容为王", "创意表达", "用户共鸣", "品牌调性"],
        "personality_fit": {"ideal_mbti": ["ENFP", "INFP", "ENFJ", "ESFP"], "ei_range": [35, 85], "tf_range": [55, 95]},
        "ability_requirements": {"creativity": 90, "communication": 85, "execution": 75, "learning": 70, "teamwork": 65},
        "interest_tags": ["内容创作", "市场营销", "用户研究"],
    },
    {
        "title": "用户研究员",
        "category": "设计",
        "description": "通过定性和定量研究方法深入了解用户需求和行为，输出用户洞察报告，为产品设计和业务决策提供用户视角的依据。",
        "requirements": ["熟练掌握用研方法论", "定性访谈和问卷设计能力", "数据分析能力", "优秀的报告撰写能力", "同理心强"],
        "culture_keywords": ["用户至上", "洞察力", "同理心", "严谨求实"],
        "personality_fit": {"ideal_mbti": ["INFJ", "INFP", "ENFJ", "INTJ"], "ei_range": [25, 70], "tf_range": [50, 90]},
        "ability_requirements": {"logical_analysis": 75, "creativity": 70, "communication": 80, "execution": 70, "learning": 80, "teamwork": 75},
        "interest_tags": ["用户研究", "产品设计", "数据分析"],
    },
    {
        "title": "市场营销经理",
        "category": "市场",
        "description": "负责品牌推广和市场营销策略制定，策划线上线下营销活动，管理广告投放和渠道合作，提升品牌知名度和市场份额。",
        "requirements": ["丰富的市场营销经验", "品牌策划能力", "渠道管理经验", "预算管理能力", "数据驱动的营销思维"],
        "culture_keywords": ["品牌意识", "创意营销", "结果导向", "资源整合"],
        "personality_fit": {"ideal_mbti": ["ENTJ", "ENFJ", "ENTP", "ESTP"], "ei_range": [60, 95], "tf_range": [35, 75]},
        "ability_requirements": {"logical_analysis": 65, "creativity": 85, "communication": 90, "execution": 80, "leadership": 75, "teamwork": 80},
        "interest_tags": ["市场营销", "商业运营", "内容创作"],
    },
    {
        "title": "全栈工程师",
        "category": "技术",
        "description": "独立负责产品的前后端开发，从数据库设计到前端交互全链路实现，适合创业团队或需要快速原型验证的场景，要求技术栈广泛。",
        "requirements": ["前后端技术栈均熟练", "数据库设计能力", "快速学习新技术", "独立解决问题", "有从0到1项目经验"],
        "culture_keywords": ["全能型", "快速迭代", "独立自驱", "创业精神"],
        "personality_fit": {"ideal_mbti": ["INTP", "ENTP", "INTJ", "ENTJ"], "ei_range": [20, 70], "tf_range": [10, 50]},
        "ability_requirements": {"logical_analysis": 85, "creativity": 75, "communication": 60, "execution": 85, "learning": 95, "stress_tolerance": 75},
        "interest_tags": ["技术研发", "产品设计"],
    },
    {
        "title": "商业分析师",
        "category": "数据",
        "description": "结合商业理解和数据分析能力，为公司战略决策提供分析支持，进行市场研究、竞品分析、财务建模，推动业务增长和效率提升。",
        "requirements": ["商业分析方法论", "财务建模能力", "数据分析工具熟练", "优秀的 PPT 和报告能力", "战略思维"],
        "culture_keywords": ["商业洞察", "战略思维", "数据驱动", "结果导向"],
        "personality_fit": {"ideal_mbti": ["ENTJ", "INTJ", "ESTJ", "ENTP"], "ei_range": [35, 80], "tf_range": [10, 50]},
        "ability_requirements": {"logical_analysis": 90, "creativity": 70, "communication": 85, "execution": 75, "learning": 80, "leadership": 60},
        "interest_tags": ["数据分析", "商业运营", "市场营销"],
    },
]


async def seed(reseed=False):
    settings = get_settings()
    gemini = ModelService(
        base_url=settings.GEMINI_BASE_URL,
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, func as sa_func, delete, text
        count_result = await db.execute(select(sa_func.count()).select_from(JobPosition))
        existing = count_result.scalar()

        if existing and existing > 0:
            if not reseed:
                print(f"Already have {existing} jobs in DB. Skipping seed. (use --reseed to force)")
                return
            print(f"Clearing {existing} existing jobs and related data...")
            from app.models.matching import MatchResult
            from app.models.interview import Interview
            await db.execute(delete(Interview))
            await db.execute(delete(MatchResult))
            await db.execute(delete(JobPosition))
            await db.commit()
            print("Cleared.")

        for i, job_data in enumerate(JOBS, 1):
            embed_text = json.dumps({
                "title": job_data["title"],
                "category": job_data["category"],
                "description": job_data["description"],
                "requirements": job_data["requirements"],
                "personality_fit": job_data["personality_fit"],
                "ability_requirements": job_data["ability_requirements"],
                "interest_tags": job_data["interest_tags"],
            }, ensure_ascii=False)

            print(f"[{i}/{len(JOBS)}] Generating embedding for: {job_data['title']}...")
            embedding = await gemini.get_embedding(embed_text)

            job = JobPosition(
                title=job_data["title"],
                category=job_data["category"],
                description=job_data["description"],
                requirements=job_data["requirements"],
                culture_keywords=job_data["culture_keywords"],
                personality_fit=job_data["personality_fit"],
                ability_requirements=job_data["ability_requirements"],
                interest_tags=job_data["interest_tags"],
                embedding=embedding,
            )
            db.add(job)
            print(f"  -> embedding dim: {len(embedding)}")

        await db.commit()
        print(f"\nSeeded {len(JOBS)} jobs successfully!")

    await engine.dispose()


if __name__ == "__main__":
    import sys
    asyncio.run(seed(reseed="--reseed" in sys.argv))
