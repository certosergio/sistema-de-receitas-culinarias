import { Recipe } from '@/types'

/** Formata um número como moeda brasileira (R$ X,XX). */
export const formatBRL = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`

/**
 * Calcula o custo estimado de uma receita somando o custo individual de
 * cada ingrediente; caso não haja ingredientes com custo, usa o campo
 * `cost` da própria receita.
 */
export function recipeCost(recipe: Recipe): number {
  const ingredientsTotalCost = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.reduce((sum, ing) => {
        const c = typeof ing.cost === 'number' ? ing.cost : 0
        return sum + (isNaN(c) ? 0 : c)
      }, 0)
    : 0
  return ingredientsTotalCost > 0 ? ingredientsTotalCost : recipe.cost || 0
}

/** Exibe apenas os últimos 8 caracteres do id (para tabelas compactas). */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id
}

/**
 * Rótulo de rendimento da receita — prefere `yield_quantity` + `yield_unit`,
 * com fallback para o campo livre `portions` e finalmente "—".
 */
export function yieldLabel(recipe: Recipe): string {
  if (recipe.yield_quantity) {
    return `${recipe.yield_quantity} ${recipe.yield_unit || 'porções'}`
  }
  return recipe.portions || '—'
}
