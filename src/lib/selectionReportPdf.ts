import { jsPDF } from 'jspdf'
import { Recipe } from '@/types'

interface PdfColors {
  tinta: [number, number, number]
  tintaSec: [number, number, number]
  tintaTer: [number, number, number]
  bronze: [number, number, number]
  verde: [number, number, number]
  marfim: [number, number, number]
  marfimCard: [number, number, number]
  border: [number, number, number]
  white: [number, number, number]
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
  white: [255, 255, 255],
}

const SERIF = 'times'
const SANS = 'helvetica'

function fmtBRL(v?: number): string {
  if (v === undefined || v === null || isNaN(v)) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

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

/** Generates and downloads a formatted PDF report of the selected recipes. */
export function exportSelectionReportPdf(recipes: Recipe[]): void {
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
  doc.text('Acervo & Fichas Técnicas', margin, 46)

  setText(COLORS.marfim)
  doc.setFont(SANS, 'italic')
  doc.setFontSize(8)
  doc.text(`Gerado em ${genDate}`, pageW - margin, 40, { align: 'right' })

  y = 110

  // ── Title ─────────────────────────────────────────────────────
  setText(COLORS.tinta)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(28)
  doc.text('Receitas Selecionadas', margin, y)
  y += 22

  setText(COLORS.tintaSec)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(10)
  doc.text(`Data: ${genDate}`, margin, y)
  y += 22

  // Divider
  setDraw(COLORS.border)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageW - margin, y)
  y += 18

  // ── Table ─────────────────────────────────────────────────────
  const cols = [
    { label: 'ID', x: margin, w: 64 },
    { label: 'Categoria', x: margin + 64, w: 104 },
    { label: 'Receita', x: margin + 64 + 104, w: 0 }, // flexible
    { label: 'Rendimento', x: 0, w: 92 }, // placed after
    { label: 'Custo', x: 0, w: 80 }, // placed after
  ]
  // Compute fixed widths: ID 64, Categoria 104, Rendimento 92, Custo 80
  // Receita takes the remainder.
  const idW = 64
  const catW = 104
  const yieldW = 92
  const costW = 80
  const nameW = contentW - idW - catW - yieldW - costW
  const colX = {
    id: margin,
    cat: margin + idW,
    name: margin + idW + catW,
    yield: margin + idW + catW + nameW,
    cost: margin + idW + catW + nameW + yieldW,
  }

  const drawFooter = () => {
    const fy = pageH - 28
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.line(margin, fy - 8, pageW - margin, fy - 8)
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(7.5)
    doc.text('Biblioteca Culinária — Receitas Selecionadas', margin, fy)
    doc.text(genDate, pageW - margin, fy, { align: 'right' })
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 24) {
      drawFooter()
      doc.addPage()
      y = margin
    }
  }

  // Header row
  setFill(COLORS.verde)
  doc.rect(margin, y - 12, contentW, 22, 'F')
  setText(COLORS.white)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(8.5)
  doc.text('ID', colX.id + 6, y + 3)
  doc.text('CATEGORIA', colX.cat + 6, y + 3)
  doc.text('RECEITA', colX.name + 6, y + 3)
  doc.text('RENDIMENTO', colX.yield + 6, y + 3)
  doc.text('CUSTO', colX.cost + 6, y + 3)
  y += 18

  // Rows
  doc.setFont(SANS, 'normal')
  doc.setFontSize(9)
  let totalCost = 0
  recipes.forEach((r, idx) => {
    const cost = recipeCost(r)
    totalCost += cost

    const nameLines = doc.splitTextToSize(r.title, nameW - 12)
    const rowH = Math.max(22, nameLines.length * 12 + 8)

    ensureSpace(rowH)

    // Zebra striping
    if (idx % 2 === 1) {
      setFill(COLORS.marfimCard)
      doc.rect(margin, y - 4, contentW, rowH, 'F')
    }

    // Cell text
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(8)
    doc.text(shortId(r.id), colX.id + 6, y + 6)

    setText(COLORS.tintaSec)
    doc.setFontSize(8.5)
    const catName = r.expand?.category?.name || '—'
    const catLines = doc.splitTextToSize(catName, catW - 12)
    doc.text(catLines, colX.cat + 6, y + 6)

    setText(COLORS.tinta)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(10)
    doc.text(nameLines, colX.name + 6, y + 6)

    setText(COLORS.tintaSec)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(8.5)
    doc.text(yieldLabel(r), colX.yield + 6, y + 6)

    setText(cost > 0 ? COLORS.verde : COLORS.tintaTer)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(9)
    doc.text(fmtBRL(cost > 0 ? cost : undefined), colX.cost + 6, y + 6)

    y += rowH

    // Row separator
    setDraw(COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(margin, y - 4, pageW - margin, y - 4)
  })

  // Outer border
  setDraw(COLORS.border)
  doc.setLineWidth(0.6)
  doc.rect(margin, margin + 76, contentW, y - (margin + 76) - 4)

  y += 14

  // ── Footer summary ────────────────────────────────────────────
  ensureSpace(60)
  setFill(COLORS.marfimCard)
  setDraw(COLORS.bronze)
  doc.setLineWidth(1)
  const boxH = 50
  doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'FD')
  setFill(COLORS.bronze)
  doc.roundedRect(margin, y, 4, boxH, 2, 2, 'F')

  setText(COLORS.tintaTer)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(8)
  doc.text('RESUMO', margin + 16, y + 16)

  setText(COLORS.tinta)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(13)
  doc.text(`Total de receitas: ${recipes.length}`, margin + 16, y + 34)

  setText(COLORS.verde)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(13)
  doc.text(`Custo total: ${fmtBRL(totalCost)}`, pageW - margin - 16, y + 34, { align: 'right' })

  drawFooter()

  doc.save('receitas-selecionadas.pdf')
}
