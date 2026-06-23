from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CalorieGoal
from schemas import GoalResponse, GoalUpdate

router = APIRouter(prefix="/goal", tags=["Goal"])


@router.get("", response_model=GoalResponse)
def get_goal(db: Session = Depends(get_db)):
    goal = db.query(CalorieGoal).first()
    if not goal:
        goal = CalorieGoal(daily_goal=2000)
        db.add(goal)
        db.commit()
        db.refresh(goal)
    return GoalResponse(daily_goal=goal.daily_goal)


@router.put("", response_model=GoalResponse)
def update_goal(payload: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(CalorieGoal).first()
    if not goal:
        goal = CalorieGoal(daily_goal=payload.daily_goal)
        db.add(goal)
    else:
        goal.daily_goal = payload.daily_goal
    db.commit()
    db.refresh(goal)
    return GoalResponse(daily_goal=goal.daily_goal)
