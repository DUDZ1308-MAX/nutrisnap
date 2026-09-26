const API_BASE = '';

interface ApiError {
  error: string;
  details?: unknown;
}

async function apiFetch<T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data: unknown = await res.json();
  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

interface AuthResponse {
  user: { id: string; email: string; username: string; age: number | null; height: number | null; weight: number | null };
}

interface MealsResponse {
  meals: Array<Record<string, unknown>>;
}

interface WorkoutsResponse {
  workouts: Array<Record<string, unknown>>;
}

interface GoalsResponse {
  goals: { calories: number; protein: number; carbs: number; fat: number; waterMl: number };
}

interface IdResponse {
  id: string;
}

interface OkResponse {
  ok: boolean;
}

export async function register(email: string, username: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });
}

export async function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch<OkResponse>('/api/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return apiFetch<AuthResponse>('/api/auth/me');
}

export async function getMeals() {
  const data = await apiFetch<MealsResponse>('/api/meals');
  return data.meals;
}

export async function createMeal(meal: Record<string, unknown>) {
  return apiFetch<IdResponse>('/api/meals', { method: 'POST', body: JSON.stringify(meal) });
}

export async function updateMeal(id: string, meal: Record<string, unknown>) {
  return apiFetch<OkResponse>(`/api/meals?id=${id}`, { method: 'PUT', body: JSON.stringify(meal) });
}

export async function deleteMeal(id: string) {
  return apiFetch<OkResponse>(`/api/meals?id=${id}`, { method: 'DELETE' });
}

export async function getWorkouts() {
  const data = await apiFetch<WorkoutsResponse>('/api/workouts');
  return data.workouts;
}

export async function createWorkout(workout: Record<string, unknown>) {
  return apiFetch<IdResponse>('/api/workouts', { method: 'POST', body: JSON.stringify(workout) });
}

export async function updateWorkout(id: string, workout: Record<string, unknown>) {
  return apiFetch<OkResponse>(`/api/workouts?id=${id}`, { method: 'PUT', body: JSON.stringify(workout) });
}

export async function deleteWorkout(id: string) {
  return apiFetch<OkResponse>(`/api/workouts?id=${id}`, { method: 'DELETE' });
}

export async function getGoals() {
  const data = await apiFetch<GoalsResponse>('/api/goals');
  return data.goals;
}

export async function updateGoals(goals: Record<string, unknown>) {
  return apiFetch<OkResponse>('/api/goals', { method: 'PUT', body: JSON.stringify(goals) });
}

export async function updateProfile(age: number | null, height: number | null, weight: number | null) {
  return apiFetch<AuthResponse>('/api/auth/me', { method: 'PUT', body: JSON.stringify({ age, height, weight }) });
}

// ── Water ──────────────────────────────────────────────────────────────────

interface WaterResponse {
  entries: Array<{ id: string; date: string; amountMl: number }>;
  totalMl: number;
}

export async function getWater(date: string) {
  const data = await apiFetch<WaterResponse>(`/api/water?date=${date}`);
  return data;
}

export async function logWater(date: string, amountMl: number) {
  return apiFetch<IdResponse>('/api/water', { method: 'POST', body: JSON.stringify({ date, amountMl }) });
}

export async function deleteWater(id: string) {
  return apiFetch<OkResponse>(`/api/water?id=${id}`, { method: 'DELETE' });
}

// ── Saved Meals ────────────────────────────────────────────────────────────

interface SavedMealsResponse {
  savedMeals: Array<{ id: string; name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number }>;
}

export async function getSavedMeals() {
  const data = await apiFetch<SavedMealsResponse>('/api/saved-meals');
  return data.savedMeals;
}

export async function createSavedMeal(meal: Record<string, unknown>) {
  return apiFetch<IdResponse>('/api/saved-meals', { method: 'POST', body: JSON.stringify(meal) });
}

export async function deleteSavedMeal(id: string) {
  return apiFetch<OkResponse>(`/api/saved-meals?id=${id}`, { method: 'DELETE' });
}

// ── Weekly Summary ─────────────────────────────────────────────────────────

interface WeekSummaryResponse {
  days: Array<{ date: string; label: string; calories: number; protein: number; carbs: number; fat: number; workouts: number; durationMinutes: number; caloriesBurned: number; waterMl: number }>;
  totals: { calories: number; protein: number; carbs: number; fat: number; workouts: number; durationMinutes: number; caloriesBurned: number; waterMl: number };
  averages: { calories: number; protein: number; carbs: number; fat: number; workouts: number; waterMl: number };
}

export async function getWeekSummary() {
  return apiFetch<WeekSummaryResponse>('/api/goals?summary=week');
}

// ── Body Photos ─────────────────────────────────────────────────────────

interface BodyPhoto {
  id: string;
  date: string;
  weight?: number;
  imageDataUrl?: string;
  notes?: string;
}

interface BodyPhotosResponse {
  photos: BodyPhoto[];
}

export async function getBodyPhotos() {
  const data = await apiFetch<BodyPhotosResponse>('/api/body-photos');
  return data.photos;
}

export async function createBodyPhoto(photo: { date: string; weight?: number; imageDataUrl: string; notes?: string }) {
  return apiFetch<IdResponse>('/api/body-photos', { method: 'POST', body: JSON.stringify(photo) });
}

export async function deleteBodyPhoto(id: string) {
  return apiFetch<OkResponse>(`/api/body-photos?id=${id}`, { method: 'DELETE' });
}
