import { ClientResponseError } from 'pocketbase'

/**
 * Retorna true se o erro for um erro de cliente do PocketBase (ClientResponseError).
 */
export function isPocketBaseError(err: unknown): err is ClientResponseError {
  return err instanceof ClientResponseError
}

/**
 * Detecta se o erro decorre de violação de chave única / duplicata no PocketBase.
 * Analisa response.data (ex: { user: { code: 'validation_not_unique' } }) bem como mensagens em texto.
 */
export function isDuplicateError(err: unknown): boolean {
  if (!err) return false

  // Checa response.data detalhado do PocketBase
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    const response = errorObj.response as Record<string, unknown> | undefined
    const data = response?.data as Record<string, unknown> | undefined

    if (data && typeof data === 'object') {
      for (const val of Object.values(data)) {
        if (!val || typeof val !== 'object') continue
        const code = (val as { code?: unknown }).code
        const message = (val as { message?: unknown }).message

        if (code === 'validation_not_unique') return true

        if (typeof message === 'string') {
          const lower = message.toLowerCase()
          if (
            lower.includes('unique') ||
            lower.includes('duplicate') ||
            lower.includes('já existe') ||
            lower.includes('already exists')
          ) {
            return true
          }
        }
      }
    }

    const msg = (typeof errorObj.message === 'string' ? errorObj.message : '').toLowerCase()
    const responseMsg = (
      response && typeof response.message === 'string' ? response.message : ''
    ).toLowerCase()
    const combined = `${msg} ${responseMsg}`

    if (
      combined.includes('unique') ||
      combined.includes('duplicate') ||
      combined.includes('constraint') ||
      combined.includes('already') ||
      combined.includes('já existe')
    ) {
      return true
    }
  }

  return false
}

/**
 * Detecta se o erro decorre de registro não encontrado (404).
 */
export function isNotFoundError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    if (err.status === 404) return true
    const msg = (err.message || '').toLowerCase()
    const responseMsg = (err.response?.message || '').toLowerCase()
    const combined = `${msg} ${responseMsg}`
    return (
      combined.includes('not found') ||
      combined.includes('não encontrado') ||
      combined.includes('no record')
    )
  }
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    if (errorObj.status === 404) return true
    const msg = (typeof errorObj.message === 'string' ? errorObj.message : '').toLowerCase()
    return msg.includes('not found') || msg.includes('não encontrado')
  }
  return false
}

/**
 * Detecta se o erro é de autenticação ou permissão (401 / 403).
 */
export function isAuthError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    return errorObj.status === 401 || errorObj.status === 403
  }
  return false
}

/**
 * Extrai erros de validação por campo retornados pelo PocketBase em `err.response.data`.
 * Exemplo: `{ email: 'Email já cadastrado.', password: 'Mínimo de 8 caracteres.' }`
 */
export function extractFieldErrors(err: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!err || typeof err !== 'object') return result

  const errorObj = err as Record<string, unknown>
  const response = errorObj.response as Record<string, unknown> | undefined
  const data = (response?.data || errorObj.data) as Record<string, unknown> | undefined

  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (!val) continue
      if (typeof val === 'string') {
        result[key] = val
      } else if (typeof val === 'object') {
        const item = val as { message?: unknown; code?: unknown }
        if (typeof item.message === 'string' && item.message.trim()) {
          result[key] = item.message.trim()
        } else if (item.code === 'validation_not_unique') {
          result[key] = 'Este valor já está em uso.'
        } else if (item.code === 'validation_required') {
          result[key] = 'Este campo é obrigatório.'
        }
      }
    }
  }

  return result
}

/**
 * Extrai uma mensagem amigável em português a partir de qualquer erro (ClientResponseError ou Genérico).
 * Suporta um fallback opcional.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro ao processar sua solicitação.',
): string {
  if (!error) return fallback

  if (isDuplicateError(error)) {
    return 'Já existe um registro com estas informações.'
  }

  if (isNotFoundError(error)) {
    return 'O registro solicitado não foi encontrado.'
  }

  if (isAuthError(error)) {
    return 'Você não possui permissão para realizar esta operação ou sua sessão expirou.'
  }

  if (error instanceof ClientResponseError) {
    // Se houver detalhes nos campos
    const fieldErrors = extractFieldErrors(error)
    const fieldKeys = Object.keys(fieldErrors)
    if (fieldKeys.length > 0) {
      const firstKey = fieldKeys[0]
      return `${fieldErrors[firstKey]}`
    }

    // Mensagem da resposta do PocketBase
    if (error.response?.message && typeof error.response.message === 'string') {
      const respMsg = error.response.message.trim()
      if (
        respMsg &&
        respMsg !== 'Failed to create record.' &&
        respMsg !== 'Failed to update record.'
      ) {
        return respMsg
      }
    }

    if (error.message && typeof error.message === 'string') {
      return error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallback
}
