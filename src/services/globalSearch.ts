import pb from '@/lib/pocketbase/client'
import { Recipe, Category, Technique, Ingredient } from '@/types'

export type GlobalSearchResultType = 'recipe' | 'category' | 'technique' | 'ingredient'

export interface GlobalSearchResultItem {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle?: string
  badge?: string
  url: string
}

export interface GlobalSearchResults {
  recipes: GlobalSearchResultItem[]
  categories: GlobalSearchResultItem[]
  techniques: GlobalSearchResultItem[]
  ingredients: GlobalSearchResultItem[]
  total: number
}

function escapeFilterValue(val: string): string {
  return val.replace(/["\\]/g, '\\$&')
}

/**
 * Executa busca paralela nas coleções recipes, categories, techniques e ingredients
 * com filtros parciais case-insensitive (~).
 */
export async function performGlobalSearch(query: string): Promise<GlobalSearchResults> {
  const clean = query.trim()
  if (clean.length < 2) {
    return {
      recipes: [],
      categories: [],
      techniques: [],
      ingredients: [],
      total: 0,
    }
  }

  const escaped = escapeFilterValue(clean)

  const [recipesRes, categoriesRes, techniquesRes, ingredientsRes] = await Promise.allSettled([
    // Receitas: busca por título ou summary
    pb.collection('recipes').getList<Recipe>(1, 6, {
      filter: `title ~ "${escaped}" || summary ~ "${escaped}"`,
      sort: '-created',
      expand: 'category',
      requestKey: null,
    }),
    // Categorias: busca por nome ou description
    pb.collection('categories').getList<Category>(1, 5, {
      filter: `name ~ "${escaped}" || description ~ "${escaped}"`,
      sort: 'name',
      requestKey: null,
    }),
    // Técnicas: busca por nome ou description
    pb.collection('techniques').getList<Technique>(1, 5, {
      filter: `name ~ "${escaped}" || description ~ "${escaped}"`,
      sort: 'name',
      requestKey: null,
    }),
    // Ingredientes: busca por nome ou código
    pb.collection('ingredients').getList<Ingredient>(1, 6, {
      filter: `nome ~ "${escaped}" || codigo ~ "${escaped}"`,
      sort: 'nome',
      expand: 'categoria_id',
      requestKey: null,
    }),
  ])

  const recipes: GlobalSearchResultItem[] =
    recipesRes.status === 'fulfilled'
      ? recipesRes.value.items.map((r) => ({
          id: r.id,
          type: 'recipe' as const,
          title: r.title,
          subtitle: r.expand?.category?.name || r.difficulty || undefined,
          badge: r.cost ? `R$ ${Number(r.cost).toFixed(2).replace('.', ',')}` : undefined,
          url: `/receitas/${r.id}`,
        }))
      : []

  const categories: GlobalSearchResultItem[] =
    categoriesRes.status === 'fulfilled'
      ? categoriesRes.value.items.map((c) => ({
          id: c.id,
          type: 'category' as const,
          title: c.name,
          subtitle: c.description || undefined,
          url: '/categorias',
        }))
      : []

  const techniques: GlobalSearchResultItem[] =
    techniquesRes.status === 'fulfilled'
      ? techniquesRes.value.items.map((t) => ({
          id: t.id,
          type: 'technique' as const,
          title: t.name,
          subtitle: t.description || undefined,
          url: '/tecnicas',
        }))
      : []

  const ingredients: GlobalSearchResultItem[] =
    ingredientsRes.status === 'fulfilled'
      ? ingredientsRes.value.items.map((i) => ({
          id: i.id,
          type: 'ingredient' as const,
          title: i.nome,
          subtitle: i.expand?.categoria_id?.name || (i.unidade ? `Un: ${i.unidade}` : undefined),
          badge: i.codigo || undefined,
          url: '/ingredientes',
        }))
      : []

  const total = recipes.length + categories.length + techniques.length + ingredients.length

  return {
    recipes,
    categories,
    techniques,
    ingredients,
    total,
  }
}
