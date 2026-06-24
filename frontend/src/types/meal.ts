export interface Meal {
  id: number
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  meal_type: string
  date: string
  image_path: string | null
  ai_generated: boolean
  created_at: string
}

export interface VisionResult {
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  confidence: string
}

export interface DailySummary {
  date: string
  total_calories: number
  total_protein: number | null
  total_carbs: number | null
  total_fat: number | null
  meal_count: number
  goal: number
}

export interface WeeklySummary {
  days: DailySummary[]
}

export interface Goal {
  daily_goal: number
}

export interface Workout {
  id: number
  name: string
  exercise_type: string
  duration_minutes: number
  calories_burned: number | null
  date: string
  target_muscles: string | null
  notes: string | null
  created_at: string
}

export interface WorkoutExerciseInput {
  exercise_id: number
  sort_order: number
  sets_data: string
  notes?: string | null
}

export interface Exercise {
  id: number
  name: string
  muscle_group: string
  equipment: string | null
  instructions: string | null
  video_url: string | null
  created_at: string
}

export interface WorkoutExercise {
  id: number
  workout_id: number
  exercise_id: number
  sort_order: number
  sets_data: string
  notes: string | null
  created_at: string
  exercise: Exercise | null
}

export interface WorkoutDetail extends Workout {
  exercises: WorkoutExercise[]
}

export interface WorkoutSummary {
  id: number
  name: string
  exercise_type: string
  duration_minutes: number
  calories_burned: number | null
  target_muscles: string | null
  exercises: WorkoutExercise[]
}

export interface DailyReport {
  date: string
  total_calories_consumed: number
  total_protein: number | null
  total_carbs: number | null
  total_fat: number | null
  meal_count: number
  calorie_goal: number
  calories_remaining: number
  total_calories_burned: number
  total_workout_minutes: number
  workout_count: number
  net_calories: number
  workouts: WorkoutSummary[]
}
