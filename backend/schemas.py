from datetime import date as date_type, datetime
from typing import Optional
from pydantic import BaseModel


class MealCreate(BaseModel):
    name: str
    calories: float
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    meal_type: str = "snack"
    meal_date: date_type = date_type.today()


class MealUpdate(BaseModel):
    name: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    meal_type: Optional[str] = None
    meal_date: Optional[date_type] = None


class MealResponse(BaseModel):
    id: int
    name: str
    calories: float
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    meal_type: str
    date: date_type
    image_path: Optional[str] = None
    ai_generated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class VisionResponse(BaseModel):
    name: str
    calories: float
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    confidence: str = "medium"


class DailySummary(BaseModel):
    date: date_type
    total_calories: float
    total_protein: Optional[float] = None
    total_carbs: Optional[float] = None
    total_fat: Optional[float] = None
    meal_count: int
    goal: float


class WeeklySummary(BaseModel):
    days: list[DailySummary]


class GoalResponse(BaseModel):
    daily_goal: float


class GoalUpdate(BaseModel):
    daily_goal: float


class ExerciseCreate(BaseModel):
    name: str
    muscle_group: str
    equipment: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None


class ExerciseResponse(BaseModel):
    id: int
    name: str
    muscle_group: str
    equipment: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutExerciseCreate(BaseModel):
    exercise_id: int
    sort_order: int = 0
    sets_data: str = "[]"
    notes: Optional[str] = None


class WorkoutExerciseResponse(BaseModel):
    id: int
    workout_id: int
    exercise_id: int
    sort_order: int
    sets_data: str
    notes: Optional[str] = None
    created_at: datetime
    exercise: Optional[ExerciseResponse] = None

    model_config = {"from_attributes": True}


class WorkoutCreate(BaseModel):
    name: str
    exercise_type: str = "other"
    duration_minutes: int
    calories_burned: Optional[int] = None
    date: date_type = date_type.today()
    target_muscles: Optional[str] = None
    notes: Optional[str] = None
    exercises: list[WorkoutExerciseCreate] = []


class WorkoutUpdate(BaseModel):
    name: Optional[str] = None
    exercise_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    calories_burned: Optional[int] = None
    date: Optional[date_type] = None
    target_muscles: Optional[str] = None
    notes: Optional[str] = None
    exercises: Optional[list[WorkoutExerciseCreate]] = None


class WorkoutResponse(BaseModel):
    id: int
    name: str
    exercise_type: str
    duration_minutes: int
    calories_burned: Optional[int] = None
    date: date_type
    target_muscles: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutDetailResponse(WorkoutResponse):
    exercises: list[WorkoutExerciseResponse] = []


class WorkoutSummary(BaseModel):
    id: int
    name: str
    exercise_type: str
    duration_minutes: int
    calories_burned: Optional[int] = None
    target_muscles: Optional[str] = None
    exercises: list[WorkoutExerciseResponse] = []


class DailyReport(BaseModel):
    date: date_type
    total_calories_consumed: float
    total_protein: Optional[float] = None
    total_carbs: Optional[float] = None
    total_fat: Optional[float] = None
    meal_count: int
    calorie_goal: float
    calories_remaining: float
    total_calories_burned: int
    total_workout_minutes: int
    workout_count: int
    net_calories: float
    workouts: list[WorkoutSummary] = []
