import pb from '@/lib/pocketbase/client'
import { RecipeIngredient } from '@/types'

export interface CreateRecipeIngredientData {
  recipe_id: string
  ingredient_id: string
  quantidade: number
  observacao?: string
}

export interface UpdateRecipeIngredientData {
  recipe_id?: string
  ingredient_id?: string
  quantidade?: number
  observacao?: string
}

/**
 * Retorna todos os ingredientes vinculados a uma receita, com o ingrediente expandido.
 */
export async function getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  try {
    return await pb.collection('recipe_ingredients').getFullList<RecipeIngredient>({
      filter: `recipe_id = "${recipeId}"`,
      expand: 'ingredient_id,ingredient_id.categoria_id',
      sort: 'created',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao buscar ingredientes da receita:', err)
    return []
  }
}

/**
 * Retorna todos os vínculos de ingredientes do usuário atual (útil para relatório consolidado).
 */
export async function getAllUserRecipeIngredients(): Promise<RecipeIngredient[]> {
  try {
    return await pb.collection('recipe_ingredients').getFullList<RecipeIngredient>({
      expand: 'ingredient_id,recipe_id',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao buscar vínculos de ingredientes:', err)
    return []
  }
}

export async function createRecipeIngredient(
  data: CreateRecipeIngredientData,
): Promise<RecipeIngredient> {
  const currentUserId = pb.authStore.model?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado.')
  }

  return await pb.collection('recipe_ingredients').create<RecipeIngredient>(
    {
      recipe_id: data.recipe_id,
      ingredient_id: data.ingredient_id,
      quantidade: data.quantidade,
      observacao: data.observacao?.trim() || '',
      user: currentUserId,
    },
    {
      expand: 'ingredient_id,ingredient_id.categoria_id',
    },
  )
}

export async function updateRecipeIngredient(
  id: string,
  data: UpdateRecipeIngredientData,
): Promise<RecipeIngredient> {
  const payload: Record<string, unknown> = {}
  if (data.recipe_id !== undefined) payload.recipe_id = data.recipe_id
  if (data.ingredient_id !== undefined) payload.ingredient_id = data.ingredient_id
  if (data.quantidade !== undefined) payload.quantidade = data.quantidade
  if (data.observacao !== undefined) payload.observacao = data.observacao.trim()

  return await pb.collection('recipe_ingredients').update<RecipeIngredient>(id, payload, {
    expand: 'ingredient_id,ingredient_id.categoria_id',
  })
}

export async function deleteRecipeIngredient(id: string): Promise<boolean> {
  await pb.collection('recipe_ingredients').delete(id)
  return true
}

export interface SyncRecipeIngredientItem {
  id?: string // se já existir
  ingredient_id: string
  quantidade: number
  observacao?: string
}

/**
 * Sincroniza a lista completa de vínculos de ingredientes de uma receita:
 * - Mantém/atualiza os existentes
 * - Cria os novos
 * - Exclui os que foram removidos da lista
 * Retorna a lista atualizada e atualiza o campo de custo da receita se aplicável.
 */
export async function syncRecipeIngredients(
  recipeId: string,
  items: SyncRecipeIngredientItem[],
): Promise<RecipeIngredient[]> {
  const currentUserId = pb.authStore.model?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado.')
  }

  // 1. Busca os atuais
  const currentList = await pb.collection('recipe_ingredients').getFullList<RecipeIngredient>({
    filter: `recipe_id = "${recipeId}"`,
    requestKey: null,
  })

  const currentMap = new Map(currentList.map((item) => [item.id, item]))
  const keptIds = new Set<string>()

  // 2. Salva/Atualiza itens
  for (const item of items) {
    if (!item.ingredient_id || item.quantidade === undefined || item.quantidade === null) continue

    if (item.id && currentMap.has(item.id)) {
      keptIds.add(item.id)
      const existing = currentMap.get(item.id)!
      if (
        existing.ingredient_id !== item.ingredient_id ||
        existing.quantidade !== item.quantidade ||
        (existing.observacao || '') !== (item.observacao || '')
      ) {
        await pb.collection('recipe_ingredients').update(item.id, {
          ingredient_id: item.ingredient_id,
          quantidade: item.quantidade,
          observacao: item.observacao?.trim() || '',
        })
      }
    } else {
      const created = await pb.collection('recipe_ingredients').create<RecipeIngredient>({
        recipe_id: recipeId,
        ingredient_id: item.ingredient_id,
        quantidade: item.quantidade,
        observacao: item.observacao?.trim() || '',
        user: currentUserId,
      })
      keptIds.add(created.id)
    }
  }

  // 3. Remove os que foram excluídos
  for (const current of currentList) {
    if (!keptIds.has(current.id)) {
      await pb.collection('recipe_ingredients').delete(current.id)
    }
  }

  // 4. Retorna a lista atualizada com expands
  const updatedList = await getRecipeIngredients(recipeId)

  // 5. Calcula custo total e atualiza recipe.cost como fonte da verdade
  let totalCalculatedCost = 0
  for (const row of updatedList) {
    const ing = row.expand?.ingredient_id
    if (ing) {
      const qtdBase = ing.quantidade_unitaria || 1
      const custoUnit = ing.custo_unitario || 0
      const unitRatio = qtdBase > 0 ? row.quantidade / qtdBase : row.quantidade
      totalCalculatedCost += unitRatio * custoUnit
    }
  }

  try {
    await pb.collection('recipes').update(recipeId, {
      cost: Number(totalCalculatedCost.toFixed(2)),
    })
  } catch (err) {
    console.warn('Não foi possível sincronizar recipe.cost:', err)
  }

  return updatedList
}
