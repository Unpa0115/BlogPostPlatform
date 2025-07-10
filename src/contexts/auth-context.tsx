"use client"

import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ローカルストレージからトークンを復元
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      // トークンの有効性を確認
      validateToken(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      // localhost環境では認証チェックをスキップ
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.startsWith('192.168.')
      )

      const headers: Record<string, string> = {}
      
      if (!isLocalhost) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/auth/me', {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        if (!isLocalhost) {
          // 本番環境でトークンが無効な場合
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
        } else {
          // localhost環境では固定ユーザーを設定
          setUser({
            id: 'localhost-user',
            email: 'localhost@example.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Token validation error:', error)
      if (typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.startsWith('192.168.')
      )) {
                 // localhost環境では固定ユーザーを設定
         setUser({
           id: 'localhost-user',
           email: 'localhost@example.com',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         })
      } else {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('token', data.token)
        return { success: true }
      } else {
        const error = await response.json()
        console.error('Login error:', error)
        return { success: false, error: error.error || 'ログインに失敗しました' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('token', data.token)
        return { success: true }
      } else {
        const error = await response.json()
        console.error('Register error:', error)
        return { success: false, error: error.error || '登録に失敗しました' }
      }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 