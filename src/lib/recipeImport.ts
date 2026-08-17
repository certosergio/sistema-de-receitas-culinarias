// Client-side recipe import helpers.
//
// `parseRecipeText` runs pure heuristics over raw text the user pasted to
// produce a PartialRecipe the user reviews and edits before saving. Everything
// here is best-effort: partial results are fine because the import page lets
// the user fix every field.

import type { IngredientItem } from '@/types'

/** Shape produced by the parser — every field optional. */
export interface ParsedRecipe {
  title: string
  summary: string
  ingredients: IngredientItem[]
  method: string[]
  yield_quantity: string
  yield_unit: string
  portions: string
  prep_minutes: string
  cook_minutes: string
  difficulty: string
  tips: string
}

const EMPTY_PARSED: ParsedRecipe = {
  title: '',
  summary: '',
  ingredients: [],
  method: [],
  yield_quantity: '',
  yield_unit: '',
  portions: '',
  prep_minutes: '',
  cook_minutes: '',
  difficulty: '',
  tips: '',
}

/** Pull an integer (e.g. "4 porções" -> 4) out of a free-form string. */
function firstInt(s: string): string {
  if (!s) return ''
  const m = s.match(/\d+/)
  return m ? m[0] : ''
}

/** Normalize a difficulty word to the app's enum (or ''). */
function normalizeDifficulty(raw: string): string {
  const d = raw.toLowerCase().trim()
  if (!d) return ''
  if (d.includes('dif') || d.includes('hard') || d.includes('diffic')) return 'Difícil'
  if (d.includes('méd') || d.includes('med') || d.includes('medium') || d.includes('moderada'))
    return 'Médio'
  if (d.includes('fác') || d.includes('fac') || d.includes('easy') || d.includes('simples'))
    return 'Fácil'
  return ''
}

/** Map a free-form yield unit string to one of the app's allowed units. */
function normalizeYieldUnit(raw: string): string {
  const u = raw.toLowerCase().trim()
  if (!u) return ''
  if (u.includes('porç') || u.includes('porco') || u.includes('pessoa') || u === 'serve')
    return 'porções'
  if (u.includes('fatia')) return 'fatias'
  if (u.includes('unid')) return 'unidades'
  if (u.includes('xic') || u.includes('xíc')) return 'xícaras'
  if (u === 'l' || u.includes('litro')) return 'L'
  if (u === 'ml' || u.includes('mililitro')) return 'ml'
  if (u === 'kg' || u.includes('quilo') || u.includes('kilo')) return 'kg'
  if (u === 'g' || u.includes('grama')) return 'g'
  return ''
}

const YIELD_UNITS = ['porções', 'unidades', 'fatias', 'xícaras', 'kg', 'g', 'L', 'ml']

/**
 * Split a single ingredient line ("2 xícaras de farinha de trigo") into
 * { quantity, unit, name }. Portuguese recipe ingredient lines rarely
 * use a strict delimiter, so we match a leading number + optional unit.
 */
