from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import CalorieGoal, User
from schemas import GoalResponse, GoalUpdate
from auth import get_current_user

router = APIRouter(prefix="/goal", tags=["Goals"])


@router.get("", response_model=GoalResponse)
def get_goal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).first()
    if not goal:
        goal = CalorieGoal(user_id=current_user.id, daily_goal=2000)
        db.add(goal)
        db.commit()
        db.refresh(goal)
    return GoalResponse(daily_goal=goal.daily_goal)


@router.put("", response_model=GoalResponse)
def update_goal(
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).first()
    if not goal:
        goal = CalorieGoal(user_id=current_user.id, daily_goal=payload.daily_goal)
        db.add(goal)
    else:
        goal.daily_goal = payload.daily_goal
    db.commit()
    db.refresh(goal)
    return GoalResponse(daily_goal=goal.daily_goal)
