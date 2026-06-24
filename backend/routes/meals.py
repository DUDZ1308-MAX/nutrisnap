from datetime import date
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Meal, User
from schemas import MealCreate, MealUpdate, MealResponse
from config import UPLOAD_DIR
from auth import get_current_user

router = APIRouter(prefix="/meals", tags=["Meals"])


@router.get("", response_model=list[MealResponse])
def list_meals(
    query_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Meal).filter(Meal.user_id == current_user.id)
    if query_date:
        q = q.filter(Meal.date == query_date)
    return q.order_by(Meal.id.desc()).all()


@router.post("", response_model=MealResponse, status_code=201)
def create_meal(
    name: str = Form(...),
    calories: float = Form(...),
    protein: float | None = Form(None),
    carbs: float | None = Form(None),
    fat: float | None = Form(None),
    meal_type: str = Form("snack"),
    meal_date: str = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_path = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image.file.read())
        image_path = f"uploads/{filename}"

    parsed_date = date.fromisoformat(meal_date) if meal_date else date.today()
    meal = Meal(
        user_id=current_user.id,
        name=name,
        calories=calories,
        protein=protein,
        carbs=carbs,
        fat=fat,
        meal_type=meal_type,
        date=parsed_date,
        image_path=image_path,
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.get("/{meal_id}", response_model=MealResponse)
def get_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == current_user.id).first()
    if not meal:
        raise HTTPException(404, "Meal not found")
    return meal


@router.put("/{meal_id}", response_model=MealResponse)
def update_meal(
    meal_id: int,
    payload: MealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == current_user.id).first()
    if not meal:
        raise HTTPException(404, "Meal not found")
    data = payload.model_dump(exclude_unset=True)
    if "meal_date" in data:
        data["date"] = data.pop("meal_date")
    for key, val in data.items():
        setattr(meal, key, val)
    db.commit()
    db.refresh(meal)
    return meal


@router.delete("/{meal_id}", status_code=204)
def delete_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == current_user.id).first()
    if not meal:
        raise HTTPException(404, "Meal not found")
    if meal.image_path:
        path = os.path.join(UPLOAD_DIR, os.path.basename(meal.image_path))
        if os.path.exists(path):
            os.remove(path)
    db.delete(meal)
    db.commit()
