// Dietary restriction helpers shared by RecipeForm, RecipeDetail, RecipeCard
// and RecipesList. "Vegana" is a derived positive seal: shown when none of the
// animal-origin flags (dairy, eggs, fish, honey, ave, camarão) are set.

export type DietaryFlagKey =
  | 'contains_gluten'
  | 'contains_dairy'
  | 'contains_eggs'
  | 'contains_fish'
  | 'contains_honey'
  | 'contains_ave'
  | 'contains_camarao'

export interface DietaryState {
  contains_gluten?: boolean
  contains_dairy?: boolean
  contains_eggs?: boolean
  contains_fish?: boolean
  contains_honey?: boolean
  contains_ave?: boolean
  contains_camarao?: boolean
}

export interface DietaryToggle {
  key: DietaryFlagKey
  label: string
  /** Short label used in compact contexts (cards/filters). */
  short: string
}

/** The explicit toggles in the form, in display order. */
export const DIETARY_TOGGLES: DietaryToggle[] = [
  { key: 'contains_gluten', label: 'Contém glúten', short: 'Glúten' },
  { key: 'contains_dairy', label: 'Contém laticínio', short: 'Laticínio' },
  { key: 'contains_eggs', label: 'Contém ovos', short: 'Ovos' },
  { key: 'contains_fish', label: 'Contém peixe', short: 'Peixe' },
  { key: 'contains_honey', label: 'Contém mel', short: 'Mel' },
  { key: 'contains_ave', label: 'Contém ave', short: 'Ave' },
  { key: 'contains_camarao', label: 'Contém camarão', short: 'Camarão' },
]

export const ANIMAL_FLAGS: DietaryFlagKey[] = [
  'contains_dairy',
  'contains_eggs',
  'contains_fish',
  'contains_honey',
  'contains_ave',
  'contains_camarao',
]

/** True when no animal-origin flag is set — i.e. the recipe is vegan. */
export function isVegan(state: DietaryState): boolean {
  return !ANIMAL_FLAGS.some((f) => state[f])
}

export function isGlutenFree(state: DietaryState): boolean {
  return !state.contains_gluten
}

export function isDairyFree(state: DietaryState): boolean {
  return !state.contains_dairy
}

/**
 * Catalog filter facets. Each facet maps to a boolean predicate over a
 * DietaryState; the catalog filters by the recipes that satisfy it.
 */
export interface DietaryFacet {
  id: string
  label: string
  /** Predicate satisfied by recipes matching this facet. */
  match: (s: DietaryState) => boolean
}

export const DIETARY_FACETS: DietaryFacet[] = [
  { id: 'vegana', label: 'Vegana', match: isVegan },
  { id: 'sem-gluten', label: 'Sem glúten', match: isGlutenFree },
  { id: 'sem-laticinios', label: 'Sem laticínio', match: isDairyFree },
]

/** Build a default (all-false) dietary state for new forms. */
export function emptyDietary(): Required<DietaryState> {
  return {
    contains_gluten: false,
    contains_dairy: false,
    contains_eggs: false,
    contains_fish: false,
    contains_honey: false,
    contains_ave: false,
    contains_camarao: false,
  }
}
