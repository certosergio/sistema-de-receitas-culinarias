import pb from '@/lib/pocketbase/client'
import { IngredientCategory } from '@/types'

export async function getIngredientCategories(): Promise<IngredientCategory[]> {
  return await pb.collection('ingredient_categories').getFullList<IngredientCategory>({
    sort: 'name',
    requestKey: null,
  })
}

export async function getIngredientCategoryById(id: string): Promise<IngredientCategory> {
  return await pb.collection('ingredient_categories').getOne<IngredientCategory>(id)
}

export async function getIngredientCategoryBySlug(
  slug: string,
): Promise<IngredientCategory | null> {
  try {
    return await pb
      .collection('ingredient_categories')
      .getFirstListItem<IngredientCategory>(`slug="${slug}"`)
  } catch {
    return null
  }
}

function generateBaseSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || 'categoria-ingrediente'
}

export async function createIngredientCategory(data: {
  name: string
  slug?: string
  description?: string
}): Promise<IngredientCategory> {
  const baseSlug = data.slug?.trim() || generateBaseSlug(data.name)

  try {
    return await pb.collection('ingredient_categories').create<IngredientCategory>({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      slug: baseSlug,
    })
  } catch (err: unknown) {
    const errObj = err as { response?: { data?: Record<string, unknown> }; message?: string }
    const isSlugCollision =
      errObj?.response?.data?.slug !== undefined ||
      (errObj?.message && /slug|unique|Failed to create record/i.test(errObj.message))

    if (isSlugCollision) {
      const uniqueSuffix = Math.random().toString(36).substring(2, 7)
      const fallbackSlug = `${baseSlug}-${uniqueSuffix}`
      return await pb.collection('ingredient_categories').create<IngredientCategory>({
        name: data.name.trim(),
        description: data.description?.trim() || '',
        slug: fallbackSlug,
      })
    }
    throw err
  }
}

export async function updateIngredientCategory(
  id: string,
  data: { name?: string; slug?: string; description?: string },
): Promise<IngredientCategory> {
  const payload: { name?: string; slug?: string; description?: string } = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.description !== undefined) payload.description = data.description.trim()
  if (data.slug !== undefined) payload.slug = data.slug.trim()

  try {
    return await pb.collection('ingredient_categories').update<IngredientCategory>(id, payload)
  } catch (err: unknown) {
    const errObj = err as { response?: { data?: Record<string, unknown> } }
    if (errObj?.response?.data?.slug && payload.slug) {
      delete payload.slug
      return await pb.collection('ingredient_categories').update<IngredientCategory>(id, payload)
    }
    throw err
  }
}

export async function deleteIngredientCategory(id: string): Promise<boolean> {
  // Check if any ingredient is linked to this category
  const count = await pb.collection('ingredients').getList(1, 1, {
    filter: `categoria_id="${id}"`,
    requestKey: null,
  })
  if (count.totalItems > 0) {
    throw new Error(
      `Esta categoria está vinculada a ${count.totalItems} ingrediente(s). Reatribua ou remova os ingredientes antes de excluir.`,
    )
  }
  await pb.collection('ingredient_categories').delete(id)
  return true
}
