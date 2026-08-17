import { jsPDF } from 'jspdf'
import type { Recipe } from '@/types'
import type { MealType } from '@/services/mealPlans'

interface PdfColors {
  tinta: [number, number, number]
  tintaSec: [number, number, number]
  tintaTer: [number, number, number]
  bronze: [number, number, number]
  verde: [number, number, number]
  marfim: [number, number, number]
  marfimCard: [number, number, number]
  border: [number, number, number]
}

const COLORS: PdfColors = {
  tinta: [28, 27, 23],
  tintaSec: [107, 103, 94],
  tintaTer: [154, 149, 138],
  bronze: [185, 138, 79],
  verde: [47, 75, 58],
  marfim: [251, 248, 243],
  marfimCard: [245, 241, 233],
  border: [231, 225, 214],
}

const SERIF = 'times'
const SANS = 'helvetica'

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

interface DayMealEntry {
  meal: MealType
  label: string
  recipe?: Recipe
}

interface DayEntry {
  date: string // YYYY-MM-DD
  weekday: string
  meals: DayMealEntry[]
  notes: string
}

export interface AggregatedIngredient {
  name: string
  quantities: string[]
  unit: string
  count: number
}

export interface ShoppingList {
  groups: { category: string; items: AggregatedIngredient[] }[]
  totalItems: number
  totalRecipes: number
}

