import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'

const rawURL = import.meta.env.VITE_API_URL || ''
const baseURL = rawURL ? `${rawURL.replace(/\/+$/, '')}/api` : '/api'

export interface User {
  id: number
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('nutrisnap-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nutrisnap-token'))

  function saveToken(t: string, u: User) {
    localStorage.setItem('nutrisnap-token', t)
    localStorage.setItem('nutrisnap-user', JSON.stringify(u))
    setToken(t)
    setUser(u)
  }

  async function login(email: string, password: string) {
    const res = await axios.post(`${baseURL}/auth/login`, { email, password })
    saveToken(res.data.access_token, res.data.user)
  }

  async function register(name: string, email: string, password: string) {
    const res = await axios.post(`${baseURL}/auth/register`, { name, email, password })
    saveToken(res.data.access_token, res.data.user)
  }

  function logout() {
    localStorage.removeItem('nutrisnap-token')
    localStorage.removeItem('nutrisnap-user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
