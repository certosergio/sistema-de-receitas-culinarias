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

export async function createTechnique(data: {
  name: string
  slug?: string
  description?: string
}): Promise<Technique> {
  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  return await pb.collection('techniques').create<Technique>({
    ...data,
    slug,
  })
}

export async function updateTechnique(
  id: string,
  data: { name?: string; slug?: string; description?: string },
): Promise<Technique> {
  return await pb.collection('techniques').update<Technique>(id, data)
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
