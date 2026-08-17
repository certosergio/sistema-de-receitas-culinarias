import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Columns2,
  Loader2,
  FileDown,
  ShoppingBasket,
  CalendarDays,
  Repeat,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { getRecipeCoverUrl } from '@/services/recipes'
import { getMealPlans, getDayNotes, MEAL_LABELS, MEAL_ORDER, slotKey } from '@/services/mealPlans'
import {
  listPlanningHistory,
  type PlanningHistoryRecord,
  type HistoryPlanData,
  type HistoryPlanEntry,
} from '@/services/planningHistory'
import { buildShoppingList, type ShoppingList } from '@/lib/shoppingList'
import { exportWeekComparePdf } from '@/lib/weekComparePdf'
import pb from '@/lib/pocketbase/client'
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

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() - mondayIndex(copy))
  return copy
}

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

// --- Week options ----------------------------------------------------------

type WeekSource = 'live' | 'history'

interface WeekOption {
  id: string
  source: WeekSource
  weekStart: Date
  weekStartIso: string
  label: string
  /** Present only for archived weeks. */
  historyRecord?: PlanningHistoryRecord
}

// ============================================================================
// Main dialog component
// ============================================================================

interface WeekComparisonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Start of the planner's currently-viewed week (used as default option A). */
  currentWeekStart: Date
}

