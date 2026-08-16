import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getRecipes } from '@/services/recipes'
import { getCategories } from '@/services/categories'
import { getTechniques } from '@/services/techniques'
import { Recipe, Category, Technique } from '@/types'
import { RecipeCard } from '@/components/RecipeCard'
import { useRealtime } from '@/hooks/use-realtime'
import { DIETARY_FACETS } from '@/lib/dietary'
import {
  Search,
  SlidersHorizontal,
  Plus,
  Upload,
  RotateCcw,
  Sparkles,
  Loader2,
  X,
  Check,
  ChefHat,
  ArrowUpDown,
  Salad,
  Leaf,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const RecipesList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // URL query state
  const searchQuery = searchParams.get('q') || ''
  const selectedCategoryParam = searchParams.get('categoria') || ''
  const selectedTechniqueParam = searchParams.get('tecnica') || ''
  const selectedDifficulty = searchParams.get('dificuldade') || 'all'
  const sortBy = searchParams.get('ordem') || 'recentes'
  const ingredientsParam = searchParams.get('ingredientes') || ''
  const dietaryParam = searchParams.get('restricoes') || ''

  // Selected categories/techniques as arrays
  const selectedCategories = useMemo(() => {
    return selectedCategoryParam ? selectedCategoryParam.split(',').filter(Boolean) : []
  }, [selectedCategoryParam])

  const selectedTechniques = useMemo(() => {
    return selectedTechniqueParam ? selectedTechniqueParam.split(',').filter(Boolean) : []
  }, [selectedTechniqueParam])

  // Ingredient search terms (non-empty, trimmed, lowercased for display original)
  const selectedIngredients = useMemo(() => {
    return ingredientsParam
      ? ingredientsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  }, [ingredientsParam])

  // Selected dietary facets (ids: 'vegana' | 'sem-gluten' | 'sem-laticinios')
  const selectedDietary = useMemo(() => {
    return dietaryParam
      ? dietaryParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  }, [dietaryParam])

  // Local input state for the ingredient field (committed to URL on Enter/comma)
  const [ingredientInput, setIngredientInput] = useState('')

  // Count active filters
  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    selectedCategories.length +
    selectedTechniques.length +
    (selectedDifficulty !== 'all' ? 1 : 0) +
    selectedIngredients.length +
    selectedDietary.length

  // Fetch meta categories and techniques
  useEffect(() => {
    async function fetchMeta() {
      try {
        const [cats, techs] = await Promise.all([getCategories(), getTechniques()])
        setCategories(cats)
        setTechniques(techs)
      } catch (err) {
        console.error('Erro ao carregar filtros:', err)
      }
    }
    fetchMeta()
  }, [])

  // Fetch recipes
  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true)
      const list = await getRecipes({
        search: searchQuery,
        categories: selectedCategories,
        techniques: selectedTechniques,
        difficulty: selectedDifficulty,
        ingredients: selectedIngredients,
        dietary: selectedDietary,
        sort: sortBy,
      })
      setRecipes(list)
    } catch (err) {
      console.error('Erro ao listar receitas:', err)
    } finally {
      setLoading(false)
    }
  }, [
    searchQuery,
    selectedCategories,
    selectedTechniques,
    selectedDifficulty,
    selectedIngredients,
    selectedDietary,
    sortBy,
  ])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  // Real-time subscription to 'recipes' collection
  useRealtime('recipes', () => {
    loadRecipes()
  })

  // URL State helpers
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all') {
        nextParams.delete(key)
      } else {
        nextParams.set(key, val)
      }
    })
    setSearchParams(nextParams, { replace: true })
  }

  const handleSearchChange = (val: string) => {
    updateUrlParams({ q: val.trim() || null })
  }

  const toggleCategory = (catIdOrSlug: string) => {
    const current = new Set(selectedCategories)
    if (current.has(catIdOrSlug)) {
      current.delete(catIdOrSlug)
    } else {
      current.add(catIdOrSlug)
    }
    const arr = Array.from(current)
    updateUrlParams({ categoria: arr.length > 0 ? arr.join(',') : null })
  }

  const toggleTechnique = (techIdOrSlug: string) => {
    const current = new Set(selectedTechniques)
    if (current.has(techIdOrSlug)) {
      current.delete(techIdOrSlug)
    } else {
      current.add(techIdOrSlug)
    }
    const arr = Array.from(current)
    updateUrlParams({ tecnica: arr.length > 0 ? arr.join(',') : null })
  }

  const handleDifficultyChange = (diff: string) => {
    updateUrlParams({ dificuldade: diff === selectedDifficulty ? null : diff })
  }

  const handleSortChange = (newSort: string) => {
    updateUrlParams({ ordem: newSort })
  }

  const toggleDietary = (facetId: string) => {
    const current = new Set(selectedDietary)
    if (current.has(facetId)) {
      current.delete(facetId)
    } else {
      current.add(facetId)
    }
    const arr = Array.from(current)
    updateUrlParams({ restricoes: arr.length > 0 ? arr.join(',') : null })
  }

  // Ingredient handlers
  const commitIngredients = (next: string[]) => {
    updateUrlParams({
      ingredientes: next.length > 0 ? next.join(',') : null,
    })
  }

  const addIngredient = (raw: string) => {
    const term = raw.trim().toLowerCase()
    if (!term) return
    if (selectedIngredients.includes(term)) {
      setIngredientInput('')
      return
    }
    commitIngredients([...selectedIngredients, term])
    setIngredientInput('')
  }

  const removeIngredient = (term: string) => {
    commitIngredients(selectedIngredients.filter((i) => i !== term))
  }

  const handleIngredientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addIngredient(ingredientInput)
    } else if (e.key === 'Backspace' && ingredientInput === '' && selectedIngredients.length > 0) {
      removeIngredient(selectedIngredients[selectedIngredients.length - 1])
    }
  }

  const handleIngredientBlur = () => {
    if (ingredientInput.trim()) addIngredient(ingredientInput)
  }

  const clearAllFilters = () => {
    setIngredientInput('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  // Count recipes per category/technique in local dataset
  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    recipes.forEach((r) => {
      if (r.category) {
        map[r.category] = (map[r.category] || 0) + 1
      }
    })
    return map
  }, [recipes])

  const techniqueCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    recipes.forEach((r) => {
      if (r.technique) {
        map[r.technique] = (map[r.technique] || 0) + 1
      }
    })
    return map
  }, [recipes])

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <span className="label-caps block mb-1">Catálogo Gastronômico</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-tinta tracking-tight">
              Acervo de Receitas
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
            onClick={() => navigate('/importar')}
            className="border-marfim-border text-verde hover:bg-verde hover:text-white shadow-xs font-medium rounded-xl px-4 py-5 gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Importar</span>
          </Button>
          <Button
            onClick={() => navigate('/receitas/nova')}
            className="bg-bronze hover:bg-bronze-hover text-white shadow-md hover:shadow-lg font-medium rounded-xl px-4 py-5 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Receita</span>
          </Button>
        </div>
      </div>

      {/* TOP CONTROLS (SEARCH, SORT, MOBILE FILTER TOGGLE) */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-tinta-ter absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Buscar por título ou resumo..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-11 bg-white border-marfim-border rounded-xl focus-visible:ring-verde text-sm shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-ter hover:text-tinta"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Ingredient search input */}
        <div className="relative w-full sm:max-w-md">
          <Salad className="w-4 h-4 text-bronze absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por ingredientes (ex.: batata, cebola, alho)"
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={handleIngredientKeyDown}
            onBlur={handleIngredientBlur}
            className="pl-10 h-11 bg-white border-marfim-border rounded-xl focus-visible:ring-bronze text-sm shadow-xs"
          />
        </div>

        {/* Sort & Mobile filter button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mobile Filter trigger */}
          <Button
            variant="outline"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden h-11 bg-white border-marfim-border rounded-xl flex items-center gap-2 text-sm shadow-xs relative"
          >
            <SlidersHorizontal className="w-4 h-4 text-verde" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-verde text-white text-[10px] font-bold flex items-center justify-center ml-1">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 min-w-[190px]">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="h-11 bg-white border-marfim-border rounded-xl shadow-xs text-xs font-medium">
                <div className="flex items-center gap-2 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-tinta-ter shrink-0" />
                  <SelectValue placeholder="Ordenar por" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="antigos">Mais antigos</SelectItem>
                <SelectItem value="titulo-asc">Título (A–Z)</SelectItem>
                <SelectItem value="titulo-desc">Título (Z–A)</SelectItem>
                <SelectItem value="tempo-menor">Menor tempo de preparo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ACTIVE FILTERS CHIP BAR */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-xs text-tinta-ter font-medium uppercase tracking-wider mr-1">
            Filtros ativos:
          </span>

          {searchQuery && (
            <Badge className="bg-verde-subtle text-verde border border-verde/20 text-xs gap-1 pl-2.5 pr-1.5 py-1">
              Busca: &ldquo;{searchQuery}&rdquo;
              <button
                onClick={() => handleSearchChange('')}
                className="hover:text-verde-hover rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {selectedCategories.map((catId) => {
            const cat = categories.find((c) => c.id === catId || c.slug === catId)
            return (
              <Badge
                key={catId}
                className="bg-marfim-card text-tinta border border-marfim-border text-xs gap-1 pl-2.5 pr-1.5 py-1"
              >
                Cat: {cat ? cat.name : catId}
                <button
                  onClick={() => toggleCategory(catId)}
                  className="hover:text-tinta-sec rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}

          {selectedTechniques.map((techId) => {
            const tech = techniques.find((t) => t.id === techId || t.slug === techId)
            return (
              <Badge
                key={techId}
                className="bg-bronze-subtle text-tinta border border-bronze/20 text-xs gap-1 pl-2.5 pr-1.5 py-1"
              >
                Técnica: {tech ? tech.name : techId}
                <button
                  onClick={() => toggleTechnique(techId)}
                  className="hover:text-tinta-sec rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}

          {selectedDifficulty !== 'all' && (
            <Badge className="bg-white text-tinta border border-marfim-border text-xs gap-1 pl-2.5 pr-1.5 py-1">
              Dificuldade: {selectedDifficulty}
              <button
                onClick={() => handleDifficultyChange(selectedDifficulty)}
                className="hover:text-tinta-sec rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {selectedIngredients.map((term) => (
            <Badge
              key={term}
              className="bg-bronze-subtle text-tinta border border-bronze/30 text-xs gap-1 pl-2.5 pr-1.5 py-1 capitalize"
            >
              <Salad className="w-3 h-3 text-bronze" />
              {term}
              <button
                onClick={() => removeIngredient(term)}
                className="hover:text-tinta-sec rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {selectedDietary.map((facetId) => {
            const facet = DIETARY_FACETS.find((f) => f.id === facetId)
            return (
              <Badge
                key={facetId}
                className="bg-verde-subtle text-verde border border-verde/30 text-xs gap-1 pl-2.5 pr-1.5 py-1"
              >
                <Leaf className="w-3 h-3" />
                {facet ? facet.label : facetId}
                <button
                  onClick={() => toggleDietary(facetId)}
                  className="hover:text-verde-hover rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-red-700 hover:text-red-800 hover:bg-red-50 h-7 px-2"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Limpar filtros
          </Button>
        </div>
      )}

      {/* MAIN LAYOUT: FILTERS SIDEBAR + RECIPES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* DESKTOP FILTER SIDEBAR (lg:block) & MOBILE DRAWER */}
        <div
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden'
          } lg:block lg:col-span-1 bg-white p-6 rounded-2xl border border-marfim-border shadow-card space-y-6 sticky top-20`}
        >
          <div className="flex items-center justify-between border-b border-marfim-border pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-verde" />
              <h3 className="font-serif text-lg font-bold text-tinta">Filtrar Acervo</h3>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-bronze hover:underline font-medium"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Dificuldade */}
          <div className="space-y-2.5">
            <span className="label-caps block text-[11px]">Dificuldade</span>
            <div className="flex flex-wrap gap-1.5">
              {['Fácil', 'Médio', 'Difícil'].map((diff) => {
                const active = selectedDifficulty === diff
                return (
                  <button
                    key={diff}
                    onClick={() => handleDifficultyChange(diff)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      active
                        ? 'bg-verde text-white shadow-xs'
                        : 'bg-marfim-card text-tinta-sec hover:bg-marfim hover:text-tinta border border-marfim-border'
                    }`}
                  >
                    {diff}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Restrições alimentares */}
          <div className="space-y-2.5 pt-2 border-t border-marfim-border/70">
            <span className="label-caps block text-[11px]">Restrições Alimentares</span>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_FACETS.map((facet) => {
                const active = selectedDietary.includes(facet.id)
                return (
                  <button
                    key={facet.id}
                    onClick={() => toggleDietary(facet.id)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      active
                        ? 'bg-verde text-white shadow-xs'
                        : 'bg-marfim-card text-tinta-sec hover:bg-marfim hover:text-tinta border border-marfim-border'
                    }`}
                  >
                    {facet.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Categorias Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-marfim-border/70">
            <div className="flex items-center justify-between">
              <span className="label-caps block text-[11px]">Categorias</span>
              <span className="text-[10px] text-tinta-ter">{categories.length}</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const checked =
                  selectedCategories.includes(cat.id) || selectedCategories.includes(cat.slug)
                const count = categoryCountMap[cat.id] || 0
                return (
                  <label
                    key={cat.id}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-marfim-card cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCategory(cat.id)}
                        className="data-[state=checked]:bg-verde data-[state=checked]:border-verde"
                      />
                      <span
                        className={`truncate ${
                          checked
                            ? 'font-semibold text-tinta'
                            : 'text-tinta-sec group-hover:text-tinta'
                        }`}
                      >
                        {cat.name}
                      </span>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] font-mono text-tinta-ter ml-2">{count}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Técnicas Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-marfim-border/70">
            <div className="flex items-center justify-between">
              <span className="label-caps block text-[11px]">Técnicas de Preparo</span>
              <span className="text-[10px] text-tinta-ter">{techniques.length}</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {techniques.map((tech) => {
                const checked =
                  selectedTechniques.includes(tech.id) || selectedTechniques.includes(tech.slug)
                const count = techniqueCountMap[tech.id] || 0
                return (
                  <label
                    key={tech.id}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-marfim-card cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleTechnique(tech.id)}
                        className="data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                      />
                      <span
                        className={`truncate ${
                          checked
                            ? 'font-semibold text-tinta'
                            : 'text-tinta-sec group-hover:text-tinta'
                        }`}
                      >
                        {tech.name}
                      </span>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] font-mono text-tinta-ter ml-2">{count}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {mobileFiltersOpen && (
            <Button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full lg:hidden bg-verde text-white rounded-xl"
            >
              Aplicar Filtros
            </Button>
          )}
        </div>

        {/* RECIPES GRID (lg:col-span-3) */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
              <Loader2 className="w-8 h-8 animate-spin text-verde mb-3" />
              <p className="text-sm font-serif italic text-tinta-sec">
                Consultando fichas técnicas do acervo...
              </p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
              <div className="w-16 h-16 rounded-full bg-marfim-card border border-marfim-border flex items-center justify-center mx-auto mb-4 text-tinta-ter">
                <ChefHat className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-tinta">
                Nenhuma receita encontrada
              </h3>
              <p className="text-sm text-tinta-sec max-w-md mx-auto mt-2 mb-6 leading-relaxed">
                Não encontramos registros correspondentes aos critérios de busca ou filtros
                selecionados.
              </p>
              <div className="flex items-center justify-center gap-3">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="border-marfim-border text-tinta rounded-xl"
                  >
                    Limpar filtros
                  </Button>
                )}
                <Button
                  onClick={() => navigate('/receitas/nova')}
                  className="bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md"
                >
                  + Nova Receita
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecipesList
