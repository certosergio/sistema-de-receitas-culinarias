import { ClientResponseError } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { SelectedRecipe, Recipe } from '@/types'

function isDuplicateError(err: unknown): boolean {
  if (!(err instanceof ClientResponseError)) return false
  const msg = (err.message || '').toLowerCase()
  const responseMsg = (err.response?.message || '').toLowerCase()
  const text = `${msg} ${responseMsg}`
  return (
    text.includes('unique') ||
    text.includes('duplicate') ||
    text.includes('constraint') ||
    text.includes('already') ||
    text.includes('já existe')
  )
}

function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof ClientResponseError)) return false
  if (err.status === 404) return true
  const msg = (err.message || '').toLowerCase()
  const responseMsg = (err.response?.message || '').toLowerCase()
  const text = `${msg} ${responseMsg}`
  return text.includes('not found') || text.includes('não encontrado') || text.includes('no record')
}

/** Fetches the set of recipe ids in the current user's selection. */
export async function fetchSelectedRecipeIds(): Promise<Set<string>> {
  const user = pb.authStore.record
  if (!user) return new Set()
  try {
    const records = await pb.collection('selected_recipes').getFullList<SelectedRecipe>({
      filter: `user = "${user.id}"`,
      fields: 'id,recipe',
      requestKey: null,
    })
    return new Set(records.map((r) => r.recipe))
  } catch (err) {
    console.error('Erro ao buscar receitas selecionadas:', err)
    return new Set()
  }
}

/** Adds a recipe to the selection (no-op if already present). */
export async function addSelectedRecipe(recipeId: string): Promise<void> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  try {
    await pb.collection('selected_recipes').create({
      user: user.id,
      recipe: recipeId,
    })
  } catch (err) {
    if (isDuplicateError(err)) {
      console.warn('Receita já está na seleção:', err)
      return
    }
    throw err
  }
}

/** Removes a recipe from the selection (no-op if absent). */
export async function removeSelectedRecipe(recipeId: string): Promise<void> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  try {
    const rec = await pb
      .collection('selected_recipes')
      .getFirstListItem<SelectedRecipe>(`user = "${user.id}" && recipe = "${recipeId}"`)
    await pb.collection('selected_recipes').delete(rec.id)
  } catch (err) {
    if (isNotFoundError(err)) {
      console.warn('Receita não estava na seleção:', err)
      return
    }
    throw err
  }
}

/** Fetches the expanded recipes in the current user's selection (newest first). */
export async function fetchSelectedRecipes(): Promise<Recipe[]> {
  const user = pb.authStore.record
  if (!user) return []
  const rows = await pb.collection('selected_recipes').getFullList<SelectedRecipe>({
    filter: `user = "${user.id}"`,
    sort: '-created',
    expand: 'recipe.category,recipe.technique,recipe.author',
    requestKey: null,
  })
  return rows.map((r) => r.expand?.recipe).filter((r): r is Recipe => Boolean(r && r.id))
}

/** Removes all recipes from the current user's selection. */
export async function clearSelectedRecipes(): Promise<void> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  const rows = await pb.collection('selected_recipes').getFullList<SelectedRecipe>({
    filter: `user = "${user.id}"`,
    fields: 'id',
    requestKey: null,
  })
  await Promise.all(rows.map((r) => pb.collection('selected_recipes').delete(r.id)))
}
