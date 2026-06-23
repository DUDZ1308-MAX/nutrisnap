from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Workout, WorkoutExercise
from schemas import WorkoutCreate, WorkoutUpdate, WorkoutResponse, WorkoutDetailResponse, WorkoutExerciseCreate

router = APIRouter(prefix="/workouts", tags=["Workouts"])


@router.get("", response_model=list[WorkoutResponse])
def list_workouts(query_date: str | None = None, db: Session = Depends(get_db)):
    from datetime import date
    q = db.query(Workout)
    if query_date:
        q = q.filter(Workout.date == date.fromisoformat(query_date))
    return q.order_by(Workout.id.desc()).all()


@router.post("", response_model=WorkoutDetailResponse, status_code=201)
def create_workout(payload: WorkoutCreate, db: Session = Depends(get_db)):
    exercises_data = payload.exercises
    workout = Workout(**payload.model_dump(exclude={"exercises"}))
    db.add(workout)
    db.commit()
    db.refresh(workout)

    for ex_data in exercises_data:
        we = WorkoutExercise(workout_id=workout.id, **ex_data.model_dump())
        db.add(we)
    if exercises_data:
        db.commit()
        db.refresh(workout)

    return workout


@router.get("/{workout_id}", response_model=WorkoutResponse)
def get_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(404, "Workout not found")
    return workout


@router.get("/{workout_id}/detail", response_model=WorkoutDetailResponse)
def get_workout_detail(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(404, "Workout not found")
    return workout


@router.put("/{workout_id}", response_model=WorkoutResponse)
def update_workout(workout_id: int, payload: WorkoutUpdate, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(404, "Workout not found")
    for key, val in payload.model_dump(exclude={"exercises"}, exclude_unset=True).items():
        setattr(workout, key, val)
    if payload.exercises is not None:
        db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout_id).delete()
        for ex_data in payload.exercises:
            we = WorkoutExercise(workout_id=workout.id, **ex_data.model_dump())
            db.add(we)
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}", status_code=204)
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(404, "Workout not found")
    db.delete(workout)
    db.commit()
