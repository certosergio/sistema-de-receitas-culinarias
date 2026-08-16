import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Recipe } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
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

/** Returns the Sunday that starts the week containing `d`. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() - copy.getDay()) // back to Sunday
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

interface SlotTarget {
  date: string
  meal: MealType
}

const Planejador: React.FC = () => {
  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Recipe picker sheet
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<SlotTarget | null>(null)
  const [search, setSearch] = useState('')
  const [recipeResults, setRecipeResults] = useState<Recipe[]>([])
  const [searching, setSearching] = useState(false)

  // Drag state
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Clear week dialog
  const [clearOpen, setClearOpen] = useState(false)

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

  // Debounced recipe search for the picker.
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

  const openPicker = (date: string, meal: MealType) => {
    setPickerTarget({ date, meal })
    setSearch('')
    setPickerOpen(true)
  }

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!pickerTarget) return
    setBusy(true)
    try {
      await addMealPlan(pickerTarget.date, pickerTarget.meal, recipe.id)
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

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDragKey(key)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox to start dragging.
    e.dataTransfer.setData('text/plain', key)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverKey !== key) setDragOverKey(key)
  }

  const handleDrop = async (e: React.DragEvent, targetKey: string) => {
    e.preventDefault()
    const sourceKey = dragKey
    setDragKey(null)
    setDragOverKey(null)
    if (!sourceKey || sourceKey === targetKey) return

    const sourcePlan = planMap[sourceKey]
    const targetPlan = planMap[targetKey]
    if (!sourcePlan) return

    const [dateStr, mealStr] = targetKey.split('|')
    const targetDate = dateStr
    const targetMeal = mealStr as MealType

    setBusy(true)
    try {
      if (targetPlan) {
        // Swap: move target's recipe back into source slot.
        const [srcDate, srcMealStr] = sourceKey.split('|')
        const srcMeal = srcMealStr as MealType
        await removeMealPlan(targetPlan.id)
        await setMealPlan(srcDate, srcMeal, targetPlan.recipe)
      }
      // Move source recipe into target slot.
      await removeMealPlan(sourcePlan.id)
      await setMealPlan(targetDate, targetMeal, sourcePlan.recipe)
      load()
    } catch (err) {
      console.error('Erro ao mover refeição:', err)
      toast({
        title: 'Falha ao mover',
        description: 'Não foi possível reorganizar a refeição.',
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

  const goToday = () => setWeekStart(startOfWeek(new Date()))
  const prevWeek = () => setWeekStart((w) => addDays(w, -7))
  const nextWeek = () => setWeekStart((w) => addDays(w, 7))

  const totalMeals = plans.length

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

        <div className="flex items-center gap-2">
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
            onClick={() => setClearOpen(true)}
            disabled={busy || totalMeals === 0}
            className="border-marfim-border bg-white text-red-600 hover:bg-red-50 rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar semana</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {days.map((day) => {
            const iso = toISODate(day)
            const isToday = isSameDay(day, today)
            return (
              <div
                key={iso}
                className={`bg-white rounded-2xl border shadow-card flex flex-col overflow-hidden ${
                  isToday ? 'border-bronze ring-1 ring-bronze/30' : 'border-marfim-border'
                }`}
              >
                {/* Day header */}
                <div
                  className={`px-3 py-2.5 border-b flex items-center justify-between ${
                    isToday
                      ? 'bg-bronze/10 border-bronze/30'
                      : 'bg-marfim-card/60 border-marfim-border'
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-tinta-ter">
                      {WEEKDAY_SHORT[day.getDay()]}
                    </div>
                    <div className="font-serif text-lg font-bold text-tinta leading-none">
                      {day.getDate()}{' '}
                      <span className="text-xs font-sans font-normal text-tinta-sec">
                        {MONTHS_PT[day.getMonth()].slice(0, 3)}
                      </span>
                    </div>
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
                      <div
                        key={meal}
                        onDragOver={(e) => handleDragOver(e, key)}
                        onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                        onDrop={(e) => handleDrop(e, key)}
                        className={`group relative rounded-xl border transition-all min-h-[84px] ${
                          isDragOver
                            ? 'border-bronze bg-bronze/5 ring-1 ring-bronze/30'
                            : 'border-marfim-border bg-marfim/30'
                        }`}
                      >
                        <div className="px-2 pt-1.5 text-[9px] uppercase tracking-wider font-semibold text-tinta-ter">
                          {MEAL_LABELS[meal]}
                        </div>
                        {recipe ? (
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, key)}
                            onDragEnd={() => {
                              setDragKey(null)
                              setDragOverKey(null)
                            }}
                            className="m-1.5 mt-1 flex items-center gap-2 p-1.5 rounded-lg bg-white border border-marfim-border cursor-grab active:cursor-grabbing hover:border-bronze/50 transition-colors"
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
                            <span className="text-xs font-medium text-tinta leading-tight line-clamp-2 flex-1">
                              {recipe.title}
                            </span>
                            <button
                              onClick={() => plan && handleRemove(plan.id)}
                              className="shrink-0 w-5 h-5 rounded-full bg-marfim-card hover:bg-erro/15 text-tinta-ter hover:text-erro flex items-center justify-center transition-colors"
                              aria-label="Remover refeição"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openPicker(iso, meal)}
                            className="m-1.5 mt-1 w-[calc(100%-0.75rem)] min-h-[52px] rounded-lg border border-dashed border-marfim-border text-tinta-ter hover:text-bronze hover:border-bronze/50 flex items-center justify-center transition-colors"
                            aria-label={`Adicionar ${MEAL_LABELS[meal]}`}
                          >
                            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* RECIPE PICKER SHEET */}
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
              recipeResults.map((r) => {
                const coverUrl = getRecipeCoverUrl(r)
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRecipe(r)}
                    disabled={busy}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-marfim-card border border-transparent hover:border-marfim-border transition-colors text-left disabled:opacity-60"
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={r.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-marfim-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-verde-subtle border border-verde/20 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-verde" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-sm font-bold text-tinta line-clamp-1">
                        {r.title}
                      </div>
                      <div className="text-xs text-tinta-sec line-clamp-1">
                        {r.expand?.category?.name || 'Sem categoria'}
                        {r.total_minutes ? ` · ${r.total_minutes} min` : ''}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

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

export default Planejador
