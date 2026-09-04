import pb from '@/lib/pocketbase/client'
import { Technique } from '@/types'

export async function getTechniques(): Promise<Technique[]> {
  return await pb.collection('techniques').getFullList<Technique>({
    sort: 'name',
    requestKey: null,
  })
}

export async function getTechniqueById(id: string): Promise<Technique> {
  return await pb.collection('techniques').getOne<Technique>(id)
}

export async function getTechniqueBySlug(slug: string): Promise<Technique | null> {
  try {
    return await pb.collection('techniques').getFirstListItem<Technique>(`slug="${slug}"`)
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
  return base || 'tecnica'
}

export async function createTechnique(data: {
  name: string
  slug?: string
  description?: string
}): Promise<Technique> {
  const baseSlug = data.slug?.trim() || generateBaseSlug(data.name)

  try {
    return await pb.collection('techniques').create<Technique>({
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
      return await pb.collection('techniques').create<Technique>({
        name: data.name.trim(),
        description: data.description?.trim() || '',
        slug: fallbackSlug,
      })
    }
    throw err
  }
}

export async function updateTechnique(
  id: string,
  data: { name?: string; slug?: string; description?: string },
): Promise<Technique> {
  const payload: { name?: string; slug?: string; description?: string } = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.description !== undefined) payload.description = data.description.trim()
  if (data.slug !== undefined) payload.slug = data.slug.trim()

  try {
    return await pb.collection('techniques').update<Technique>(id, payload)
  } catch (err: unknown) {
    const errObj = err as { response?: { data?: Record<string, unknown> } }
    if (errObj?.response?.data?.slug && payload.slug) {
      delete payload.slug
      return await pb.collection('techniques').update<Technique>(id, payload)
    }
    throw err
  }
}

export async function deleteTechnique(id: string): Promise<boolean> {
  // Check if any recipe uses this technique
  const count = await pb.collection('recipes').getList(1, 1, {
    filter: `technique="${id}"`,
    requestKey: null,
  })
  if (count.totalItems > 0) {
    throw new Error(
      `Esta técnica está vinculada a ${count.totalItems} receita(s). Reatribua as receitas antes de excluir.`,
    )
  }
  await pb.collection('techniques').delete(id)
  return true
}
