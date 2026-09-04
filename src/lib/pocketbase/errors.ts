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

export function isDuplicateError(error: unknown, field?: string): boolean {
  if (!(error instanceof ClientResponseError)) return false
  const data = error.response?.data
  if (data && typeof data === 'object') {
    if (field) {
      const fieldErr = (data as Record<string, { code?: string; message?: string }>)[field]
      if (
        fieldErr &&
        (fieldErr.code === 'validation_not_unique' ||
          /unique|já existe|ja existe/i.test(fieldErr.message || ''))
      ) {
        return true
      }
    } else {
      for (const val of Object.values(data)) {
        if (
          val &&
          typeof val === 'object' &&
          ('code' in val || 'message' in val) &&
          ((val as { code?: string }).code === 'validation_not_unique' ||
            /unique|já existe|ja existe/i.test((val as { message?: string }).message || ''))
        ) {
          return true
        }
      }
    }
  }
  return /unique constraint|UNIQUE constraint failed|já existe/i.test(error.message || '')
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : fallback || 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0
    ? msgs.join(' ')
    : error.message || fallback || 'An unexpected error occurred.'
}
