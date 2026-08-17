import { ClientResponseError } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { Collection, Recipe, SharedCollection } from '@/types'

/**
 * Detects a unique-constraint (duplicate) violation from a PocketBase response.
 * PocketBase may surface these as status 400 with a message containing
 * "unique" / "constraint", or as a 404/400 with a `data` field referencing
 * uniqueness on the collection/recipe pair.
 */
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

/** Detects a "record not found" (404) error from a PocketBase response. */
function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof ClientResponseError)) return false
  // 404 is the canonical "not found"; some list lookups also return 400.
  if (err.status === 404) return true
  const msg = (err.message || '').toLowerCase()
  const responseMsg = (err.response?.message || '').toLowerCase()
  const text = `${msg} ${responseMsg}`
  return text.includes('not found') || text.includes('não encontrado') || text.includes('no record')
}

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
  data: { name?: string; description?: string; share_token?: string | null },
): Promise<Collection> {
  return await pb.collection('collections').update<Collection>(id, {
    name: data.name?.trim(),
    description: data.description?.trim(),
    share_token: data.share_token === null ? '' : data.share_token,
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
    // A duplicate (recipe already in the collection) is expected and safe to ignore.
    if (isDuplicateError(err)) {
      console.warn('Receita já está na coleção:', err)
      return
    }
    // Any other error (permissions, API rules, validation, network) must propagate
    // so the caller can revert the optimistic UI and show an error toast.
    throw err
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
    // Already removed (no matching row) is expected and safe to ignore.
    if (isNotFoundError(err)) {
      console.warn('Receita não estava na coleção:', err)
      return
    }
    // Any other error must propagate so the caller can revert and notify.
    throw err
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

/** Short, URL-safe token (base36, ~10 chars). */
export function generateShareToken(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
}

/** Enables sharing on a collection, returning the updated record. */
export async function enableCollectionSharing(collectionId: string): Promise<Collection> {
  const token = generateShareToken()
  return await pb.collection('collections').update<Collection>(collectionId, {
    share_token: token,
  })
}

/** Disables sharing on a collection (clears the token). */
export async function disableCollectionSharing(collectionId: string): Promise<Collection> {
  return await pb.collection('collections').update<Collection>(collectionId, {
    share_token: '',
  })
}

/** Public (unauthenticated) fetch of a shared collection by token. */
export async function fetchSharedCollection(token: string): Promise<SharedCollection> {
  const res = await pb.send(`/api/share/${encodeURIComponent(token)}`, {
    method: 'GET',
  })
  const data = res as SharedCollection
  // Resolve cover relative paths to absolute URLs against the PocketBase base URL.
  const base = pb.baseUrl.replace(/\/$/, '')
  data.recipes = (data.recipes || []).map((r) => ({
    ...r,
    cover: r.cover && !/^https?:\/\//i.test(r.cover) ? base + r.cover : r.cover,
  }))
  return data
}
