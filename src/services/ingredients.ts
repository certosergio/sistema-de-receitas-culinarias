import pb from '@/lib/pocketbase/client'
import { Ingredient } from '@/types'
import { isDuplicateError } from '@/lib/pocketbase/errors'

export interface CreateIngredientData {
  categoria_id: string
  codigo: string
  nome: string
  unidade?: string
  quantidade_unitaria?: number
  custo_unitario?: number
}

export interface UpdateIngredientData {
  categoria_id?: string
  codigo?: string
  nome?: string
  unidade?: string
  quantidade_unitaria?: number
  custo_unitario?: number
}

export async function getIngredients(): Promise<Ingredient[]> {
  return await pb.collection('ingredients').getFullList<Ingredient>({
    sort: 'nome',
    expand: 'categoria_id',
    requestKey: null,
  })
}

export async function getIngredientById(id: string): Promise<Ingredient> {
  return await pb.collection('ingredients').getOne<Ingredient>(id, {
    expand: 'categoria_id',
  })
}

export async function getIngredientByCodigo(codigo: string): Promise<Ingredient | null> {
  try {
    return await pb.collection('ingredients').getFirstListItem<Ingredient>(`codigo="${codigo}"`, {
      expand: 'categoria_id',
    })
  } catch {
    return null
  }
}

export async function createIngredient(data: CreateIngredientData): Promise<Ingredient> {
  const currentUserId = pb.authStore.model?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado.')
  }

  const payload = {
    categoria_id: data.categoria_id,
    codigo: data.codigo.trim(),
    nome: data.nome.trim(),
    unidade: data.unidade?.trim() || '',
    quantidade_unitaria: data.quantidade_unitaria ?? 0,
    custo_unitario: data.custo_unitario ?? 0,
    user: currentUserId,
  }

  try {
    return await pb.collection('ingredients').create<Ingredient>(payload, {
      expand: 'categoria_id',
    })
  } catch (err: unknown) {
    if (isDuplicateError(err, 'codigo')) {
      throw new Error('Já existe um ingrediente com este código.')
    }
    throw err
  }
}

export async function updateIngredient(
  id: string,
  data: UpdateIngredientData,
): Promise<Ingredient> {
  const payload: Partial<CreateIngredientData> = {}
  if (data.categoria_id !== undefined) payload.categoria_id = data.categoria_id
  if (data.codigo !== undefined) payload.codigo = data.codigo.trim()
  if (data.nome !== undefined) payload.nome = data.nome.trim()
  if (data.unidade !== undefined) payload.unidade = data.unidade.trim()
  if (data.quantidade_unitaria !== undefined) payload.quantidade_unitaria = data.quantidade_unitaria
  if (data.custo_unitario !== undefined) payload.custo_unitario = data.custo_unitario

  try {
    return await pb.collection('ingredients').update<Ingredient>(id, payload, {
      expand: 'categoria_id',
    })
  } catch (err: unknown) {
    if (isDuplicateError(err, 'codigo')) {
      throw new Error('Já existe um ingrediente com este código.')
    }
    throw err
  }
}

export async function deleteIngredient(id: string): Promise<boolean> {
  await pb.collection('ingredients').delete(id)
  return true
}
