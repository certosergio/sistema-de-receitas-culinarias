import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, FileDown, ListChecks, Loader2, ArrowRight, BookOpen } from 'lucide-react'
import {
  fetchSelectedRecipes,
  clearSelectedRecipes,
  removeSelectedRecipe,
} from '@/services/selectedRecipes'
import { useSelection } from '@/contexts/SelectionContext'
import { Recipe } from '@/types'
import { useRealtime } from '@/hooks/use-realtime'
import { exportSelectionReportPdf } from '@/lib/selectionReportPdf'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`

function recipeCost(recipe: Recipe): number {
  const ingredientsTotalCost = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.reduce((sum, ing) => {
        const c = typeof ing.cost === 'number' ? ing.cost : 0
        return sum + (isNaN(c) ? 0 : c)
      }, 0)
    : 0
  return ingredientsTotalCost > 0 ? ingredientsTotalCost : recipe.cost || 0
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id
}

function yieldLabel(recipe: Recipe): string {
  if (recipe.yield_quantity) {
    return `${recipe.yield_quantity} ${recipe.yield_unit || 'porções'}`
  }
  return recipe.portions || '—'
}

const Selecionadas: React.FC = () => {
  const { refresh } = useSelection()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<Recipe | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const list = await fetchSelectedRecipes()
      setRecipes(list)
    } catch (err) {
      console.error('Erro ao carregar receitas selecionadas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('selected_recipes', () => {
    load()
    refresh()
  })

  const totalCost = recipes.reduce((sum, r) => sum + recipeCost(r), 0)

  const handleRemove = async () => {
    if (!removeTarget) return
    const target = removeTarget
    setRemoving(true)
    try {
      await removeSelectedRecipe(target.id)
      setRecipes((prev) => prev.filter((r) => r.id !== target.id))
      await refresh()
      toast({
        title: 'Receita removida',
        description: `"${target.title}" foi retirada da seleção.`,
      })
    } catch (err) {
      console.error('Erro ao remover receita:', err)
      toast({
        title: 'Falha ao remover',
        description: 'Não foi possível remover a receita da seleção.',
        variant: 'destructive',
      })
    } finally {
      setRemoving(false)
      setRemoveTarget(null)
    }
  }

  const handleClearAll = async () => {
    setRemoving(true)
    try {
      await clearSelectedRecipes()
      setRecipes([])
      await refresh()
      toast({
        title: 'Seleção limpa',
        description: 'Todas as receitas foram removidas da seleção.',
      })
    } catch (err) {
      console.error('Erro ao limpar seleção:', err)
      toast({
        title: 'Falha ao limpar',
        description: 'Não foi possível limpar a seleção.',
        variant: 'destructive',
      })
    } finally {
      setRemoving(false)
      setClearOpen(false)
    }
  }

  const handleExport = async () => {
    if (recipes.length === 0) return
    setExporting(true)
    try {
      await new Promise((r) => setTimeout(r, 50))
      exportSelectionReportPdf(recipes)
      toast({
        title: 'Relatório gerado',
        description: 'O PDF das receitas selecionadas foi exportado.',
      })
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      toast({
        title: 'Falha na exportação',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border dark:border-[#322F26]">
        <div>
          <span className="label-caps block mb-1">Seleção Pessoal</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-tinta dark:text-[#EFE9DD] tracking-tight">
              Receitas Selecionadas
            </h1>
            <span className="text-xs font-mono bg-marfim-card dark:bg-[#221F18] px-2.5 py-1 rounded-full border border-marfim-border dark:border-[#322F26] text-tinta font-medium dark:text-[#EFE9DD]">
              {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
            </span>
          </div>
        </div>

        {recipes.length > 0 && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setClearOpen(true)}
              disabled={removing || exporting}
              className="border-marfim-border dark:border-[#322F26] text-red-600 dark:text-[#E0806B] hover:bg-red-50 dark:hover:bg-[#2a1f1c] rounded-xl gap-2 h-10 text-xs font-semibold shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar tudo</span>
            </Button>
            <Button
              onClick={handleExport}
              disabled={removing || exporting || recipes.length === 0}
              className="bg-bronze hover:bg-bronze-hover text-white dark:bg-[#B98A4F] dark:hover:bg-[#C99860] dark:text-[#15140F] rounded-xl gap-2 h-10 text-xs font-semibold shadow-md"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{exporting ? 'Gerando...' : 'Gerar Relatório'}</span>
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1E1C16] rounded-2xl border border-marfim-border dark:border-[#322F26] shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde dark:text-[#A9C4B5] mb-3" />
          <p className="text-sm font-serif italic text-tinta-sec dark:text-[#B5AE9F]">
            Carregando sua seleção...
          </p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1C16] rounded-2xl p-12 text-center border border-dashed border-marfim-border dark:border-[#322F26] shadow-card">
          <div className="w-20 h-20 rounded-full bg-bronze-subtle border border-bronze/30 flex items-center justify-center mx-auto mb-5">
            <ListChecks className="w-10 h-10 text-bronze" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD]">
            Nenhuma receita selecionada
          </h3>
          <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] max-w-md mx-auto mt-2 mb-6 leading-relaxed">
            Nenhuma receita selecionada. Adicione receitas a partir do catálogo.
          </p>
          <Button asChild className="bg-verde hover:bg-verde-hover text-white rounded-xl">
            <Link to="/receitas">
              <BookOpen className="w-4 h-4 mr-2" />
              Explorar receitas
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1C16] rounded-2xl border border-marfim-border dark:border-[#322F26] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-verde text-white dark:bg-[#24392C] dark:text-[#EFE9DD]">
                  <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-4 py-3 w-28">
                    ID
                  </th>
                  <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-4 py-3 w-44">
                    Categoria
                  </th>
                  <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-4 py-3">
                    Receita
                  </th>
                  <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-4 py-3 w-36">
                    Rendimento
                  </th>
                  <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-4 py-3 w-32">
                    Custo estimado
                  </th>
                  <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-4 py-3 w-20">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe, idx) => {
                  const cost = recipeCost(recipe)
                  return (
                    <tr
                      key={recipe.id}
                      className={`border-t border-marfim-border dark:border-[#322F26] transition-colors hover:bg-marfim-card/60 dark:hover:bg-[#221F18]/60 ${
                        idx % 2 === 1 ? 'bg-marfim/40 dark:bg-[#1A1812]' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-tinta-ter dark:text-[#8F887B]">
                          {shortId(recipe.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
                          {recipe.expand?.category?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/receitas/${recipe.id}`}
                          className="font-serif font-bold text-tinta dark:text-[#EFE9DD] hover:text-verde dark:hover:text-[#A9C4B5] transition-colors"
                        >
                          {recipe.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
                          {yieldLabel(recipe)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(recipe)}
                          aria-label={`Excluir ${recipe.title} da seleção`}
                          title="Excluir da seleção"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-[#E0806B] hover:bg-red-50 dark:hover:bg-[#2a1f1c] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-marfim-card dark:bg-[#221F18] border-t-2 border-marfim-border dark:border-[#322F26]">
                  <td colSpan={2} className="px-4 py-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-tinta dark:text-[#EFE9DD]">
                      Total de receitas
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD]">
                      {recipes.length}
                    </span>
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-verde dark:text-[#A9C4B5]">
                      {formatBRL(totalCost)}
                    </span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* REMOVE CONFIRMATION */}
      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta dark:text-[#EFE9DD]">
              Remover da seleção?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
              Esta ação remove{' '}
              <strong className="text-tinta dark:text-[#EFE9DD]">
                &ldquo;{removeTarget?.title}&rdquo;
              </strong>{' '}
              da sua seleção pessoal. A receita permanece no acervo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {removing ? 'Removendo...' : 'Sim, remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CLEAR ALL CONFIRMATION */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta dark:text-[#EFE9DD]">
              Limpar toda a seleção?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
              Todas as{' '}
              <strong className="text-tinta dark:text-[#EFE9DD]">{recipes.length} receitas</strong>{' '}
              serão removidas da sua seleção pessoal. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {removing ? 'Limpando...' : 'Sim, limpar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Selecionadas
