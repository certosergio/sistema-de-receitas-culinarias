import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRecipes } from '@/services/recipes'
import { getAllUserRecipeIngredients } from '@/services/recipeIngredients'
import { Recipe, RecipeIngredient } from '@/types'
import { formatBRL, yieldLabel } from '@/lib/recipeUtils'
import {
  DollarSign,
  Search,
  ArrowUpDown,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Loader2,
  X,
  ExternalLink,
  Plus,
  Scale,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface RecipeCostRow {
  recipe: Recipe
  hasLinked: boolean
  linkedCount: number
  totalCost: number // 0 if not calculated
  costPerPortion: number | null // null if no yield_quantity or cost == 0
}

type SortColumn = 'title' | 'totalCost' | 'costPerPortion' | 'yield'
type SortDirection = 'asc' | 'desc'

export const RelatorioCustos: React.FC = () => {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [allLinked, setAllLinked] = useState<RecipeIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('totalCost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [recipesList, linkedList] = await Promise.all([
          getRecipes({ sort: '-created' }),
          getAllUserRecipeIngredients(),
        ])
        setRecipes(recipesList)
        setAllLinked(linkedList)
      } catch (err) {
        console.error('Erro ao carregar dados do relatório de custos:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Agrupa recipe_ingredients por recipe_id
  const linkedByRecipe = useMemo(() => {
    const map = new Map<string, RecipeIngredient[]>()
    allLinked.forEach((item) => {
      const arr = map.get(item.recipe_id) || []
      arr.push(item)
      map.set(item.recipe_id, arr)
    })
    return map
  }, [allLinked])

  // Monta as linhas consolidadas de custo de cada receita
  const rows: RecipeCostRow[] = useMemo(() => {
    return recipes.map((recipe) => {
      const linkedItems = linkedByRecipe.get(recipe.id) || []
      const hasLinked = linkedItems.length > 0

      let total = 0
      if (hasLinked) {
        total = linkedItems.reduce((sum, item) => {
          const ing = item.expand?.ingredient_id
          if (!ing) return sum
          const q = item.quantidade || 0
          const unitCost = ing.custo_unitario || 0
          return sum + q * unitCost
        }, 0)
      } else if (typeof recipe.cost === 'number' && recipe.cost > 0) {
        total = recipe.cost
      }

      // Custo por porção/rendimento quando existirem dados
      let perPortion: number | null = null
      if (total > 0 && recipe.yield_quantity && recipe.yield_quantity > 0) {
        perPortion = total / recipe.yield_quantity
      }

      return {
        recipe,
        hasLinked,
        linkedCount: linkedItems.length,
        totalCost: total,
        costPerPortion: perPortion,
      }
    })
  }, [recipes, linkedByRecipe])

  // Filtro por nome
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase().trim()
    return rows.filter((r) => {
      return (
        r.recipe.title.toLowerCase().includes(q) ||
        r.recipe.summary?.toLowerCase().includes(q) ||
        r.recipe.expand?.category?.name.toLowerCase().includes(q)
      )
    })
  }, [rows, search])

  // Ordenação
  const sortedRows = useMemo(() => {
    const copy = [...filteredRows]
    copy.sort((a, b) => {
      let comparison = 0
      if (sortColumn === 'title') {
        comparison = a.recipe.title.localeCompare(b.recipe.title, 'pt-BR')
      } else if (sortColumn === 'totalCost') {
        comparison = a.totalCost - b.totalCost
      } else if (sortColumn === 'costPerPortion') {
        const valA = a.costPerPortion ?? -1
        const valB = b.costPerPortion ?? -1
        comparison = valA - valB
      } else if (sortColumn === 'yield') {
        const valA = a.recipe.yield_quantity ?? 0
        const valB = b.recipe.yield_quantity ?? 0
        comparison = valA - valB
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return copy
  }, [filteredRows, sortColumn, sortDirection])

  // Total geral
  const totalGeral = useMemo(() => {
    return sortedRows.reduce((sum, row) => sum + row.totalCost, 0)
  }, [sortedRows])

  const receitasComCusto = useMemo(() => {
    return sortedRows.filter((r) => r.totalCost > 0).length
  }, [sortedRows])

  const mediaPorReceita = useMemo(() => {
    return receitasComCusto > 0 ? totalGeral / receitasComCusto : 0
  }, [totalGeral, receitasComCusto])

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection(col === 'title' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <span className="label-caps block mb-1">Gestão &amp; Rentabilidade</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
              Relatório de Custos
            </h1>
            <Badge
              variant="outline"
              className="bg-marfim-card text-tinta font-mono text-xs px-2.5 py-0.5 border-marfim-border"
            >
              {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/ingredientes')}
            variant="outline"
            className="border-bronze/40 text-bronze hover:bg-bronze-subtle rounded-xl text-xs px-4 py-5 font-semibold"
          >
            Gerenciar Preços de Insumos
          </Button>
          <Button
            onClick={() => navigate('/receitas/nova')}
            className="bg-bronze hover:bg-bronze-hover text-white shadow-md rounded-xl text-xs px-4 py-5 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Receita</span>
          </Button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Geral */}
        <div className="bg-white rounded-2xl p-5 border border-marfim-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-tinta-ter font-semibold">
              Custo Total Geral
            </span>
            <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-verde font-mono">
            {formatBRL(totalGeral)}
          </div>
          <p className="text-xs text-tinta-sec">
            Soma de {receitasComCusto} receitas com custo calculado
          </p>
        </div>

        {/* Média por Receita */}
        <div className="bg-white rounded-2xl p-5 border border-marfim-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-tinta-ter font-semibold">
              Custo Médio por Receita
            </span>
            <div className="w-8 h-8 rounded-full bg-bronze-subtle text-bronze flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta font-mono">
            {mediaPorReceita > 0 ? formatBRL(mediaPorReceita) : '—'}
          </div>
          <p className="text-xs text-tinta-sec">
            Considerando receitas com ingredientes cadastrados
          </p>
        </div>

        {/* Cobertura de Vínculos */}
        <div className="bg-white rounded-2xl p-5 border border-marfim-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-tinta-ter font-semibold">
              Cobertura de Fichas
            </span>
            <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta font-mono">
            {recipes.length > 0
              ? `${Math.round((receitasComCusto / recipes.length) * 100)}%`
              : '0%'}
          </div>
          <p className="text-xs text-tinta-sec">
            {receitasComCusto} de {recipes.length} receitas vinculadas a insumos
          </p>
        </div>
      </div>

      {/* TOOLBAR & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-tinta-ter absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Buscar receita por título ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white border-marfim-border rounded-xl focus-visible:ring-verde text-sm shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-ter hover:text-tinta"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-tinta-sec">
          <span>
            Exibindo <strong>{sortedRows.length}</strong> de <strong>{recipes.length}</strong>{' '}
            receitas
          </span>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-2" />
          <p className="text-sm font-serif italic text-tinta-sec">
            Calculando relatório de custos do acervo...
          </p>
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <BookOpen className="w-12 h-12 text-tinta-ter mx-auto mb-3" />
          <h3 className="font-serif text-2xl font-bold text-tinta">Nenhuma receita encontrada</h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-1 mb-6">
            {search
              ? 'Nenhuma receita corresponde ao termo pesquisado.'
              : 'Cadastre suas receitas e vincule os ingredientes para acompanhar o custo total de produção.'}
          </p>
          <Button
            onClick={() => navigate('/receitas/nova')}
            className="bg-verde text-white rounded-xl"
          >
            + Cadastrar Nova Receita
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-marfim-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-marfim-border bg-marfim/40 text-tinta-sec font-serif text-xs uppercase tracking-wider">
                  <th
                    onClick={() => handleSort('title')}
                    className="py-3.5 px-4 font-semibold cursor-pointer hover:text-tinta select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Receita</span>
                      {sortColumn === 'title' &&
                        (sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-bronze" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-bronze" />
                        ))}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold">Categoria</th>
                  <th
                    onClick={() => handleSort('yield')}
                    className="py-3.5 px-4 font-semibold cursor-pointer hover:text-tinta select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rendimento</span>
                      {sortColumn === 'yield' &&
                        (sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-bronze" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-bronze" />
                        ))}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-center">Insumos Vinculados</th>
                  <th
                    onClick={() => handleSort('costPerPortion')}
                    className="py-3.5 px-4 font-semibold text-right cursor-pointer hover:text-tinta select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Custo / Porção</span>
                      {sortColumn === 'costPerPortion' &&
                        (sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-bronze" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-bronze" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalCost')}
                    className="py-3.5 px-4 font-semibold text-right cursor-pointer hover:text-tinta select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Custo Total</span>
                      {sortColumn === 'totalCost' &&
                        (sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-verde" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-verde" />
                        ))}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marfim-border/70">
                {sortedRows.map((row) => {
                  const r = row.recipe
                  const cat = r.expand?.category

                  return (
                    <tr key={r.id} className="hover:bg-marfim/30 transition-colors group">
                      {/* Receita Título */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/receitas/${r.id}`}
                          className="font-serif font-bold text-tinta group-hover:text-verde transition-colors block leading-snug"
                        >
                          {r.title}
                        </Link>
                        {r.summary && (
                          <span className="text-xs text-tinta-ter line-clamp-1 mt-0.5">
                            {r.summary}
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        {cat ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-marfim-card text-tinta-sec border border-marfim-border">
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-xs text-tinta-ter italic">—</span>
                        )}
                      </td>

                      {/* Rendimento */}
                      <td className="py-3.5 px-4 text-xs font-mono text-tinta-sec">
                        {yieldLabel(r)}
                      </td>

                      {/* Insumos vinculados */}
                      <td className="py-3.5 px-4 text-center">
                        {row.hasLinked ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-verde-subtle text-verde border border-verde/20">
                            {row.linkedCount} {row.linkedCount === 1 ? 'insumo' : 'insumos'}
                          </span>
                        ) : (
                          <span className="text-xs text-tinta-ter italic">Sem vínculos</span>
                        )}
                      </td>

                      {/* Custo por porção */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-tinta-sec">
                        {row.costPerPortion !== null && row.costPerPortion > 0 ? (
                          formatBRL(row.costPerPortion)
                        ) : (
                          <span className="text-tinta-ter">—</span>
                        )}
                      </td>

                      {/* Custo Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        {row.totalCost > 0 ? (
                          <span className="text-verde">{formatBRL(row.totalCost)}</span>
                        ) : (
                          <span className="text-tinta-ter font-normal">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/receitas/${r.id}`}
                          className="inline-flex items-center justify-center p-1.5 text-tinta-ter hover:text-bronze rounded-lg transition-colors"
                          title="Ver ficha técnica"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Rodapé com Total Geral */}
              <tfoot>
                <tr className="border-t-2 border-marfim-border bg-marfim/60 font-serif font-bold text-sm">
                  <td colSpan={5} className="py-4 px-4 text-tinta uppercase tracking-wider text-xs">
                    Total Geral do Acervo ({sortedRows.length} receitas)
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-lg text-verde">
                    {formatBRL(totalGeral)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3.5 bg-marfim/30 border-t border-marfim-border text-xs text-tinta-ter flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Receitas sem ingredientes vinculados entram com custo zero no total geral.</span>
            <span className="italic">
              Os valores refletem o cadastro unitário em Ingredientes e nas Fichas Técnicas.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelatorioCustos
