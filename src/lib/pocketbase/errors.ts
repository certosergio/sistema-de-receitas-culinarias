export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== 'object') return {}
  const err = error as {
    data?: { data?: Record<string, { message?: string } | string> }
    response?: { data?: Record<string, { message?: string } | string> }
  }
  const raw = err.response?.data || err.data?.data
  if (!raw || typeof raw !== 'object') return {}

  const result: FieldErrors = {}
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      result[key] = val
    } else if (val && typeof val === 'object' && 'message' in val && typeof val.message === 'string') {
      result[key] = val.message
    }
  }
  return result
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const err = error as { message?: string }
    if (err.message) return err.message
  }
  return fallback || 'Ocorreu um erro inesperado.'
}
