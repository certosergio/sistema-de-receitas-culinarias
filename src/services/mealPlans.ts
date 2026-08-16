import pb from '@/lib/pocketbase/client'
import { Recipe } from '@/types'

export type MealType = 'cafe_da_manha' | 'almoco' | 'jantar'

export interface MealPlan {
  id: string
  user: string
  date: string // YYYY-MM-DD
  meal_type: MealType
  recipe: string
  expand?: {
    recipe?: Recipe
  }
  created: string
  updated: string
}

/** Slot key combines date + meal_type. */
export const slotKey = (date: string, meal: MealType) => `${date}|${meal}`

export const MEAL_LABELS: Record<MealType, string> = {
  cafe_da_manha: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
}

export const MEAL_ORDER: MealType[] = ['cafe_da_manha', 'almoco', 'jantar']

/** Loads all meal plans for the current user within [start, end] inclusive (YYYY-MM-DD). */
export async function getMealPlans(start: string, end: string): Promise<MealPlan[]> {
  const user = pb.authStore.record
  if (!user) return []
  const rows = await pb.collection('meal_plans').getFullList<MealPlan>({
    filter: `user = "${user.id}" && date >= "${start}" && date <= "${end}"`,
    sort: 'date',
    expand: 'recipe.category,recipe.technique,recipe.author',
    requestKey: null,
  })
  return rows
}

export async function addMealPlan(
  date: string,
  meal_type: MealType,
  recipeId: string,
): Promise<MealPlan> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  return await pb.collection('meal_plans').create<MealPlan>({
    user: user.id,
    date,
    meal_type,
    recipe: recipeId,
  })
}

/** Replaces whatever is in a slot (date+meal_type) with the given recipe. */
export async function setMealPlan(
  date: string,
  meal_type: MealType,
  recipeId: string,
): Promise<MealPlan> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')
  // Delete existing slot rows then create the new one.
  await removeMealPlanSlot(date, meal_type)
  return await pb.collection('meal_plans').create<MealPlan>({
    user: user.id,
    date,
    meal_type,
    recipe: recipeId,
  })
}

export async function removeMealPlan(id: string): Promise<void> {
  await pb.collection('meal_plans').delete(id)
}

/** Removes every plan in a slot (date+meal_type). */
export async function removeMealPlanSlot(date: string, meal_type: MealType): Promise<void> {
  const user = pb.authStore.record
  if (!user) return
  try {
    const rows = await pb.collection('meal_plans').getFullList<MealPlan>({
      filter: `user = "${user.id}" && date = "${date}" && meal_type = "${meal_type}"`,
      requestKey: null,
    })
    await Promise.all(rows.map((r) => pb.collection('meal_plans').delete(r.id)))
  } catch (err) {
    console.warn('Erro ao limpar slot:', err)
  }
}

/** Removes every plan in a date range (used by "Limpar semana"). */
export async function clearMealPlansRange(start: string, end: string): Promise<void> {
  const user = pb.authStore.record
  if (!user) return
  try {
    const rows = await pb.collection('meal_plans').getFullList<MealPlan>({
      filter: `user = "${user.id}" && date >= "${start}" && date <= "${end}"`,
      requestKey: null,
    })
    await Promise.all(rows.map((r) => pb.collection('meal_plans').delete(r.id)))
  } catch (err) {
    console.warn('Erro ao limpar semana:', err)
  }
}
