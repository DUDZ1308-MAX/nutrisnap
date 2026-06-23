import { useEffect, useState } from 'react'
import MealCard from '../components/MealCard'
import { fetchMeals, deleteMeal, updateMeal } from '../api/client'
import type { Meal } from '../types/meal'

export default function History() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [editing, setEditing] = useState<Meal | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchMeals(date).then(setMeals).finally(() => setLoading(false))
  }

  useEffect(load, [date])

  async function handleDelete(id: number) {
    await deleteMeal(id)
    load()
  }

  async function handleEdit(meal: Meal) {
    setEditing(meal)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    await updateMeal(editing.id, editing)
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Meal History</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : meals.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">No meals on this date</div>
      ) : (
        <div className="space-y-3">
          {meals.map((m) => (
            <MealCard key={m.id} meal={m} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-end sm:items-center justify-center z-50">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl dark:shadow-2xl p-4 sm:p-6 w-full sm:max-w-md sm:mx-4 space-y-3 sm:space-y-4">
            <h2 className="text-lg font-semibold dark:text-gray-100">Edit Meal</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Calories</label>
                <input
                  type="number"
                  value={editing.calories}
                  onChange={(e) => setEditing({ ...editing, calories: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Protein</label>
                <input
                  type="number"
                  value={editing.protein ?? ''}
                  onChange={(e) => setEditing({ ...editing, protein: e.target.value ? Number(e.target.value) : null })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Carbs</label>
                <input
                  type="number"
                  value={editing.carbs ?? ''}
                  onChange={(e) => setEditing({ ...editing, carbs: e.target.value ? Number(e.target.value) : null })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Fat</label>
                <input
                  type="number"
                  value={editing.fat ?? ''}
                  onChange={(e) => setEditing({ ...editing, fat: e.target.value ? Number(e.target.value) : null })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
                Cancel
              </button>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
