import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setResetToken('')
    setBusy(true)
    try {
      const res = await forgotPassword(email)
      setMessage(res.message)
      if (res.reset_token) {
        setResetToken(res.reset_token)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-xl font-bold text-center mb-2">Reset Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Enter your email to receive a reset link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-emerald-600 dark:text-emerald-400 text-sm">{message}</p>}
          {resetToken && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-xs break-all">
              <p className="font-medium mb-1">Dev mode — your reset token:</p>
              <code className="text-emerald-600 dark:text-emerald-400">{resetToken}</code>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
