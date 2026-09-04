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

const TRANSLATED_MESSAGES: Record<string, string> = {
  'Failed to create record.': 'Não foi possível criar o registro. Verifique os dados informados.',
  'Failed to update record.':
    'Não foi possível atualizar o registro. Verifique os dados informados.',
  'Failed to delete record.': 'Não foi possível excluir o registro.',
  'Failed to authenticate.': 'Falha na autenticação. Verifique suas credenciais.',
  'The request requires valid authorization.': 'Sua sessão expirou ou não possui autorização.',
  'Something went wrong while processing your request.':
    'Ocorreu um erro inesperado ao processar a requisição.',
  'The slug must be unique.':
    'Já existe uma categoria ou item cadastrado com este nome ou identificador.',
  'Value must be unique.': 'Já existe um registro com este mesmo identificador.',
  'Missing required value.': 'Campo obrigatório não preenchido.',
  'Cannot be blank.': 'Este campo não pode ficar em branco.',
}

export function translatePocketBaseMessage(msg: string): string {
  const trimmed = msg.trim()
  if (TRANSLATED_MESSAGES[trimmed]) return TRANSLATED_MESSAGES[trimmed]
  if (/must be unique/i.test(trimmed)) {
    return 'Já existe um registro cadastrado com este mesmo valor ou identificador.'
  }
  if (/cannot be blank|required/i.test(trimmed)) {
    return 'Campo obrigatório não preenchido.'
  }
  return trimmed
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro inesperado ao processar a requisição.',
): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error) {
      return error.message || fallback
    }
    return fallback
  }

  const fieldErrors = extractFieldErrors(error)
  const fieldKeys = Object.keys(fieldErrors)

  if (fieldKeys.length > 0) {
    const errorDetails = fieldKeys.map((field) => {
      const rawMsg = fieldErrors[field]
      const translated = translatePocketBaseMessage(rawMsg)
      let fieldLabel = field
      if (field === 'slug') fieldLabel = 'Identificador/Nome'
      if (field === 'name') fieldLabel = 'Nome'
      if (field === 'description') fieldLabel = 'Descrição'
      if (field === 'color') fieldLabel = 'Cor'
      if (field === 'title') fieldLabel = 'Título'
      return `${fieldLabel}: ${translated}`
    })
    return errorDetails.join('\n')
  }

  if (error.status === 400 && error.message === 'Failed to create record.') {
    return 'Não foi possível salvar o registro. Já pode existir um item com nome/identificador idêntico ou os dados enviados são inválidos.'
  }

  if (error.status === 401 || error.status === 403) {
    return 'Você não tem permissão para realizar esta ação. Faça login novamente.'
  }

  if (error.message) {
    return translatePocketBaseMessage(error.message)
  }

  return fallback
}
