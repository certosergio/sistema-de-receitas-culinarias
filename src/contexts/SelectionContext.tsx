import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  addSelectedRecipe,
  fetchSelectedRecipeIds,
  removeSelectedRecipe,
} from '@/services/selectedRecipes'

interface SelectionContextValue {
  /** Set of recipe ids the current user has selected. */
  selectedIds: Set<string>
  /** True until the initial load completes. */
  loading: boolean
  isSelected: (recipeId: string) => boolean
  /** Optimistically toggles a selection and reconciles with the backend. */
  toggleSelection: (recipeId: string) => Promise<void>
  refresh: () => Promise<void>
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined)

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const ids = await fetchSelectedRecipeIds()
    setSelectedIds(ids)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) {
      setSelectedIds(new Set())
      setLoading(false)
      return
    }
    refresh()
  }, [user, refresh])

  const isSelected = useCallback((recipeId: string) => selectedIds.has(recipeId), [selectedIds])

  const toggleSelection = useCallback(
    async (recipeId: string) => {
      const currentlySelected = selectedIds.has(recipeId)
      // Optimistic update.
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (currentlySelected) next.delete(recipeId)
        else next.add(recipeId)
        return next
      })
      try {
        if (currentlySelected) {
          await removeSelectedRecipe(recipeId)
        } else {
          await addSelectedRecipe(recipeId)
        }
      } catch (err) {
        console.error('Erro ao alternar seleção:', err)
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (currentlySelected) next.add(recipeId)
          else next.delete(recipeId)
          return next
        })
        throw err
      }
    },
    [selectedIds],
  )

  return (
    <SelectionContext.Provider
      value={{ selectedIds, loading, isSelected, toggleSelection, refresh }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) {
    throw new Error('useSelection deve ser usado dentro de SelectionProvider')
  }
  return ctx
}
