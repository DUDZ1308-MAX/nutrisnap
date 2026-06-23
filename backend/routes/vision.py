from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas import VisionResponse
from services.gemini_vision import analyze_food_image

router = APIRouter(prefix="/vision", tags=["Vision"])


@router.post("/analyze", response_model=VisionResponse)
async def analyze(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    image_bytes = await image.read()
    result = analyze_food_image(image_bytes)

    if result is None:
        raise HTTPException(503, "Vision API not configured. Set GEMINI_API_KEY in .env")

    return VisionResponse(
        name=result.get("name", "Unknown food"),
        calories=result.get("calories", 0),
        protein=result.get("protein"),
        carbs=result.get("carbs"),
        fat=result.get("fat"),
        confidence=result.get("confidence", "low"),
    )
