import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserSettings, saveUserSettings } from '@/services/settings'
import { UserSettings } from '@/types'

interface SettingsContextType {
  settings: UserSettings | null
  costLimitPerPortion: number | null
  loading: boolean
  updateCostLimit: (limit: number | null) => Promise<void>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refreshSettings = useCallback(async () => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }
    try {
      const data = await getUserSettings()
      setSettings(data)
    } catch (err) {
      console.error('Erro ao carregar configurações de usuário:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  const updateCostLimit = async (limit: number | null) => {
    const updated = await saveUserSettings({ cost_limit_per_portion: limit })
    setSettings(updated)
  }

  const costLimitPerPortion =
    settings?.cost_limit_per_portion !== undefined && settings?.cost_limit_per_portion !== null
      ? Number(settings.cost_limit_per_portion)
      : null

  return (
    <SettingsContext.Provider
      value={{
        settings,
        costLimitPerPortion,
        loading,
        updateCostLimit,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider')
  }
  return context
}
