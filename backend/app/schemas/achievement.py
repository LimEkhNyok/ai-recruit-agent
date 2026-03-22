from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AchievementProgress(BaseModel):
    current: int
    target: int


class AchievementItem(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    rarity: str
    category: str
    unlocked: bool
    unlocked_at: Optional[datetime] = None
    progress: Optional[AchievementProgress] = None
    counter_value: Optional[int] = None


class AchievementListResponse(BaseModel):
    total: int
    unlocked: int
    achievements: list[AchievementItem]


class NewlyUnlockedItem(BaseModel):
    id: str
    name: str
    icon: str
    rarity: str


class AchievementCheckResponse(BaseModel):
    newly_unlocked: list[NewlyUnlockedItem]
