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
  user: { id: string; email: string; username: string };
}

interface MealsResponse {
  meals: Array<Record<string, unknown>>;
}

interface WorkoutsResponse {
  workouts: Array<Record<string, unknown>>;
}

interface GoalsResponse {
  goals: { calories: number; protein: number; carbs: number; fat: number };
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
  return apiFetch<OkResponse>(`/api/meals/${id}`, { method: 'PUT', body: JSON.stringify(meal) });
}

export async function deleteMeal(id: string) {
  return apiFetch<OkResponse>(`/api/meals/${id}`, { method: 'DELETE' });
}

export async function getWorkouts() {
  const data = await apiFetch<WorkoutsResponse>('/api/workouts');
  return data.workouts;
}

export async function createWorkout(workout: Record<string, unknown>) {
  return apiFetch<IdResponse>('/api/workouts', { method: 'POST', body: JSON.stringify(workout) });
}

export async function updateWorkout(id: string, workout: Record<string, unknown>) {
  return apiFetch<OkResponse>(`/api/workouts/${id}`, { method: 'PUT', body: JSON.stringify(workout) });
}

export async function deleteWorkout(id: string) {
  return apiFetch<OkResponse>(`/api/workouts/${id}`, { method: 'DELETE' });
}

export async function getGoals() {
  const data = await apiFetch<GoalsResponse>('/api/goals');
  return data.goals;
}

export async function updateGoals(goals: Record<string, unknown>) {
  return apiFetch<OkResponse>('/api/goals', { method: 'PUT', body: JSON.stringify(goals) });
}
