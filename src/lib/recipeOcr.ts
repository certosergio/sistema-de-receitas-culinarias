// Client-side OCR helpers built on Tesseract.js.
//
// Everything here runs entirely in the browser — no backend. We spin up a
// web worker, recognize the supplied image in Portuguese (`por`) with a
// 60-second timeout, and fall back to English (`eng`) if the PT training
// data fails to load or recognize. The raw text returned by the worker is
// then handed to `parseRecipeText` (from recipeImport) so the existing
// heuristics structure it into a ParsedRecipe.

import { createWorker, PSM } from 'tesseract.js'
import { parseRecipeText, type ParsedRecipe } from '@/lib/recipeImport'

/** Progress events emitted during recognition (0..1, plus a status label). */
export interface OcrProgress {
  /** 0..1 recognition progress (combined load + recognize). */
  progress: number
  /** Human-readable status from the worker ("loading language traineddata", etc). */
  status: string
}

export type OcrProgressCallback = (p: OcrProgress) => void

/** Minimal shape of the logger messages Tesseract emits. */
interface TesseractLoggerMessage {
  status?: string
  progress?: number
}

/** Result of a full run: the structured recipe plus the raw OCR text. */
export interface OcrRecipeResult {
  text: string
  recipe: ParsedRecipe
  language: string
}

/** Reasons we might reject an image before even running OCR. */
export type ImageValidationError = 'too-small' | 'not-an-image'

export function validateImageFile(file: File): ImageValidationError | null {
  if (!file.type.startsWith('image/')) return 'not-an-image'
  // 50KB is a generous floor; anything smaller is almost certainly a thumbnail
  // or icon that will produce garbage text.
  if (file.size < 50 * 1024) return 'too-small'
  return null
}

const OCR_TIMEOUT_MS = 60_000

/**
 * Decode a File/Blob into an HTMLImageElement so we can read its natural
 * dimensions (used to warn about low-resolution photos).
 */
export function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    img.src = src
  })
}

/**
 * Run Tesseract OCR on an image source with a hard timeout, then structure
 * the recognized text into a ParsedRecipe via the existing parser.
 *
 * Strategy: try Portuguese (`por`) first; if the worker throws or returns
 * near-empty text, retry once with English (`eng`). Progress is reported
 * through the optional callback.
 */
export async function ocrImageToRecipe(
  image: File | Blob | string,
  onProgress?: OcrProgressCallback,
): Promise<OcrRecipeResult> {
  // `createWorker(lang)` in v5 loads the language and initializes in one call.
  // We attempt `por` first; on failure we tear down and retry with `eng`.
  let lastError: unknown = null

  for (const lang of ['por', 'eng'] as const) {
    try {
      const { text, language } = await recognizeWithTimeout(image, lang, onProgress)
      // If `por` returns essentially nothing, try `eng` before giving up.
      const trimmed = text.trim()
      if (trimmed.length < 4 && lang === 'por') {
        lastError = new Error('Texto insuficiente com português; tentando inglês.')
        continue
      }
      const recipe = parseRecipeText(text)
      return { text, recipe, language }
    } catch (err) {
      lastError = err
      // Only the `por` attempt falls through to `eng`; if `eng` also fails we bail.
      if (lang === 'por') continue
      break
    }
  }

  // If we exhausted both languages with no usable text, surface a friendly
  // message rather than the raw tesseract error.
  const fallbackMsg = 'Não foi possível extrair texto desta imagem. Tente outra foto.'
  const msg = lastError instanceof Error && lastError.message ? lastError.message : fallbackMsg
  throw new Error(msg)
}

/**
 * Wrap a single-language Tesseract recognize() in a 60s timeout. Resolves
 * with the raw text (or rejects on timeout/worker error).
 */
async function recognizeWithTimeout(
  image: File | Blob | string,
  lang: 'por' | 'eng',
  onProgress?: OcrProgressCallback,
): Promise<{ text: string; language: string }> {
  // Map tesseract progress into our simpler shape. The worker emits
  // { progress, status, ... } where progress is 0..1 within the current
  // job (loading vs recognizing); we keep the latest combined value.
  const worker = await createWorker(lang, 1, {
    // logger fires during both load and recognize; we forward it.
    logger: (m: TesseractLoggerMessage) => {
      const p = typeof m.progress === 'number' ? m.progress : 0
      onProgress?.({ progress: p, status: translateStatus(m.status) })
    },
    // Keep the worker lean — no core path downloads beyond the language.
    errorHandler: (e: unknown) => {
      // Swallow non-fatal worker logs; real errors reject the recognize call.
      console.warn('Tesseract worker:', e)
    },
  })

  // Use automatic page segmentation (default) which works well for photos
  // of printed pages; override only if the default misbehaves.
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
  })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('A análise demorou muito. Tente com uma imagem mais simples.')),
      OCR_TIMEOUT_MS,
    )
  })

  try {
    const result = await Promise.race([worker.recognize(image), timeout])
    const text = (result?.data?.text ?? '').trim()
    return { text, language: lang }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    // terminate() is async but we don't need to await it.
    void worker.terminate()
  }
}

/** Map Tesseract status codes to short PT-BR labels for the progress UI. */
function translateStatus(status?: string): string {
  switch (status) {
    case 'loading tesseract core':
      return 'Iniciando motor de OCR...'
    case 'initializing tesseract':
      return 'Preparando reconhecimento...'
    case 'loading language traineddata':
      return 'Carregando dados do idioma...'
    case 'initializing api':
      return 'Configurando reconhecedor...'
    case 'recognizing text':
      return 'Lendo imagem...'
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Processando...'
  }
}
