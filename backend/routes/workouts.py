from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Workout, WorkoutExercise, User
from schemas import WorkoutCreate, WorkoutUpdate, WorkoutDetailResponse
from auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["Workouts"])


@router.get("", response_model=list[WorkoutDetailResponse])
def list_workouts(
    query_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise))
        .filter(Workout.user_id == current_user.id)
    )
    if query_date:
        q = q.filter(Workout.date == query_date)
    return q.order_by(Workout.id.desc()).all()


@router.post("", response_model=WorkoutDetailResponse, status_code=201)
def create_workout(
    payload: WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = Workout(
        user_id=current_user.id,
        name=payload.name,
        exercise_type=payload.exercise_type,
        duration_minutes=payload.duration_minutes,
        calories_burned=payload.calories_burned,
        date=payload.date,
        target_muscles=payload.target_muscles,
        notes=payload.notes,
    )
    db.add(workout)
    db.flush()

    for ex in payload.exercises:
        we = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=ex.exercise_id,
            sort_order=ex.sort_order,
            sets_data=ex.sets_data,
            notes=ex.notes,
        )
        db.add(we)

    db.commit()
    db.refresh(workout)
    return (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise))
        .filter(Workout.id == workout.id)
        .first()
    )


@router.get("/{workout_id}", response_model=WorkoutDetailResponse)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise))
        .filter(Workout.id == workout_id, Workout.user_id == current_user.id)
        .first()
    )
    if not workout:
        raise HTTPException(404, "Workout not found")
    return workout


@router.put("/{workout_id}", response_model=WorkoutDetailResponse)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(404, "Workout not found")

    data = payload.model_dump(exclude_unset=True, exclude={"exercises"})
    if "date" in data and isinstance(data["date"], str):
        data["date"] = date.fromisoformat(data["date"])
    for key, val in data.items():
        setattr(workout, key, val)

    if payload.exercises is not None:
        db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout.id).delete()
        for i, ex in enumerate(payload.exercises):
            we = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=ex.exercise_id,
                sort_order=ex.sort_order,
                sets_data=ex.sets_data,
                notes=ex.notes,
            )
            db.add(we)

    db.commit()
    db.refresh(workout)
    return (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise))
        .filter(Workout.id == workout.id)
        .first()
    )


@router.delete("/{workout_id}", status_code=204)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(404, "Workout not found")
    db.delete(workout)
    db.commit()
