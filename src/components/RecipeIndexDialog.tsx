import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getRecipes } from '@/services/recipes'
import { addSelectedRecipe, isAuthError } from '@/services/selectedRecipes'
import { useSelection } from '@/contexts/SelectionContext'
import { Recipe } from '@/types'
import { formatBRL, recipeCost, yieldLabel } from '@/lib/recipeUtils'
import { toast } from '@/hooks/use-toast'

interface RecipeIndexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Kept for API compatibility; no longer used — realtime refreshes the list. */
  onAdded?: () => void
}

interface CategoryGroup {
  name: string
  recipes: Recipe[]
}

const RecipeIndexDialog: React.FC<RecipeIndexDialogProps> = ({ open, onOpenChange }) => {
  const { selectedIds } = useSelection()
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getRecipes({ sort: 'titulo-asc' })
      setAllRecipes(list)
    } catch (err) {
      console.error('Erro ao carregar receitas do acervo:', err)
      toast({
        title: 'Falha ao carregar',
        description: 'Não foi possível carregar o índice de receitas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadRecipes()
    }
  }, [open, loadRecipes])

  const grouped = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, Recipe[]>()
    for (const r of allRecipes) {
      const name = r.expand?.category?.name || 'Sem categoria'
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(r)
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        // "Sem categoria" goes last.
        if (a[0] === 'Sem categoria') return 1
        if (b[0] === 'Sem categoria') return -1
        return a[0].localeCompare(b[0], 'pt-BR')
      })
      .map(([name, recipes]) => ({ name, recipes }))
  }, [allRecipes])

  const handleAdd = async (recipe: Recipe) => {
    setAddingId(recipe.id)
    try {
      await addSelectedRecipe(recipe.id)
      // NOTE: we intentionally skip `refresh()` and `onAdded?.()` here.
      // `useRealtime('selected_recipes', …)` in Selecionadas.tsx (and the
      // SelectionContext) already react to the created record and reload the
      // list + selectedIds. Calling them here caused a duplicated API call
      // racing with the realtime update.
      toast({
        title: 'Receita adicionada à seleção',
        description: `"${recipe.title}" foi adicionada à sua seleção.`,
      })
    } catch (err) {
      console.error('Erro ao adicionar receita à seleção:', err)
      if (isAuthError(err)) {
        toast({
          title: 'Sessão expirada',
          description: 'Sessão expirada. Faça login novamente.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Falha ao adicionar',
          description: 'Não foi possível adicionar a receita à seleção.',
          variant: 'destructive',
        })
      }
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-marfim-border dark:border-[#322F26] shrink-0">
          <DialogTitle className="font-serif text-2xl font-semibold text-tinta dark:text-[#EFE9DD] tracking-tight">
            Índice de Receitas
          </DialogTitle>
          <DialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
            Selecione as receitas para adicionar à sua seleção
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <Loader2 className="w-8 h-8 animate-spin text-verde dark:text-[#A9C4B5] mb-3" />
            <p className="text-sm font-serif italic text-tinta-sec dark:text-[#B5AE9F]">
              Carregando receitas do acervo...
            </p>
          </div>
        ) : allRecipes.length === 0 ? (
          <div className="py-24 px-6 text-center">
            <p className="text-sm text-tinta-sec dark:text-[#B5AE9F]">
              Nenhuma receita encontrada no acervo.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5 space-y-8">
            {grouped.map((group) => (
              <section key={group.name}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD]">
                    {group.name}
                  </h3>
                  <span className="text-xs font-mono bg-marfim-card dark:bg-[#221F18] px-2 py-0.5 rounded-full border border-marfim-border dark:border-[#322F26] text-tinta-sec dark:text-[#B5AE9F]">
                    {group.recipes.length} {group.recipes.length === 1 ? 'receita' : 'receitas'}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-marfim-border dark:border-[#322F26]">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="bg-marfim/60 dark:bg-[#221F18] text-tinta-sec dark:text-[#B5AE9F]">
                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                          Receita
                        </th>
                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2 w-32">
                          Rendimento
                        </th>
                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2 w-32">
                          Custo estimado
                        </th>
                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2 w-24">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.recipes.map((recipe, idx) => {
                        const cost = recipeCost(recipe)
                        const alreadySelected = selectedIds.has(recipe.id)
                        const isAdding = addingId === recipe.id
                        return (
                          <tr
                            key={recipe.id}
                            className={`border-t border-marfim-border dark:border-[#322F26] transition-colors hover:bg-marfim-card/60 dark:hover:bg-[#221F18]/60 ${
                              idx % 2 === 1 ? 'bg-marfim/40 dark:bg-[#1A1812]' : ''
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <Link
                                to={`/receitas/${recipe.id}`}
                                onClick={() => onOpenChange(false)}
                                className="font-serif font-bold text-tinta dark:text-[#EFE9DD] hover:text-verde dark:hover:text-[#A9C4B5] transition-colors"
                              >
                                {recipe.title}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
                                {yieldLabel(recipe)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`font-mono text-xs font-semibold ${
                                  cost > 0
                                    ? 'text-verde dark:text-[#A9C4B5]'
                                    : 'text-tinta-ter dark:text-[#8F887B]'
                                }`}
                              >
                                {cost > 0 ? formatBRL(cost) : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {alreadySelected ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-verde/10 text-verde dark:bg-[#24392C] dark:text-[#A9C4B5] border border-verde/30 dark:border-[#3A5A47] gap-1 font-semibold"
                                >
                                  <Check className="w-3 h-3" />
                                  Selecionada
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAdd(recipe)}
                                  disabled={isAdding}
                                  className="h-8 px-3 text-xs font-semibold bg-bronze hover:bg-bronze-hover text-white dark:bg-[#B98A4F] dark:hover:bg-[#C99860] dark:text-[#15140F] rounded-lg gap-1 shadow-xs"
                                >
                                  {isAdding ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isAdding ? '...' : 'Adicionar'}</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RecipeIndexDialog
