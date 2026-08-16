import pb from '@/lib/pocketbase/client'
import { Collection, Recipe } from '@/types'

export interface CollectionWithCount extends Collection {
  recipeCount?: number
}

export async function getCollections(): Promise<CollectionWithCount[]> {
  const user = pb.authStore.record
  if (!user) return []
  const collections = await pb.collection('collections').getFullList<Collection>({
    filter: `user = "${user.id}"`,
    sort: '-created',
    requestKey: null,
  })
  // Count recipes per collection in a single pass over collection_recipes.
  let countMap: Record<string, number> = {}
  try {
    const rows = await pb.collection('collection_recipes').getFullList({
      filter: collections.map((c) => `collection = "${c.id}"`).join(' || '),
      fields: 'id,collection',
      requestKey: null,
    })
    countMap = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.collection] = (acc[r.collection] || 0) + 1
      return acc
    }, {})
  } catch (err) {
    console.error('Erro ao contar receitas por coleção:', err)
  }
  return collections.map((c) => ({ ...c, recipeCount: countMap[c.id] || 0 }))
}

export async function getCollectionById(id: string): Promise<Collection> {
  return await pb.collection('collections').getOne<Collection>(id, {
    requestKey: null,
  })
}

export async function createCollection(data: {
  name: string
  description?: string
}): Promise<Collection> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  return await pb.collection('collections').create<Collection>({
    user: user.id,
    name: data.name.trim(),
    description: data.description?.trim() || '',
  })
}

export async function updateCollection(
  id: string,
  data: { name?: string; description?: string },
): Promise<Collection> {
  return await pb.collection('collections').update<Collection>(id, {
    name: data.name?.trim(),
    description: data.description?.trim(),
  })
}

export async function deleteCollection(id: string): Promise<void> {
  // collection_recipes rows cascade-delete with the collection.
  await pb.collection('collections').delete(id)
}

export async function getCollectionRecipes(collectionId: string): Promise<Recipe[]> {
  const user = pb.authStore.record
  if (!user) return []
  const rows = await pb.collection('collection_recipes').getFullList({
    filter: `collection = "${collectionId}" && collection.user = "${user.id}"`,
    sort: '-created',
    expand: 'recipe.category,recipe.technique,recipe.author',
    requestKey: null,
  })
  return rows.map((r) => r.expand?.recipe).filter((r): r is Recipe => Boolean(r && r.id))
}

/** Adds a recipe to a collection if not already present (unique index guards). */
export async function addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
  try {
    await pb.collection('collection_recipes').create({
      collection: collectionId,
      recipe: recipeId,
    })
  } catch (err) {
    // Likely already present (unique index) — ignore.
    console.warn('Receita já está na coleção ou erro ao adicionar:', err)
  }
}

export async function removeRecipeFromCollection(
  collectionId: string,
  recipeId: string,
): Promise<void> {
  try {
    const row = await pb
      .collection('collection_recipes')
      .getFirstListItem(`collection = "${collectionId}" && recipe = "${recipeId}"`)
    await pb.collection('collection_recipes').delete(row.id)
  } catch (err) {
    console.warn('Receita não estava na coleção:', err)
  }
}

/** Toggles membership; returns the new state (true = present). */
export async function toggleRecipeInCollection(
  collectionId: string,
  recipeId: string,
  currentlyIn: boolean,
): Promise<boolean> {
  if (currentlyIn) {
    await removeRecipeFromCollection(collectionId, recipeId)
    return false
  }
  await addRecipeToCollection(collectionId, recipeId)
  return true
}
