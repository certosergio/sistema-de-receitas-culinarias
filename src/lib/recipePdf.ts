import { jsPDF } from 'jspdf'
import { Recipe, RecipeIngredient } from '@/types'

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
      .replace(/(^-|-$)/g, '') || 'ficha-tecnica'
  )
}

function fmtBRL(v?: number): string {
  if (v === undefined || v === null || isNaN(v)) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

/**
 * Gera e realiza o download do PDF completo e elegante da Ficha Técnica Culinária.
 * Inclui:
 * - Cabeçalho editorial "Biblioteca Culinária"
 * - Título e metadados (categoria, técnica, dificuldade, rendimento, porção, tempos)
 * - Tabela técnica detalhada de insumos vinculados (código, ingrediente, quantidade, observação, custo unitário e subtotal)
 * - Consolidação de custos (custo total e custo por porção) — omitido graciosamente se sem custos
 * - Modo de preparo numerado passo a passo
 * - Dicas do chef (se houver)
 * - Rodapé com numeração e data de geração
 */
export function exportRecipePdf(recipe: Recipe, linkedIngredients: RecipeIngredient[] = []): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 44
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

  const drawFooter = () => {
    const fy = pageH - 26
    setDraw(COLORS.border)
    doc.setLineWidth(0.5)
    doc.line(margin, fy - 8, pageW - margin, fy - 8)
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'normal')
    doc.setFontSize(7.5)
    doc.text('Biblioteca Culinária — Acervo & Fichas Técnicas', margin, fy)
    doc.text(`Gerado em ${genDate}`, pageW - margin, fy, { align: 'right' })
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 20) {
      drawFooter()
      doc.addPage()
      y = margin + 10
    }
  }

  // ── 1. CABEÇALHO EDITORIAL ────────────────────────────────────
  setFill(COLORS.tinta)
  doc.rect(0, 0, pageW, 68, 'F')
  setFill(COLORS.bronze)
  doc.rect(0, 68, pageW, 3, 'F')

  setText(COLORS.bronze)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(9)
  doc.text('BIBLIOTECA CULINÁRIA', margin, 30)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(8)
  setText(COLORS.marfimCard)
  doc.text('Ficha Técnica de Produção & Custos', margin, 44)

  setText(COLORS.marfim)
  doc.setFont(SANS, 'italic')
  doc.setFontSize(8)
  doc.text(genDate, pageW - margin, 38, { align: 'right' })

  y = 96

  // ── 2. TÍTULO DA RECEITA ─────────────────────────────────────
  setText(COLORS.tinta)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(26)
  const titleLines = doc.splitTextToSize(recipe.title, contentW)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 28 + 4

  // Linha de taxonomia (categoria, técnica, dificuldade)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(9.5)
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
    doc.setFontSize(9)
    const sumLines = doc.splitTextToSize(recipe.summary, contentW)
    doc.text(sumLines, margin, y)
    y += sumLines.length * 12 + 6
  }

  // Divisória sutil
  setDraw(COLORS.border)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageW - margin, y)
  y += 14

  // Helper de títulos de seção
  const sectionTitle = (label: string) => {
    setText(COLORS.verde)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(8)
    doc.text(label.toUpperCase(), margin, y)
    y += 11
    setDraw(COLORS.bronze)
    doc.setLineWidth(1.4)
    doc.line(margin, y - 5, margin + 26, y - 5)
    y += 5
  }

  // ── 3. CÁLCULO E CONSOLIDAÇÃO DE CUSTOS ───────────────────────
  const hasLinked = Array.isArray(linkedIngredients) && linkedIngredients.length > 0

  let totalCost = 0
  if (hasLinked) {
    totalCost = linkedIngredients.reduce((sum, item) => {
      const ing = item.expand?.ingredient_id
      const q = item.quantidade || 0
      const c = ing?.custo_unitario || 0
      return sum + q * c
    }, 0)
  } else if (typeof recipe.cost === 'number' && recipe.cost > 0) {
    totalCost = recipe.cost
  }

  let costPerPortion: number | null = null
  if (totalCost > 0) {
    if (recipe.yield_quantity && recipe.yield_quantity > 0) {
      costPerPortion = totalCost / recipe.yield_quantity
    } else if (recipe.portions) {
      const m = recipe.portions.match(/^(\d+(?:[.,]\d+)?)/)
      if (m) {
        const parsed = parseFloat(m[1].replace(',', '.'))
        if (parsed > 0) costPerPortion = totalCost / parsed
      }
    }
  }

  // ── 4. GRADE DE DADOS TÉCNICOS ───────────────────────────────
  sectionTitle('Parâmetros da Ficha Técnica')
  const totalTime =
    (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0) || recipe.total_minutes || 0

  const techRows: { label: string; value: string }[] = [
    {
      label: 'Rendimento',
      value: recipe.yield_quantity
        ? `${recipe.yield_quantity} ${recipe.yield_unit || ''}`.trim()
        : '—',
    },
    { label: 'Porção Unitária', value: recipe.portions || '—' },
    {
      label: 'Tempo de Preparo',
      value: recipe.prep_minutes !== undefined ? `${recipe.prep_minutes} min` : '—',
    },
    { label: 'Tempo Total', value: `${totalTime} min` },
    { label: 'Dificuldade', value: recipe.difficulty || 'Média' },
    {
      label: 'Custo Total',
      value: totalCost > 0 ? fmtBRL(totalCost) : 'Não calculado',
    },
  ]

  const cols = 3
  const cellW = contentW / cols
  const cellH = 38
  techRows.forEach((row, i) => {
    const col = i % cols
    const rowIdx = Math.floor(i / cols)
    const cx = margin + col * cellW
    const cy = y + rowIdx * cellH
    setFill(COLORS.marfimCard)
    doc.setLineWidth(0.5)
    setDraw(COLORS.border)
    doc.roundedRect(cx + 2, cy, cellW - 4, cellH - 6, 4, 4, 'FD')

    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(6.5)
    doc.text(row.label.toUpperCase(), cx + 8, cy + 12)

    setText(COLORS.tinta)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(11)
    doc.text(row.value, cx + 8, cy + 26)
  })
  y += Math.ceil(techRows.length / cols) * cellH + 10

  // ── 5. SEÇÃO DE INSUMOS & CUSTO UNITÁRIO ──────────────────────
  ensureSpace(60)
  sectionTitle(hasLinked ? 'Matérias-Primas e Custos de Insumos' : 'Ingredientes')

  if (hasLinked) {
    // Tabela detalhada de insumos vinculados
    const colW = {
      codigo: 54,
      nome: contentW - 54 - 74 - 76 - 82,
      qtd: 74,
      custoUnit: 76,
      subtotal: 82,
    }

    // Cabeçalho da tabela
    setFill(COLORS.tinta)
    doc.roundedRect(margin, y, contentW, 20, 3, 3, 'F')
    setText(COLORS.marfimCard)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(7.5)

    let hx = margin + 8
    doc.text('CÓDIGO', hx, y + 13)
    hx += colW.codigo
    doc.text('INSUMO / DESCRIÇÃO', hx, y + 13)
    hx += colW.nome
    doc.text('QUANTIDADE', hx + colW.qtd - 12, y + 13, { align: 'right' })
    hx += colW.qtd
    doc.text('CUSTO UNIT.', hx + colW.custoUnit - 12, y + 13, { align: 'right' })
    hx += colW.custoUnit
    doc.text('SUBTOTAL', hx + colW.subtotal - 12, y + 13, { align: 'right' })

    y += 22

    linkedIngredients.forEach((item, idx) => {
      ensureSpace(24)
      const ing = item.expand?.ingredient_id
      const codigo = ing?.codigo || '—'
      const nome = ing?.nome || 'Ingrediente'
      const unidade = ing?.unidade || ''
      const custoUnit = ing?.custo_unitario || 0
      const qtd = item.quantidade || 0
      const subtotal = qtd * custoUnit
      const obs = item.observacao ? ` (${item.observacao})` : ''

      // Zebra striping
      if (idx % 2 === 0) {
        setFill(COLORS.marfimCard)
        doc.rect(margin, y - 4, contentW, 20, 'F')
      }

      setDraw(COLORS.border)
      doc.setLineWidth(0.4)
      doc.line(margin, y + 16, margin + contentW, y + 16)

      let rx = margin + 8
      setText(COLORS.tintaTer)
      doc.setFont(SANS, 'bold')
      doc.setFontSize(7)
      doc.text(codigo, rx, y + 9)

      rx += colW.codigo
      setText(COLORS.tinta)
      doc.setFont(SERIF, 'normal')
      doc.setFontSize(9)
      const displayName = doc.splitTextToSize(`${nome}${obs}`, colW.nome - 8)
      doc.text(displayName[0], rx, y + 9)

      rx += colW.nome
      setText(COLORS.tinta)
      doc.setFont(SANS, 'normal')
      doc.setFontSize(8)
      doc.text(`${qtd} ${unidade}`.trim(), rx + colW.qtd - 12, y + 9, { align: 'right' })

      rx += colW.qtd
      setText(COLORS.tintaSec)
      doc.setFont(SANS, 'normal')
      doc.setFontSize(8)
      doc.text(fmtBRL(custoUnit), rx + colW.custoUnit - 12, y + 9, { align: 'right' })

      rx += colW.custoUnit
      setText(COLORS.verde)
      doc.setFont(SANS, 'bold')
      doc.setFontSize(8.5)
      doc.text(fmtBRL(subtotal), rx + colW.subtotal - 12, y + 9, { align: 'right' })

      y += 20
    })

    // Linha de total de custos
    y += 4
    ensureSpace(32)
    setFill(COLORS.marfimCard)
    setDraw(COLORS.bronze)
    doc.setLineWidth(0.8)
    doc.roundedRect(margin, y, contentW, 26, 4, 4, 'FD')

    setText(COLORS.tinta)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(8)
    doc.text('CUSTO TOTAL DA RECEITA', margin + 12, y + 16)

    if (costPerPortion !== null && costPerPortion > 0) {
      setText(COLORS.tintaSec)
      doc.setFont(SANS, 'normal')
      doc.setFontSize(7.5)
      doc.text(`(Custo por porção: ${fmtBRL(costPerPortion)})`, margin + 170, y + 16)
    }

    setText(COLORS.verde)
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(12)
    doc.text(fmtBRL(totalCost), pageW - margin - 12, y + 17, { align: 'right' })

    y += 36
  } else {
    // Lista de ingredientes legados em texto livre ou simples
    const rawIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
    if (rawIngredients.length === 0) {
      setText(COLORS.tintaTer)
      doc.setFont(SANS, 'italic')
      doc.setFontSize(9)
      doc.text('Nenhum ingrediente informado na ficha.', margin, y)
      y += 16
    } else {
      doc.setFont(SANS, 'normal')
      doc.setFontSize(9)
      rawIngredients.forEach((ing) => {
        ensureSpace(18)
        setFill(COLORS.bronze)
        doc.circle(margin + 4, y - 3, 2, 'F')
        setText(COLORS.tinta)
        const qty = ing.quantity || ing.unit ? `${ing.quantity || ''} ${ing.unit || ''}`.trim() : ''
        const line = qty ? `${qty}  —  ${ing.name}` : ing.name
        const lines = doc.splitTextToSize(line, contentW - 16)
        doc.text(lines, margin + 14, y)
        y += lines.length * 13 + 3
      })
      if (totalCost > 0) {
        y += 6
        setText(COLORS.tinta)
        doc.setFont(SANS, 'bold')
        doc.setFontSize(8.5)
        doc.text(`Custo total estimado: ${fmtBRL(totalCost)}`, margin, y)
        y += 16
      }
    }
    y += 10
  }

  // ── 6. MODO DE PREPARO ───────────────────────────────────────
  const method = Array.isArray(recipe.method) ? recipe.method : []
  ensureSpace(50)
  sectionTitle('Modo de Preparo')

  if (method.length === 0) {
    setText(COLORS.tintaTer)
    doc.setFont(SANS, 'italic')
    doc.setFontSize(9)
    doc.text('Nenhum passo de preparo informado.', margin, y)
    y += 16
  } else {
    method.forEach((step, idx) => {
      const lines = doc.splitTextToSize(step, contentW - 28)
      ensureSpace(lines.length * 12 + 12)

      // Emblema numérico
      setFill(COLORS.verde)
      doc.roundedRect(margin, y - 9, 16, 16, 3, 3, 'F')
      setText(COLORS.marfim)
      doc.setFont(SANS, 'bold')
      doc.setFontSize(8.5)
      doc.text(`${idx + 1}`, margin + 8, y + 2, { align: 'center' })

      // Texto do passo
      setText(COLORS.tinta)
      doc.setFont(SANS, 'normal')
      doc.setFontSize(9)
      doc.text(lines, margin + 24, y)
      y += lines.length * 12 + 7
    })
  }
  y += 8

  // ── 7. DICAS DO CHEF (SE HOUVER) ─────────────────────────────
  if (recipe.tips) {
    const tipLines = doc.splitTextToSize(recipe.tips, contentW - 24)
    ensureSpace(tipLines.length * 11 + 36)

    setFill(COLORS.marfimCard)
    setDraw(COLORS.bronze)
    doc.setLineWidth(0.8)
    const boxH = tipLines.length * 11 + 26
    doc.roundedRect(margin, y, contentW, boxH, 5, 5, 'FD')

    setFill(COLORS.bronze)
    doc.roundedRect(margin, y, 3.5, boxH, 1.5, 1.5, 'F')

    setText(COLORS.bronze)
    doc.setFont(SANS, 'bold')
    doc.setFontSize(7.5)
    doc.text('DICAS DO CHEF', margin + 14, y + 14)

    setText(COLORS.tinta)
    doc.setFont(SERIF, 'italic')
    doc.setFontSize(9)
    doc.text(tipLines, margin + 14, y + 28)
    y += boxH + 10
  }

  drawFooter()

  const filename = `ficha-${slugify(recipe.title)}.pdf`
  doc.save(filename)
}
