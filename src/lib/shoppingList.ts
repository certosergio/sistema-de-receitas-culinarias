import type { Recipe } from '@/types'

/**
 * Shared shopping-list aggregation logic, used by both the live weekly
 * planner and the archived-week (history) viewer.
 */

export interface AggregatedIngredient {
  name: string
  quantities: string[]
  unit: string
  count: number
}

export interface ShoppingList {
  groups: { category: string; items: AggregatedIngredient[] }[]
  totalItems: number
  totalRecipes: number
}

/** Simple keyword-based grocery category guesser (Portuguese). */
const GROCERY_KEYWORDS: { category: string; words: string[] }[] = [
  {
    category: 'Hortifrúti',
    words: [
      'tomate',
      'cebola',
      'alho',
      'batata',
      'cenoura',
      'abobora',
      'abóbora',
      'pimentão',
      'pimentao',
      'alface',
      'rúcula',
      'rucula',
      'espinafre',
      'brócolis',
      'brocolis',
      'couve',
      'abobrinha',
      'berinjela',
      'pepino',
      'beterraba',
      'mandioca',
      'inhame',
      'cará',
      'cara',
      'chuchu',
      'quiabo',
      'jiló',
      'jilo',
      'limão',
      'limao',
      'laranja',
      'maçã',
      'maca',
      'banana',
      'mamão',
      'mamao',
      'abacaxi',
      'manga',
      'uva',
      'morango',
      'abacate',
      'pera',
      'pêra',
      'kiwi',
      'melancia',
      'melão',
      'melao',
      'ervilha',
      'feijão',
      'feijao',
      'grão',
      'grao',
      'lentilha',
      'grão-de-bico',
      'cogumelo',
      'champignon',
      'salsa',
      'coentro',
      'manjericão',
      'manjericao',
      'cebolinha',
      'hortelã',
      'hortela',
      'alecrim',
      'tomilho',
      'louro',
      'orégano',
      'oregano',
      'pimenta',
      'rucola',
    ],
  },
  {
    category: 'Laticínios',
    words: [
      'leite',
      'queijo',
      'manteiga',
      'requeijão',
      'requeijao',
      'iogurte',
      'creme de leite',
      'nata',
      'ricota',
      'mascarpone',
      'parmesão',
      'parmesao',
      'muçarela',
      'mussarela',
      'catupiry',
      'gorgonzola',
      'cream cheese',
    ],
  },
  {
    category: 'Carnes',
    words: [
      'frango',
      'carne',
      'boi',
      'porco',
      'bacon',
      'linguiça',
      'linguica',
      'presunto',
      'salsicha',
      'costela',
      'maminha',
      'alcatra',
      'picanha',
      'filé',
      'file',
      'coxinha',
      'sobrecoxa',
      'peito',
      'lombo',
      'pernil',
      'panceta',
      'pastrami',
      'defumado',
      'salame',
      'pepperoni',
      'calabresa',
      'fradinho',
      'carne moída',
      'carne moida',
      'patinho',
      'acém',
      'acem',
      'moela',
      'fígado',
      'figado',
      'salmão',
      'salmao',
      'atum',
      'bacalhau',
      'camarão',
      'camarao',
      'polvo',
      'lula',
      'merluza',
      'tilápia',
      'tilapia',
      'sardinha',
      'anchova',
      'truta',
      'crustáceo',
      'crustaceo',
      'marisco',
      'ostra',
      'vôngole',
      'vongole',
      'caranguejo',
    ],
  },
  {
    category: 'Despensa',
    words: [
      'farinha',
      'arroz',
      'macarrão',
      'macarrao',
      'massa',
      'espaguete',
      'penne',
      'fusilli',
      'talharim',
      'lasanha',
      'nhoque',
      'pão',
      'pao',
      'açúcar',
      'acucar',
      'sal',
      'óleo',
      'oleo',
      'azeite',
      'fermento',
      'baunilha',
      'canela',
      'cravo',
      'noz-moscada',
      'cominho',
      'açafrão',
      'acafrao',
      'cúrcuma',
      'curcuma',
      'páprica',
      'paprica',
      'ervas',
      'chocolate',
      'cacau',
      'cacao',
      'mel',
      'geleia',
      'fubá',
      'fuba',
      'polenta',
      'aveia',
      'granola',
      'quinoa',
      'trigo',
      'centeio',
      'amendoim',
      'castanha',
      'nozes',
      'amêndoa',
      'amendoa',
      'uva passa',
      'tâmaras',
      'tamaras',
      'cranberry',
      'coco',
      'leite de coco',
      'shoyu',
      'molho de soja',
      'molho inglês',
      'molho ingles',
      'mostarda',
      'ketchup',
      'maionese',
      'extrato de tomate',
      'molho de tomate',
      'passata',
      'tomate pelado',
      'vinagre',
      'xerez',
      'balsâmico',
      'balsamico',
      'saquê',
      'sake',
      'mirin',
      'cogumelo seco',
      'fungo',
      'shiitake',
      'shimeji',
      'ervas finas',
    ],
  },
]

function guessGroceryCategory(name: string): string {
  const lower = name.toLowerCase()
  for (const group of GROCERY_KEYWORDS) {
    if (group.words.some((w) => lower.includes(w))) {
      return group.category
    }
  }
  return 'Outros'
}

/** Aggregates ingredients across the given recipes, grouping by name and
 *  grocery category. Quantities are summed textually (same unit merged). */
export function buildShoppingList(recipes: Recipe[]): ShoppingList {
  const map = new Map<string, AggregatedIngredient>()
  const usedRecipeIds = new Set<string>()

  for (const recipe of recipes) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) continue
    usedRecipeIds.add(recipe.id)
    for (const ing of recipe.ingredients) {
      const rawName = (ing.name || '').trim()
      if (!rawName) continue
      const key = rawName.toLowerCase().replace(/\s+/g, ' ').trim()
      const unit = (ing.unit || '').trim()
      const quantity = (ing.quantity || '').trim()
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        if (quantity) existing.quantities.push(quantity)
        if (unit && !existing.unit) existing.unit = unit
      } else {
        map.set(key, {
          name: rawName,
          quantities: quantity ? [quantity] : [],
          unit,
          count: 1,
        })
      }
    }
  }

  const groupsMap = new Map<string, AggregatedIngredient[]>()
  for (const item of map.values()) {
    const cat = guessGroceryCategory(item.name)
    if (!groupsMap.has(cat)) groupsMap.set(cat, [])
    groupsMap.get(cat)!.push(item)
  }

  const categoryOrder = ['Hortifrúti', 'Laticínios', 'Carnes', 'Despensa', 'Outros']
  const groups = categoryOrder
    .filter((c) => groupsMap.has(c))
    .map((category) => ({
      category,
      items: groupsMap.get(category)!.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }))

  return {
    groups,
    totalItems: map.size,
    totalRecipes: usedRecipeIds.size,
  }
}
