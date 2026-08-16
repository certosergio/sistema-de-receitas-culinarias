import pb from '@/lib/pocketbase/client'
import { Recipe, RecipeFormData } from '@/types'

export interface RecipeFilterOptions {
  search?: string
  categories?: string[]
  techniques?: string[]
  difficulty?: string
  sort?: string
}

export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${base}-${Math.random().toString(36).substring(2, 6)}`
}

export function getRecipeCoverUrl(recipe: Recipe): string | null {
  if (!recipe.cover) return null
  return pb.files.getURL(recipe, recipe.cover)
}

export async function getRecipes(options: RecipeFilterOptions = {}): Promise<Recipe[]> {
  const filterParts: string[] = []

  if (options.search && options.search.trim()) {
    const q = options.search.trim()
    filterParts.push(`(title ~ "${q}" || summary ~ "${q}" || tips ~ "${q}")`)
  }

  if (options.categories && options.categories.length > 0) {
    const catConditions = options.categories.map((c) => `category = "${c}"`).join(' || ')
    filterParts.push(`(${catConditions})`)
  }

  if (options.techniques && options.techniques.length > 0) {
    const techConditions = options.techniques.map((t) => `technique = "${t}"`).join(' || ')
    filterParts.push(`(${techConditions})`)
  }

  if (options.difficulty && options.difficulty !== 'all') {
    filterParts.push(`difficulty = "${options.difficulty}"`)
  }

  let sort = '-created'
  if (options.sort) {
    switch (options.sort) {
      case 'recentes':
        sort = '-created'
        break
      case 'antigos':
        sort = 'created'
        break
      case 'titulo-asc':
        sort = 'title'
        break
      case 'titulo-desc':
        sort = '-title'
        break
      case 'tempo-menor':
        sort = 'total_minutes'
        break
      default:
        sort = options.sort
    }
  }

  return await pb.collection('recipes').getFullList<Recipe>({
    filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
    sort,
    expand: 'category,technique,author',
    requestKey: null,
  })
}

export async function getRecentRecipes(limit: number = 6): Promise<Recipe[]> {
  const result = await pb.collection('recipes').getList<Recipe>(1, limit, {
    sort: '-created',
    expand: 'category,technique,author',
    requestKey: null,
  })
  return result.items
}

export async function getRecipeById(id: string): Promise<Recipe> {
  return await pb.collection('recipes').getOne<Recipe>(id, {
    expand: 'category,technique,author',
    requestKey: null,
  })
}

export async function createRecipe(formData: RecipeFormData): Promise<Recipe> {
  const user = pb.authStore.record
  const prep = Number(formData.prep_minutes) || 0
  const cook = Number(formData.cook_minutes) || 0
  const total = prep + cook

  const slug = formData.slug || generateSlug(formData.title)

  const payload = new FormData()
  payload.append('title', formData.title.trim())
  payload.append('slug', slug)
  payload.append('summary', formData.summary || '')
  if (formData.category) payload.append('category', formData.category)
  if (formData.technique) payload.append('technique', formData.technique)
  if (formData.difficulty) payload.append('difficulty', formData.difficulty)
  if (formData.yield_quantity) payload.append('yield_quantity', String(formData.yield_quantity))
  if (formData.yield_unit) payload.append('yield_unit', formData.yield_unit)
  if (formData.portions) payload.append('portions', formData.portions)
  payload.append('prep_minutes', String(prep))
  payload.append('cook_minutes', String(cook))
  payload.append('total_minutes', String(total))
  if (formData.cost) payload.append('cost', String(formData.cost))
  if (formData.calories) payload.append('calories', String(formData.calories))
  if (formData.protein) payload.append('protein', String(formData.protein))
  if (formData.carbs) payload.append('carbs', String(formData.carbs))
  if (formData.fat) payload.append('fat', String(formData.fat))

  const cleanIngredients = (formData.ingredients || []).filter((i) => i.name && i.name.trim())
  payload.append('ingredients', JSON.stringify(cleanIngredients))

  const cleanMethod = (formData.method || []).filter((m) => m && m.trim())
  payload.append('method', JSON.stringify(cleanMethod))

  if (formData.tips) payload.append('tips', formData.tips)
  if (user?.id) payload.append('author', user.id)

  if (formData.coverFile) {
    payload.append('cover', formData.coverFile)
  }

  return await pb.collection('recipes').create<Recipe>(payload)
}

export async function updateRecipe(id: string, formData: RecipeFormData): Promise<Recipe> {
  const prep = Number(formData.prep_minutes) || 0
  const cook = Number(formData.cook_minutes) || 0
  const total = prep + cook

  const payload = new FormData()
  payload.append('title', formData.title.trim())
  if (formData.summary !== undefined) payload.append('summary', formData.summary)
  if (formData.category) payload.append('category', formData.category)
  if (formData.technique) payload.append('technique', formData.technique)
  if (formData.difficulty) payload.append('difficulty', formData.difficulty)
  payload.append('yield_quantity', formData.yield_quantity ? String(formData.yield_quantity) : '')
  if (formData.yield_unit) payload.append('yield_unit', formData.yield_unit)
  payload.append('portions', formData.portions || '')
  payload.append('prep_minutes', String(prep))
  payload.append('cook_minutes', String(cook))
  payload.append('total_minutes', String(total))
  payload.append('cost', formData.cost ? String(formData.cost) : '')
  payload.append('calories', formData.calories ? String(formData.calories) : '')
  payload.append('protein', formData.protein ? String(formData.protein) : '')
  payload.append('carbs', formData.carbs ? String(formData.carbs) : '')
  payload.append('fat', formData.fat ? String(formData.fat) : '')

  const cleanIngredients = (formData.ingredients || []).filter((i) => i.name && i.name.trim())
  payload.append('ingredients', JSON.stringify(cleanIngredients))

  const cleanMethod = (formData.method || []).filter((m) => m && m.trim())
  payload.append('method', JSON.stringify(cleanMethod))

  payload.append('tips', formData.tips || '')

  if (formData.coverFile) {
    payload.append('cover', formData.coverFile)
  } else if (formData.removeCover) {
    payload.append('cover', '')
  }

  return await pb.collection('recipes').update<Recipe>(id, payload)
}

export async function deleteRecipe(id: string): Promise<boolean> {
  await pb.collection('recipes').delete(id)
  return true
}

export function isRecipeComplete(recipe: Recipe): boolean {
  const hasYield = !!recipe.yield_quantity && !!recipe.yield_unit
  const hasTimes =
    (recipe.prep_minutes !== undefined && recipe.prep_minutes !== null) ||
    (recipe.cook_minutes !== undefined && recipe.cook_minutes !== null)
  const hasDifficulty = !!recipe.difficulty
  const hasCost = recipe.cost !== undefined && recipe.cost !== null && recipe.cost > 0
  const hasNutri =
    (recipe.calories || 0) > 0 ||
    (recipe.protein || 0) > 0 ||
    (recipe.carbs || 0) > 0 ||
    (recipe.fat || 0) > 0
  const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
  const hasMethod = Array.isArray(recipe.method) && recipe.method.length > 0

  return Boolean(
    hasYield && hasTimes && hasDifficulty && hasCost && hasNutri && hasIngredients && hasMethod,
  )
}
