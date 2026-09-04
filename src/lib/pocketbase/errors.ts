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

export function isDuplicateError(err: unknown, fieldName?: string): boolean {
  if (err instanceof ClientResponseError) {
    if (err.status === 400) {
      const data = err.response?.data
      if (fieldName && data && typeof data === 'object') {
        const fieldError = (data as Record<string, { code?: string; message?: string }>)[fieldName]
        if (
          fieldError &&
          (fieldError.code === 'validation_not_unique' || /unique/i.test(fieldError.message || ''))
        ) {
          return true
        }
      }
      return (
        err.response?.message?.includes('UNIQUE constraint failed') ||
        err.message?.includes('UNIQUE constraint failed') ||
        false
      )
    }
  }
  const msg = (err as Error)?.message || ''
  return /unique|duplicate|já existe/i.test(msg)
}

export function getErrorMessage(
  error: unknown,
  fallback: string = 'Ocorreu um erro inesperado.',
): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : fallback
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || fallback
}
