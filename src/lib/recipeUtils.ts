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

/**
 * Calcula o custo por porção de uma receita com base no custo total e no rendimento.
 * Retorna null se não houver custo ou rendimento positivo.
 */
export function recipeCostPerPortion(recipe: Recipe, explicitTotalCost?: number): number | null {
  const total = explicitTotalCost !== undefined ? explicitTotalCost : recipeCost(recipe)
  if (!total || total <= 0) return null

  // Tenta pelo yield_quantity
  if (recipe.yield_quantity && recipe.yield_quantity > 0) {
    return total / recipe.yield_quantity
  }

  // Tenta extrair número inicial do texto de portions (ex: "4 porções", "12 fatias")
  if (recipe.portions) {
    const match = recipe.portions.match(/^(\d+(?:[.,]\d+)?)/)
    if (match) {
      const parsed = parseFloat(match[1].replace(',', '.'))
      if (parsed > 0) return total / parsed
    }
  }

  return null
}
