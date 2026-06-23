import { useEffect, useState } from 'react'
import { fetchDailyReport, fetchMeals, deleteMeal, fetchExercises, createWorkout, deleteWorkout } from '../api/client'
import type { DailyReport, Meal, Exercise } from '../types/meal'

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Core', 'Full Body',
]

const EXERCISE_TYPES = ['cardio', 'strength', 'yoga', 'sports', 'other']

interface SetRow { set: number; reps: string; weight: string }
interface PickedExercise { exercise: Exercise; sets: SetRow[] }

export default function Progress() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<DailyReport | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [wName, setWName] = useState('')
  const [wType, setWType] = useState('strength')
  const [wDuration, setWDuration] = useState('30')
  const [wCalories, setWCalories] = useState('')
  const [wMuscles, setWMuscles] = useState<string[]>([])

  const [dbExercises, setDbExercises] = useState<Exercise[]>([])
  const [picked, setPicked] = useState<PickedExercise[]>([])
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      fetchDailyReport(date),
      fetchMeals(date),
    ]).then(([r, m]) => {
      setReport(r)
      setMeals(m)
    }).finally(() => setLoading(false))
  }

  useEffect(load, [date])

  useEffect(() => {
    if (showForm) {
      fetchExercises(pickerMuscleFilter || undefined).then(setDbExercises)
    }
  }, [showForm, pickerMuscleFilter])

  function toggleMuscle(m: string) {
    setWMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  function addExercise(ex: Exercise) {
    if (picked.some((p) => p.exercise.id === ex.id)) return
    setPicked([...picked, { exercise: ex, sets: [{ set: 1, reps: '10', weight: '' }] }])
  }

  function removePicked(idx: number) {
    setPicked(picked.filter((_, i) => i !== idx))
  }

  function addSet(exIdx: number) {
    const updated = [...picked]
    const current = updated[exIdx]
    current.sets = [...current.sets, { set: current.sets.length + 1, reps: '', weight: '' }]
    setPicked(updated)
  }

  function updateSet(exIdx: number, setIdx: number, field: 'reps' | 'weight', val: string) {
    const updated = [...picked]
    updated[exIdx].sets[setIdx][field] = val
    setPicked(updated)
  }

  function removeSet(exIdx: number, setIdx: number) {
    const updated = [...picked]
    updated[exIdx].sets = updated[exIdx].sets
      .filter((_, i) => i !== setIdx)
      .map((s, i) => ({ ...s, set: i + 1 }))
    setPicked(updated)
  }

  function resetForm() {
    setWName('')
    setWType('strength')
    setWDuration('30')
    setWCalories('')
    setWMuscles([])
    setPicked([])
    setShowExercisePicker(false)
    setPickerMuscleFilter('')
  }

  async function handleAddWorkout(e: React.FormEvent) {
    e.preventDefault()
    const exercises = picked.map((p, i) => ({
      exercise_id: p.exercise.id,
      sort_order: i,
      sets_data: JSON.stringify(p.sets.map((s) => ({ set: s.set, reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 }))),
    }))
    await createWorkout({
      name: wName,
      exercise_type: wType,
      duration_minutes: Number(wDuration),
      calories_burned: wCalories ? Number(wCalories) : null,
      target_muscles: wMuscles.length > 0 ? wMuscles.join(',') : null,
      date,
      exercises,
    })
    resetForm()
    setShowForm(false)
    load()
  }

  if (loading) return <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>

  const calPct = report ? Math.min((report.total_calories_consumed / report.calorie_goal) * 100, 100) : 0
  const burnPct = report && report.total_calories_burned > 0 ? Math.min((report.total_calories_burned / report.total_calories_consumed) * 100, 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Progress Report</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{Math.round(report.total_calories_consumed)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Calories In</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{Math.round(report.total_calories_burned)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Calories Out</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{Math.round(report.net_calories)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Net Calories</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">{Math.round(report.calories_remaining)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Remaining</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-lg font-semibold dark:text-gray-100 mb-3">Calorie Balance</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Consumed ({Math.round(report.total_calories_consumed)} / {Math.round(report.calorie_goal)})</span>
                  <span className="text-emerald-600 font-medium">{Math.round(calPct)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                  <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${calPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Burned ({Math.round(report.total_calories_burned)})</span>
                  <span className="text-red-500 font-medium">{Math.round(burnPct)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                  <div className="h-3 rounded-full bg-red-400" style={{ width: `${burnPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-lg font-semibold dark:text-gray-100 mb-3">Macronutrients</h3>
              <div className="space-y-3">
                <MacroRow label="Protein" grams={report.total_protein} color="bg-red-400" />
                <MacroRow label="Carbs" grams={report.total_carbs} color="bg-yellow-400" />
                <MacroRow label="Fat" grams={report.total_fat} color="bg-blue-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-lg font-semibold dark:text-gray-100 mb-3">Activity</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Workouts</span>
                  <span className="font-medium">{report.workout_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Total Minutes</span>
                  <span className="font-medium">{report.total_workout_minutes}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Calories Burned</span>
                  <span className="font-medium text-red-500">{Math.round(report.total_calories_burned)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-300">Meals Logged</span>
                  <span className="font-medium">{report.meal_count}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold dark:text-gray-100">Workout Sessions</h3>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
            className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
          >
            {showForm ? 'Cancel' : '+ Add Session'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddWorkout} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Workout Name</label>
                <input value={wName} onChange={(e) => setWName(e.target.value)} required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Upper Body Push" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Type</label>
                <select value={wType} onChange={(e) => setWType(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Duration (min)</label>
                <input type="number" value={wDuration} onChange={(e) => setWDuration(e.target.value)} required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Calories Burned</label>
                <input type="number" value={wCalories} onChange={(e) => setWCalories(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Optional" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Target Muscle Groups</label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMuscle(m)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      wMuscles.includes(m)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Exercises</label>
                <button type="button" onClick={() => setShowExercisePicker(!showExercisePicker)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  {showExercisePicker ? 'Done Picking' : '+ Add Exercise'}
                </button>
              </div>

              {showExercisePicker && (
                <div className="mb-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <button onClick={() => setPickerMuscleFilter('')}
                      className={`text-xs px-2 py-1 rounded ${!pickerMuscleFilter ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>All</button>
                    {MUSCLE_GROUPS.map((m) => (
                      <button key={m} onClick={() => setPickerMuscleFilter(m)}
                        className={`text-xs px-2 py-1 rounded ${pickerMuscleFilter === m ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>{m}</button>
                    ))}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {dbExercises.map((ex) => (
                      <button key={ex.id} type="button" onClick={() => addExercise(ex)}
                        disabled={picked.some((p) => p.exercise.id === ex.id)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                          picked.some((p) => p.exercise.id === ex.id)
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }`}>
                        {ex.name} <span className="text-gray-400 dark:text-gray-500 text-xs">({ex.muscle_group})</span>
                      </button>
                    ))}
                    {dbExercises.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No exercises for this group</p>}
                  </div>
                </div>
              )}

              {picked.map((p, exIdx) => (
                <div key={p.exercise.id} className="mb-2 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium dark:text-gray-100">{p.exercise.name}</span>
                    <button type="button" onClick={() => removePicked(exIdx)}
                      className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                  <div className="space-y-1.5">
                    {p.sets.map((s, setIdx) => (
                      <div key={setIdx} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-gray-500 dark:text-gray-400">Set {s.set}</span>
                        <input type="number" value={s.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                          placeholder="Reps"
                          className="w-16 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        <span className="text-gray-400 dark:text-gray-500">×</span>
                        <input type="number" value={s.weight} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          placeholder="Weight"
                          className="w-20 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        <span className="text-gray-400 dark:text-gray-500">lbs</span>
                        <button type="button" onClick={() => removeSet(exIdx, setIdx)}
                          className="text-red-300 hover:text-red-500 ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addSet(exIdx)}
                    className="mt-1.5 text-xs text-emerald-600 hover:text-emerald-700">+ Add Set</button>
                </div>
              ))}
            </div>

            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
              Save Workout
            </button>
          </form>
        )}

        {(!report || report.workouts.length === 0) ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-4">No workouts logged for this date</p>
        ) : (
          <div className="space-y-3">
            {report.workouts.map((w) => {
              const muscles = w.target_muscles ? w.target_muscles.split(',').map((m) => m.trim()) : []
              return (
                <div key={w.id} className="py-3 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium dark:text-gray-100">{w.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{w.exercise_type}</span>
                      </div>
                      {muscles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {muscles.map((m) => (
                            <span key={m} className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 flex-shrink-0 ml-3">
                      <span>{w.duration_minutes} min</span>
                      {w.calories_burned != null && <span className="text-red-500">{w.calories_burned} cal</span>}
                      <button onClick={() => deleteWorkout(w.id).then(load)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                  {w.exercises.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {w.exercises.map((we) => {
                        let sets: { set: number; reps: number; weight: number }[] = []
                        try { sets = JSON.parse(we.sets_data) } catch { sets = [] }
                        return (
                          <div key={we.id} className="pl-2 border-l-2 border-emerald-300 dark:border-emerald-700">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{we.exercise?.name ?? `Exercise #${we.exercise_id}`}</div>
                            {sets.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {sets.map((s) => (
                                  <span key={s.set} className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                    {s.reps} × {s.weight}lbs
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-lg font-semibold dark:text-gray-100 mb-3">Meals</h3>
        {meals.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-4">No meals logged for this date</p>
        ) : (
          <div className="space-y-2">
            {meals.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium dark:text-gray-100">{m.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{m.meal_type}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-emerald-600 font-medium">{Math.round(m.calories)} cal</span>
                  {m.protein != null && <span>P:{Math.round(m.protein)}g</span>}
                  {m.carbs != null && <span>C:{Math.round(m.carbs)}g</span>}
                  {m.fat != null && <span>F:{Math.round(m.fat)}g</span>}
                  <button onClick={() => deleteMeal(m.id).then(load)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MacroRow({ label, grams, color }: { label: string; grams: number | null; color: string }) {
  const maxG = 100
  const pct = grams != null ? Math.min((grams / maxG) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="dark:text-gray-200">{label}</span>
        <span className="font-medium">{grams != null ? `${Math.round(grams)}g` : '-'}</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
        {grams != null && <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />}
      </div>
    </div>
  )
}
