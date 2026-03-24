from pydantic import BaseModel


class PositionCapitalRow(BaseModel):
    manager_id: int
    manager_name: str
    position: str
    picks_spent: int
    avg_pick: float
    total_capital: float


class DraftTendencyRow(BaseModel):
    manager_id: int
    manager_name: str
    position: str
    early_round_pct: float
    mid_round_pct: float
    late_round_pct: float


class DraftGradeRow(BaseModel):
    manager_id: int
    manager_name: str
    year: int
    grade: str
    composite_score: float
    total_picks: int
    avg_roi: float


class BestWorstPick(BaseModel):
    manager_id: int
    manager_name: str
    year: int
    round: int
    pick: int
    player_name: str
    position: str
    fantasy_points: float
    pick_value: float
    roi: float


class DraftAnalysis(BaseModel):
    position_capital: list[PositionCapitalRow]
    tendencies: list[DraftTendencyRow]
    grades: list[DraftGradeRow]
    best_picks: list[BestWorstPick]
    worst_picks: list[BestWorstPick]
