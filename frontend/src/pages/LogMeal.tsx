import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageUploader from '../components/ImageUploader'
import { analyzeImage, createMeal } from '../api/client'
import type { VisionResult } from '../types/meal'

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack']

export default function LogMeal() {
  const navigate = useNavigate()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null)

  async function handleImage(file: File) {
    setImageFile(file)
    setAnalyzing(true)
    setError('')
    try {
      const result = await analyzeImage(file)
      setVisionResult(result)
      setName(result.name)
      setCalories(String(result.calories))
      setProtein(result.protein != null ? String(result.protein) : '')
      setCarbs(result.carbs != null ? String(result.carbs) : '')
      setFat(result.fat != null ? String(result.fat) : '')
    } catch {
      setError('AI analysis failed. Fill in the details manually.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !calories) {
      setError('Name and calories are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('calories', calories)
      fd.append('meal_type', mealType)
      fd.append('meal_date', date)
      if (protein) fd.append('protein', protein)
      if (carbs) fd.append('carbs', carbs)
      if (fat) fd.append('fat', fat)
      if (imageFile) fd.append('image', imageFile)
      await createMeal(fd)
      navigate('/')
    } catch {
      setError('Failed to save meal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Log Meal</h1>

      <ImageUploader onImage={handleImage} disabled={analyzing} />

      {analyzing && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-3 rounded-lg">
          <span className="animate-pulse">🔍</span>
          Analyzing with AI...
        </div>
      )}

      {visionResult && !analyzing && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg">
          <span>🤖</span>
          AI suggests <strong>{visionResult.name}</strong> — {Math.round(visionResult.calories)} cal
          <span className="text-xs text-blue-500 dark:text-blue-400 ml-1">(confidence: {visionResult.confidence})</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Meal Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Grilled Chicken Salad"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Calories</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Carbs (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Fat (g)</label>
            <input
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Meal Type</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {mealTypes.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Meal'}
        </button>
      </form>
    </div>
  )
}
