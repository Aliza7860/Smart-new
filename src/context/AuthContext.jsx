import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('sb_token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
    } catch {
      localStorage.removeItem('sb_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('sb_token', data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form)
    localStorage.setItem('sb_token', data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('sb_token')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, loadUser }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
