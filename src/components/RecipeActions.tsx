import React, { useEffect, useRef, useState } from 'react'
import { Heart, MoreVertical, FolderPlus, Check } from 'lucide-react'
import { useFavorites } from '@/contexts/FavoritesContext'
import { toast } from '@/hooks/use-toast'
import { getCollections, toggleRecipeInCollection } from '@/services/collections'
import { Collection } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RecipeActionsProps {
  recipeId: string
  /** When true, the heart button is large and on its own (detail page). */
  size?: 'sm' | 'md'
  /** Optional stop-propagation wrapper class for the trigger button container. */
  className?: string
}

/**
 * Inline favorite heart + "add to collection" dropdown used on recipe cards
 * and on the recipe detail hero. All clicks stop propagation so the wrapping
 * <Link> navigation is not triggered.
 */
export const RecipeActions: React.FC<RecipeActionsProps> = ({
  recipeId,
  size = 'sm',
  className = '',
}) => {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [collections, setCollections] = useState<Collection[]>([])
  const [membership, setMembership] = useState<Record<string, boolean>>({})
  const [loadingCols, setLoadingCols] = useState(false)
  const dropdownOpenRef = useRef(false)

  const favorited = isFavorite(recipeId)
  const btnSize = size === 'md' ? 'w-10 h-10' : 'w-8 h-8'
  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleFavorite(recipeId)
    } catch {
      toast({
        title: 'Erro ao favoritar',
        description: 'Não foi possível atualizar seus favoritos.',
        variant: 'destructive',
      })
    }
  }

  const loadCollectionsForRecipe = async () => {
    setLoadingCols(true)
    try {
      const cols = await getCollections()
      setCollections(cols)
      // Determine membership by querying per-collection (lightweight for small sets).
      const { fetchCollectionsContainingRecipe } = await import('@/services/favorites')
      const present = await fetchCollectionsContainingRecipe(recipeId)
      const map: Record<string, boolean> = {}
      cols.forEach((c) => {
        map[c.id] = present.has(c.id)
      })
      setMembership(map)
    } catch (err) {
      console.error('Erro ao carregar coleções:', err)
    } finally {
      setLoadingCols(false)
    }
  }

  const handleToggleInCollection = async (e: React.MouseEvent, collectionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const currently = membership[collectionId] || false
    // Optimistic.
    setMembership((prev) => ({ ...prev, [collectionId]: !currently }))
    try {
      const next = await toggleRecipeInCollection(collectionId, recipeId, currently)
      setMembership((prev) => ({ ...prev, [collectionId]: next }))
    } catch {
      setMembership((prev) => ({ ...prev, [collectionId]: currently }))
      toast({
        title: 'Erro ao atualizar coleção',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleFavorite}
        aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        className={`${btnSize} rounded-full flex items-center justify-center backdrop-blur-md border shadow-xs transition-all active:scale-90 ${
          favorited
            ? 'bg-bronze/95 border-bronze-light/50 text-white hover:bg-bronze-hover'
            : 'bg-white/85 dark:bg-[#1E1C16]/85 border-white/40 dark:border-[#322F26] text-tinta dark:text-[#EFE9DD] hover:bg-white dark:hover:bg-[#221F18]'
        }`}
      >
        <Heart className={`${iconSize} ${favorited ? 'fill-current' : ''}`} strokeWidth={2} />
      </button>

      <DropdownMenu
        onOpenChange={(open) => {
          dropdownOpenRef.current = open
          if (open) loadCollectionsForRecipe()
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Adicionar à coleção"
            className={`${btnSize} rounded-full flex items-center justify-center backdrop-blur-md bg-white/85 dark:bg-[#1E1C16]/85 border border-white/40 dark:border-[#322F26] text-tinta dark:text-[#EFE9DD] hover:bg-white dark:hover:bg-[#221F18] shadow-xs transition-all active:scale-90`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <MoreVertical className={iconSize} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 bg-white dark:bg-[#1E1C16] border-marfim-border dark:border-[#322F26] rounded-xl shadow-dropdown dark:shadow-dropdown-dark p-1.5"
          // Prevent the card Link navigation when interacting with the menu.
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-tinta-ter font-semibold px-2 py-1.5 flex items-center gap-1.5">
            <FolderPlus className="w-3.5 h-3.5 text-bronze" />
            Adicionar à coleção
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-marfim-border dark:bg-[#322F26]" />
          {loadingCols ? (
            <div className="px-2 py-3 text-xs text-tinta-ter dark:text-[#8F887B] italic">
              Carregando coleções...
            </div>
          ) : collections.length === 0 ? (
            <div className="px-2 py-3 text-xs text-tinta-sec dark:text-[#B5AE9F]">
              Você ainda não criou coleções.{' '}
              <a
                href="/colecoes"
                className="text-verde font-semibold hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Criar agora
              </a>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {collections.map((col) => {
                const checked = membership[col.id] || false
                return (
                  <DropdownMenuItem
                    key={col.id}
                    onSelect={(e) => e.preventDefault()}
                    onClick={(e) => handleToggleInCollection(e, col.id)}
                    className="cursor-pointer text-xs rounded-lg py-2 px-2 flex items-center gap-2 justify-between"
                  >
                    <span className="truncate">{col.name}</span>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        checked
                          ? 'bg-verde border-verde text-white'
                          : 'border-marfim-border dark:border-[#322F26] bg-white dark:bg-[#221F18]'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default RecipeActions
