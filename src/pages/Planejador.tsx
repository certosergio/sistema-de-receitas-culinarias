import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Loader2,
  Trash2,
  Calendar,
  Plus,
  ShoppingBasket,
  Leaf,
  Utensils,
} from 'lucide-react'
import {
  getMealPlans,
  addMealPlan,
  removeMealPlan,
  clearMealPlansRange,
  setMealPlan,
  MEAL_LABELS,
  MEAL_ORDER,
  slotKey,
  type MealType,
  type MealPlan,
} from '@/services/mealPlans'
import { getRecipes, getRecipeCoverUrl } from '@/services/recipes'
import { getCategories } from '@/services/categories'
import { isVegan } from '@/lib/dietary'
import pb from '@/lib/pocketbase/client'
import type { Recipe, Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

/** Weekday names in Portuguese, Monday-first. */
const WEEKDAYS_FULL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** Parses a YYYY-MM-DD string to a local Date (avoids UTC off-by-one). */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Formats a Date as YYYY-MM-DD. */
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday-based weekday index (0 = Monday, 6 = Sunday). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** Returns the Monday that starts the week containing `d`. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() - mondayIndex(copy))
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  const startDay = start.getDate()
  const endDay = end.getDate()
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${startDay} a ${endDay} de ${MONTHS_PT[start.getMonth()]}`
  }
  return `${startDay} de ${MONTHS_PT[start.getMonth()]} a ${endDay} de ${MONTHS_PT[end.getMonth()]}`
}

/** A pending recipe slot selection — set when the user picks a recipe from the
 *  side tray before clicking an empty slot. */
interface PendingRecipe {
  id: string
  title: string
}

interface SlotTarget {
  date: string
  meal: MealType
}

// ----------------------------------------------------------------------------
// Shopping-list helpers
// ----------------------------------------------------------------------------

/** Simple keyword-based grocery category guesser (Portuguese). */
const GROCERY_KEYWORDS: { category: string; words: string[] }[] = [
  {
    category: 'Hortifrúti',
    words: [
      'tomate',
      'cebola',
      'alho',
      'batata',
      'cenoura',
      'abobora',
      'abóbora',
      'pimentão',
      'pimentao',
      'alface',
      'rúcula',
      'rucula',
      'espinafre',
      'brócolis',
      'brocolis',
      'couve',
      'abobrinha',
      'berinjela',
      'pepino',
      'beterraba',
      'mandioca',
      'inhame',
      'cará',
      'cara',
      'chuchu',
      'quiabo',
      'jiló',
      'jilo',
      'limão',
      'limao',
      'laranja',
      'maçã',
      'maca',
      'banana',
      'mamão',
      'mamao',
      'abacaxi',
      'manga',
      'uva',
      'morango',
      'abacate',
      'pera',
      'pêra',
      'mamão',
      'mamão',
      'kiwi',
      'melancia',
      'melão',
      'melao',
      'ervilha',
      'feijão',
      'feijao',
      'grão',
      'grao',
      'lentilha',
      'grão-de-bico',
      'cogumelo',
      'champignon',
      'salsa',
      'coentro',
      'manjericão',
      'manjericao',
      'cebolinha',
      'hortelã',
      'hortela',
      'alecrim',
      'tomilho',
      'louro',
      'orégano',
      'oregano',
      'pimenta',
      'rucola',
    ],
  },
  {
    category: 'Laticínios',
    words: [
      'leite',
      'queijo',
      'manteiga',
      'requeijão',
      'requeijao',
      'iogurte',
      'creme de leite',
      'nata',
      'ricota',
      'mascarpone',
      'parmesão',
      'parmesao',
      'muçarela',
      'mussarela',
      'catupiry',
      'gorgonzola',
      'cream cheese',
    ],
  },
  {
    category: 'Carnes',
    words: [
      'frango',
      'carne',
      'boi',
      'porco',
      'bacon',
      'linguiça',
      'linguica',
      'presunto',
      'salsicha',
      'linguiça',
      'costela',
      'maminha',
      'alcatra',
      'picanha',
      'filé',
      'file',
      'coxinha',
      'sobrecoxa',
      'peito',
      'lombo',
      'pernil',
      'panceta',
      'pastrami',
      'defumado',
      'salame',
      'pepperoni',
      'calabresa',
      'fradinho',
      'carne moída',
      'carne moida',
      'patinho',
      'acém',
      'acem',
      'moela',
      'fígado',
      'figado',
      'salmão',
      'salmao',
      'atum',
      'bacalhau',
      'camarão',
      'camarao',
      'polvo',
      'lula',
      'merluza',
      'tilápia',
      'tilapia',
      'sardinha',
      'anchova',
      'truta',
      'crustáceo',
      'crustaceo',
      'marisco',
      'ostra',
      'vôngole',
      'vongole',
      'caranguejo',
    ],
  },
  {
    category: 'Despensa',
    words: [
      'farinha',
      'arroz',
      'macarrão',
      'macarrao',
      'massa',
      'espaguete',
      'penne',
      'fusilli',
      'talharim',
      'lasanha',
      'nhoque',
      'pão',
      'pao',
      'pão',
      'açúcar',
      'acucar',
      'sal',
      'óleo',
      'oleo',
      'azeite',
      'fermento',
      'baunilha',
      'canela',
      'cravo',
      'noz-moscada',
      'cominho',
      'açafrão',
      'acafrao',
      'cúrcuma',
      'curcuma',
      'páprica',
      'paprica',
      'ervas',
      'chocolate',
      'cacau',
      'cacao',
      'fermento',
      'mel',
      'geleia',
      'fubá',
      'fuba',
      'polenta',
      'aveia',
      'granola',
      'quinoa',
      'trigo',
      'centeio',
      'fermento',
      'amendoim',
      'castanha',
      'nozes',
      'amêndoa',
      'amendoa',
      'uva passa',
      'tâmaras',
      'tamaras',
      'cranberry',
      'coco',
      'leite de coco',
      'shoyu',
      'molho de soja',
      'molho inglês',
      'molho ingles',
      'mostarda',
      'ketchup',
      'maionese',
      'extrato de tomate',
      'molho de tomate',
      'passata',
      'tomate pelado',
      'vinagre',
      'xerez',
      'balsâmico',
      'balsamico',
      'saquê',
      'sake',
      'mirin',
      'cogumelo seco',
      'fungo',
      'shiitake',
      'shimeji',
      'ervas finas',
    ],
  },
]

function guessGroceryCategory(name: string): string {
  const lower = name.toLowerCase()
  for (const group of GROCERY_KEYWORDS) {
    if (group.words.some((w) => lower.includes(w))) {
      return group.category
    }
  }
  return 'Outros'
}

interface AggregatedIngredient {
  name: string
  quantities: string[]
  unit: string
  count: number
}

interface ShoppingList {
  groups: { category: string; items: AggregatedIngredient[] }[]
  totalItems: number
  totalRecipes: number
}

/** Aggregates ingredients across the week's recipes, grouping by name and
 *  grocery category. Quantities are summed textually (same unit merged). */
function buildShoppingList(recipes: Recipe[]): ShoppingList {
  const map = new Map<string, AggregatedIngredient>()
  const usedRecipeIds = new Set<string>()

  for (const recipe of recipes) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) continue
    usedRecipeIds.add(recipe.id)
    for (const ing of recipe.ingredients) {
      const rawName = (ing.name || '').trim()
      if (!rawName) continue
      // Normalize name: lowercase, collapse spaces.
      const key = rawName.toLowerCase().replace(/\s+/g, ' ').trim()
      const unit = (ing.unit || '').trim()
      const quantity = (ing.quantity || '').trim()
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        if (quantity) existing.quantities.push(quantity)
        if (unit && !existing.unit) existing.unit = unit
      } else {
        map.set(key, {
          name: rawName,
          quantities: quantity ? [quantity] : [],
          unit,
          count: 1,
        })
      }
    }
  }

  // Group by grocery category.
  const groupsMap = new Map<string, AggregatedIngredient[]>()
  for (const item of map.values()) {
    const cat = guessGroceryCategory(item.name)
    if (!groupsMap.has(cat)) groupsMap.set(cat, [])
    groupsMap.get(cat)!.push(item)
  }

  // Sort items within each group alphabetically, groups in a fixed order.
  const categoryOrder = ['Hortifrúti', 'Laticínios', 'Carnes', 'Despensa', 'Outros']
  const groups = categoryOrder
    .filter((c) => groupsMap.has(c))
    .map((category) => ({
      category,
      items: groupsMap.get(category)!.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }))

  return {
    groups,
    totalItems: map.size,
    totalRecipes: usedRecipeIds.size,
  }
}

// ----------------------------------------------------------------------------

const Planejador: React.FC = () => {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Recipe picker sheet (tap "+" on a slot)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<SlotTarget | null>(null)
  const [search, setSearch] = useState('')
  const [recipeResults, setRecipeResults] = useState<Recipe[]>([])
  const [searching, setSearching] = useState(false)

  // Side tray recipes
  const [trayRecipes, setTrayRecipes] = useState<Recipe[]>([])
  const [trayLoading, setTrayLoading] = useState(true)
  const [traySearch, setTraySearch] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [trayCategory, setTrayCategory] = useState<string>('all')
  const [trayOpenMobile, setTrayOpenMobile] = useState(false)

  // Pending recipe (selected from tray, waiting for a slot)
  const [pendingRecipe, setPendingRecipe] = useState<PendingRecipe | null>(null)

  // Drag state
  const [dragRecipeId, setDragRecipeId] = useState<string | null>(null)
  const [dragSlotKey, setDragSlotKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Clear week dialog
  const [clearOpen, setClearOpen] = useState(false)

  // Shopping list dialog
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [shoppingLoading, setShoppingLoading] = useState(false)
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)

  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(addDays(weekStart, 6))

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Map slotKey -> MealPlan for quick lookup.
  const planMap = useMemo(() => {
    const m: Record<string, MealPlan> = {}
    for (const p of plans) {
      m[slotKey(p.date, p.meal_type)] = p
    }
    return m
  }, [plans])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await getMealPlans(weekStartIso, weekEndIso)
      setPlans(rows)
    } catch (err) {
      console.error('Erro ao carregar cardápio:', err)
      toast({
        title: 'Erro ao carregar cardápio',
        description: 'Não foi possível buscar as refeições da semana.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [weekStartIso, weekEndIso])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('meal_plans', () => {
    load()
  })

  // Load categories once for the tray filter.
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error('Erro ao carregar categorias:', err))
  }, [])

  // Load the tray recipes once on mount.
  useEffect(() => {
    let cancelled = false
    setTrayLoading(true)
    getRecipes({})
      .then((rows) => {
        if (!cancelled) setTrayRecipes(rows)
      })
      .catch((err) => {
        console.error('Erro ao carregar receitas da bandeja:', err)
        if (!cancelled) setTrayRecipes([])
      })
      .finally(() => {
        if (!cancelled) setTrayLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Debounced recipe search for the picker sheet.
  useEffect(() => {
    if (!pickerOpen) return
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const results = await getRecipes({ search })
        if (!cancelled) setRecipeResults(results)
      } catch (err) {
        console.error('Erro ao buscar receitas:', err)
        if (!cancelled) setRecipeResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [search, pickerOpen])

  // Tray recipes filtered by search + category (client-side).
  const filteredTrayRecipes = useMemo(() => {
    const term = traySearch.trim().toLowerCase()
    return trayRecipes.filter((r) => {
      if (trayCategory !== 'all' && r.category !== trayCategory) return false
      if (!term) return true
      return r.title.toLowerCase().includes(term) || (r.summary || '').toLowerCase().includes(term)
    })
  }, [trayRecipes, traySearch, trayCategory])

  const openPicker = (date: string, meal: MealType) => {
    setPickerTarget({ date, meal })
    setSearch('')
    setPickerOpen(true)
  }

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!pickerTarget) return
    setBusy(true)
    try {
      await setMealPlan(pickerTarget.date, pickerTarget.meal, recipe.id)
      toast({
        title: 'Receita adicionada',
        description: `${recipe.title} foi inserida no cardápio.`,
      })
      setPickerOpen(false)
      setPickerTarget(null)
      load()
    } catch (err) {
      console.error('Erro ao adicionar refeição:', err)
      toast({
        title: 'Falha ao adicionar',
        description: 'Não foi possível salvar a refeição.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (planId: string) => {
    setBusy(true)
    try {
      await removeMealPlan(planId)
      load()
    } catch (err) {
      console.error('Erro ao remover refeição:', err)
      toast({
        title: 'Falha ao remover',
        description: 'Não foi possível remover a refeição.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  // --- Drag & drop ---

  const handleTrayDragStart = (e: React.DragEvent, recipe: Recipe) => {
    setDragRecipeId(recipe.id)
    setDragSlotKey(null)
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', `recipe:${recipe.id}`)
  }

  const handleSlotDragStart = (e: React.DragEvent, key: string) => {
    setDragSlotKey(key)
    setDragRecipeId(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `slot:${key}`)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = dragSlotKey ? 'move' : 'copy'
    if (dragOverKey !== key) setDragOverKey(key)
  }

  const handleDrop = async (e: React.DragEvent, targetKey: string) => {
    e.preventDefault()
    const isSlotDrag = dragSlotKey !== null
    const recipeId = dragRecipeId
    const sourceKey = dragSlotKey
    setDragRecipeId(null)
    setDragSlotKey(null)
    setDragOverKey(null)
    if (!isSlotDrag && !recipeId) return

    const [dateStr, mealStr] = targetKey.split('|')
    const targetDate = dateStr
    const targetMeal = mealStr as MealType

    setBusy(true)
    try {
      if (isSlotDrag && sourceKey) {
        if (sourceKey === targetKey) return
        const sourcePlan = planMap[sourceKey]
        const targetPlan = planMap[targetKey]
        if (!sourcePlan) return
        const [srcDate, srcMealStr] = sourceKey.split('|')
        const srcMeal = srcMealStr as MealType
        if (targetPlan) {
          // Swap: move target's recipe back into source slot.
          await removeMealPlan(targetPlan.id)
          await setMealPlan(srcDate, srcMeal, targetPlan.recipe)
        }
        await removeMealPlan(sourcePlan.id)
        await setMealPlan(targetDate, targetMeal, sourcePlan.recipe)
      } else if (recipeId) {
        // Drop from tray → set slot.
        await setMealPlan(targetDate, targetMeal, recipeId)
      }
      load()
    } catch (err) {
      console.error('Erro ao mover/adicionar refeição:', err)
      toast({
        title: 'Falha ao atualizar',
        description: 'Não foi possível atualizar a refeição.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleClearWeek = async () => {
    setBusy(true)
    try {
      await clearMealPlansRange(weekStartIso, weekEndIso)
      toast({ title: 'Semana limpa', description: 'Todas as refeições da semana foram removidas.' })
      setClearOpen(false)
      load()
    } catch (err) {
      console.error('Erro ao limpar semana:', err)
      toast({
        title: 'Falha ao limpar',
        description: 'Não foi possível limpar a semana.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleGenerateShoppingList = async () => {
    setShoppingOpen(true)
    setShoppingLoading(true)
    try {
      // The week's planned recipes (deduped), with ingredients expanded.
      const recipeIds = Array.from(new Set(plans.map((p) => p.recipe).filter(Boolean)))
      if (recipeIds.length === 0) {
        setShoppingList({ groups: [], totalItems: 0, totalRecipes: 0 })
        return
      }
      // Use the already-expanded recipe objects from plans; fetch full ones
      // for any whose ingredients are missing.
      const expandedById = new Map<string, Recipe>()
      for (const p of plans) {
        if (p.expand?.recipe) expandedById.set(p.expand.recipe.id, p.expand.recipe)
      }
      const toFetch = recipeIds.filter((id) => !expandedById.has(id))
      if (toFetch.length > 0) {
        const fetched = await Promise.all(
          toFetch.map((id) => pb.collection('recipes').getOne<Recipe>(id, { requestKey: null })),
        )
        for (const r of fetched) expandedById.set(r.id, r)
      }
      const recipes = recipeIds
        .map((id) => expandedById.get(id))
        .filter((r): r is Recipe => Boolean(r))
      setShoppingList(buildShoppingList(recipes))
    } catch (err) {
      console.error('Erro ao gerar lista de compras:', err)
      toast({
        title: 'Falha ao gerar lista',
        description: 'Não foi possível agregar os ingredientes.',
        variant: 'destructive',
      })
    } finally {
      setShoppingLoading(false)
    }
  }

  const applyPending = async (date: string, meal: MealType) => {
    if (!pendingRecipe) return
    setBusy(true)
    try {
      await setMealPlan(date, meal, pendingRecipe.id)
      toast({
        title: 'Receita adicionada',
        description: `${pendingRecipe.title} foi inserida no cardápio.`,
      })
      setPendingRecipe(null)
      load()
    } catch (err) {
      console.error('Erro ao adicionar refeição:', err)
      toast({
        title: 'Falha ao adicionar',
        description: 'Não foi possível salvar a refeição.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const goToday = () => setWeekStart(startOfWeek(new Date()))
  const prevWeek = () => setWeekStart((w) => addDays(w, -7))
  const nextWeek = () => setWeekStart((w) => addDays(w, 7))

  const totalMeals = plans.length
  const hasMeals = totalMeals > 0

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <span className="label-caps block mb-1">Organize sua semana</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-tinta tracking-tight">
              Planejador de Cardápio
            </h1>
            <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium">
              {totalMeals} {totalMeals === 1 ? 'refeição' : 'refeições'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={prevWeek}
            className="border-marfim-border bg-white text-tinta rounded-xl h-10 w-10 p-0"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={goToday}
            className="border-marfim-border bg-white text-tinta rounded-xl h-10 px-3 text-xs font-semibold"
          >
            Esta semana
          </Button>
          <Button
            variant="outline"
            onClick={nextWeek}
            className="border-marfim-border bg-white text-tinta rounded-xl h-10 w-10 p-0"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleGenerateShoppingList}
            disabled={busy || !hasMeals}
            className="bg-verde hover:bg-verde-hover text-white rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
          >
            <ShoppingBasket className="w-3.5 h-3.5" />
            <span>Lista de compras</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setClearOpen(true)}
            disabled={busy || !hasMeals}
            className="border-marfim-border bg-white text-red-600 hover:bg-red-50 rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </Button>
        </div>
      </div>

      {/* WEEK RANGE INDICATOR */}
      <div className="flex items-center justify-center gap-2 text-sm font-serif italic text-tinta-sec">
        <CalendarDays className="w-4 h-4 text-bronze" />
        <span>Semana de {formatWeekRange(weekStart)}</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-2" />
          <p className="text-sm font-serif italic text-tinta-sec">Carregando cardápio...</p>
        </div>
      ) : !hasMeals ? (
        <EMPTY_STATE />
      ) : (
        <div className="flex flex-col xl:flex-row gap-5">
          {/* WEEK GRID (desktop: 7 columns; mobile: accordion) */}
          <div className="flex-1 min-w-0">
            {/* DESKTOP GRID (≥ xl) */}
            <div className="hidden xl:grid grid-cols-7 gap-3">
              {days.map((day, idx) => (
                <DayColumn
                  key={toISODate(day)}
                  day={day}
                  weekdayFull={WEEKDAYS_FULL[idx]}
                  weekdayShort={WEEKDAYS_SHORT[idx]}
                  isToday={isSameDay(day, today)}
                  planMap={planMap}
                  dragOverKey={dragOverKey}
                  pendingRecipe={pendingRecipe}
                  busy={busy}
                  onOpenPicker={openPicker}
                  onApplyPending={applyPending}
                  onRemove={handleRemove}
                  onSlotDragStart={handleSlotDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    setDragSlotKey(null)
                    setDragRecipeId(null)
                    setDragOverKey(null)
                  }}
                  onRecipeClick={(id) => navigate(`/receitas/${id}`)}
                />
              ))}
            </div>

            {/* TABLET GRID (md–lg: 4+3) — uses same DayColumn */}
            <div className="hidden md:grid xl:hidden grid-cols-2 lg:grid-cols-4 gap-3">
              {days.map((day, idx) => (
                <DayColumn
                  key={toISODate(day)}
                  day={day}
                  weekdayFull={WEEKDAYS_FULL[idx]}
                  weekdayShort={WEEKDAYS_SHORT[idx]}
                  isToday={isSameDay(day, today)}
                  planMap={planMap}
                  dragOverKey={dragOverKey}
                  pendingRecipe={pendingRecipe}
                  busy={busy}
                  onOpenPicker={openPicker}
                  onApplyPending={applyPending}
                  onRemove={handleRemove}
                  onSlotDragStart={handleSlotDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    setDragSlotKey(null)
                    setDragRecipeId(null)
                    setDragOverKey(null)
                  }}
                  onRecipeClick={(id) => navigate(`/receitas/${id}`)}
                />
              ))}
            </div>

            {/* MOBILE ACCORDION (< md) */}
            <div className="md:hidden">
              <Accordion type="single" defaultValue={toISODate(today)} collapsible>
                {days.map((day, idx) => {
                  const iso = toISODate(day)
                  const isToday = isSameDay(day, today)
                  const dayMeals = MEAL_ORDER.filter((m) => planMap[slotKey(iso, m)]).length
                  return (
                    <AccordionItem
                      key={iso}
                      value={iso}
                      className="bg-white rounded-2xl border border-marfim-border shadow-card mb-3 overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <div
                            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                              isToday
                                ? 'bg-bronze/15 border border-bronze/40'
                                : 'bg-marfim-card border border-marfim-border'
                            }`}
                          >
                            <span className="text-[9px] uppercase font-bold text-tinta-ter leading-none">
                              {WEEKDAYS_SHORT[idx]}
                            </span>
                            <span className="font-serif text-base font-bold text-tinta leading-none mt-0.5">
                              {day.getDate()}
                            </span>
                          </div>
                          <div>
                            <div className="font-serif text-base font-bold text-tinta">
                              {WEEKDAYS_FULL[idx]}
                            </div>
                            <div className="text-xs text-tinta-ter">
                              {dayMeals > 0
                                ? `${dayMeals} ${dayMeals === 1 ? 'refeição' : 'refeições'}`
                                : 'Sem refeições'}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <div className="space-y-2">
                          {MEAL_ORDER.map((meal) => {
                            const key = slotKey(iso, meal)
                            const plan = planMap[key]
                            const recipe = plan?.expand?.recipe
                            const isDragOver = dragOverKey === key
                            return (
                              <SlotCard
                                key={meal}
                                meal={meal}
                                plan={plan}
                                recipe={recipe}
                                isDragOver={isDragOver}
                                pendingRecipe={pendingRecipe}
                                busy={busy}
                                date={iso}
                                onOpenPicker={openPicker}
                                onApplyPending={applyPending}
                                onRemove={handleRemove}
                                onSlotDragStart={handleSlotDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDragEnd={() => {
                                  setDragSlotKey(null)
                                  setDragRecipeId(null)
                                  setDragOverKey(null)
                                }}
                                onRecipeClick={(id) => navigate(`/receitas/${id}`)}
                              />
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          </div>

          {/* SIDE TRAY — available recipes (desktop) */}
          <aside className="hidden xl:block w-[300px] shrink-0">
            <RecipeTray
              recipes={filteredTrayRecipes}
              loading={trayLoading}
              categories={categories}
              trayCategory={trayCategory}
              setTrayCategory={setTrayCategory}
              traySearch={traySearch}
              setTraySearch={setTraySearch}
              pendingRecipe={pendingRecipe}
              onSelectPending={(r) =>
                setPendingRecipe(pendingRecipe?.id === r.id ? null : { id: r.id, title: r.title })
              }
              onDragStart={handleTrayDragStart}
            />
          </aside>
        </div>
      )}

      {/* MOBILE TRAY BUTTON (when there are meals) */}
      {hasMeals && (
        <button
          onClick={() => setTrayOpenMobile(true)}
          className="xl:hidden fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full bg-verde hover:bg-verde-hover text-white flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all border-2 border-white"
          aria-label="Receitas disponíveis"
        >
          <Utensils className="w-6 h-6" />
        </button>
      )}

      {/* PENDING RECIPE BANNER */}
      {pendingRecipe && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 xl:hidden flex items-center gap-3 bg-tinta text-white px-4 py-3 rounded-full shadow-2xl border border-bronze/40 max-w-[90vw]">
          <Leaf className="w-4 h-4 text-bronze shrink-0" />
          <span className="text-xs font-medium truncate">
            Toque num slot p/ <strong className="text-bronze-light">{pendingRecipe.title}</strong>
          </span>
          <button
            onClick={() => setPendingRecipe(null)}
            className="shrink-0 w-5 h-5 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
            aria-label="Cancelar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* MOBILE TRAY SHEET */}
      <Sheet open={trayOpenMobile} onOpenChange={setTrayOpenMobile}>
        <SheetContent
          side="right"
          className="bg-white border-marfim-border w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-marfim-border text-left">
            <SheetTitle className="font-serif text-2xl font-bold text-tinta">
              Receitas disponíveis
            </SheetTitle>
            <SheetDescription className="text-xs text-tinta-sec">
              Selecione uma receita e toque num slot, ou arraste no desktop.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <RecipeTray
              recipes={filteredTrayRecipes}
              loading={trayLoading}
              categories={categories}
              trayCategory={trayCategory}
              setTrayCategory={setTrayCategory}
              traySearch={traySearch}
              setTraySearch={setTraySearch}
              pendingRecipe={pendingRecipe}
              onSelectPending={(r) => {
                setPendingRecipe(pendingRecipe?.id === r.id ? null : { id: r.id, title: r.title })
                setTrayOpenMobile(false)
              }}
              onDragStart={handleTrayDragStart}
              compact
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* RECIPE PICKER SHEET (tap "+") */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="right"
          className="bg-white border-marfim-border w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-marfim-border text-left">
            <SheetTitle className="font-serif text-2xl font-bold text-tinta">
              Escolher receita
            </SheetTitle>
            <SheetDescription className="text-xs text-tinta-sec">
              {pickerTarget
                ? `${MEAL_LABELS[pickerTarget.meal]} · ${parseISODate(pickerTarget.date).getDate()}/${
                    parseISODate(pickerTarget.date).getMonth() + 1
                  }`
                : 'Selecione uma receita do acervo para este slot.'}
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 py-3 border-b border-marfim-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta-ter" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, resumo ou dica..."
                className="pl-9 h-10 bg-marfim/30 rounded-xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            {searching ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-verde" />
              </div>
            ) : recipeResults.length === 0 ? (
              <div className="text-center py-10 text-sm text-tinta-sec">
                Nenhuma receita encontrada.
              </div>
            ) : (
              recipeResults.map((r) => (
                <RecipePickerRow
                  key={r.id}
                  recipe={r}
                  busy={busy}
                  onSelect={() => handleSelectRecipe(r)}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* SHOPPING LIST DIALOG */}
      <Dialog open={shoppingOpen} onOpenChange={setShoppingOpen}>
        <DialogContent className="bg-white rounded-2xl border-marfim-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-tinta flex items-center gap-2">
              <ShoppingBasket className="w-5 h-5 text-verde" />
              Lista de Compras
            </DialogTitle>
            <DialogDescription className="text-tinta-sec text-sm">
              {shoppingList
                ? `${shoppingList.totalItems} ${shoppingList.totalItems === 1 ? 'ingrediente' : 'ingredientes'} de ${shoppingList.totalRecipes} ${shoppingList.totalRecipes === 1 ? 'receita' : 'receitas'} planejadas.`
                : 'Agregando ingredientes da semana...'}
            </DialogDescription>
          </DialogHeader>

          {shoppingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-verde" />
            </div>
          ) : !shoppingList || shoppingList.totalItems === 0 ? (
            <div className="text-center py-10 text-sm text-tinta-sec">
              Nenhum ingrediente encontrado nas receitas planejadas.
            </div>
          ) : (
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {shoppingList.groups.map((group) => (
                <div key={group.category}>
                  <h3 className="font-serif text-lg font-bold text-tinta mb-2 flex items-center gap-2 border-b border-marfim-border pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-bronze" />
                    {group.category}
                    <span className="text-xs font-sans font-normal text-tinta-ter">
                      ({group.items.length})
                    </span>
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => {
                      const qtyStr = item.quantities.length ? item.quantities.join(' + ') : ''
                      return (
                        <li
                          key={item.name}
                          className="flex items-start justify-between gap-3 text-sm py-1"
                        >
                          <span className="flex items-start gap-2 text-tinta">
                            <span className="mt-1.5 w-3 h-3 rounded-sm border border-marfim-border shrink-0" />
                            <span className="font-medium">{item.name}</span>
                            {item.count > 1 && (
                              <span className="text-[10px] font-mono bg-marfim-card text-tinta-ter px-1.5 py-0.5 rounded-full border border-marfim-border">
                                ×{item.count}
                              </span>
                            )}
                          </span>
                          <span className="text-tinta-sec font-mono text-xs whitespace-nowrap">
                            {qtyStr}
                            {item.unit ? ` ${item.unit}` : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShoppingOpen(false)}
              className="rounded-xl border-marfim-border"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLEAR WEEK DIALOG */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border-marfim-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta">
              Limpar semana?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec text-sm">
              Todas as refeições da semana de {formatWeekRange(weekStart)} serão removidas. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearWeek}
              disabled={busy}
              className="bg-erro hover:bg-erro/90 text-white rounded-xl"
            >
              <span>{busy ? 'Limpando...' : 'Sim, limpar'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

const EMPTY_STATE: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-dashed border-marfim-border text-center">
    <div className="w-24 h-24 rounded-full bg-verde-subtle border border-verde/20 flex items-center justify-center mb-5">
      <CalendarDays className="w-11 h-11 text-verde" />
    </div>
    <h3 className="font-serif text-2xl font-bold text-tinta mb-2">Nenhum planejamento ainda</h3>
    <p className="text-sm text-tinta-sec max-w-md leading-relaxed">
      Adicione receitas aos dias da semana para começar. Use o botão
      <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded bg-marfim-card border border-marfim-border text-tinta font-medium">
        <Plus className="w-3 h-3 mr-0.5" /> Adicionar
      </span>
      em cada refeição ou arraste uma receita da bandeja lateral.
    </p>
  </div>
)

interface DayColumnProps {
  day: Date
  weekdayFull: string
  weekdayShort: string
  isToday: boolean
  planMap: Record<string, MealPlan>
  dragOverKey: string | null
  pendingRecipe: PendingRecipe | null
  busy: boolean
  onOpenPicker: (date: string, meal: MealType) => void
  onApplyPending: (date: string, meal: MealType) => void
  onRemove: (id: string) => void
  onSlotDragStart: (e: React.DragEvent, key: string) => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDrop: (e: React.DragEvent, key: string) => void
  onDragEnd: () => void
  onRecipeClick: (id: string) => void
}

const DayColumn: React.FC<DayColumnProps> = ({
  day,
  weekdayFull,
  weekdayShort,
  isToday,
  planMap,
  dragOverKey,
  pendingRecipe,
  busy,
  onOpenPicker,
  onApplyPending,
  onRemove,
  onSlotDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRecipeClick,
}) => {
  const iso = toISODate(day)
  return (
    <div
      className={`bg-white rounded-2xl border shadow-card flex flex-col overflow-hidden ${
        isToday ? 'border-bronze ring-1 ring-bronze/30' : 'border-marfim-border'
      }`}
    >
      {/* Day header */}
      <div
        className={`px-3 py-2.5 border-b flex items-center justify-between ${
          isToday ? 'bg-bronze/10 border-bronze/30' : 'bg-marfim-card/60 border-marfim-border'
        }`}
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-tinta-ter">
            {weekdayShort}
          </div>
          <div className="font-serif text-lg font-bold text-tinta leading-none">
            {day.getDate()}{' '}
            <span className="text-xs font-sans font-normal text-tinta-sec">
              {MONTHS_PT[day.getMonth()].slice(0, 3)}
            </span>
          </div>
          <div className="text-[10px] text-tinta-ter mt-0.5 hidden xl:block">{weekdayFull}</div>
        </div>
        {isToday && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-bronze bg-bronze/15 px-1.5 py-0.5 rounded-full">
            Hoje
          </span>
        )}
      </div>

      {/* Meal slots */}
      <div className="p-2 space-y-2 flex-1">
        {MEAL_ORDER.map((meal) => {
          const key = slotKey(iso, meal)
          const plan = planMap[key]
          const recipe = plan?.expand?.recipe
          const isDragOver = dragOverKey === key
          return (
            <SlotCard
              key={meal}
              meal={meal}
              plan={plan}
              recipe={recipe}
              isDragOver={isDragOver}
              pendingRecipe={pendingRecipe}
              busy={busy}
              date={iso}
              onOpenPicker={onOpenPicker}
              onApplyPending={onApplyPending}
              onRemove={onRemove}
              onSlotDragStart={onSlotDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onRecipeClick={onRecipeClick}
            />
          )
        })}
      </div>
    </div>
  )
}

interface SlotCardProps {
  meal: MealType
  plan?: MealPlan
  recipe?: Recipe
  isDragOver: boolean
  pendingRecipe: PendingRecipe | null
  busy: boolean
  date: string
  onOpenPicker: (date: string, meal: MealType) => void
  onApplyPending: (date: string, meal: MealType) => void
  onRemove: (id: string) => void
  onSlotDragStart: (e: React.DragEvent, key: string) => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDrop: (e: React.DragEvent, key: string) => void
  onDragEnd: () => void
  onRecipeClick: (id: string) => void
}

const SlotCard: React.FC<SlotCardProps> = ({
  meal,
  plan,
  recipe,
  isDragOver,
  pendingRecipe,
  busy,
  date,
  onOpenPicker,
  onApplyPending,
  onRemove,
  onSlotDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRecipeClick,
}) => {
  const key = slotKey(date, meal)
  const hasPending = Boolean(pendingRecipe)
  const showPendingHint = hasPending && !recipe

  return (
    <div
      onDragOver={(e) => onDragOver(e, key)}
      onDragLeave={() => {
        /* visual handled by parent state */
      }}
      onDrop={(e) => onDrop(e, key)}
      className={`group relative rounded-xl border transition-all min-h-[84px] ${
        isDragOver
          ? 'border-bronze bg-bronze/5 ring-1 ring-bronze/30'
          : showPendingHint
            ? 'border-verde/50 bg-verde-subtle/40 border-dashed'
            : 'border-marfim-border bg-marfim/30'
      }`}
    >
      <div className="px-2 pt-1.5 text-[9px] uppercase tracking-wider font-semibold text-tinta-ter">
        {MEAL_LABELS[meal]}
      </div>
      {recipe ? (
        <div className="m-1.5 mt-1">
          <div
            draggable
            onDragStart={(e) => onSlotDragStart(e, key)}
            onDragEnd={onDragEnd}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-marfim-border cursor-grab active:cursor-grabbing hover:border-bronze/50 transition-colors"
          >
            {recipe.cover ? (
              <img
                src={getRecipeCoverUrl(recipe) || ''}
                alt={recipe.title}
                className="w-9 h-9 rounded-md object-cover shrink-0 border border-marfim-border"
                loading="lazy"
              />
            ) : (
              <div className="w-9 h-9 rounded-md bg-verde-subtle border border-verde/20 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-verde" />
              </div>
            )}
            <button
              onClick={() => onRecipeClick(recipe.id)}
              className="text-xs font-medium text-tinta leading-tight line-clamp-2 flex-1 text-left hover:text-verde hover:underline"
              title={recipe.title}
            >
              {recipe.title}
            </button>
            <button
              onClick={() => plan && onRemove(plan.id)}
              className="shrink-0 w-5 h-5 rounded-full bg-marfim-card hover:bg-erro/15 text-tinta-ter hover:text-erro flex items-center justify-center transition-colors"
              aria-label="Remover refeição"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => (pendingRecipe ? onApplyPending(date, meal) : onOpenPicker(date, meal))}
          onDrop={(e) => e.preventDefault()}
          disabled={busy}
          className={`m-1.5 mt-1 w-[calc(100%-0.75rem)] min-h-[52px] rounded-lg border border-dashed flex flex-col items-center justify-center transition-colors gap-0.5 ${
            showPendingHint
              ? 'border-verde/60 text-verde hover:bg-verde/10'
              : 'border-marfim-border text-tinta-ter hover:text-bronze hover:border-bronze/50'
          }`}
          aria-label={`Adicionar ${MEAL_LABELS[meal]}`}
        >
          {showPendingHint ? (
            <>
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-medium leading-none">
                Adicionar {pendingRecipe!.title.slice(0, 18)}
                {pendingRecipe!.title.length > 18 ? '…' : ''}
              </span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                Adicionar
              </span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

interface RecipeTrayProps {
  recipes: Recipe[]
  loading: boolean
  categories: Category[]
  trayCategory: string
  setTrayCategory: (v: string) => void
  traySearch: string
  setTraySearch: (v: string) => void
  pendingRecipe: PendingRecipe | null
  onSelectPending: (r: Recipe) => void
  onDragStart: (e: React.DragEvent, r: Recipe) => void
  compact?: boolean
}

const RecipeTray: React.FC<RecipeTrayProps> = ({
  recipes,
  loading,
  categories,
  trayCategory,
  setTrayCategory,
  traySearch,
  setTraySearch,
  pendingRecipe,
  onSelectPending,
  onDragStart,
  compact,
}) => {
  return (
    <div
      className={`flex flex-col h-full ${compact ? '' : 'bg-white rounded-2xl border border-marfim-border shadow-card overflow-hidden sticky top-6'}`}
    >
      <div className={`flex flex-col h-full ${compact ? '' : 'max-h-[calc(100vh-7rem)]'}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-marfim-border">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-4 h-4 text-verde" />
            <h2 className="font-serif text-lg font-bold text-tinta">Receitas disponíveis</h2>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tinta-ter" />
            <Input
              value={traySearch}
              onChange={(e) => setTraySearch(e.target.value)}
              placeholder="Buscar receita..."
              className="pl-9 h-9 bg-marfim/30 rounded-lg text-sm"
            />
          </div>
          <select
            value={trayCategory}
            onChange={(e) => setTrayCategory(e.target.value)}
            className="w-full h-9 rounded-lg bg-marfim/30 border border-marfim-border text-sm text-tinta px-2 focus:outline-none focus:ring-1 focus:ring-bronze"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-verde" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-10 text-sm text-tinta-sec">
              Nenhuma receita encontrada.
            </div>
          ) : (
            recipes.map((r) => {
              const vegan = isVegan(r)
              const selected = pendingRecipe?.id === r.id
              return (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, r)}
                  onClick={() => onSelectPending(r)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-colors ${
                    selected
                      ? 'border-verde bg-verde-subtle/60 ring-1 ring-verde/30'
                      : 'border-transparent hover:border-marfim-border hover:bg-marfim-card'
                  }`}
                >
                  {r.cover ? (
                    <img
                      src={getRecipeCoverUrl(r) || ''}
                      alt={r.title}
                      className="w-9 h-9 rounded-md object-cover shrink-0 border border-marfim-border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-verde-subtle border border-verde/20 flex items-center justify-center shrink-0">
                      <Utensils className="w-4 h-4 text-verde" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-sm font-bold text-tinta line-clamp-1 leading-tight">
                      {r.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {r.expand?.category && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] py-0 px-1.5 h-4 font-medium bg-marfim-card text-tinta-sec border border-marfim-border"
                        >
                          {r.expand.category.name}
                        </Badge>
                      )}
                      {vegan && (
                        <span
                          className="text-[10px] flex items-center gap-0.5 text-verde font-medium"
                          title="Vegana"
                        >
                          🍃
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-marfim-border text-[10px] text-tinta-ter text-center">
          Arraste para um slot ou selecione e toque no slot
        </div>
      </div>
    </div>
  )
}

interface RecipePickerRowProps {
  recipe: Recipe
  busy: boolean
  onSelect: () => void
}

const RecipePickerRow: React.FC<RecipePickerRowProps> = ({ recipe, busy, onSelect }) => {
  const coverUrl = getRecipeCoverUrl(recipe)
  return (
    <button
      onClick={onSelect}
      disabled={busy}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-marfim-card border border-transparent hover:border-marfim-border transition-colors text-left disabled:opacity-60"
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={recipe.title}
          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-marfim-border"
          loading="lazy"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-verde-subtle border border-verde/20 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-verde" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-serif text-sm font-bold text-tinta line-clamp-1">{recipe.title}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tinta-sec line-clamp-1">
            {recipe.expand?.category?.name || 'Sem categoria'}
          </span>
          {isVegan(recipe) && (
            <span className="text-[10px]" title="Vegana">
              🍃
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default Planejador
