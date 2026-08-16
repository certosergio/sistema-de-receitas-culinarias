import React from 'react'
import { Leaf, WheatOff } from 'lucide-react'
import type { DietaryState } from '@/lib/dietary'
import { isVegan } from '@/lib/dietary'

/**
 * Compact dietary icons shown on catalog cards. Only positive indicators
 * (Vegana, Sem glúten) appear, as subtle small icons over the cover.
 */
export const RecipeCardDietary: React.FC<{ state: DietaryState }> = ({ state }) => {
  const vegan = isVegan(state)
  const glutenFree = !state.contains_gluten
  if (!vegan && !glutenFree) return null

  return (
    <div className="flex items-center gap-1">
      {vegan && (
        <span
          title="Vegana"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-verde/90 text-white shadow-xs"
        >
          <Leaf className="w-3 h-3" />
        </span>
      )}
      {glutenFree && !vegan && (
        <span
          title="Sem glúten"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-marfim/90 text-verde border border-verde/30 shadow-xs"
        >
          <WheatOff className="w-3 h-3" />
        </span>
      )}
    </div>
  )
}
