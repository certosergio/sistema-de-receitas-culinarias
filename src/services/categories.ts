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

export async function createCategory(data: {
  name: string
  slug?: string
  description?: string
  color?: string
}): Promise<Category> {
  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  return await pb.collection('categories').create<Category>({
    ...data,
    slug,
  })
}

export async function updateCategory(
  id: string,
  data: { name?: string; slug?: string; description?: string; color?: string },
): Promise<Category> {
  return await pb.collection('categories').update<Category>(id, data)
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
