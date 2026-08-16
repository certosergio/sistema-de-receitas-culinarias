// Client-side recipe import helpers.
//
// `fetchRecipeFromUrl` calls the backend proxy (pocketbase/hooks/recipe_import.js)
// which fetches the page server-side (browsers can't CORS arbitrary sites),
// extracts JSON-LD + meta + a cleaned text dump, and returns them here.
//
// `parseRecipeText` runs pure heuristics over that dump (or over raw text the
// user pasted) to produce a PartialRecipe the user reviews and edits before
// saving. Everything here is best-effort: partial results are fine because
// the import page lets the user fix every field.

import pb from '@/lib/pocketbase/client'
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
  sourceUrl?: string
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

interface ProxyResponse {
  url: string
  pageTitle: string
  jsonLd: unknown[]
  meta: Record<string, string>
  text: string
}

/** Fetch a recipe page through the backend proxy. Throws on error. */
export async function fetchRecipeFromUrl(url: string): Promise<ProxyResponse> {
  return await pb.send('/api/import-recipe', {
    method: 'POST',
    body: { url },
  })
}

/**
 * Walk a parsed JSON-LD tree and return the first object whose @type (or
 * graph node) is a Recipe. schema.org graphs nest as { @graph: [...] }
 * and Recipe is often { @type: 'Recipe' } or ['Recipe', 'Article'].
 */
function findRecipeJsonLd(node: unknown): Record<string, unknown> | null {
  if (!node) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeJsonLd(item)
      if (found) return found
    }
    return null
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const t = obj['@type']
    const types = Array.isArray(t) ? t.map(String) : t != null ? [String(t)] : []
    if (types.some((x) => x.toLowerCase().includes('recipe'))) {
      return obj
    }
    if (Array.isArray(obj['@graph'])) {
      const found = findRecipeJsonLd(obj['@graph'])
      if (found) return found
    }
  }
  return null
}

function asString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(asString).join(' ').trim()
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>
    // schema.org often nests { '@value': '...' } or { 'text': '...' }
    if (typeof obj['@value'] === 'string') return String(obj['@value']).trim()
    if (typeof obj['text'] === 'string') return String(obj['text']).trim()
    if (typeof obj['name'] === 'string') return String(obj['name']).trim()
  }
  return ''
}

/** "PT15M" / "PT1H30M" -> minutes (0 if unparseable). */
function isoDurationToMinutes(v: unknown): number {
  const s = asString(v)
  if (!s) return 0
  const m = s.match(/^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i)
  if (!m) return 0
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2] || '0', 10)
  return h * 60 + min
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
 * Build a ParsedRecipe from a schema.org Recipe JSON-LD object. JSON-LD
 * (when present) is far more reliable than scraping text, so we prefer it.
 */
