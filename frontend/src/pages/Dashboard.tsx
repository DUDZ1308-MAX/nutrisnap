import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CalorieProgress from '../components/CalorieProgress'
import WeeklyChart from '../components/WeeklyChart'
import MealCard from '../components/MealCard'
import { fetchDailySummary, fetchWeeklySummary, fetchMeals, deleteMeal } from '../api/client'
import type { DailySummary, WeeklySummary, Meal } from '../types/meal'

export default function Dashboard() {
  const [daily, setDaily] = useState<DailySummary | null>(null)
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    Promise.all([
      fetchDailySummary(),
      fetchWeeklySummary(),
      fetchMeals(),
    ]).then(([d, w, m]) => {
      setDaily(d)
      setWeekly(w)
      setMeals(m.slice(0, 5))
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDelete(id: number) {
    await deleteMeal(id)
    load()
  }

  if (loading) return <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>

  return (
      <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <Link
          to="/log"
          className="bg-emerald-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          + Log Meal
        </Link>
      </div>

      {daily && <CalorieProgress current={daily.total_calories} goal={daily.goal} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{daily?.meal_count ?? 0}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Meals</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">
            {daily?.total_protein != null ? `${Math.round(daily.total_protein)}g` : '-'}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Protein</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">
            {daily?.total_carbs != null ? `${Math.round(daily.total_carbs)}g` : '-'}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Carbs</div>
        </div>
      </div>

      {weekly && <WeeklyChart days={weekly.days} />}

      <div>
        <h2 className="text-lg font-semibold dark:text-gray-100 mb-3">Recent Meals</h2>
        {meals.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            No meals logged today. <Link to="/log" className="text-emerald-600 underline">Log your first meal</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((m) => (
              <MealCard key={m.id} meal={m} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
