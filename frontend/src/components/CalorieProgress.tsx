interface Props {
  current: number
  goal: number
}

export default function CalorieProgress({ current, goal }: Props) {
  const pct = Math.min((current / goal) * 100, 100)
  const remaining = Math.max(goal - current, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-semibold dark:text-gray-100">Today's Calories</span>
        <span className="text-2xl font-bold text-emerald-600">
          {Math.round(current)}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-1">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{Math.round(remaining)} remaining</span>
        <span>{Math.round(goal)} goal</span>
      </div>
    </div>
  )
}
