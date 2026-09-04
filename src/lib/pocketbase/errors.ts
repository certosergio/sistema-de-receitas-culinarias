import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(
  error: unknown,
  fallback: string = 'An unexpected error occurred.',
): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : fallback
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || fallback
}

export function isDuplicateError(error: unknown, fieldName?: string): boolean {
  if (error instanceof ClientResponseError) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      if (fieldName) {
        const fieldErr = (data as Record<string, unknown>)[fieldName]
        if (fieldErr) {
          const msg =
            typeof fieldErr === 'object' && fieldErr && 'message' in fieldErr
              ? String((fieldErr as { message: unknown }).message)
              : String(fieldErr)
          if (/unique|exist|duplicate|já existe/i.test(msg)) return true
        }
      } else {
        const allMsg = JSON.stringify(data)
        if (/unique|exist|duplicate|já existe/i.test(allMsg)) return true
      }
    }
    if (/unique|exist|duplicate|já existe/i.test(error.message)) return true
  }
  const msg = error instanceof Error ? error.message : String(error)
  return /unique|exist|duplicate|já existe/i.test(msg)
}
