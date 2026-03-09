from app.models.user import User
from app.models.assessment import Assessment, TalentProfile
from app.models.job import JobPosition
from app.models.matching import MatchResult
from app.models.interview import Interview
from app.models.career import CareerPlan
from app.models.quiz import QuizRecord

__all__ = [
    "User", "Assessment", "TalentProfile",
    "JobPosition", "MatchResult", "Interview", "CareerPlan", "QuizRecord",
]
