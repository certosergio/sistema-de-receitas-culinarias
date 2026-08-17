import { jsPDF } from 'jspdf'
import type { Recipe } from '@/types'
import { buildShoppingList, type ShoppingList } from '@/lib/shoppingList'
import type { HistoryPlanData } from '@/services/planningHistory'
import { MEAL_LABELS, MEAL_ORDER, slotKey } from '@/services/mealPlans'

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

const WEEKDAYS_FULL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
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

export interface WeekComparePdfInput {
  labelA: string
  dataA: HistoryPlanData
  labelB: string
  dataB: HistoryPlanData
  summary: { common: number; exclusiveA: number; exclusiveB: number }
}

function recipesOf(data: HistoryPlanData): Recipe[] {
  const m = new Map<string, Recipe>()
  for (const p of data.plans) if (p.recipe) m.set(p.recipe.id, p.recipe)
  return Array.from(m.values())
}

/** Generates and downloads an A4 landscape PDF comparing two weeks side by
 *  side, including the comparative summary and each week's shopping list. */
export function exportWeekComparePdf(input: WeekComparePdfInput): void {
  const { labelA, dataA, labelB, dataB, summary } = input
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 40
  const gap = 28
  const colW = (pageW - margin * 2 - gap) / 2
  let y = margin

  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])

  const genDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const ensureSpace = (needed: number, colX: number, colWidth: number) => {
    if (y + needed > pageH - margin - 20) {
      drawFooter()
      doc.addPage()
      y = margin
      // Redraw column headers on the new page for continuity.
      drawColumnHeader(labelA, colX, colWidth)
      drawColumnHeader(labelB, colX + colW + gap, colWidth)
      y += 26
    }
  }

  const drawFooter = () => {
    const fy = pageH - 22
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.line(margin, fy - 6, pageW - margin, fy - 6)
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(7.5)
    doc.text('Biblioteca Culinária — Comparação de Semanas', margin, fy)
    doc.text(genDate, pageW - margin, fy, { align: 'right' })
  }

  const drawColumnHeader = (label: string, x: number, w: number) => {
    setFill(COLORS.marfimCard)
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, y, w, 22, 4, 4, 'FD')
    setFill(COLORS.bronze)
    doc.roundedRect(x, y, 4, 22, 2, 2, 'F')
    setText(COLORS.tinta)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(12)
    doc.text(label, x + 14, y + 15)
  }

  // ── Header band ───────────────────────────────────────────────
  setFill(COLORS.tinta)
  doc.rect(0, 0, pageW, 58, 'F')
  setFill(COLORS.bronze)
  doc.rect(0, 58, pageW, 2.5, 'F')

  setText(COLORS.bronze)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(9)
  doc.text('BIBLIOTECA CULINÁRIA', margin, 28)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(8)
  setText(COLORS.marfimCard)
  doc.text('Comparação entre Semanas', margin, 42)

  setText(COLORS.marfim)
  doc.setFont(SANS, 'italic')
  doc.setFontSize(8)
  doc.text(`Gerado em ${genDate}`, pageW - margin, 36, { align: 'right' })

  y = 82

  // ── Title ─────────────────────────────────────────────────────
  setText(COLORS.tinta)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(22)
  doc.text('Comparação de Semanas', margin, y)
  y += 18

  // ── Summary ───────────────────────────────────────────────────
  setText(COLORS.tintaSec)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(9.5)
  const summaryText = `${summary.common} ${summary.common === 1 ? 'receita em comum' : 'receitas em comum'}   ·   ${summary.exclusiveA} ${summary.exclusiveA === 1 ? 'exclusiva da Semana 1' : 'exclusivas da Semana 1'}   ·   ${summary.exclusiveB} ${summary.exclusiveB === 1 ? 'exclusiva da Semana 2' : 'exclusivas da Semana 2'}`
  doc.text(summaryText, margin, y)
  y += 10

  setDraw(COLORS.border)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageW - margin, y)
  y += 16

  // ── Two columns ───────────────────────────────────────────────
  const colXA = margin
  const colXB = margin + colW + gap

  drawColumnHeader(labelA, colXA, colW)
  drawColumnHeader(labelB, colXB, colW)
  y += 30

  const startA = parseISODate(dataA.week_start)
  const startB = parseISODate(dataB.week_start)
  const shoppingA = buildShoppingList(recipesOf(dataA))
  const shoppingB = buildShoppingList(recipesOf(dataB))

  const drawWeekColumn = (
    data: HistoryPlanData,
    start: Date,
    x: number,
    w: number,
    shopping: ShoppingList,
  ) => {
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
      const dateLabel = `${WEEKDAYS_FULL[i]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`

      // Day header
      ensureSpace(24, x, w)
      setText(COLORS.verde)
      doc.setFont(SERIF, 'bold')
      doc.setFontSize(9.5)
      doc.text(dateLabel, x, y)
      y += 12

      // Meals
      for (const meal of MEAL_ORDER) {
        ensureSpace(13, x, w)
        const entry = data.plans.find((p) => p.date === iso && p.meal_type === meal)
        const recipe = entry?.recipe
        setText(COLORS.tintaTer)
        doc.setFont(SANS, 'bold')
        doc.setFontSize(7)
        doc.text(MEAL_LABELS[meal].toUpperCase(), x + 2, y)
        setText(COLORS.tinta)
        doc.setFont(SERIF, 'normal')
        doc.setFontSize(9)
        const titleW = w - 90
        const title = recipe ? recipe.title : '—'
        const lines = doc.splitTextToSize(title, titleW)
        doc.text(lines[0], x + 82, y)
        y += 12
      }

      // Notes
      const note = data.notes[iso]
      if (note && note.trim()) {
        ensureSpace(16, x, w)
        setText(COLORS.tintaTer)
        doc.setFont(SANS, 'italic')
        doc.setFontSize(7.5)
        const noteLines = doc.splitTextToSize(`“${note.trim()}”`, w - 4)
        doc.text(noteLines[0], x + 2, y)
        y += 12
      }

      setDraw(COLORS.border)
      doc.setLineWidth(0.3)
      doc.line(x, y, x + w, y)
      y += 8
    }

    // Shopping list
    ensureSpace(24, x, w)
    setText(COLORS.verde)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(10)
    doc.text('Lista de Compras', x, y)
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(7.5)
    doc.text(
      `${shopping.totalItems} ${shopping.totalItems === 1 ? 'item' : 'itens'}`,
      x + doc.getTextWidth('Lista de Compras') + 8,
      y,
    )
    y += 12

    if (shopping.totalItems === 0) {
      setText(COLORS.tintaTer)
      doc.setFont(SANS, 'italic')
      doc.setFontSize(8)
      doc.text('Nenhum ingrediente encontrado.', x, y)
      y += 12
    } else {
      for (const group of shopping.groups) {
        ensureSpace(14, x, w)
        setText(COLORS.bronze)
        doc.setFont(SERIF, 'bold')
        doc.setFontSize(8.5)
        doc.text(group.category, x, y)
        y += 10
        for (const item of group.items) {
          ensureSpace(11, x, w)
          setText(COLORS.tinta)
          doc.setFont(SANS, 'normal')
          doc.setFontSize(8)
          const qtyStr = item.quantities.length ? item.quantities.join(' + ') : ''
          const qtyFull = qtyStr ? `${qtyStr}${item.unit ? ` ${item.unit}` : ''}` : ''
          const nameLine = item.count > 1 ? `${item.name} ×${item.count}` : item.name
          const nameW = w - 8 - (qtyFull ? doc.getTextWidth(qtyFull) + 8 : 0)
          const nameLines = doc.splitTextToSize(nameLine, nameW)
          doc.text(nameLines[0], x + 6, y)
          if (qtyFull) {
            setText(COLORS.tintaSec)
            doc.setFont(SANS, 'normal')
            doc.setFontSize(7.5)
            doc.text(qtyFull, x + w, y, { align: 'right' })
          }
          y += Math.max(10, nameLines.length * 10)
        }
        y += 4
      }
    }
  }

  // Draw column A fully, then reset y and draw column B beside it.
  const yAfterA = y
  drawWeekColumn(dataA, startA, colXA, colW, shoppingA)
  const yEndA = y

  y = yAfterA
  drawWeekColumn(dataB, startB, colXB, colW, shoppingB)
  const yEndB = y

  y = Math.max(yEndA, yEndB)
  drawFooter()

  const filename = `comparacao-semanas-${Date.now()}.pdf`
  doc.save(filename)
}
