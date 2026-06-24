import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/log', label: 'Log Meal', icon: '📷' },
  { to: '/exercises', label: 'Exercises', icon: '💪' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/progress', label: 'Progress', icon: '📈' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nutrisnap-theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('nutrisnap-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-emerald-600">
            NutriSnap
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden sm:flex gap-2">
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
            {user && (
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
                {user.name}
              </span>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="hidden sm:inline text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
              >
                Logout
              </button>
            )}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="sm:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-1">
            {nav.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </Link>
            ))}
            {user && (
              <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{user.name}</div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}
