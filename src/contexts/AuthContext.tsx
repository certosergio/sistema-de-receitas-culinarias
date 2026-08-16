import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  register: (name: string, email: string, pass: string, passConfirm: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    return (pb.authStore.record as unknown as User) || null
  })
  const [token, setToken] = useState<string | null>(() => pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Initial sync
    setUser((pb.authStore.record as unknown as User) || null)
    setToken(pb.authStore.token || null)
    setIsLoading(false)

    // Listen to changes in authStore
    const unsubscribe = pb.authStore.onChange((newToken, model) => {
      setToken(newToken || null)
      setUser((model as unknown as User) || null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    await pb.collection('users').authWithPassword(email.trim(), pass)
  }

  const register = async (name: string, email: string, pass: string, passConfirm: string) => {
    await pb.collection('users').create({
      name: name.trim(),
      email: email.trim(),
      password: pass,
      passwordConfirm: passConfirm,
    })
    await pb.collection('users').authWithPassword(email.trim(), pass)
  }

  const logout = () => {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
