import pb from '@/lib/pocketbase/client'
import { Favorite, Recipe } from '@/types'

/**
 * Favorites service — each user manages only their own favorites (enforced by
 * PocketBase access rules). We cache the set of favorited recipe ids in the
 * authStore-attached model is not enough, so callers should use useFavorites.
 */

export async function fetchFavoriteRecipeIds(): Promise<Set<string>> {
  const user = pb.authStore.record
  if (!user) return new Set()
  try {
    const records = await pb.collection('favorites').getFullList<Favorite>({
      filter: `user = "${user.id}"`,
      fields: 'id,recipe',
      requestKey: null,
    })
    return new Set(records.map((r) => r.recipe))
  } catch (err) {
    console.error('Erro ao buscar favoritos:', err)
    return new Set()
  }
}

export async function addFavorite(recipeId: string): Promise<void> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  await pb.collection('favorites').create({
    user: user.id,
    recipe: recipeId,
  })
}

export async function removeFavoriteByRecipe(recipeId: string): Promise<void> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  // The unique index guarantees at most one row per (user, recipe).
  try {
    const rec = await pb
      .collection('favorites')
      .getFirstListItem<Favorite>(`user = "${user.id}" && recipe = "${recipeId}"`)
    await pb.collection('favorites').delete(rec.id)
  } catch (err) {
    // Already absent — treat as success.
    console.warn('Favorito não localizado para remoção:', err)
  }
}

export async function fetchFavoriteRecipes(): Promise<Recipe[]> {
  const user = pb.authStore.record
  if (!user) return []
  const favorites = await pb.collection('favorites').getFullList<Favorite>({
    filter: `user = "${user.id}"`,
    sort: '-created',
    expand: 'recipe.category,recipe.technique,recipe.author',
    requestKey: null,
  })
  // Flatten expanded recipes, skip any whose underlying recipe was deleted.
  return favorites.map((f) => f.expand?.recipe).filter((r): r is Recipe => Boolean(r && r.id))
}

/**
 * Returns, for a given recipe, the ids of the user's collections that contain
 * it. Used to pre-check the collection membership checkboxes.
 */
export async function fetchCollectionsContainingRecipe(recipeId: string): Promise<Set<string>> {
  const user = pb.authStore.record
  if (!user) return new Set()
  try {
    const rows = await pb.collection('collection_recipes').getFullList({
      filter: `recipe = "${recipeId}" && collection.user = "${user.id}"`,
      fields: 'id,collection',
      expand: 'collection',
      requestKey: null,
    })
    const ids = new Set<string>()
    rows.forEach((r) => {
      if (r.expand?.collection?.user === user.id) {
        ids.add(r.collection)
      }
    })
    return ids
  } catch (err) {
    console.error('Erro ao verificar coleções da receita:', err)
    return new Set()
  }
}
