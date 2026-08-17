import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  FileDown,
  Loader2,
  ShoppingBasket,
  Utensils,
  Clock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { exportWeekPlanPdf } from '@/lib/weekPlanPdf'
import { buildShoppingList } from '@/lib/shoppingList'
import { getRecipeCoverUrl } from '@/services/recipes'
import { MEAL_LABELS, MEAL_ORDER, slotKey, type MealType } from '@/services/mealPlans'
import {
  listPlanningHistory,
  type PlanningHistoryRecord,
  type HistoryPlanData,
  type HistoryPlanEntry,
} from '@/services/planningHistory'
import type { Recipe } from '@/types'

// --- Date helpers (local — mirror the planner's, kept independent) -----------

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

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

/** "14 a 20 de abril de 2025" (always includes the year). */
function formatWeekRangeFull(start: Date): string {
  const end = addDays(start, 6)
  const startDay = start.getDate()
  const endDay = end.getDate()
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${startDay} a ${endDay} de ${MONTHS_PT[start.getMonth()]} de ${start.getFullYear()}`
  }
  return `${startDay} de ${MONTHS_PT[start.getMonth()]} a ${endDay} de ${MONTHS_PT[end.getMonth()]} de ${end.getFullYear()}`
}

// --- Derived-data helpers ---------------------------------------------------

interface WeekSummary {
  totalMeals: number
  uniqueRecipes: number
  /** Per-day compact summary, in week order. */
  days: { weekdayShort: string; dayNumber: number; meals: number }[]
}

function buildSummary(data: HistoryPlanData): WeekSummary {
  const recipeIds = new Set<string>()
  let totalMeals = 0
  const start = parseISODate(data.week_start)
  const dayCounts = new Array(7).fill(0)
  for (const p of data.plans) {
    if (!p.recipe) continue
    totalMeals += 1
    recipeIds.add(p.recipe.id)
    const di = Math.round((parseISODate(p.date).getTime() - start.getTime()) / 86400000)
    if (di >= 0 && di < 7) dayCounts[di] += 1
  }
  return {
    totalMeals,
    uniqueRecipes: recipeIds.size,
    days: dayCounts.map((meals, i) => ({
      weekdayShort: WEEKDAYS_SHORT[i],
      dayNumber: addDays(start, i).getDate(),
      meals,
    })),
  }
}

/** Indexes plan entries by slotKey for quick lookup. */
function indexPlans(data: HistoryPlanData): Record<string, HistoryPlanEntry> {
  const m: Record<string, HistoryPlanEntry> = {}
  for (const p of data.plans) m[slotKey(p.date, p.meal_type)] = p
  return m
}

// ============================================================================
// Main dialog component
// ============================================================================

interface PlanningHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PlanningHistoryDialog: React.FC<PlanningHistoryDialogProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate()
  const [history, setHistory] = useState<PlanningHistoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<PlanningHistoryRecord | null>(null)
  const [showShopping, setShowShopping] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listPlanningHistory()
      setHistory(rows)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
      toast({
        title: 'Erro ao carregar histórico',
        description: 'Não foi possível buscar as semanas arquivadas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSelected(null)
      setShowShopping(false)
      loadHistory()
    }
  }, [open, loadHistory])

  const handleExportPdf = useCallback(async (record: PlanningHistoryRecord) => {
    const data = record.plan_data
    const start = parseISODate(data.week_start)
    const planMap = indexPlans(data)
    const recipesById = new Map<string, Recipe>()
    for (const p of data.plans) {
      if (p.recipe) recipesById.set(p.recipe.id, p.recipe)
    }
    const recipes = Array.from(recipesById.values())
    setExportingPdf(true)
    try {
      exportWeekPlanPdf({
        weekStart: start,
        days: Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, i)
          const iso = toISODate(d)
          return {
            date: iso,
            weekday: WEEKDAYS_FULL[i],
            meals: MEAL_ORDER.map((meal) => {
              const entry = planMap[slotKey(iso, meal)]
              return { meal, label: MEAL_LABELS[meal], recipe: entry?.recipe || undefined }
            }),
            notes: data.notes[iso] || '',
          }
        }),
        recipes,
        shoppingList: buildShoppingList(recipes),
      })
      toast({ title: 'PDF gerado', description: 'O planejamento arquivado foi exportado.' })
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
  }, [])

  const handleRecipeClick = useCallback(
    (id: string) => {
      onOpenChange(false)
      navigate(`/receitas/${id}`)
    },
    [navigate, onOpenChange],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] flex flex-col max-h-[92vh] ${
          selected ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        {selected ? (
          <ArchivedWeekView
            record={selected}
            showShopping={showShopping}
            setShowShopping={setShowShopping}
            exportingPdf={exportingPdf}
            onBack={() => {
              setSelected(null)
              setShowShopping(false)
            }}
            onExportPdf={() => handleExportPdf(selected)}
            onRecipeClick={handleRecipeClick}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD] flex items-center gap-2">
                <Archive className="w-5 h-5 text-bronze" />
                Histórico de Planejamentos
              </DialogTitle>
              <DialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
                Semanas arquivadas disponíveis para consulta.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto pr-1 -mr-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-verde dark:text-[#A9C4B5]" />
                </div>
              ) : history.length === 0 ? (
                <EmptyHistory />
              ) : (
                <ul className="space-y-2.5">
                  {history.map((record) => (
                    <HistoryRow
                      key={record.id}
                      record={record}
                      onOpen={() => setSelected(record)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Empty state ------------------------------------------------------------

const EmptyHistory: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-20 h-20 rounded-full bg-verde-subtle border border-verde/20 flex items-center justify-center mb-4">
      <Archive className="w-9 h-9 text-verde dark:text-[#A9C4B5]" />
    </div>
    <h3 className="font-serif text-xl font-bold text-tinta dark:text-[#EFE9DD] mb-1">
      Nenhuma semana arquivada
    </h3>
    <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] max-w-sm leading-relaxed">
      Navegue para uma semana passada no planejador e use{' '}
      <span className="font-medium text-tinta dark:text-[#EFE9DD]">Arquivar esta semana</span> para
      guardá-la no histórico.
    </p>
  </div>
)

// --- List row ---------------------------------------------------------------

interface HistoryRowProps {
  record: PlanningHistoryRecord
  onOpen: () => void
}

const HistoryRow: React.FC<HistoryRowProps> = ({ record, onOpen }) => {
  const summary = useMemo(() => buildSummary(record.plan_data), [record])
  const start = parseISODate(record.plan_data.week_start)
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full text-left p-4 rounded-xl border border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/60 hover:border-bronze/50 hover:bg-marfim-card/50 dark:hover:bg-[#221F18] transition-colors group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-bronze shrink-0" />
              {formatWeekRangeFull(start)}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge
                variant="secondary"
                className="text-[10px] py-0 px-1.5 h-5 font-medium bg-verde-subtle text-verde border border-verde/20"
              >
                <Utensils className="w-3 h-3 mr-1" />
                {summary.uniqueRecipes} {summary.uniqueRecipes === 1 ? 'receita' : 'receitas'}
              </Badge>
              <span className="text-xs text-tinta-ter dark:text-[#8F887B]">
                {summary.totalMeals} {summary.totalMeals === 1 ? 'refeição' : 'refeições'}
              </span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-tinta-ter dark:text-[#8F887B] rotate-180 group-hover:text-bronze shrink-0 mt-1" />
        </div>

        {/* Compact day summary */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {summary.days.map((d, i) => (
            <span
              key={i}
              className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                d.meals > 0
                  ? 'bg-bronze/10 border-bronze/30 text-bronze font-semibold'
                  : 'bg-marfim-card dark:bg-[#221F18] border-marfim-border dark:border-[#322F26] text-tinta-ter dark:text-[#8F887B]'
              }`}
              title={`${d.weekdayShort}: ${d.meals} ${d.meals === 1 ? 'refeição' : 'refeições'}`}
            >
              {d.weekdayShort} {d.dayNumber}
              {d.meals > 0 && ` · ${d.meals}`}
            </span>
          ))}
        </div>
      </button>
    </li>
  )
}