function fromJsonLd(r: Record<string, unknown>): ParsedRecipe {
  const out: ParsedRecipe = { ...EMPTY_PARSED }

  out.title = asString(r['name']) || asString(r['headline'])

  out.summary = asString(r['description'])

  const recipeYield = asString(r['recipeYield'])
  if (recipeYield) {
    const ym = recipeYield.match(/^([\d.,]+)\s*(.*)$/)
    if (ym) {
      out.yield_quantity = ym[1].replace(/\./g, '').replace(/,/g, '.')
      out.yield_unit = normalizeYieldUnit(ym[2]) || 'porções'
    } else {
      out.yield_quantity = firstInt(recipeYield)
      out.yield_unit = 'porções'
    }
  }
  const nutrition = r['nutrition'] as Record<string, unknown> | undefined
  const servings = asString(r['recipeCategory']) || asString(nutrition?.servings)
  if (servings && !out.yield_quantity) out.yield_quantity = firstInt(servings)

  // Ingredients — schema.org uses recipeIngredient (string[]).
  const rawIngs = Array.isArray(r['recipeIngredient'])
    ? r['recipeIngredient']
    : Array.isArray(r['ingredients'])
      ? r['ingredients']
      : []
  out.ingredients = rawIngs.map(asString).filter(Boolean).map(parseIngredientLine)

  // Instructions — string[] OR HowToStep[] with .text.
  const rawInstr = r['recipeInstructions']
  let steps: string[] = []
  if (Array.isArray(rawInstr)) {
    for (const s of rawInstr) {
      if (typeof s === 'string') {
        steps.push(s.trim())
      } else if (s && typeof s === 'object') {
        const t = asString((s as Record<string, unknown>)['text'])
        if (t) steps.push(t)
        else {
          const n = asString((s as Record<string, unknown>)['name'])
          if (n) steps.push(n)
        }
      }
    }
  } else if (typeof rawInstr === 'string') {
    steps = rawInstr
      .split(/\n|\r/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  out.method = steps

  // Times — ISO 8601 duration or free text.
  const prep = isoDurationToMinutes(r['prepTime']) || firstInt(asString(r['prepTime']))
  out.prep_minutes = String(prep)
  const cook = isoDurationToMinutes(r['cookTime']) || firstInt(asString(r['cookTime']))
  out.cook_minutes = String(cook)

  const diff = asString(r['difficulty']) || asString(r['recipeDifficulty'])
  out.difficulty = normalizeDifficulty(diff)

  const tipsRaw = r['recipeCuisine'] ? '' : asString(r['cookingMethod'])
  out.tips = tipsRaw

  return out
}

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

const SECTION_PATTERNS: { field: keyof ParsedRecipe; re: RegExp }[] = [
  // Ingredients
  {
    field: 'ingredients',
    re: /^(ingredientes|ingredients|lista de ingredientes|mise en place)\s*:?\s*$/i,
  },
  // Method
  {
    field: 'method',
    re: /^(modo de preparo|preparo|preparação|modo de fazer|preparo da receita|instructions|instructions?|preparation|directions|passo a passo|elaboração)\s*:?\s*$/i,
  },
  // Tips
  { field: 'tips', re: /^(dicas|tips|sugest[õo]es|notas|observa[çc][õo]es)\s*:?\s*$/i },
]

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
export function parseRecipeText(rawText: string, opts?: { pageTitle?: string }): ParsedRecipe {
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

    // Section headers.
    let matchedSection = false
    for (const pat of SECTION_PATTERNS) {
      if (pat.re.test(line)) {
        current = pat.field
        matchedSection = true
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

  // Page title fallback (used when parsing a fetched URL).
  if (!out.title && opts?.pageTitle) {
    out.title = opts.pageTitle.replace(/\s*[|\-–—].*$/, '').trim()
  }

  // Ensure a sane default yield_unit if we found a quantity but no unit.
  if (out.yield_quantity && !out.yield_unit) out.yield_unit = 'porções'

  return out
}

/**
 * Full pipeline for a URL: fetch via proxy, prefer JSON-LD, fall back to
 * text heuristics merged with the page <title>.
 */
export async function importFromUrl(url: string): Promise<ParsedRecipe> {
  const data = await fetchRecipeFromUrl(url)

  // 1. Try schema.org Recipe JSON-LD first.
  const ld = findRecipeJsonLd(data.jsonLd)
  let parsed: ParsedRecipe
  if (ld) {
    parsed = fromJsonLd(ld)
  } else {
    parsed = parseRecipeText(data.text, { pageTitle: data.pageTitle })
  }

  // 2. Fill gaps from Open Graph / meta tags.
  if (!parsed.title) {
    parsed.title = data.meta['og:title'] || data.meta['twitter:title'] || data.pageTitle || ''
  }
  if (!parsed.summary) {
    parsed.summary = data.meta['og:description'] || data.meta['description'] || ''
  }

  // 3. If JSON-LD gave ingredients/method but text scraper found more,
  // merge (JSON-LD takes precedence, text fills missing pieces).
  if (!ld) {
    // already text-parsed
  } else {
    const textParsed = parseRecipeText(data.text, { pageTitle: data.pageTitle })
    if (parsed.ingredients.length === 0 && textParsed.ingredients.length > 0) {
      parsed.ingredients = textParsed.ingredients
    }
    if (parsed.method.length === 0 && textParsed.method.length > 0) {
      parsed.method = textParsed.method
    }
    if (!parsed.tips && textParsed.tips) parsed.tips = textParsed.tips
    if (!parsed.prep_minutes && textParsed.prep_minutes)
      parsed.prep_minutes = textParsed.prep_minutes
    if (!parsed.cook_minutes && textParsed.cook_minutes)
      parsed.cook_minutes = textParsed.cook_minutes
    if (!parsed.yield_quantity && textParsed.yield_quantity) {
      parsed.yield_quantity = textParsed.yield_quantity
      parsed.yield_unit = textParsed.yield_unit || 'porções'
    }
    if (!parsed.difficulty && textParsed.difficulty) parsed.difficulty = textParsed.difficulty
  }

  parsed.sourceUrl = url
  if (parsed.yield_quantity && !parsed.yield_unit) parsed.yield_unit = 'porções'
  if (parsed.yield_unit && !YIELD_UNITS.includes(parsed.yield_unit)) {
    parsed.yield_unit = 'porções'
  }
  return parsed
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
