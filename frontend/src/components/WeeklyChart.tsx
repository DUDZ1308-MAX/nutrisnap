import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DailySummary } from '../types/meal'

interface Props {
  days: DailySummary[]
}

export default function WeeklyChart({ days }: Props) {
  const data = days.map((d) => ({
    name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    calories: Math.round(d.total_calories),
    goal: d.goal,
  }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <h3 className="text-base sm:text-lg font-semibold dark:text-gray-100 mb-3 sm:mb-4">Weekly Trend</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="goal" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