// --- Archived week read-only view -------------------------------------------

interface ArchivedWeekViewProps {
  record: PlanningHistoryRecord
  showShopping: boolean
  setShowShopping: (v: boolean) => void
  exportingPdf: boolean
  onBack: () => void
  onExportPdf: () => void
  onRecipeClick: (id: string) => void
}

const ArchivedWeekView: React.FC<ArchivedWeekViewProps> = ({
  record,
  showShopping,
  setShowShopping,
  exportingPdf,
  onBack,
  onExportPdf,
  onRecipeClick,
}) => {
  const data = record.plan_data
  const start = parseISODate(data.week_start)
  const planMap = useMemo(() => indexPlans(data), [data])
  const recipes = useMemo(() => {
    const m = new Map<string, Recipe>()
    for (const p of data.plans) if (p.recipe) m.set(p.recipe.id, p.recipe)
    return Array.from(m.values())
  }, [data])
  const shopping = useMemo(() => buildShoppingList(recipes), [recipes])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-marfim-border dark:border-[#322F26] bg-white dark:bg-[#221F18] text-tinta dark:text-[#EFE9DD] rounded-xl h-8 px-2.5 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Voltar
          </Button>
          <DialogTitle className="font-serif text-xl font-bold text-tinta dark:text-[#EFE9DD] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-bronze" />
            {formatWeekRangeFull(start)}
          </DialogTitle>
        </div>
        <DialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-xs flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1">
            <Archive className="w-3 h-3" /> Semana arquivada · modo somente leitura
          </span>
        </DialogDescription>
      </DialogHeader>

      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-2">
        <Button
          onClick={onExportPdf}
          disabled={exportingPdf}
          className="bg-bronze hover:bg-bronze/90 text-white rounded-xl h-9 px-3 text-xs font-semibold gap-1.5"
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
          onClick={() => setShowShopping(!showShopping)}
          disabled={recipes.length === 0}
          className="border-marfim-border dark:border-[#322F26] bg-white dark:bg-[#221F18] text-tinta dark:text-[#EFE9DD] rounded-xl h-9 px-3 text-xs font-semibold gap-1.5"
        >
          <ShoppingBasket className="w-3.5 h-3.5" />
          <span>Lista de compras</span>
        </Button>
      </div>

      <div className="overflow-y-auto pr-1 -mr-1 space-y-3">
        {/* DESKTOP GRID (≥ lg) */}
        <div className="hidden lg:grid grid-cols-7 gap-2">
          {days.map((day, idx) => (
            <ArchivedDayColumn
              key={toISODate(day)}
              day={day}
              weekdayFull={WEEKDAYS_FULL[idx]}
              weekdayShort={WEEKDAYS_SHORT[idx]}
              planMap={planMap}
              notes={data.notes[toISODate(day)] || ''}
              onRecipeClick={onRecipeClick}
            />
          ))}
        </div>

        {/* MOBILE ACCORDION (< lg) */}
        <div className="lg:hidden">
          <Accordion type="single" defaultValue={toISODate(start)} collapsible>
            {days.map((day, idx) => {
              const iso = toISODate(day)
              const dayMeals = MEAL_ORDER.filter((m) => planMap[slotKey(iso, m)]).length
              return (
                <AccordionItem
                  key={iso}
                  value={iso}
                  className="bg-white dark:bg-[#1E1C16] rounded-2xl border border-marfim-border dark:border-[#322F26] mb-3 overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 bg-marfim-card dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26]">
                        <span className="text-[9px] uppercase font-bold text-tinta-ter dark:text-[#8F887B] leading-none">
                          {WEEKDAYS_SHORT[idx]}
                        </span>
                        <span className="font-serif text-base font-bold text-tinta dark:text-[#EFE9DD] leading-none mt-0.5">
                          {day.getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="font-serif text-base font-bold text-tinta dark:text-[#EFE9DD]">
                          {WEEKDAYS_FULL[idx]}
                        </div>
                        <div className="text-xs text-tinta-ter dark:text-[#8F887B]">
                          {dayMeals > 0
                            ? `${dayMeals} ${dayMeals === 1 ? 'refeição' : 'refeições'}`
                            : 'Sem refeições'}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <ArchivedDayBody
                      iso={iso}
                      planMap={planMap}
                      notes={data.notes[iso] || ''}
                      onRecipeClick={onRecipeClick}
                    />
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>

        {/* Shopping list (collapsible) */}
        {showShopping && (
          <div className="bg-marfim/40 dark:bg-[#221F18]/60 rounded-2xl border border-marfim-border dark:border-[#322F26] p-4">
            <h3 className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD] mb-3 flex items-center gap-2 border-b border-marfim-border dark:border-[#322F26] pb-2">
              <ShoppingBasket className="w-4 h-4 text-verde dark:text-[#A9C4B5]" />
              Lista de Compras
              <span className="text-xs font-sans font-normal text-tinta-ter dark:text-[#8F887B]">
                {shopping.totalItems} {shopping.totalItems === 1 ? 'item' : 'itens'}
              </span>
            </h3>
            {shopping.totalItems === 0 ? (
              <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] italic">
                Nenhum ingrediente encontrado nas receitas planejadas.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {shopping.groups.map((group) => (
                  <div key={group.category}>
                    <h4 className="font-serif text-sm font-bold text-tinta dark:text-[#EFE9DD] mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-bronze" />
                      {group.category}
                      <span className="text-[10px] font-sans font-normal text-tinta-ter dark:text-[#8F887B]">
                        ({group.items.length})
                      </span>
                    </h4>
                    <ul className="space-y-1">
                      {group.items.map((item) => {
                        const qtyStr = item.quantities.length ? item.quantities.join(' + ') : ''
                        return (
                          <li
                            key={item.name}
                            className="flex items-start justify-between gap-2 text-xs py-0.5"
                          >
                            <span className="flex items-start gap-1.5 text-tinta dark:text-[#EFE9DD]">
                              <span className="mt-1 w-2.5 h-2.5 rounded-sm border border-marfim-border dark:border-[#322F26] shrink-0" />
                              <span className="font-medium">{item.name}</span>
                              {item.count > 1 && (
                                <span className="text-[9px] font-mono bg-marfim-card dark:bg-[#221F18] text-tinta-ter dark:text-[#8F887B] px-1 py-0.5 rounded-full border border-marfim-border dark:border-[#322F26]">
                                  ×{item.count}
                                </span>
                              )}
                            </span>
                            <span className="text-tinta-sec dark:text-[#B5AE9F] font-mono text-[10px] whitespace-nowrap">
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
          </div>
        )}
      </div>
    </>
  )
}

// --- Archived day column (desktop) ------------------------------------------

interface ArchivedDayColumnProps {
  day: Date
  weekdayFull: string
  weekdayShort: string
  planMap: Record<string, HistoryPlanEntry>
  notes: string
  onRecipeClick: (id: string) => void
}

const ArchivedDayColumn: React.FC<ArchivedDayColumnProps> = ({
  day,
  weekdayFull,
  weekdayShort,
  planMap,
  notes,
  onRecipeClick,
}) => {
  const iso = toISODate(day)
  return (
    <div className="bg-white dark:bg-[#1E1C16] rounded-2xl border border-marfim-border dark:border-[#322F26] shadow-card flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-marfim-border dark:border-[#322F26] bg-marfim-card/60 dark:bg-[#221F18]/60">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B]">
          {weekdayShort}
        </div>
        <div className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD] leading-none">
          {day.getDate()}{' '}
          <span className="text-xs font-sans font-normal text-tinta-sec dark:text-[#B5AE9F]">
            {MONTHS_PT[day.getMonth()].slice(0, 3)}
          </span>
        </div>
        <div className="text-[10px] text-tinta-ter dark:text-[#8F887B] mt-0.5">{weekdayFull}</div>
      </div>
      <div className="p-2 space-y-2 flex-1">
        <ArchivedDayBody iso={iso} planMap={planMap} notes={notes} onRecipeClick={onRecipeClick} />
      </div>
    </div>
  )
}

// --- Archived day body (shared by desktop column + mobile accordion) --------

interface ArchivedDayBodyProps {
  iso: string
  planMap: Record<string, HistoryPlanEntry>
  notes: string
  onRecipeClick: (id: string) => void
}

const ArchivedDayBody: React.FC<ArchivedDayBodyProps> = ({
  iso,
  planMap,
  notes,
  onRecipeClick,
}) => {
  return (
    <>
      {MEAL_ORDER.map((meal) => {
        const entry = planMap[slotKey(iso, meal)]
        const recipe = entry?.recipe
        return (
          <div
            key={meal}
            className="rounded-xl border border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/60 min-h-[72px]"
          >
            <div className="px-2 pt-1.5 text-[9px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B]">
              {MEAL_LABELS[meal]}
            </div>
            {recipe ? (
              <div className="m-1.5 mt-1">
                <button
                  onClick={() => onRecipeClick(recipe.id)}
                  className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-[#1E1C16] border border-marfim-border dark:border-[#322F26] hover:border-bronze/50 transition-colors w-full text-left"
                >
                  {recipe.cover ? (
                    <img
                      src={getRecipeCoverUrl(recipe) || ''}
                      alt={recipe.title}
                      className="w-9 h-9 rounded-md object-cover shrink-0 border border-marfim-border dark:border-[#322F26]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-verde-subtle border border-verde/20 flex items-center justify-center shrink-0">
                      <Utensils className="w-4 h-4 text-verde dark:text-[#A9C4B5]" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-tinta dark:text-[#EFE9DD] leading-tight line-clamp-2 flex-1 hover:text-verde hover:underline">
                    {recipe.title}
                  </span>
                </button>
              </div>
            ) : (
              <div className="m-1.5 mt-1 px-2 py-2 text-[11px] italic text-tinta-ter dark:text-[#8F887B]">
                —
              </div>
            )}
          </div>
        )
      })}
      {notes && notes.trim() && (
        <div className="rounded-lg border border-marfim-border dark:border-[#322F26] bg-marfim/20 dark:bg-[#221F18]/40 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B] mb-0.5 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Anotações
          </div>
          <p className="text-[11px] leading-snug text-tinta-sec dark:text-[#B5AE9F] whitespace-pre-wrap">
            {notes.trim()}
          </p>
        </div>
      )}
    </>
  )
}

export default PlanningHistoryDialog
