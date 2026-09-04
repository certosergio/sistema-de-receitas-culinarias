import pb from '@/lib/pocketbase/client'
import { Category } from '@/types'

export async function getCategories(): Promise<Category[]> {
  return await pb.collection('categories').getFullList<Category>({
    sort: 'name',
    requestKey: null,
  })
}

export async function getCategoryById(id: string): Promise<Category> {
  return await pb.collection('categories').getOne<Category>(id)
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    return await pb.collection('categories').getFirstListItem<Category>(`slug="${slug}"`)
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
  return base || 'categoria'
}

export async function createCategory(data: {
  name: string
  slug?: string
  description?: string
  color?: string
}): Promise<Category> {
  const baseSlug = data.slug?.trim() || generateBaseSlug(data.name)

  // First try the clean slug directly
  try {
    return await pb.collection('categories').create<Category>({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      color: data.color || '#B98A4F',
      slug: baseSlug,
    })
  } catch (err: unknown) {
    // If slug collision occurs (unique index constraint idx_categories_slug),
    // append a random unique suffix and retry to guarantee success
    const errObj = err as { response?: { data?: Record<string, unknown> }; message?: string }
    const isSlugCollision =
      errObj?.response?.data?.slug !== undefined ||
      (errObj?.message && /slug|unique|Failed to create record/i.test(errObj.message))

    if (isSlugCollision) {
      const uniqueSuffix = Math.random().toString(36).substring(2, 7)
      const fallbackSlug = `${baseSlug}-${uniqueSuffix}`
      return await pb.collection('categories').create<Category>({
        name: data.name.trim(),
        description: data.description?.trim() || '',
        color: data.color || '#B98A4F',
        slug: fallbackSlug,
      })
    }
    throw err
  }
}

export async function updateCategory(
  id: string,
  data: { name?: string; slug?: string; description?: string; color?: string },
): Promise<Category> {
  const payload: { name?: string; slug?: string; description?: string; color?: string } = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.description !== undefined) payload.description = data.description.trim()
  if (data.color !== undefined) payload.color = data.color
  if (data.slug !== undefined) payload.slug = data.slug.trim()

  try {
    return await pb.collection('categories').update<Category>(id, payload)
  } catch (err: unknown) {
    // If updating slug fails due to collision and slug was not explicitly changed, retry without changing slug
    const errObj = err as { response?: { data?: Record<string, unknown> } }
    if (errObj?.response?.data?.slug && payload.slug) {
      delete payload.slug
      return await pb.collection('categories').update<Category>(id, payload)
    }
    throw err
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  // Check if any recipe uses this category
  const count = await pb.collection('recipes').getList(1, 1, {
    filter: `category="${id}"`,
    requestKey: null,
  })
  if (count.totalItems > 0) {
    throw new Error(
      `Esta categoria está vinculada a ${count.totalItems} receita(s). Reatribua as receitas antes de excluir.`,
    )
  }
  await pb.collection('categories').delete(id)
  return true
}