export function parseIngredientLine(line: string): IngredientItem {
  const raw = line.replace(/^\s*[•\-*]\s*/, '').trim()
  if (!raw) return { name: '', quantity: '', unit: '' }

  // Leading number: integer, decimal ("," or "."), or fraction (1/2, 1 1/2).
  const numRe = /^(?:(\d+(?:[.,]\d+)?|\d+\/\d+|\d+\s+\d+\/\d+))\s*/i
  const m = raw.match(numRe)
  let quantity = ''
  let rest = raw
  if (m) {
    quantity = m[1].replace(/\s+/g, '')
    rest = raw.slice(m[0].length)
  }

  // Known PT-BR + common units. Longest first so "colher de sopa" wins
  // over "colher".
  const units = [
    'colheres de sopa',
    'colher de sopa',
    'colheres de chá',
    'colher de chá',
    'colheres de sobremesa',
    'colher de sobremesa',
    'xícaras de chá',
    'xícara de chá',
    'xícaras',
    'xícara',
    'xicaras',
    'xicara',
    'copos',
    'copo',
    'latas',
    'lata',
    'caixas',
    'caixa',
    'envelopes',
    'envelope',
    'sachês',
    'sachê',
    'pacotes',
    'pacote',
    'dentes',
    'dente',
    'fatias',
    'fatia',
    'cubic centimeters',
    'quilos',
    'quilo',
    'kg',
    'gramas',
    'grama',
    'g',
    'litros',
    'litro',
    'l',
    'mililitros',
    'ml',
    'cálices',
    'cálice',
    'pitadas',
    'pitada',
    'maços',
    'maço',
    'macos',
    'maço'.replace('ç', 'c'),
    'cubos',
    'cubo',
    'ramos',
    'ramo',
    'pessoas',
    'pessoa',
  ]
  let unit = ''
  for (const u of units) {
    const re = new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:de\\s+)?`, 'i')
    if (re.test(rest)) {
      unit = u
      rest = rest.replace(re, '')
      break
    }
  }

  // Strip a leading "de " left after unit removal, and trailing punctuation.
  rest = rest
    .replace(/^de\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,.;:]+$/, '')
    .trim()

  return { name: rest, quantity, unit }
}

// --- Text-section heuristics ---

/**
 * Normalize a line for header matching: lowercase + strip diacritics so
 * "INGREDIENTES", "Ingredientes", "Preparação" and "preparacao" all match
 * the same ASCII pattern. Used only for header detection, never for the
 * extracted text itself.
 */
function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Patterns are ASCII-only (accents already stripped by normalizeForMatch).
// Trailing punctuation is tolerant: "Ingredientes", "Ingredientes:",
// "Ingredientes :", "Ingredientes)" and "Ingredientes -" all match.
const SECTION_PATTERNS: { field: keyof ParsedRecipe; re: RegExp }[] = [
  // Ingredients
  {
    field: 'ingredients',
    re: /^(ingredientes|ingredients|lista de ingredientes|mise en place)\s*[:\-)]?\s*$/,
  },
  // Method
  {
    field: 'method',
    re: /^(modo de preparo|preparo|preparacao|modo de fazer|preparo da receita|instructions?|preparation|directions|passo a passo|elaboracao|como fazer|como preparar)\s*[:\-)]?\s*$/,
  },
  // Tips
  {
    field: 'tips',
    re: /^(dicas|tips|sugestoes|notas|observacoes)\s*[:\-)]?\s*$/,
  },
]

/**
 * Block-based fallback used when NO section header was recognized. Splits the
 * text into blocks separated by blank lines and classifies each block by
 * scoring how "ingredient-like" and "method-like" its lines are, then picks
 * the best-scoring block for each role (preferring different blocks when
 * possible). Best-effort, like the rest of this module.
 */
function fallbackBlockParse(rawLines: string[]): {
  ingredients: string[]
  method: string[]
  titleCandidates: string[]
} {
  // Group consecutive non-empty lines into blocks.
  const blocks: { lines: string[]; index: number }[] = []
  let cur: string[] = []
  rawLines.forEach((l) => {
    if (l.trim() === '') {
      if (cur.length) blocks.push({ lines: cur, index: blocks.length })
      cur = []
    } else {
      cur.push(l.trim())
    }
  })
  if (cur.length) blocks.push({ lines: cur, index: blocks.length })

  const titleCandidates: string[] = []
  const ingBlocks: { lines: string[]; score: number; index: number }[] = []
  const methBlocks: { lines: string[]; score: number; index: number }[] = []

  const unitRe =
    /\b(xic|colher|copo|lata|caixa|pacote|dente|fatia|pitada|maco|ramo|envelope|sache|sachê|kg|gramas|ml|litros)\b/i
  const verbRe =
    /\b(asse|misture|bata|coloque|leve|aqueça|aqueca|refogue|temper|deixe|adicione|adicion|junte|acrescent|acrescente|cozinhe|frite|frit|passe|corte|despeje|unte|mexa|incorpore|reserve|sirva|desligue)\b/i

  for (const block of blocks) {
    let ingScore = 0
    let methScore = 0
    for (const line of block.lines) {
      // Ingredient-like: starts with a quantity.
      if (/^\d+(?:[.,]\d+)?\s/.test(line) || /^\d+\s*\/\s*\d/.test(line)) ingScore++
      if (unitRe.test(line)) ingScore++
      // Method-like: longer sentence with several words.
      const words = line.split(/\s+/).length
      if (words >= 4 && line.length >= 25) methScore++
      if (verbRe.test(line)) methScore++
    }
    if (ingScore > 0) ingBlocks.push({ lines: block.lines, score: ingScore, index: block.index })
    if (methScore > 0) methBlocks.push({ lines: block.lines, score: methScore, index: block.index })
    // A short single-line block is a likely title.
    if (block.lines.length === 1) {
      const t = block.lines[0]
      if (t.length <= 80 && t.split(' ').length <= 12) titleCandidates.push(t)
    }
  }

  ingBlocks.sort((a, b) => b.score - a.score)
  methBlocks.sort((a, b) => b.score - a.score)

  const chosenIng = ingBlocks[0]
  // Prefer a method block that is NOT the chosen ingredient block.
  const chosenMeth = methBlocks.find((b) => b.index !== chosenIng?.index) || methBlocks[0]

  const ingredients = chosenIng ? chosenIng.lines : []
  const method = chosenMeth
    ? chosenMeth.lines
        .map((l) => l.replace(/^\s*(?:passo\s*)?\d+[).:-]\s*/i, '').trim())
        .filter(Boolean)
    : []

  return { ingredients, method, titleCandidates }
}

const YIELD_LABEL_RE =
  /^(rendimento|serve|por[çc][õo]es|porcao|porcoes|rendimento da receita|yields?|servings?)\s*:\s*(.*)$/i
const PREP_LABEL_RE =
  /^(tempo de preparo|tempo de prepara[çc][aã]o|prep(?:aration)?\s*time|preparo)\s*:\s*(.*)$/i
const COOK_LABEL_RE =
  /^(tempo de cozimento|tempo de forno|tempo de cozinh?o|cook(?:ing)?\s*time|cozimento|tempo de cozimento)\s*:\s*(.*)$/i
const TOTAL_TIME_LABEL_RE = /^(tempo total|total time|tempo)\s*:\s*(.*)$/i
const DIFFICULTY_LABEL_RE = /^(dificuldade|dificulty|difficulty|n[íi]vel)\s*:\s*(.*)$/i

function matchTimeMinutes(value: string): string {
  if (!value) return ''
  // "1h30", "1h 30", "1 h 30 min", "90 min", "90 minutos", "1 hora e 30 minutos"
  let total = 0
  const hMatch = value.match(/(\d+)\s*h/i)
  const mMatch = value.match(/(\d+)\s*(?:min|minuto)/i)
  if (hMatch) total += parseInt(hMatch[1], 10) * 60
  if (mMatch) total += parseInt(mMatch[1], 10)
  if (total > 0) return String(total)
  // Bare number.
  const n = value.match(/(\d+)/)
  return n ? n[1] : ''
}

/**
 * Heuristic parser for free-form recipe text (PT-BR or EN). Splits into
 * sections by label headings, then extracts ingredients/steps from the
 * bullet/numbered lines under each. Falls back gracefully: any content
 * we can't classify is simply ignored, and the user edits the rest.
 */
export function parseRecipeText(rawText: string): ParsedRecipe {
  const out: ParsedRecipe = { ...EMPTY_PARSED }

  // Normalize line endings + strip leading bullets on every line so a
  // heading like "• Ingredientes" still matches.
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .map((l) => l.replace(/^\s*[•·▪◦\-*–—]\s+/, ''))

  let current: keyof ParsedRecipe | null = null
  const ingredientLines: string[] = []
  const methodLines: string[] = []
  const tipLines: string[] = []
  const titleCandidates: string[] = []
  let sawSectionHeader = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      current = null
      continue
    }

    // Inline single-line metadata.
    let m: RegExpMatchArray | null
    if ((m = line.match(YIELD_LABEL_RE))) {
      const val = m[2] || ''
      const ym = val.match(/^([\d.,]+)\s*(.*)$/)
      if (ym) {
        out.yield_quantity = ym[1].replace(/\./g, '').replace(/,/g, '.')
        out.yield_unit = normalizeYieldUnit(ym[2]) || 'porções'
      } else {
        out.yield_quantity = firstInt(val)
        out.yield_unit = 'porções'
      }
      current = null
      continue
    }
    if ((m = line.match(PREP_LABEL_RE))) {
      out.prep_minutes = matchTimeMinutes(m[2] || '')
      current = null
      continue
    }
    if ((m = line.match(COOK_LABEL_RE))) {
      out.cook_minutes = matchTimeMinutes(m[2] || '')
      current = null
      continue
    }
    if ((m = line.match(TOTAL_TIME_LABEL_RE))) {
      // Only use "tempo total" when prep/cook weren't found.
      const t = matchTimeMinutes(m[2] || '')
      if (t && !out.prep_minutes && !out.cook_minutes) {
        out.cook_minutes = t
      }
      current = null
      continue
    }
    if ((m = line.match(DIFFICULTY_LABEL_RE))) {
      out.difficulty = normalizeDifficulty(m[2] || '')
      current = null
      continue
    }

    // Section headers — normalized (case- + accent-insensitive) so that
    // "INGREDIENTES", "Ingredientes", "Ingredientes:", "Preparação" and
    // "preparacao" all match the same ASCII pattern.
    let matchedSection = false
    const norm = normalizeForMatch(line)
    for (const pat of SECTION_PATTERNS) {
      if (pat.re.test(norm)) {
        current = pat.field
        matchedSection = true
        sawSectionHeader = true
        break
      }
    }
    if (matchedSection) continue

    // Body lines under a section.
    if (current === 'ingredients') {
      ingredientLines.push(line)
    } else if (current === 'method') {
      // Strip a leading step number ("1.", "1)", "Passo 1:").
      const cleaned = line.replace(/^\s*(?:passo\s*)?\d+[).:-]\s*/i, '').trim()
      if (cleaned) methodLines.push(cleaned)
    } else if (current === 'tips') {
      tipLines.push(line)
    } else {
      // Not in a section — treat a short early line as a title candidate.
      if (titleCandidates.length < 3 && line.length <= 80 && line.split(' ').length <= 12) {
        titleCandidates.push(line)
      }
    }
  }

  // Fallback: if NO section header was recognized at all, try block-based
  // classification so headerless pastes still yield ingredients + method.
  if (!sawSectionHeader) {
    const fb = fallbackBlockParse(lines)
    if (ingredientLines.length === 0 && fb.ingredients.length > 0) {
      fb.ingredients.forEach((l) => ingredientLines.push(l))
    }
    if (methodLines.length === 0 && fb.method.length > 0) {
      fb.method.forEach((l) => methodLines.push(l))
    }
    if (titleCandidates.length === 0) {
      fb.titleCandidates.forEach((l) => titleCandidates.push(l))
    }
  }

  out.ingredients = ingredientLines.map(parseIngredientLine).filter((i) => i.name)
  out.method = methodLines
  out.tips = tipLines.join('\n').trim()

  // Title: prefer the first candidate that doesn't look like metadata.
  if (!out.title) {
    for (const c of titleCandidates) {
      if (/^(ingredientes|preparo|modo|dicas|rendimento|tempo|dificuldade)/i.test(c)) continue
      out.title = c
      break
    }
  }

  // Ensure a sane default yield_unit if we found a quantity but no unit.
  if (out.yield_quantity && !out.yield_unit) out.yield_unit = 'porções'

  return out
}

/** Parse pasted raw text directly (no network). */
export function importFromText(text: string): ParsedRecipe {
  const parsed = parseRecipeText(text)
  if (parsed.yield_quantity && !parsed.yield_unit) parsed.yield_unit = 'porções'
  if (parsed.yield_unit && !YIELD_UNITS.includes(parsed.yield_unit)) {
    parsed.yield_unit = 'porções'
  }
  return parsed
}
