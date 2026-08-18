import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Archive,
  History,
  Columns2,
} from 'lucide-react'
import {
  getMealPlans,
  addMealPlan,
  removeMealPlan,
  clearMealPlansRange,
  setMealPlan,
  getDayNotes,
  saveDayNote,
  MEAL_LABELS,
  MEAL_ORDER,
  slotKey,
  type MealType,
  type MealPlan,
  type DayNote,
} from '@/services/mealPlans'
import { exportWeekPlanPdf } from '@/lib/weekPlanPdf'
import { buildShoppingList, type ShoppingList } from '@/lib/shoppingList'
import { Textarea } from '@/components/ui/textarea'
import { FileDown } from 'lucide-react'
import debounce from '@/lib/debounce'
import { getRecipes, getRecipeCoverUrl } from '@/services/recipes'
import { savePlanningHistory, type HistoryPlanData } from '@/services/planningHistory'
import PlanningHistoryDialog from '@/components/PlanningHistory'
import WeekComparisonDialog from '@/components/WeekComparison'
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

// (Shopping-list aggregation now lives in src/lib/shoppingList.ts and is
//  imported as `buildShoppingList` + the `ShoppingList` type.)

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

  // Day notes (per-day free-form observations)
  const [notes, setNotes] = useState<Record<string, string>>({}) // isoDate -> text
  const [exportingPdf, setExportingPdf] = useState(false)
  // References to per-day debounced save functions, keyed by iso date.
  const noteSaversRef = useRef<Record<string, (text: string) => void>>({})

  // Planning history (archived weeks) dialog + archiving state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  // Whether the currently-viewed week is strictly in the past.
  const isPastWeek = useMemo(() => {
    return startOfWeek(weekStart).getTime() < startOfWeek(today).getTime()
  }, [weekStart, today])

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
      const [rows, noteRows] = await Promise.all([
        getMealPlans(weekStartIso, weekEndIso),
        getDayNotes(weekStartIso, weekEndIso),
      ])
      setPlans(rows)
      const map: Record<string, string> = {}
      for (const n of noteRows) map[n.date] = n.notes || ''
      setNotes(map)
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

  useRealtime('day_notes', () => {
    load()
  })

  // --- Day notes handling ---

  // Returns a memoized, debounced saver for a given date.
  const getNoteSaver = useCallback((date: string) => {
    if (!noteSaversRef.current[date]) {
      noteSaversRef.current[date] = debounce((text: string) => {
        saveDayNote(date, text).catch((err) => {
          console.error('Erro ao salvar anotação:', err)
          toast({
            title: 'Falha ao salvar anotação',
            description: 'Não foi possível salvar a anotação do dia.',
            variant: 'destructive',
          })
        })
      }, 700)
    }
    return noteSaversRef.current[date]
  }, [])

  const handleNoteChange = useCallback(
    (date: string, value: string) => {
      setNotes((prev) => ({ ...prev, [date]: value }))
      getNoteSaver(date)(value)
    },
    [getNoteSaver],
  )

  const handleNoteBlur = useCallback((date: string) => {
    // Flush pending debounced save immediately on blur.
    const saver = noteSaversRef.current[date]
    if (saver && 'flush' in saver) (saver as { flush: () => void }).flush()
  }, [])

  // Flush any pending note saves when navigating away.
  useEffect(() => {
    return () => {
      Object.values(noteSaversRef.current).forEach((saver) => {
        if (saver && 'flush' in saver) (saver as { flush: () => void }).flush()
      })
    }
  }, [])

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
      toast({ title: 'Semana esvaziada com sucesso.' })
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

  // Helper: build the expanded recipe map for the current week (used by both
  // the shopping list and the PDF export).
  const getExpandedRecipes = useCallback(async (): Promise<Recipe[]> => {
    const recipeIds = Array.from(new Set(plans.map((p) => p.recipe).filter(Boolean)))
    if (recipeIds.length === 0) return []
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
    return recipeIds.map((id) => expandedById.get(id)).filter((r): r is Recipe => Boolean(r))
  }, [plans])

  // --- Archive the current week into planning_history ---

  const archiveCurrentWeek = useCallback(
    async (silent = false): Promise<void> => {
      // Snapshot is only meaningful when there are meals planned.
      if (plans.length === 0) return
      setArchiving(true)
      try {
        const recipes = await getExpandedRecipes()
        const recipeById = new Map<string, Recipe>()
        for (const r of recipes) recipeById.set(r.id, r)

        const planData: HistoryPlanData = {
          week_start: weekStartIso,
          week_end: weekEndIso,
          plans: plans.map((p) => ({
            date: p.date,
            meal_type: p.meal_type,
            recipe: recipeById.get(p.recipe) || null,
          })),
          notes: { ...notes },
        }
        await savePlanningHistory(weekStartIso, weekEndIso, planData)
        if (!silent) {
          toast({
            title: 'Semana arquivada',
            description: 'O planejamento foi salvo no histórico.',
          })
        }
      } catch (err) {
        console.error('Erro ao arquivar semana:', err)
        if (!silent) {
          toast({
            title: 'Falha ao arquivar',
            description: 'Não foi possível salvar a semana no histórico.',
            variant: 'destructive',
          })
        }
      } finally {
        setArchiving(false)
      }
    },
    [plans, weekStartIso, weekEndIso, notes, getExpandedRecipes],
  )

  // Auto-archive past weeks when navigating away from them (week changes or
  // unmount). The effect tracks the *previous* week; when it changes and the
  // previous one is in the past with meals, it snapshots that previous week.
  const prevWeekStartRef = useRef<Date>(weekStart)
  const prevPlansRef = useRef<MealPlan[]>(plans)
  const prevNotesRef = useRef<Record<string, string>>(notes)

  useEffect(() => {
    prevPlansRef.current = plans
    prevNotesRef.current = notes
  }, [plans, notes])

  useEffect(() => {
    const prevWeek = prevWeekStartRef.current
    prevWeekStartRef.current = weekStart
    if (prevWeek.getTime() === weekStart.getTime()) return
    // If the week we just left is in the past and had meals, archive it.
    if (startOfWeek(prevWeek).getTime() < startOfWeek(today).getTime()) {
      const prevStartIso = toISODate(prevWeek)
      const prevEndIso = toISODate(addDays(prevWeek, 6))
      const prevPlans = prevPlansRef.current
      const prevNotes = prevNotesRef.current
      if (prevPlans.length === 0)
        return // Run async without blocking the render; read fresh recipe data.
      ;(async () => {
        try {
          const recipeIds = Array.from(new Set(prevPlans.map((p) => p.recipe).filter(Boolean)))
          const expandedById = new Map<string, Recipe>()
          for (const p of prevPlans) {
            if (p.expand?.recipe) expandedById.set(p.expand.recipe.id, p.expand.recipe)
          }
          const toFetch = recipeIds.filter((id) => !expandedById.has(id))
          if (toFetch.length > 0) {
            const fetched = await Promise.all(
              toFetch.map((id) =>
                pb.collection('recipes').getOne<Recipe>(id, { requestKey: null }),
              ),
            )
            for (const r of fetched) expandedById.set(r.id, r)
          }
          const planData: HistoryPlanData = {
            week_start: prevStartIso,
            week_end: prevEndIso,
            plans: prevPlans.map((p) => ({
              date: p.date,
              meal_type: p.meal_type,
              recipe: expandedById.get(p.recipe) || null,
            })),
            notes: { ...prevNotes },
          }
          await savePlanningHistory(prevStartIso, prevEndIso, planData)
        } catch (err) {
          console.error('Erro ao arquivar semana automaticamente:', err)
        }
      })()
    }
  }, [weekStart, today])

  // Also archive the current past week on unmount (leaving the planner page).
  useEffect(() => {
    return () => {
      const w = prevWeekStartRef.current
      const currentPlans = prevPlansRef.current
      const currentNotes = prevNotesRef.current
      if (startOfWeek(w).getTime() < startOfWeek(today).getTime() && currentPlans.length > 0) {
        const startIso = toISODate(w)
        const endIso = toISODate(addDays(w, 6))
        ;(async () => {
          try {
            const recipeIds = Array.from(new Set(currentPlans.map((p) => p.recipe).filter(Boolean)))
            const expandedById = new Map<string, Recipe>()
            for (const p of currentPlans) {
              if (p.expand?.recipe) expandedById.set(p.expand.recipe.id, p.expand.recipe)
            }
            const toFetch = recipeIds.filter((id) => !expandedById.has(id))
            if (toFetch.length > 0) {
              const fetched = await Promise.all(
                toFetch.map((id) =>
                  pb.collection('recipes').getOne<Recipe>(id, { requestKey: null }),
                ),
              )
              for (const r of fetched) expandedById.set(r.id, r)
            }
            const planData: HistoryPlanData = {
              week_start: startIso,
              week_end: endIso,
              plans: currentPlans.map((p) => ({
                date: p.date,
                meal_type: p.meal_type,
                recipe: expandedById.get(p.recipe) || null,
              })),
              notes: { ...currentNotes },
            }
            await savePlanningHistory(startIso, endIso, planData)
          } catch (err) {
            console.error('Erro ao arquivar ao sair da página:', err)
          }
        })()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true)
    try {
      const recipes = await getExpandedRecipes()
      exportWeekPlanPdf({
        weekStart,
        days: days.map((d, idx) => ({
          date: toISODate(d),
          weekday: WEEKDAYS_FULL[idx],
          meals: MEAL_ORDER.map((meal) => {
            const plan = planMap[slotKey(toISODate(d), meal)]
            const recipe = plan?.expand?.recipe
            return { meal, label: MEAL_LABELS[meal], recipe }
          }),
          notes: notes[toISODate(d)] || '',
        })),
        recipes,
        shoppingList: buildShoppingList(recipes),
      })
      toast({ title: 'PDF gerado', description: 'O planejamento semanal foi exportado.' })
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast({
        title: 'Falha ao exportar PDF',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      })
    } finally {
      setExportingPdf(false)
    }
  }, [weekStart, days, planMap, notes, getExpandedRecipes])

  const goToday = () => setWeekStart(startOfWeek(new Date()))
  const prevWeek = () => setWeekStart((w) => addDays(w, -7))
  const nextWeek = () => setWeekStart((w) => addDays(w, 7))

  const totalMeals = plans.length
  const hasMeals = totalMeals > 0

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border dark:border-[#322F26]">
        <div>
          <span className="label-caps block mb-1">Organize sua semana</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-tinta dark:text-[#EFE9DD] tracking-tight">
              Planejador de Cardápio
            </h1>
            <span className="text-xs font-mono bg-marfim-card dark:bg-[#221F18] px-2.5 py-1 rounded-full border border-marfim-border dark:border-[#322F26] text-tinta dark:text-[#EFE9DD] font-medium">
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
            variant="outline"
            onClick={() => setHistoryOpen(true)}
            className="border-marfim-border bg-white text-tinta rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCompareOpen(true)}
            className="border-bronze/40 bg-bronze/5 text-bronze hover:bg-bronze/10 rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
            title="Comparar semanas lado a lado"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Comparar</span>
          </Button>
          {isPastWeek && (
            <Button
              onClick={() => archiveCurrentWeek()}
              disabled={busy || archiving || !hasMeals}
              className="bg-tinta hover:bg-tinta/90 text-white rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
            >
              {archiving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Arquivar</span>
            </Button>
          )}
          <Button
            onClick={handleGenerateShoppingList}
            disabled={busy || !hasMeals}
            className="bg-verde hover:bg-verde-hover text-white rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
          >
            <ShoppingBasket className="w-3.5 h-3.5" />
            <span>Lista de compras</span>
          </Button>
          <Button
            onClick={handleExportPdf}
            disabled={busy || exportingPdf || !hasMeals}
            className="bg-bronze hover:bg-bronze/90 text-white rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
          >
            {exportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>Exportar PDF</span>
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
      ) : (
        <div className="flex flex-col xl:flex-row gap-5">
          {/* WEEK GRID (desktop: 7 columns; mobile: accordion) / EMPTY STATE */}
          <div className="flex-1 min-w-0">
            {!hasMeals ? (
              <EMPTY_STATE />
            ) : (
              <>
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
                      noteText={notes[toISODate(day)] ?? ''}
                      onNoteChange={handleNoteChange}
                      onNoteBlur={handleNoteBlur}
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
                      noteText={notes[toISODate(day)] ?? ''}
                      onNoteChange={handleNoteChange}
                      onNoteBlur={handleNoteBlur}
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
                              <DayNotesField
                                date={iso}
                                value={notes[iso] ?? ''}
                                onChange={handleNoteChange}
                                onBlur={handleNoteBlur}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </div>
              </>
            )}
          </div>

          {/* SIDE TRAY — always visible (desktop) */}
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

      {/* MOBILE TRAY BUTTON — always visible when not loading */}
      <button
        onClick={() => setTrayOpenMobile(true)}
        className="xl:hidden fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full bg-verde hover:bg-verde-hover text-white flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all border-2 border-white"
        aria-label="Receitas disponíveis"
      >
        <Utensils className="w-6 h-6" />
      </button>

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
          className="bg-white dark:bg-[#1E1C16] border-marfim-border dark:border-[#322F26] w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-marfim-border dark:border-[#322F26] text-left">
            <SheetTitle className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD]">
              Escolher receita
            </SheetTitle>
            <SheetDescription className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
              {pickerTarget
                ? `${MEAL_LABELS[pickerTarget.meal]} · ${parseISODate(pickerTarget.date).getDate()}/${
                    parseISODate(pickerTarget.date).getMonth() + 1
                  }`
                : 'Selecione uma receita do acervo para este slot.'}
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 py-3 border-b border-marfim-border dark:border-[#322F26]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta-ter dark:text-[#8F887B]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, resumo ou dica..."
                className="pl-9 h-10 bg-marfim/30 dark:bg-[#221F18]/60 rounded-xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            {searching ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-verde dark:text-[#A9C4B5]" />
              </div>
            ) : recipeResults.length === 0 ? (
              <div className="text-center py-10 text-sm text-tinta-sec dark:text-[#B5AE9F]">
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
              Esvaziar semana?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec text-sm">
              Tem certeza? Todas as refeições planejadas desta semana serão removidas.
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

      {/* PLANNING HISTORY DIALOG */}
      <PlanningHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* WEEK COMPARISON DIALOG */}
      <WeekComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        currentWeekStart={weekStart}
      />
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
    <p className="text-xs text-tinta-ter max-w-md leading-relaxed mt-3">
      No desktop, use a <strong className="text-tinta-sec">bandeja lateral</strong> à direita para
      buscar e arrastar receitas. No celular, toque no botão flutuante{' '}
      <Utensils className="inline w-3 h-3 -mt-0.5 text-verde" /> para abrir a bandeja.
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
  noteText: string
  onNoteChange: (date: string, value: string) => void
  onNoteBlur: (date: string) => void
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
  noteText,
  onNoteChange,
  onNoteBlur,
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
        <DayNotesField date={iso} value={noteText} onChange={onNoteChange} onBlur={onNoteBlur} />
      </div>
    </div>
  )
}

interface DayNotesFieldProps {
  date: string
  value: string
  onChange: (date: string, value: string) => void
  onBlur: (date: string) => void
}

/** Discreet auto-saving notes textarea rendered at the bottom of each day. */
const DayNotesField: React.FC<DayNotesFieldProps> = ({ date, value, onChange, onBlur }) => {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(date, e.target.value)}
      onBlur={() => onBlur(date)}
      placeholder="Anotações do dia..."
      rows={2}
      className="w-full resize-none bg-marfim/30 dark:bg-[#221F18]/60 border-marfim-border dark:border-[#322F26] rounded-lg text-[11px] leading-snug text-tinta dark:text-[#EFE9DD] placeholder:text-tinta-ter dark:placeholder:text-[#8F887B] focus-visible:ring-1 focus-visible:ring-bronze/50 focus-visible:border-bronze/40 px-2 py-1.5"
    />
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
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium leading-none">Adicionar</span>
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
