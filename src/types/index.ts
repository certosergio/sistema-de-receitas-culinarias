export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created: string
  updated: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  created: string
  updated: string
}

export interface Technique {
  id: string
  name: string
  slug: string
  description?: string
  created: string
  updated: string
}

export interface IngredientItem {
  name: string
  quantity: string
  unit: string
}

export interface Recipe {
  id: string
  title: string
  slug: string
  summary?: string
  category?: string
  expand?: {
    category?: Category
    technique?: Technique
    author?: User
  }
  technique?: string
  cover?: string
  difficulty?: 'Fácil' | 'Médio' | 'Difícil'
  yield_quantity?: number
  yield_unit?: 'porções' | 'unidades' | 'fatias' | 'xícaras' | 'kg' | 'g' | 'L' | 'ml'
  portions?: string
  prep_minutes?: number
  cook_minutes?: number
  total_minutes?: number
  cost?: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  ingredients?: IngredientItem[]
  method?: string[]
  tips?: string
  author?: string
  /** Dietary restriction flags (migration 0006). */
  contains_gluten?: boolean
  contains_dairy?: boolean
  contains_eggs?: boolean
  contains_fish?: boolean
  contains_honey?: boolean
  created: string
  updated: string
}

export interface Favorite {
  id: string
  user: string
  recipe: string
  expand?: {
    recipe?: Recipe
  }
  created: string
  updated: string
}

export interface Collection {
  id: string
  user: string
  name: string
  description?: string
  share_token?: string
  expand?: {
    user?: User
  }
  created: string
  updated: string
}

/** Public (unauthenticated) shared collection view returned by /api/share/:token. */
export interface SharedRecipe {
  id: string
  title: string
  summary: string
  category: string
  technique: string
  cover: string
  difficulty: string
  yield_quantity: number
  yield_unit: string
  portions: string
  prep_minutes: number
  cook_minutes: number
  total_minutes: number
  cost: number
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: { name: string; quantity: string; unit: string }[]
  method: string[]
  tips: string
  /** Dietary restriction flags (mirrors Recipe, exposed on the public share). */
  contains_gluten?: boolean
  contains_dairy?: boolean
  contains_eggs?: boolean
  contains_fish?: boolean
  contains_honey?: boolean
}

export interface SharedCollection {
  collection: {
    id: string
    name: string
    description: string
    author: string
    created: string
  }
  recipes: SharedRecipe[]
}

export interface CollectionRecipe {
  id: string
  collection: string
  recipe: string
  expand?: {
    recipe?: Recipe
    collection?: Collection
  }
  created: string
  updated: string
}

export interface RecipeFormData {
  title: string
  slug?: string
  summary: string
  category: string
  technique: string
  difficulty: 'Fácil' | 'Médio' | 'Difícil'
  yield_quantity: number | string
  yield_unit: 'porções' | 'unidades' | 'fatias' | 'xícaras' | 'kg' | 'g' | 'L' | 'ml'
  portions: string
  prep_minutes: number | string
  cook_minutes: number | string
  cost: number | string
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
  ingredients: IngredientItem[]
  method: string[]
  tips: string
  coverFile?: File | null
  removeCover?: boolean
  /** Dietary restriction flags (migration 0006). */
  contains_gluten?: boolean
  contains_dairy?: boolean
  contains_eggs?: boolean
  contains_fish?: boolean
  contains_honey?: boolean
}
