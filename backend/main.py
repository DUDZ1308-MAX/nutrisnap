import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base, get_db
from models import CalorieGoal, Exercise
from routes import meals, vision, summary, goals, workouts, exercises

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NutriSnap API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from config import UPLOAD_DIR
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(meals.router, prefix="/api")
app.include_router(vision.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(workouts.router, prefix="/api")
app.include_router(exercises.router, prefix="/api")


SEED_EXERCISES = [
    # Chest
    ("Barbell Bench Press", "Chest", "Barbell", "Lie on a flat bench, grip the bar at shoulder width, lower to your chest, then press up until arms are extended."),
    ("Dumbbell Bench Press", "Chest", "Dumbbell", "Lie on a flat bench holding dumbbells at your chest, press up until arms are extended, then lower with control."),
    ("Incline Barbell Press", "Chest", "Barbell", "Lie on an incline bench, grip the bar at shoulder width, lower to upper chest, press up."),
    ("Push-Ups", "Chest", "Bodyweight", "Start in a plank position with hands slightly wider than shoulder-width, lower your chest to the ground, then push back up."),
    ("Cable Flyes", "Chest", "Cable", "Stand between cable pulleys set at shoulder height, bring handles together in front of your chest with a slight bend in your elbows."),
    ("Decline Bench Press", "Chest", "Barbell", "Lie on a decline bench, grip the bar at shoulder width, lower to lower chest, press up."),
    ("Chest Dips", "Chest", "Bodyweight", "Grip parallel bars, lean forward, lower until shoulders are below elbows, push back up."),
    # Back
    ("Barbell Deadlift", "Back", "Barbell", "Stand with feet hip-width, grip the bar outside your knees, drive through your heels to stand up tall."),
    ("Pull-Ups", "Back", "Bodyweight", "Grip the bar palms facing away, pull yourself up until your chin clears the bar, lower with control."),
    ("Bent Over Barbell Row", "Back", "Barbell", "Hinge at the hips with a flat back, grip the bar, pull it to your lower ribcage, squeeze at the top."),
    ("Lat Pulldown", "Back", "Cable", "Sit at the lat pulldown machine, grip the bar wide, pull down to your upper chest, squeeze your lats."),
    ("Seated Cable Row", "Back", "Cable", "Sit at the cable row station, grip the handle, pull to your stomach, squeeze your shoulder blades together."),
    ("Dumbbell Row", "Back", "Dumbbell", "Place one knee and hand on a bench, pull the dumbbell to your hip, squeeze your lat."),
    ("Face Pull", "Back", "Cable", "Set a cable pulley at upper chest height, grip with both hands, pull toward your face, squeeze rear delts."),
    # Shoulders
    ("Overhead Barbell Press", "Shoulders", "Barbell", "Stand with the bar at shoulder height, press overhead until arms are extended, lower with control."),
    ("Dumbbell Shoulder Press", "Shoulders", "Dumbbell", "Sit holding dumbbells at shoulder height, press overhead, lower with control."),
    ("Lateral Raise", "Shoulders", "Dumbbell", "Stand holding light dumbbells, raise arms out to the sides until parallel to the floor, lower slowly."),
    ("Front Raise", "Shoulders", "Dumbbell", "Stand holding dumbbells in front of thighs, raise straight arms to shoulder height, lower slowly."),
    ("Reverse Flyes", "Shoulders", "Dumbbell", "Bend forward with a flat back, raise dumbbells out to the sides, squeeze shoulder blades."),
    ("Arnold Press", "Shoulders", "Dumbbell", "Sit holding dumbbells in front of shoulders palms facing you, press overhead while rotating palms forward."),
    # Biceps
    ("Barbell Curl", "Biceps", "Barbell", "Stand holding a barbell palms up, curl to shoulder height keeping elbows fixed, lower with control."),
    ("Dumbbell Curl", "Biceps", "Dumbbell", "Stand holding dumbbells palms forward, curl to shoulder height, lower with control."),
    ("Hammer Curl", "Biceps", "Dumbbell", "Stand holding dumbbells palms facing each other, curl keeping palms facing in, lower."),
    ("Preacher Curl", "Biceps", "Barbell", "Sit at a preacher bench, curl the bar toward your shoulders, lower with control."),
    ("Cable Curl", "Biceps", "Cable", "Stand at a low cable pulley, grip the bar palms up, curl to shoulder height, lower."),
    # Triceps
    ("Tricep Pushdown", "Triceps", "Cable", "Stand at a high cable pulley, push the bar down until arms are straight, return with control."),
    ("Overhead Tricep Extension", "Triceps", "Dumbbell", "Hold a dumbbell overhead with both hands, lower behind your head, extend back up."),
    ("Close-Grip Bench Press", "Triceps", "Barbell", "Lie on a flat bench with hands close together on the bar, lower to chest, press up."),
    ("Skull Crushers", "Triceps", "Barbell", "Lie on a flat bench holding the bar above chest, lower toward forehead, extend back up."),
    ("Tricep Dips", "Triceps", "Bodyweight", "Grip parallel bars, keep your torso upright, lower until arms are at 90 degrees, push back up."),
    # Legs
    ("Barbell Back Squat", "Legs", "Barbell", "Rest the bar on your upper back, squat down to parallel or below, drive up through your heels."),
    ("Front Squat", "Legs", "Barbell", "Rest the bar on your front shoulders, keep elbows high, squat down, drive up."),
    ("Leg Press", "Legs", "Machine", "Sit on the leg press machine, place feet shoulder-width on the platform, push until legs are extended."),
    ("Romanian Deadlift", "Legs", "Barbell", "Hold the bar at hip height, hinge at the hips pushing them back, lower the bar down your shins, squeeze glutes to return."),
    ("Leg Extension", "Legs", "Machine", "Sit on the leg extension machine, extend your legs until straight, lower with control."),
    ("Leg Curl", "Legs", "Machine", "Lie face down on the leg curl machine, curl your heels toward your glutes, lower with control."),
    ("Bulgarian Split Squat", "Legs", "Dumbbell", "Place one foot behind you on a bench, hold dumbbells, squat down, drive up through the front heel."),
    ("Goblet Squat", "Legs", "Dumbbell", "Hold a dumbbell at your chest, squat down keeping elbows inside knees, stand back up."),
    ("Walking Lunges", "Legs", "Dumbbell", "Hold dumbbells, step forward into a lunge with each leg, driving off the front heel."),
    ("Calf Raises", "Legs", "Barbell", "Stand with a barbell on your back, raise up onto your toes, lower with control."),
    # Glutes
    ("Hip Thrust", "Glutes", "Barbell", "Sit on the floor with a bench behind you, rest the bar across your hips, drive hips up squeezing glutes at the top."),
    ("Glute Bridge", "Glutes", "Bodyweight", "Lie on your back with knees bent, drive hips up squeezing glutes, hold at the top."),
    ("Cable Kickback", "Glutes", "Cable", "Attach an ankle strap to a low cable, kick your leg straight back squeezing the glute."),
    ("Step-Ups", "Glutes", "Dumbbell", "Hold dumbbells, step onto a bench or box with one leg, drive through the heel to stand on top."),
    # Core
    ("Plank", "Core", "Bodyweight", "Hold a push-up position on your forearms, keep your body in a straight line from head to heels."),
    ("Crunches", "Core", "Bodyweight", "Lie on your back with knees bent, curl your shoulders off the floor, lower with control."),
    ("Russian Twists", "Core", "Bodyweight", "Sit with legs raised, lean back, rotate your torso side to side holding a weight or your hands together."),
    ("Hanging Leg Raises", "Core", "Bodyweight", "Hang from a bar, raise your legs until they are parallel to the floor, lower with control."),
    ("Ab Wheel Rollout", "Core", "Bodyweight", "Kneel holding an ab wheel, roll forward extending your body, pull back using your core."),
    # Full Body
    ("Kettlebell Swings", "Full Body", "Kettlebell", "Stand with feet wider than shoulder-width, swing the kettlebell between your legs, drive hips forward to swing to shoulder height."),
    ("Burpees", "Full Body", "Bodyweight", "Drop into a squat, kick feet back into a push-up, return to squat, jump up."),
    ("Turkish Get-Up", "Full Body", "Kettlebell", "Lie holding a kettlebell overhead with one arm, stand up while keeping the arm extended, reverse the movement."),
    ("Clean and Press", "Full Body", "Barbell", "Explosively pull the bar from the floor to your shoulders, then press overhead."),
]


@app.on_event("startup")
def startup():
    db = next(get_db())
    if not db.query(CalorieGoal).first():
        db.add(CalorieGoal(daily_goal=2000))
        db.commit()
    if not db.query(Exercise).first():
        for name, group, equip, instr in SEED_EXERCISES:
            db.add(Exercise(name=name, muscle_group=group, equipment=equip, instructions=instr))
        db.commit()
    db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
