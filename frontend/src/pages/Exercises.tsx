import { useEffect, useState } from 'react'
import { fetchExercises, fetchMuscleGroups } from '../api/client'
import type { Exercise } from '../types/meal'

const MUSCLE_GROUP_ICONS: Record<string, string> = {
  Chest: '💪', Back: '🔙', Shoulders: '🏋️', Biceps: '💪',
  Triceps: '💪', Legs: '🦵', Glutes: '🍑', Core: '🧊', 'Full Body': '🔥',
}

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [activeGroup, setActiveGroup] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMuscleGroups().then(setGroups)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchExercises(activeGroup || undefined, search || undefined)
      .then(setExercises)
      .finally(() => setLoading(false))
  }, [activeGroup, search])

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Exercise Library</h1>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGroup('')}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            !activeGroup ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-400'
          }`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              activeGroup === g ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-400'
            }`}
          >
            {MUSCLE_GROUP_ICONS[g] ?? ''} {g}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises..."
        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(selected?.id === ex.id ? null : ex)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selected?.id === ex.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-200 dark:ring-emerald-800'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="font-medium dark:text-gray-100">{ex.name}</div>
                {ex.equipment && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                    {ex.equipment}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {MUSCLE_GROUP_ICONS[ex.muscle_group] ?? ''} {ex.muscle_group}
              </div>
              {selected?.id === ex.id && ex.instructions && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                  {ex.instructions}
                </div>
              )}
            </button>
          ))}
          {exercises.length === 0 && (
            <p className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">No exercises found</p>
          )}
        </div>
      )}
    </div>
  )
}
