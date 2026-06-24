import axios from 'axios'
import type { Meal, VisionResult, DailySummary, WeeklySummary, Goal, Workout, DailyReport, Exercise, WorkoutDetail, WorkoutExerciseInput } from '../types/meal'

const rawURL = import.meta.env.VITE_API_URL || ''
const baseURL = rawURL ? `${rawURL.replace(/\/+$/, '')}/api` : '/api'
const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nutrisnap-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchMeals(date?: string): Promise<Meal[]> {
  const params = date ? { date } : {}
  const res = await api.get('/meals', { params })
  return res.data
}

export async function createMeal(formData: FormData): Promise<Meal> {
  const res = await api.post('/meals', formData)
  return res.data
}

export async function updateMeal(id: number, data: Partial<Meal>): Promise<Meal> {
  const res = await api.put(`/meals/${id}`, data)
  return res.data
}

export async function deleteMeal(id: number): Promise<void> {
  await api.delete(`/meals/${id}`)
}

export async function analyzeImage(file: File): Promise<VisionResult> {
  const formData = new FormData()
  formData.append('image', file)
  const res = await api.post('/vision/analyze', formData)
  return res.data
}

export async function fetchDailySummary(date?: string): Promise<DailySummary> {
  const params = date ? { query_date: date } : {}
  const res = await api.get('/summary/daily', { params })
  return res.data
}

export async function fetchWeeklySummary(start?: string): Promise<WeeklySummary> {
  const params = start ? { start } : {}
  const res = await api.get('/summary/weekly', { params })
  return res.data
}

export async function fetchGoal(): Promise<Goal> {
  const res = await api.get('/goal')
  return res.data
}

export async function updateGoal(daily_goal: number): Promise<Goal> {
  const res = await api.put('/goal', { daily_goal })
  return res.data
}

export async function fetchWorkouts(date?: string): Promise<Workout[]> {
  const params = date ? { query_date: date } : {}
  const res = await api.get('/workouts', { params })
  return res.data
}

export async function createWorkout(data: Partial<Workout> & { exercises?: WorkoutExerciseInput[] }): Promise<Workout> {
  const res = await api.post('/workouts', data)
  return res.data
}

export async function updateWorkout(id: number, data: Partial<Workout>): Promise<Workout> {
  const res = await api.put(`/workouts/${id}`, data)
  return res.data
}

export async function deleteWorkout(id: number): Promise<void> {
  await api.delete(`/workouts/${id}`)
}

export async function fetchDailyReport(date?: string): Promise<DailyReport> {
  const params = date ? { query_date: date } : {}
  const res = await api.get('/summary/report', { params })
  return res.data
}

export async function fetchExercises(muscleGroup?: string, search?: string): Promise<Exercise[]> {
  const params: Record<string, string> = {}
  if (muscleGroup) params.muscle_group = muscleGroup
  if (search) params.search = search
  const res = await api.get('/exercises', { params })
  return res.data
}

export async function fetchMuscleGroups(): Promise<string[]> {
  const res = await api.get('/exercises/muscle-groups')
  return res.data
}

export async function fetchWorkoutDetail(id: number): Promise<WorkoutDetail> {
  const res = await api.get(`/workouts/${id}/detail`)
  return res.data
}

export async function fetchExercise(id: number): Promise<Exercise> {
  const res = await api.get(`/exercises/${id}`)
  return res.data
}

export async function forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
  const res = await axios.post(`${baseURL}/auth/forgot-password`, { email })
  return res.data
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const res = await axios.post(`${baseURL}/auth/reset-password`, { token, new_password })
  return res.data
}
