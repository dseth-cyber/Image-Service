import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/axios'

export interface User {
  id: string
  username: string
  email: string
  role: string
  permissions?: string[]
  lastLogin: string | null
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function storeTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') ?? 'null') } catch { return null }
  })
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('accessToken'))

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post('/image-service/api/v1/auth/login', { username, password })
    storeTokens(data.accessToken, data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/image-service/api/v1/auth/logout') } catch { /* ignore */ }
    clearTokens()
    setAccessToken(null)
    setUser(null)
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post('/image-service/api/v1/auth/change-password', { currentPassword, newPassword })
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated: !!user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
