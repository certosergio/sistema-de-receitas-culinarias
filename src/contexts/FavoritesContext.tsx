import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { addFavorite, fetchFavoriteRecipeIds, removeFavoriteByRecipe } from '@/services/favorites'

interface FavoritesContextValue {
  /** Set of recipe ids the current user has favorited. */
  favoriteIds: Set<string>
  /** True until the initial load completes. */
  loading: boolean
  isFavorite: (recipeId: string) => boolean
  /** Optimistically toggles a favorite and reconciles with the backend. */
  toggleFavorite: (recipeId: string) => Promise<void>
  refresh: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const ids = await fetchFavoriteRecipeIds()
    setFavoriteIds(ids)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set())
      setLoading(false)
      return
    }
    refresh()
  }, [user, refresh])

  const isFavorite = useCallback((recipeId: string) => favoriteIds.has(recipeId), [favoriteIds])

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      const currentlyFavorite = favoriteIds.has(recipeId)
      // Optimistic update.
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (currentlyFavorite) next.delete(recipeId)
        else next.add(recipeId)
        return next
      })
      try {
        if (currentlyFavorite) {
          await removeFavoriteByRecipe(recipeId)
        } else {
          await addFavorite(recipeId)
        }
      } catch (err) {
        // Revert on failure.
        console.error('Erro ao alternar favorito:', err)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (currentlyFavorite) next.add(recipeId)
          else next.delete(recipeId)
          return next
        })
      }
    },
    [favoriteIds],
  )

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, loading, isFavorite, toggleFavorite, refresh }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  }
  return ctx
}
