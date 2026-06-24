from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Meal, Workout, CalorieGoal, WorkoutExercise, User
from schemas import DailySummary, WeeklySummary, DailyReport, WorkoutSummary, WorkoutExerciseResponse, ExerciseResponse
from auth import get_current_user

router = APIRouter(prefix="/summary", tags=["Summary"])


@router.get("/daily", response_model=DailySummary)
def daily_summary(
    query_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = query_date or date.today()
    meals = db.query(Meal).filter(Meal.user_id == current_user.id, Meal.date == d).all()
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).first()
    total_cal = sum(m.calories for m in meals) if meals else 0.0
    total_p = sum(m.protein for m in meals if m.protein is not None) or None
    total_c = sum(m.carbs for m in meals if m.carbs is not None) or None
    total_f = sum(m.fat for m in meals if m.fat is not None) or None
    return DailySummary(
        date=d,
        total_calories=total_cal,
        total_protein=total_p,
        total_carbs=total_c,
        total_fat=total_f,
        meal_count=len(meals),
        goal=goal.daily_goal if goal else 2000,
    )


@router.get("/weekly", response_model=WeeklySummary)
def weekly_summary(
    start: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end = (start or date.today())
    start_date = end - timedelta(days=6)
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).first()
    goal_val = goal.daily_goal if goal else 2000

    days = []
    for i in range(7):
        d = start_date + timedelta(days=i)
        meals = db.query(Meal).filter(Meal.user_id == current_user.id, Meal.date == d).all()
        total_cal = sum(m.calories for m in meals) if meals else 0.0
        total_p = sum(m.protein for m in meals if m.protein is not None) or None
        total_c = sum(m.carbs for m in meals if m.carbs is not None) or None
        total_f = sum(m.fat for m in meals if m.fat is not None) or None
        days.append(DailySummary(
            date=d,
            total_calories=total_cal,
            total_protein=total_p,
            total_carbs=total_c,
            total_fat=total_f,
            meal_count=len(meals),
            goal=goal_val,
        ))
    return WeeklySummary(days=days)


@router.get("/report", response_model=DailyReport)
def daily_report(
    query_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = query_date or date.today()

    meals = db.query(Meal).filter(Meal.user_id == current_user.id, Meal.date == d).all()
    workouts = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise))
        .filter(Workout.user_id == current_user.id, Workout.date == d)
        .all()
    )
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).first()
    goal_val = goal.daily_goal if goal else 2000

    total_cal = sum(m.calories for m in meals) if meals else 0.0
    total_p = sum(m.protein for m in meals if m.protein is not None) or None
    total_c = sum(m.carbs for m in meals if m.carbs is not None) or None
    total_f = sum(m.fat for m in meals if m.fat is not None) or None
    total_burned = sum(w.calories_burned or 0 for w in workouts)
    total_min = sum(w.duration_minutes for w in workouts)
    remaining = max(goal_val - total_cal + total_burned, 0)

    workout_summaries = []
    for w in workouts:
        exercises = []
        for we in w.exercises:
            ex = None
            if we.exercise:
                ex = ExerciseResponse.model_validate(we.exercise)
            exercises.append(WorkoutExerciseResponse(
                id=we.id,
                workout_id=we.workout_id,
                exercise_id=we.exercise_id,
                sort_order=we.sort_order,
                sets_data=we.sets_data,
                notes=we.notes,
                created_at=we.created_at,
                exercise=ex,
            ))
        workout_summaries.append(WorkoutSummary(
            id=w.id,
            name=w.name,
            exercise_type=w.exercise_type,
            duration_minutes=w.duration_minutes,
            calories_burned=w.calories_burned,
            target_muscles=w.target_muscles,
            exercises=exercises,
        ))

    return DailyReport(
        date=d,
        total_calories_consumed=total_cal,
        total_protein=total_p,
        total_carbs=total_c,
        total_fat=total_f,
        meal_count=len(meals),
        calorie_goal=goal_val,
        calories_remaining=remaining,
        total_calories_burned=total_burned,
        total_workout_minutes=total_min,
        workout_count=len(workouts),
        net_calories=total_cal - total_burned,
        workouts=workout_summaries,
    )
