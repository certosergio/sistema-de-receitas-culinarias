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

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'receita'
  )
}

function fmtBRL(v?: number): string {
  if (v === undefined || v === null) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

/** Generates and downloads a formatted PDF ficha técnica for a recipe. */
export function exportRecipePdf(recipe: Recipe): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentW = pageW - margin * 2
  let y = margin

  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])

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
  const genDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  doc.text(`Gerado em ${genDate}`, pageW - margin, 40, { align: 'right' })

  y = 110

  // ── Recipe title (serif, large) ───────────────────────────────
  setText(COLORS.tinta)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(30)
  const titleLines = doc.splitTextToSize(recipe.title, contentW)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 32 + 6

  // Category & technique line
  doc.setFont(SANS, 'normal')
  doc.setFontSize(10)
  setText(COLORS.bronze)
  const metaParts: string[] = []
  if (recipe.expand?.category) metaParts.push(recipe.expand.category.name)
  if (recipe.expand?.technique) metaParts.push(recipe.expand.technique.name)
  if (recipe.difficulty) metaParts.push(`Dificuldade: ${recipe.difficulty}`)
  if (metaParts.length > 0) {
    doc.text(metaParts.join('   ·   '), margin, y)
    y += 14
  }
  if (recipe.summary) {
    setText(COLORS.tintaSec)
    doc.setFont(SANS, 'italic')
    doc.setFontSize(9.5)
    const sumLines = doc.splitTextToSize(recipe.summary, contentW)
    doc.text(sumLines, margin, y)
    y += sumLines.length * 12 + 8
  }

  // Divider
  setDraw(COLORS.border)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageW - margin, y)
  y += 18

  // ── Section helper ────────────────────────────────────────────
  const sectionTitle = (label: string) => {
    setText(COLORS.verde)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(8)
    doc.text(label.toUpperCase(), margin, y)
    y += 13
    setDraw(COLORS.bronze)
    doc.setLineWidth(1.4)
    doc.line(margin, y - 6, margin + 28, y - 6)
    y += 6
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 24) {
      // Footer
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
    doc.text('Biblioteca Culinária — Acervo & Fichas Técnicas', margin, fy)
    doc.text(genDate, pageW - margin, fy, { align: 'right' })
  }

  // ── Technical data grid ───────────────────────────────────────
  sectionTitle('Dados Técnicos')
  const totalTime =
    (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0) || recipe.total_minutes || 0

  const techRows: { label: string; value: string }[] = [
    {
      label: 'Rendimento',
      value: recipe.yield_quantity
        ? `${recipe.yield_quantity} ${recipe.yield_unit || ''}`.trim()
        : '—',
    },
    { label: 'Porção unitária', value: recipe.portions || '—' },
    {
      label: 'Tempo de preparo',
      value: recipe.prep_minutes !== undefined ? `${recipe.prep_minutes} min` : '—',
    },
    {
      label: 'Tempo total',
      value: `${totalTime} min`,
    },
    { label: 'Dificuldade', value: recipe.difficulty || '—' },
    { label: 'Custo estimado', value: recipe.cost ? fmtBRL(recipe.cost) : '—' },
  ]

  const cols = 3
  const cellW = contentW / cols
  const cellH = 44
  techRows.forEach((row, i) => {
    const col = i % cols
    const rowIdx = Math.floor(i / cols)
    const cx = margin + col * cellW
    const cy = y + rowIdx * cellH
    setFill(COLORS.marfimCard)
    doc.setLineWidth(0.5)
    setDraw(COLORS.border)
    doc.roundedRect(cx + 3, cy, cellW - 6, cellH - 8, 5, 5, 'FD')
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(7)
    doc.text(row.label.toUpperCase(), cx + 12, cy + 14)
    setText(COLORS.tinta)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(13)
    doc.text(row.value, cx + 12, cy + 32)
  })
  y += Math.ceil(techRows.length / cols) * cellH + 12

  // ── Nutritional table ─────────────────────────────────────────
  ensureSpace(80)
  sectionTitle('Valor Nutricional por Porção')
  const nutri: { label: string; value: string; pct: number }[] = [
    {
      label: 'Calorias',
      value: `${recipe.calories || 0} kcal`,
      pct: Math.min(100, ((recipe.calories || 0) / 800) * 100),
    },
    {
      label: 'Proteínas',
      value: `${recipe.protein || 0} g`,
      pct: Math.min(100, ((recipe.protein || 0) / 60) * 100),
    },
    {
      label: 'Carboidratos',
      value: `${recipe.carbs || 0} g`,
      pct: Math.min(100, ((recipe.carbs || 0) / 100) * 100),
    },
    {
      label: 'Gorduras',
      value: `${recipe.fat || 0} g`,
      pct: Math.min(100, ((recipe.fat || 0) / 50) * 100),
    },
    { label: 'Fibras', value: `${(recipe as Recipe & { fiber?: number }).fiber ?? 0} g`, pct: 0 },
  ]

  const nCols = 5
  const nCellW = contentW / nCols
  nutri.forEach((n, i) => {
    const cx = margin + i * nCellW
    setFill(COLORS.marfim)
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.roundedRect(cx + 2, y, nCellW - 4, 56, 4, 4, 'FD')
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(7)
    doc.text(n.label.toUpperCase(), cx + nCellW / 2, y + 14, { align: 'center' })
    setText(COLORS.tinta)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(12)
    doc.text(n.value, cx + nCellW / 2, y + 32, { align: 'center' })
    // bar
    const barW = nCellW - 20
    const barX = cx + 10
    const barY = y + 42
    setFill(COLORS.border)
    doc.roundedRect(barX, barY, barW, 5, 2.5, 2.5, 'F')
    if (n.pct > 0) {
      setFill(COLORS.bronze)
      doc.roundedRect(barX, barY, (barW * n.pct) / 100, 5, 2.5, 2.5, 'F')
    }
  })
  y += 68

  // ── Ingredients ───────────────────────────────────────────────
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  ensureSpace(50)
  sectionTitle('Ingredientes')
  if (ingredients.length === 0) {
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'italic')
    doc.setFontSize(9)
    doc.text('Nenhum ingrediente informado.', margin, y)
    y += 16
  } else {
    doc.setFont(SANS, 'normal')
    doc.setFontSize(9.5)
    ingredients.forEach((ing) => {
      ensureSpace(20)
      // bullet
      setFill(COLORS.bronze)
      doc.circle(margin + 3, y - 3, 2, 'F')
      setText(COLORS.tinta)
      const qty = ing.quantity || ing.unit ? `${ing.quantity || ''} ${ing.unit || ''}`.trim() : ''
      const line = qty ? `${qty}  —  ${ing.name}` : ing.name
      const lines = doc.splitTextToSize(line, contentW - 16)
      doc.text(lines, margin + 12, y)
      y += lines.length * 13 + 3
    })
  }
  y += 8

  // ── Method ────────────────────────────────────────────────────
  const method = Array.isArray(recipe.method) ? recipe.method : []
  ensureSpace(50)
  sectionTitle('Modo de Preparo')
  if (method.length === 0) {
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'italic')
    doc.setFontSize(9)
    doc.text('Nenhum passo informado.', margin, y)
    y += 16
  } else {
    doc.setFont(SANS, 'normal')
    doc.setFontSize(9.5)
    method.forEach((step, idx) => {
      const numText = `${idx + 1}.`
      const lines = doc.splitTextToSize(step, contentW - 28)
      ensureSpace(lines.length * 13 + 10)
      // number badge
      setFill(COLORS.verde)
      doc.roundedRect(margin, y - 10, 18, 18, 4, 4, 'F')
      setText(COLORS.marfim)
      doc.setFont(SANS, 'bold')
      doc.setFontSize(9)
      doc.text(`${idx + 1}`, margin + 9, y + 2, { align: 'center' })
      setText(COLORS.tinta)
      doc.setFont(SANS, 'normal')
      doc.setFontSize(9.5)
      doc.text(lines, margin + 26, y)
      y += lines.length * 13 + 8
    })
  }
  y += 6

  // ── Chef tips ─────────────────────────────────────────────────
  if (recipe.tips) {
    const tipLines = doc.splitTextToSize(recipe.tips, contentW - 24)
    ensureSpace(tipLines.length * 12 + 40)
    setFill(COLORS.marfimCard)
    setDraw(COLORS.bronze)
    doc.setLineWidth(1)
    const boxH = tipLines.length * 12 + 30
    doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'FD')
    setFill(COLORS.bronze)
    doc.roundedRect(margin, y, 4, boxH, 2, 2, 'F')
    setText(COLORS.bronze)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(8)
    doc.text('DICAS DO CHEF', margin + 16, y + 16)
    setText(COLORS.tinta)
    doc.setFont(SERIF, 'italic')
    doc.setFontSize(10)
    doc.text(tipLines, margin + 16, y + 32)
    y += boxH + 12
  }

  drawFooter()

  const filename = `${slugify(recipe.title)}-ficha-tecnica.pdf`
  doc.save(filename)
}
