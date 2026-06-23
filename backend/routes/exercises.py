from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Exercise
from schemas import ExerciseCreate, ExerciseResponse

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(
    muscle_group: str | None = Query(None, description="Filter by muscle group"),
    search: str | None = Query(None, description="Search by name"),
    db: Session = Depends(get_db),
):
    q = db.query(Exercise)
    if muscle_group:
        q = q.filter(Exercise.muscle_group.ilike(muscle_group))
    if search:
        q = q.filter(Exercise.name.ilike(f"%{search}%"))
    return q.order_by(Exercise.muscle_group, Exercise.name).all()


@router.get("/muscle-groups", response_model=list[str])
def list_muscle_groups(db: Session = Depends(get_db)):
    results = db.query(Exercise.muscle_group).distinct().order_by(Exercise.muscle_group).all()
    return [r[0] for r in results]


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercise not found")
    return ex


@router.post("", response_model=ExerciseResponse, status_code=201)
def create_exercise(payload: ExerciseCreate, db: Session = Depends(get_db)):
    ex = Exercise(**payload.model_dump())
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercise not found")
    db.delete(ex)
    db.commit()
