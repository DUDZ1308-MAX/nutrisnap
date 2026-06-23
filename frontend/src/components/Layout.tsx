import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/log', label: 'Log Meal', icon: '📷' },
  { to: '/exercises', label: 'Exercises', icon: '💪' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/progress', label: 'Progress', icon: '📈' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nutrisnap-theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('nutrisnap-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-emerald-600">
            NutriSnap
          </Link>
          <div className="flex items-center gap-3">
            <nav className="flex gap-2">
              {nav.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === to
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => setDark(!dark)}
              className="ml-2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
