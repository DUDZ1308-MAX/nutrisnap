from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Meal, Workout, WorkoutExercise, CalorieGoal
from schemas import DailySummary, WeeklySummary, DailyReport, WorkoutSummary, WorkoutExerciseResponse, ExerciseResponse

router = APIRouter(prefix="/summary", tags=["Summary"])


def _get_goal(db: Session) -> float:
    goal = db.query(CalorieGoal).first()
    return goal.daily_goal if goal else 2000


def _daily_summary(db: Session, d: date) -> DailySummary:
    rows = db.query(Meal).filter(Meal.date == d).all()
    total_cal = sum(m.calories for m in rows) if rows else 0
    total_p = sum(m.protein or 0 for m in rows) if rows else None
    total_c = sum(m.carbs or 0 for m in rows) if rows else None
    total_f = sum(m.fat or 0 for m in rows) if rows else None
    return DailySummary(
        date=d,
        total_calories=total_cal,
        total_protein=total_p,
        total_carbs=total_c,
        total_fat=total_f,
        meal_count=len(rows),
        goal=_get_goal(db),
    )


@router.get("/daily", response_model=DailySummary)
def daily_summary(query_date: date | None = None, db: Session = Depends(get_db)):
    d = query_date or date.today()
    return _daily_summary(db, d)


@router.get("/report", response_model=DailyReport)
def daily_report(query_date: date | None = None, db: Session = Depends(get_db)):
    d = query_date or date.today()
    meals = db.query(Meal).filter(Meal.date == d).all()
    workouts = db.query(Workout).options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise)).filter(Workout.date == d).all()
    goal = _get_goal(db)

    cal_consumed = sum(m.calories for m in meals) if meals else 0
    protein = sum(m.protein or 0 for m in meals) if meals else None
    carbs = sum(m.carbs or 0 for m in meals) if meals else None
    fat = sum(m.fat or 0 for m in meals) if meals else None
    cal_burned = sum(w.calories_burned or 0 for w in workouts) if workouts else 0
    workout_minutes = sum(w.duration_minutes for w in workouts) if workouts else 0

    def we_to_resp(we):
        ex = we.exercise
        return WorkoutExerciseResponse(
            id=we.id, workout_id=we.workout_id, exercise_id=we.exercise_id,
            sort_order=we.sort_order, sets_data=we.sets_data, notes=we.notes,
            created_at=we.created_at,
            exercise=ExerciseResponse(
                id=ex.id, name=ex.name, muscle_group=ex.muscle_group,
                equipment=ex.equipment, instructions=ex.instructions,
                video_url=ex.video_url, created_at=ex.created_at,
            ) if ex else None,
        )

    workout_summaries = [
        WorkoutSummary(
            id=w.id, name=w.name, exercise_type=w.exercise_type,
            duration_minutes=w.duration_minutes, calories_burned=w.calories_burned,
            target_muscles=w.target_muscles,
            exercises=[we_to_resp(we) for we in w.exercises],
        ) for w in workouts
    ]

    return DailyReport(
        date=d,
        total_calories_consumed=cal_consumed,
        total_protein=protein,
        total_carbs=carbs,
        total_fat=fat,
        meal_count=len(meals),
        calorie_goal=goal,
        calories_remaining=max(goal - cal_consumed, 0),
        total_calories_burned=cal_burned,
        total_workout_minutes=workout_minutes,
        workout_count=len(workouts),
        net_calories=cal_consumed - cal_burned,
        workouts=workout_summaries,
    )


@router.get("/weekly", response_model=WeeklySummary)
def weekly_summary(start: date | None = None, db: Session = Depends(get_db)):
    s = start or date.today()
    days = [_daily_summary(db, s + timedelta(days=i)) for i in range(7)]
    return WeeklySummary(days=days)
