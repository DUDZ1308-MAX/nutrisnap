import type { Meal } from '../types/meal'

interface Props {
  meal: Meal
  onEdit?: (meal: Meal) => void
  onDelete?: (id: number) => void
}

const typeColors: Record<string, string> = {
  breakfast: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  lunch: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  dinner: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  snack: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

export default function MealCard({ meal, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4">
      {meal.image_path && (
        <img
          src={`/uploads/${meal.image_path.split('/').pop()}`}
          alt={meal.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold truncate">{meal.name}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[meal.meal_type] || typeColors.snack}`}>
            {meal.meal_type}
          </span>
          {meal.ai_generated && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">AI</span>
          )}
        </div>
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span>{Math.round(meal.calories)} cal</span>
          {meal.protein != null && <span>P: {Math.round(meal.protein)}g</span>}
          {meal.carbs != null && <span>C: {Math.round(meal.carbs)}g</span>}
          {meal.fat != null && <span>F: {Math.round(meal.fat)}g</span>}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {onEdit && (
          <button onClick={() => onEdit(meal)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 px-2 py-1">
            ✏️
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(meal.id)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1">
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