const WeekComparisonDialog: React.FC<WeekComparisonDialogProps> = ({
  open,
  onOpenChange,
  currentWeekStart,
}) => {
  const navigate = useNavigate()

  const [options, setOptions] = useState<WeekOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState(false)

  const [idA, setIdA] = useState<string>('')
  const [idB, setIdB] = useState<string>('')

  const [dataA, setDataA] = useState<HistoryPlanData | null>(null)
  const [dataB, setDataB] = useState<HistoryPlanData | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [errorA, setErrorA] = useState(false)
  const [errorB, setErrorB] = useState(false)

  const [showShoppingA, setShowShoppingA] = useState(false)
  const [showShoppingB, setShowShoppingB] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // --- Load the week selector options (current week + history) --------------

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true)
    setOptionsError(false)
    const liveIso = toISODate(startOfWeek(currentWeekStart))
    const liveStart = startOfWeek(currentWeekStart)
    const built: WeekOption[] = [
      {
        id: `live:${liveIso}`,
        source: 'live',
        weekStart: liveStart,
        weekStartIso: liveIso,
        label: `${formatWeekRangeFull(liveStart)} (atual)`,
      },
    ]
    setOptions(built)

    try {
      const history = await listPlanningHistory()
      for (const rec of history) {
        const ws = parseISODate(rec.week_start)
        // Skip a history row that duplicates the current live week.
        if (rec.week_start === liveIso) continue
        built.push({
          id: `history:${rec.id}`,
          source: 'history',
          weekStart: ws,
          weekStartIso: rec.week_start,
          label: formatWeekRangeFull(ws),
          historyRecord: rec,
        })
      }
      setOptions([...built])
    } catch (err) {
      console.error('Erro ao carregar histórico para comparação:', err)
      setOptionsError(true)
      toast({
        title: 'Erro ao carregar histórico',
        description: 'Não foi possível buscar as semanas arquivadas.',
        variant: 'destructive',
      })
    } finally {
      setOptionsLoading(false)
    }
  }, [currentWeekStart])

  useEffect(() => {
    if (open) {
      setShowShoppingA(false)
      setShowShoppingB(false)
      loadOptions()
      const liveId = `live:${toISODate(startOfWeek(currentWeekStart))}`
      setIdA(liveId)
      // Default B is chosen once the options list resolves (see effect below).
      setIdB('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentWeekStart])

  // When options finish loading, pick a sensible default B (first history row).
  useEffect(() => {
    if (open && !idB && options.length > 1) {
      const candidate = options.find((o) => o.id !== idA) || options[0]
      setIdB(candidate.id)
    }
  }, [open, idB, options, idA])

  // --- Load a week's data on demand -----------------------------------------

  const loadWeekData = useCallback(async (option: WeekOption): Promise<HistoryPlanData> => {
    if (option.source === 'history' && option.historyRecord) {
      return option.historyRecord.plan_data
    }
    // Live week: fetch meal_plans + day_notes and build a HistoryPlanData.
    const startIso = option.weekStartIso
    const endIso = toISODate(addDays(option.weekStart, 6))
    const [plans, noteRows] = await Promise.all([
      getMealPlans(startIso, endIso),
      getDayNotes(startIso, endIso),
    ])
    // Ensure every plan has an expanded recipe object.
    const expandedById = new Map<string, Recipe>()
    for (const p of plans) {
      if (p.expand?.recipe) expandedById.set(p.expand.recipe.id, p.expand.recipe)
    }
    const toFetch = plans.map((p) => p.recipe).filter((id) => id && !expandedById.has(id))
    const uniqueToFetch = Array.from(new Set(toFetch))
    if (uniqueToFetch.length > 0) {
      const fetched = await Promise.all(
        uniqueToFetch.map((id) =>
          pb.collection('recipes').getOne<Recipe>(id, { requestKey: null }),
        ),
      )
      for (const r of fetched) expandedById.set(r.id, r)
    }
    const notesMap: Record<string, string> = {}
    for (const n of noteRows) notesMap[n.date] = n.notes || ''
    const data: HistoryPlanData = {
      week_start: startIso,
      week_end: endIso,
      plans: plans.map((p) => ({
        date: p.date,
        meal_type: p.meal_type,
        recipe: expandedById.get(p.recipe) || null,
      })),
      notes: notesMap,
    }
    return data
  }, [])

  // Load week A whenever idA changes.
  useEffect(() => {
    if (!open || !idA) {
      setDataA(null)
      setErrorA(false)
      return
    }
    let cancelled = false
    setLoadingA(true)
    setErrorA(false)
    const option = options.find((o) => o.id === idA)
    if (!option) {
      setLoadingA(false)
      return
    }
    loadWeekData(option)
      .then((d) => {
        if (!cancelled) setDataA(d)
      })
      .catch((err) => {
        console.error('Erro ao carregar semana A:', err)
        if (!cancelled) setErrorA(true)
      })
      .finally(() => {
        if (!cancelled) setLoadingA(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, idA, options, loadWeekData])

  // Load week B whenever idB changes.
  useEffect(() => {
    if (!open || !idB) {
      setDataB(null)
      setErrorB(false)
      return
    }
    let cancelled = false
    setLoadingB(true)
    setErrorB(false)
    const option = options.find((o) => o.id === idB)
    if (!option) {
      setLoadingB(false)
      return
    }
    loadWeekData(option)
      .then((d) => {
        if (!cancelled) setDataB(d)
      })
      .catch((err) => {
        console.error('Erro ao carregar semana B:', err)
        if (!cancelled) setErrorB(true)
      })
      .finally(() => {
        if (!cancelled) setLoadingB(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, idB, options, loadWeekData])

  // --- Comparison summary ---------------------------------------------------

  const summary = useMemo(() => {
    const idsA = new Set<string>()
    const idsB = new Set<string>()
    if (dataA) for (const p of dataA.plans) if (p.recipe) idsA.add(p.recipe.id)
    if (dataB) for (const p of dataB.plans) if (p.recipe) idsB.add(p.recipe.id)
    const common = new Set<string>()
    for (const id of idsA) if (idsB.has(id)) common.add(id)
    const exclusiveA = new Set<string>()
    for (const id of idsA) if (!idsB.has(id)) exclusiveA.add(id)
    const exclusiveB = new Set<string>()
    for (const id of idsB) if (!idsA.has(id)) exclusiveB.add(id)
    return {
      common,
      exclusiveA,
      exclusiveB,
      commonCount: common.size,
      exclusiveACount: exclusiveA.size,
      exclusiveBCount: exclusiveB.size,
    }
  }, [dataA, dataB])

  // --- Shopping lists -------------------------------------------------------

  const shoppingA = useMemo<ShoppingList | null>(() => {
    if (!dataA) return null
    const m = new Map<string, Recipe>()
    for (const p of dataA.plans) if (p.recipe) m.set(p.recipe.id, p.recipe)
    return buildShoppingList(Array.from(m.values()))
  }, [dataA])

  const shoppingB = useMemo<ShoppingList | null>(() => {
    if (!dataB) return null
    const m = new Map<string, Recipe>()
    for (const p of dataB.plans) if (p.recipe) m.set(p.recipe.id, p.recipe)
    return buildShoppingList(Array.from(m.values()))
  }, [dataB])

  // --- PDF export -----------------------------------------------------------

  const handleExportPdf = useCallback(async () => {
    if (!dataA || !dataB) return
    setExportingPdf(true)
    try {
      const labelA = options.find((o) => o.id === idA)?.label || 'Semana 1'
      const labelB = options.find((o) => o.id === idB)?.label || 'Semana 2'
      exportWeekComparePdf({
        labelA,
        dataA,
        labelB,
        dataB,
        summary: {
          common: summary.commonCount,
          exclusiveA: summary.exclusiveACount,
          exclusiveB: summary.exclusiveBCount,
        },
      })
      toast({ title: 'PDF gerado', description: 'A comparação foi exportada.' })
    } catch (err) {
      console.error('Erro ao exportar comparação em PDF:', err)
      toast({
        title: 'Falha ao exportar PDF',
        description: 'Não foi possível gerar o PDF da comparação.',
        variant: 'destructive',
      })
    } finally {
      setExportingPdf(false)
    }
  }, [dataA, dataB, options, idA, idB, summary])

  const handleRecipeClick = useCallback(
    (id: string) => {
      onOpenChange(false)
      navigate(`/receitas/${id}`)
    },
    [navigate, onOpenChange],
  )

  const ready = dataA && dataB && !loadingA && !loadingB && !errorA && !errorB

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] flex flex-col max-h-[94vh] max-w-[1180px] w-[96vw] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-marfim-border dark:border-[#322F26]">
          <DialogTitle className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD] flex items-center gap-2">
            <Columns2 className="w-5 h-5 text-bronze" />
            Comparar Semanas
          </DialogTitle>
          <DialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-xs">
            Selecione duas semanas para comparar lado a lado. Receitas repetidas são destacadas.
          </DialogDescription>
        </DialogHeader>

        {/* Selectors */}
        <div className="px-6 py-3 border-b border-marfim-border dark:border-[#322F26] grid sm:grid-cols-2 gap-3">
          <WeekSelector
            label="Semana 1"
            value={idA}
            onChange={setIdA}
            options={options}
            loading={optionsLoading}
            error={optionsError}
            accent="bronze"
          />
          <WeekSelector
            label="Semana 2"
            value={idB}
            onChange={setIdB}
            options={options}
            loading={optionsLoading}
            error={optionsError}
            accent="verde"
          />
        </div>

        {/* Summary bar */}
        <div className="px-6 py-2.5 border-b border-marfim-border dark:border-[#322F26] flex flex-wrap items-center gap-2">
          <Badge className="bg-bronze/15 text-bronze border border-bronze/30 text-[11px] font-medium">
            <Repeat className="w-3 h-3 mr-1" />
            {summary.commonCount} {summary.commonCount === 1 ? 'em comum' : 'em comum'}
          </Badge>
          <Badge className="bg-marfim-card dark:bg-[#221F18] text-tinta-sec dark:text-[#B5AE9F] border border-marfim-border dark:border-[#322F26] text-[11px] font-medium">
            {summary.exclusiveACount}{' '}
            {summary.exclusiveACount === 1 ? 'exclusiva Semana 1' : 'exclusivas Semana 1'}
          </Badge>
          <Badge className="bg-marfim-card dark:bg-[#221F18] text-tinta-sec dark:text-[#B5AE9F] border border-marfim-border dark:border-[#322F26] text-[11px] font-medium">
            {summary.exclusiveBCount}{' '}
            {summary.exclusiveBCount === 1 ? 'exclusiva Semana 2' : 'exclusivas Semana 2'}
          </Badge>
          <div className="flex-1" />
          <Button
            onClick={handleExportPdf}
            disabled={!ready || exportingPdf}
            className="bg-bronze hover:bg-bronze/90 text-white rounded-xl h-8 px-3 text-xs font-semibold gap-1.5"
          >
            {exportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>Exportar PDF</span>
          </Button>
        </div>

        {/* Two columns */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid lg:grid-cols-2 gap-5">
            <ComparisonColumn
              title={options.find((o) => o.id === idA)?.label || 'Semana 1'}
              accent="bronze"
              data={dataA}
              loading={loadingA}
              error={errorA}
              commonIds={summary.common}
              showShopping={showShoppingA}
              onToggleShopping={() => setShowShoppingA((v) => !v)}
              shopping={shoppingA}
              onRecipeClick={handleRecipeClick}
            />
            <ComparisonColumn
              title={options.find((o) => o.id === idB)?.label || 'Semana 2'}
              accent="verde"
              data={dataB}
              loading={loadingB}
              error={errorB}
              commonIds={summary.common}
              showShopping={showShoppingB}
              onToggleShopping={() => setShowShoppingB((v) => !v)}
              shopping={shoppingB}
              onRecipeClick={handleRecipeClick}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Week selector
// ============================================================================

interface WeekSelectorProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: WeekOption[]
  loading: boolean
  error: boolean
  accent: 'bronze' | 'verde'
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
  label,
  value,
  onChange,
  options,
  loading,
  error,
  accent,
}) => {
  const accentDot = accent === 'bronze' ? 'bg-bronze' : 'bg-verde'
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${accentDot}`} />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B]">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="flex-1 h-9 rounded-lg bg-marfim/30 dark:bg-[#221F18]/60 border border-marfim-border dark:border-[#322F26] flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-tinta-ter dark:text-[#8F887B]" />
        </div>
      ) : error ? (
        <div className="flex-1 h-9 rounded-lg bg-erro/10 border border-erro/30 flex items-center px-3 gap-1.5 text-erro text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Falha ao carregar</span>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 h-9 rounded-lg bg-marfim/30 dark:bg-[#221F18]/60 border-marfim-border dark:border-[#322F26] text-tinta dark:text-[#EFE9DD] text-xs font-medium focus:ring-bronze/40">
            <SelectValue placeholder="Selecionar semana..." />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#1E1C16] border-marfim-border dark:border-[#322F26] max-h-[280px]">
            {options.map((o) => (
              <SelectItem
                key={o.id}
                value={o.id}
                className="text-tinta dark:text-[#EFE9DD] text-xs focus:bg-bronze/10"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-3 h-3 text-bronze shrink-0" />
                  <span>{o.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

// ============================================================================
// Comparison column
// ============================================================================

interface ComparisonColumnProps {
  title: string
  accent: 'bronze' | 'verde'
  data: HistoryPlanData | null
  loading: boolean
  error: boolean
  commonIds: Set<string>
  showShopping: boolean
  onToggleShopping: () => void
  shopping: ShoppingList | null
  onRecipeClick: (id: string) => void
}

const ComparisonColumn: React.FC<ComparisonColumnProps> = ({
  title,
  accent,
  data,
  loading,
  error,
  commonIds,
  showShopping,
  onToggleShopping,
  shopping,
  onRecipeClick,
}) => {
  const accentText = accent === 'bronze' ? 'text-bronze' : 'text-verde dark:text-[#A9C4B5]'
  const start = data ? parseISODate(data.week_start) : null
  const days = useMemo(() => {
    if (!start) return []
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [start])
  const planMap = useMemo(() => {
    const m: Record<string, HistoryPlanEntry> = {}
    if (data) for (const p of data.plans) m[slotKey(p.date, p.meal_type)] = p
    return m
  }, [data])
  const hasMeals = data ? data.plans.some((p) => p.recipe) : false

  return (
    <div className="bg-marfim/30 dark:bg-[#221F18]/40 rounded-2xl border border-marfim-border dark:border-[#322F26] p-3 flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <h3 className={`font-serif text-base font-bold ${accentText} flex items-center gap-1.5`}>
          <CalendarDays className="w-4 h-4" />
          <span className="truncate">{title}</span>
        </h3>
        <Button
          variant="outline"
          onClick={onToggleShopping}
          disabled={!shopping || shopping.totalItems === 0}
          className="border-marfim-border dark:border-[#322F26] bg-white dark:bg-[#1E1C16] text-tinta dark:text-[#EFE9DD] rounded-lg h-7 px-2.5 text-[10px] font-semibold gap-1 shrink-0"
        >
          <ShoppingBasket className="w-3 h-3" />
          <span>Compras</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-verde dark:text-[#A9C4B5] mb-2" />
          <p className="text-xs font-serif italic text-tinta-sec dark:text-[#B5AE9F]">
            Carregando semana...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-8 h-8 text-erro mb-2" />
          <p className="text-sm font-medium text-erro mb-1">Falha ao carregar</p>
          <p className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
            Não foi possível carregar os dados desta semana.
          </p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center py-16 text-xs text-tinta-ter dark:text-[#8F887B]">
          Selecione uma semana.
        </div>
      ) : !hasMeals ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-marfim-card dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26] flex items-center justify-center mb-3">
            <CalendarDays className="w-6 h-6 text-tinta-ter dark:text-[#8F887B]" />
          </div>
          <p className="text-sm font-medium text-tinta dark:text-[#EFE9DD]">
            Sem refeições planejadas
          </p>
          <p className="text-xs text-tinta-sec dark:text-[#B5AE9F] mt-0.5">
            Esta semana não possui cardápio.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP GRID (≥ lg) */}
          <div className="hidden lg:grid grid-cols-7 gap-1.5">
            {days.map((day, idx) => (
              <CompareDayColumn
                key={toISODate(day)}
                day={day}
                weekdayShort={WEEKDAYS_SHORT[idx]}
                weekdayFull={WEEKDAYS_FULL[idx]}
                planMap={planMap}
                notes={data.notes[toISODate(day)] || ''}
                commonIds={commonIds}
                onRecipeClick={onRecipeClick}
              />
            ))}
          </div>

          {/* MOBILE ACCORDION (< lg) */}
          <div className="lg:hidden">
            <Accordion type="single" defaultValue={toISODate(start!)} collapsible>
              {days.map((day, idx) => {
                const iso = toISODate(day)
                const dayMeals = MEAL_ORDER.filter((m) => planMap[slotKey(iso, m)]).length
                return (
                  <AccordionItem
                    key={iso}
                    value={iso}
                    className="bg-white dark:bg-[#1E1C16] rounded-2xl border border-marfim-border dark:border-[#322F26] mb-2 overflow-hidden"
                  >
                    <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 bg-marfim-card dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26]">
                          <span className="text-[8px] uppercase font-bold text-tinta-ter dark:text-[#8F887B] leading-none">
                            {WEEKDAYS_SHORT[idx]}
                          </span>
                          <span className="font-serif text-sm font-bold text-tinta dark:text-[#EFE9DD] leading-none mt-0.5">
                            {day.getDate()}
                          </span>
                        </div>
                        <div>
                          <div className="font-serif text-sm font-bold text-tinta dark:text-[#EFE9DD]">
                            {WEEKDAYS_FULL[idx]}
                          </div>
                          <div className="text-[11px] text-tinta-ter dark:text-[#8F887B]">
                            {dayMeals > 0
                              ? `${dayMeals} ${dayMeals === 1 ? 'refeição' : 'refeições'}`
                              : 'Sem refeições'}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <CompareDayBody
                        iso={iso}
                        planMap={planMap}
                        notes={data.notes[iso] || ''}
                        commonIds={commonIds}
                        onRecipeClick={onRecipeClick}
                      />
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>

          {/* Shopping list (per-column toggle) */}
          {showShopping && shopping && (
            <div className="mt-3 bg-marfim/50 dark:bg-[#221F18]/60 rounded-xl border border-marfim-border dark:border-[#322F26] p-3">
              <h4 className="font-serif text-sm font-bold text-tinta dark:text-[#EFE9DD] mb-2 flex items-center gap-1.5 border-b border-marfim-border dark:border-[#322F26] pb-1.5">
                <ShoppingBasket className="w-3.5 h-3.5 text-verde dark:text-[#A9C4B5]" />
                Lista de Compras
                <span className="text-[10px] font-sans font-normal text-tinta-ter dark:text-[#8F887B]">
                  {shopping.totalItems} {shopping.totalItems === 1 ? 'item' : 'itens'}
                </span>
              </h4>
              {shopping.totalItems === 0 ? (
                <p className="text-xs text-tinta-sec dark:text-[#B5AE9F] italic">
                  Nenhum ingrediente encontrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {shopping.groups.map((group) => (
                    <div key={group.category}>
                      <h5 className="font-serif text-xs font-bold text-tinta dark:text-[#EFE9DD] mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-bronze" />
                        {group.category}
                        <span className="text-[9px] font-sans font-normal text-tinta-ter dark:text-[#8F887B]">
                          ({group.items.length})
                        </span>
                      </h5>
                      <ul className="space-y-0.5">
                        {group.items.map((item) => {
                          const qtyStr = item.quantities.length ? item.quantities.join(' + ') : ''
                          return (
                            <li
                              key={item.name}
                              className="flex items-start justify-between gap-2 text-[11px] py-0.5"
                            >
                              <span className="flex items-start gap-1 text-tinta dark:text-[#EFE9DD]">
                                <span className="mt-1 w-2 h-2 rounded-sm border border-marfim-border dark:border-[#322F26] shrink-0" />
                                <span className="font-medium">{item.name}</span>
                                {item.count > 1 && (
                                  <span className="text-[9px] font-mono bg-marfim-card dark:bg-[#221F18] text-tinta-ter dark:text-[#8F887B] px-1 py-0 rounded-full border border-marfim-border dark:border-[#322F26]">
                                    ×{item.count}
                                  </span>
                                )}
                              </span>
                              <span className="text-tinta-sec dark:text-[#B5AE9F] font-mono text-[9px] whitespace-nowrap">
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
        </>
      )}
    </div>
  )
}

// ============================================================================
// Day column / body (read-only)
// ============================================================================

interface CompareDayColumnProps {
  day: Date
  weekdayShort: string
  weekdayFull: string
  planMap: Record<string, HistoryPlanEntry>
  notes: string
  commonIds: Set<string>
  onRecipeClick: (id: string) => void
}

const CompareDayColumn: React.FC<CompareDayColumnProps> = ({
  day,
  weekdayShort,
  weekdayFull,
  planMap,
  notes,
  commonIds,
  onRecipeClick,
}) => {
  const iso = toISODate(day)
  return (
    <div className="bg-white dark:bg-[#1E1C16] rounded-xl border border-marfim-border dark:border-[#322F26] flex flex-col overflow-hidden">
      <div className="px-1.5 py-2 border-b border-marfim-border dark:border-[#322F26] bg-marfim-card/60 dark:bg-[#221F18]/60 text-center">
        <div className="text-[8px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B]">
          {weekdayShort}
        </div>
        <div className="font-serif text-sm font-bold text-tinta dark:text-[#EFE9DD] leading-none">
          {day.getDate()}
        </div>
        <div className="text-[8px] text-tinta-ter dark:text-[#8F887B] mt-0.5 hidden xl:block">
          {weekdayFull}
        </div>
      </div>
      <div className="p-1 space-y-1.5 flex-1">
        <CompareDayBody
          iso={iso}
          planMap={planMap}
          notes={notes}
          commonIds={commonIds}
          onRecipeClick={onRecipeClick}
        />
      </div>
    </div>
  )
}

interface CompareDayBodyProps {
  iso: string
  planMap: Record<string, HistoryPlanEntry>
  notes: string
  commonIds: Set<string>
  onRecipeClick: (id: string) => void
}

const CompareDayBody: React.FC<CompareDayBodyProps> = ({
  iso,
  planMap,
  notes,
  commonIds,
  onRecipeClick,
}) => {
  return (
    <>
      {MEAL_ORDER.map((meal) => {
        const entry = planMap[slotKey(iso, meal)]
        const recipe = entry?.recipe
        const repeated = recipe ? commonIds.has(recipe.id) : false
        return (
          <div
            key={meal}
            className={`rounded-lg border bg-marfim/30 dark:bg-[#221F18]/60 min-h-[60px] ${
              repeated
                ? 'border-bronze/50 ring-1 ring-bronze/20'
                : 'border-marfim-border dark:border-[#322F26]'
            }`}
          >
            <div className="px-1.5 pt-1 text-[8px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B] flex items-center justify-between">
              <span>{MEAL_LABELS[meal]}</span>
              {repeated && (
                <span className="inline-flex items-center gap-0.5 text-bronze text-[8px] font-bold">
                  <Repeat className="w-2 h-2" />
                </span>
              )}
            </div>
            {recipe ? (
              <div className="m-1 mt-0.5">
                <button
                  onClick={() => onRecipeClick(recipe.id)}
                  className="flex items-center gap-1.5 p-1 rounded-md bg-white dark:bg-[#1E1C16] border border-marfim-border dark:border-[#322F26] hover:border-bronze/50 transition-colors w-full text-left"
                >
                  {recipe.cover ? (
                    <img
                      src={getRecipeCoverUrl(recipe) || ''}
                      alt={recipe.title}
                      className="w-7 h-7 rounded object-cover shrink-0 border border-marfim-border dark:border-[#322F26]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-verde-subtle border border-verde/20 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-3 h-3 text-verde dark:text-[#A9C4B5]" />
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-tinta dark:text-[#EFE9DD] leading-tight line-clamp-2 flex-1 hover:text-verde hover:underline">
                    {recipe.title}
                  </span>
                </button>
              </div>
            ) : (
              <div className="m-1 mt-0.5 px-1.5 py-1.5 text-[10px] italic text-tinta-ter dark:text-[#8F887B]">
                —
              </div>
            )}
          </div>
        )
      })}
      {notes && notes.trim() && (
        <div className="rounded-md border border-marfim-border dark:border-[#322F26] bg-marfim/20 dark:bg-[#221F18]/40 px-1.5 py-1">
          <div className="text-[8px] uppercase tracking-wider font-semibold text-tinta-ter dark:text-[#8F887B] mb-0.5">
            Anotações
          </div>
          <p className="text-[10px] leading-snug text-tinta-sec dark:text-[#B5AE9F] whitespace-pre-wrap line-clamp-3">
            {notes.trim()}
          </p>
        </div>
      )}
    </>
  )
}

export default WeekComparisonDialog