export interface WeekPlanPdfInput {
  weekStart: Date
  days: DayEntry[]
  recipes: Recipe[]
  shoppingList: ShoppingList
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  const startDay = start.getDate()
  const endDay = end.getDate()
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${startDay} a ${endDay} de ${MONTHS_PT[start.getMonth()]} de ${start.getFullYear()}`
  }
  return `${startDay} de ${MONTHS_PT[start.getMonth()]} a ${endDay} de ${MONTHS_PT[end.getMonth()]} de ${end.getFullYear()}`
}

function recipeTotalMinutes(r: Recipe): number {
  return (r.prep_minutes || 0) + (r.cook_minutes || 0) || r.total_minutes || 0
}

/** Generates and downloads an A4 PDF of the weekly meal plan, including a
 *  shopping list aggregated by grocery category. Mirrors the visual style of
 *  `exportRecipePdf` (verde/bronze/marfim palette, serif titles). */
export function exportWeekPlanPdf(input: WeekPlanPdfInput): void {
  const { weekStart, days, shoppingList } = input
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentW = pageW - margin * 2
  let y = margin

  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])

  const genDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 24) {
      drawFooter()
      doc.addPage()
      y = margin
    }
  }

  const drawFooter = () => {
    const fy = pageH - 28
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.line(margin, fy - 8, pageW - margin, fy - 8)
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(7.5)
    doc.text('Biblioteca Culinária — Planejamento Semanal', margin, fy)
    doc.text(genDate, pageW - margin, fy, { align: 'right' })
  }

  const sectionTitle = (label: string) => {
    ensureSpace(40)
    setText(COLORS.verde)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(8)
    doc.text(label.toUpperCase(), margin, y)
    y += 13
    setDraw(COLORS.bronze)
    doc.setLineWidth(1.4)
    doc.line(margin, y - 6, margin + 28, y - 6)
    y += 10
  }

  // ── Header band ───────────────────────────────────────────────
  setFill(COLORS.tinta)
  doc.rect(0, 0, pageW, 70, 'F')
  setFill(COLORS.bronze)
  doc.rect(0, 70, pageW, 3, 'F')

  setText(COLORS.bronze)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(9)
  doc.text('BIBLIOTECA CULINÁRIA', margin, 32)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(8)
  setText(COLORS.marfimCard)
  doc.text('Planejamento Semanal', margin, 46)

  setText(COLORS.marfim)
  doc.setFont(SANS, 'italic')
  doc.setFontSize(8)
  doc.text(`Gerado em ${genDate}`, pageW - margin, 40, { align: 'right' })

  y = 110

  // ── Title (serif, large) ──────────────────────────────────────
  setText(COLORS.tinta)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(28)
  doc.text('Planejamento Semanal', margin, y)
  y += 26

  setText(COLORS.bronze)
  doc.setFont(SERIF, 'italic')
  doc.setFontSize(13)
  doc.text(formatWeekRange(weekStart), margin, y)
  y += 10

  // Divider
  setDraw(COLORS.border)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageW - margin, y)
  y += 16

  // ── Days ──────────────────────────────────────────────────────
  for (const day of days) {
    const d = parseISODate(day.date)
    const dateLabel = `${day.weekday}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`

    // Reserve space for at least the header + 3 meal rows.
    ensureSpace(90)

    // Day header bar.
    setFill(COLORS.marfimCard)
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, y, contentW, 26, 4, 4, 'FD')
    setFill(COLORS.bronze)
    doc.roundedRect(margin, y, 4, 26, 2, 2, 'F')
    setText(COLORS.tinta)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(13)
    doc.text(dateLabel, margin + 14, y + 17)
    y += 34

    // Meal rows.
    for (const meal of day.meals) {
      ensureSpace(26)
      // Meal label
      setText(COLORS.tintaTer)
      doc.setFont(SANS, 'bold')
      doc.setFontSize(7.5)
      doc.text(meal.label.toUpperCase(), margin + 6, y)
      // Recipe
      const recipeX = margin + 150
      const recipeW = contentW - 150 - 130
      if (meal.recipe) {
        setText(COLORS.tinta)
        doc.setFont(SERIF, 'bold')
        doc.setFontSize(11)
        const titleLines = doc.splitTextToSize(meal.recipe.title, recipeW)
        doc.text(titleLines[0], recipeX, y)
        // Meta (tempo · dificuldade)
        setText(COLORS.tintaSec)
        doc.setFont(SANS, 'normal')
        doc.setFontSize(8)
        const parts: string[] = []
        const total = recipeTotalMinutes(meal.recipe)
        if (total) parts.push(`${total} min`)
        if (meal.recipe.difficulty) parts.push(meal.recipe.difficulty)
        doc.text(parts.join('   ·   '), recipeX, y + 12)
      } else {
        setText(COLORS.tintaTer)
        doc.setFont(SANS, 'italic')
        doc.setFontSize(10)
        doc.text('—', recipeX, y)
      }
      y += 26
    }

    // Day notes (if any).
    if (day.notes && day.notes.trim()) {
      ensureSpace(30)
      setText(COLORS.tintaTer)
      doc.setFont(SANS, 'bold')
      doc.setFontSize(7.5)
      doc.text('ANOTAÇÕES', margin + 6, y)
      setText(COLORS.tintaSec)
      doc.setFont(SANS, 'italic')
      doc.setFontSize(9.5)
      const noteLines = doc.splitTextToSize(day.notes.trim(), contentW - 20)
      doc.text(noteLines, margin + 6, y + 12)
      y += 12 + noteLines.length * 12 + 6
    }

    y += 8
    setDraw(COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 12
  }

  // ── Shopping list ─────────────────────────────────────────────
  ensureSpace(60)
  doc.addPage()
  y = margin

  // Repeat a compact header on the shopping-list page.
  setFill(COLORS.tinta)
  doc.rect(0, 0, pageW, 50, 'F')
  setFill(COLORS.bronze)
  doc.rect(0, 50, pageW, 2, 'F')
  setText(COLORS.bronze)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(8)
  doc.text('BIBLIOTECA CULINÁRIA', margin, 22)
  setText(COLORS.marfim)
  doc.setFont(SERIF, 'italic')
  doc.setFontSize(10)
  doc.text('Lista de Compras', pageW - margin, 22, { align: 'right' })
  y = 78

  sectionTitle('Lista de Compras')

  if (shoppingList.totalItems === 0) {
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'italic')
    doc.setFontSize(9)
    doc.text('Nenhum ingrediente encontrado nas receitas planejadas.', margin, y)
    y += 16
  } else {
    setText(COLORS.tintaSec)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(9)
    doc.text(
      `${shoppingList.totalItems} ${shoppingList.totalItems === 1 ? 'ingrediente' : 'ingredientes'} de ${shoppingList.totalRecipes} ${shoppingList.totalRecipes === 1 ? 'receita' : 'receitas'} planejadas.`,
      margin,
      y,
    )
    y += 14

    for (const group of shoppingList.groups) {
      ensureSpace(50)
      // Group header
      setDraw(COLORS.bronze)
      doc.setLineWidth(0.8)
      doc.line(margin, y - 4, margin + 20, y - 4)
      setText(COLORS.verde)
      doc.setFont(SERIF, 'bold')
      doc.setFontSize(12)
      doc.text(group.category, margin, y + 6)
      setText(COLORS.tintaTer)
      doc.setFont(SANS, 'normal')
      doc.setFontSize(8)
      doc.text(`(${group.items.length})`, margin + doc.getTextWidth(group.category) + 8, y + 6)
      y += 18

      setDraw(COLORS.border)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageW - margin, y)
      y += 8

      for (const item of group.items) {
        ensureSpace(16)
        // Bullet
        setFill(COLORS.bronze)
        doc.circle(margin + 3, y - 3, 1.8, 'F')
        // Name
        setText(COLORS.tinta)
        doc.setFont(SANS, 'normal')
        doc.setFontSize(9.5)
        const nameLine = item.count > 1 ? `${item.name}  ×${item.count}` : item.name
        const qtyStr = item.quantities.length ? item.quantities.join(' + ') : ''
        const unitStr = item.unit ? ` ${item.unit}` : ''
        const qtyFull = qtyStr ? `${qtyStr}${unitStr}` : ''
        const nameW = contentW - 16 - (qtyFull ? doc.getTextWidth(qtyFull) + 10 : 0)
        const nameLines = doc.splitTextToSize(nameLine, nameW)
        doc.text(nameLines, margin + 12, y)
        // Quantity (right aligned)
        if (qtyFull) {
          setText(COLORS.tintaSec)
          doc.setFont(SANS, 'normal')
          doc.setFontSize(8.5)
          doc.text(qtyFull, pageW - margin, y, { align: 'right' })
        }
        y += Math.max(14, nameLines.length * 12)
      }
      y += 10
    }
  }

  drawFooter()

  const filename = `planejamento-semanal-${formatWeekRange(weekStart)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}.pdf`
  doc.save(filename)
}
