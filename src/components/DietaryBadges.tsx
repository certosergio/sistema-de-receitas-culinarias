import React from 'react'
import { Check, Leaf, Wheat, MilkOff, Egg, Fish, Droplet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { DietaryState } from '@/lib/dietary'
import { DIETARY_TOGGLES, isVegan, type DietaryFlagKey } from '@/lib/dietary'

/**
 * Toggle chips for the recipe form. Light background with border, filled
 * (verde) when active. Renders the derived "Vegana" seal as a read-only
 * indicator when no animal-origin flag is set.
 */
interface DietaryChipsProps {
  state: DietaryState
  onChange: (key: DietaryFlagKey, value: boolean) => void
}

const FLAG_ICON: Record<DietaryFlagKey, React.ComponentType<{ className?: string }>> = {
  contains_gluten: Wheat,
  contains_dairy: MilkOff,
  contains_eggs: Egg,
  contains_fish: Fish,
  contains_honey: Droplet,
}

export const DietaryChips: React.FC<DietaryChipsProps> = ({ state, onChange }) => {
  const vegan = isVegan(state)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DIETARY_TOGGLES.map((toggle) => {
          const active = Boolean(state[toggle.key])
          const Icon = FLAG_ICON[toggle.key]
          return (
            <button
              key={toggle.key}
              type="button"
              onClick={() => onChange(toggle.key, !active)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all border ${
                active
                  ? 'bg-verde text-white border-verde shadow-xs'
                  : 'bg-marfim/50 text-tinta-sec border-marfim-border hover:border-bronze hover:text-tinta'
              }`}
              aria-pressed={active}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{toggle.label}</span>
              {active && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          )
        })}
      </div>

      {/* Derived vegan seal */}
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          vegan
            ? 'bg-verde-subtle text-verde border-verde/30'
            : 'bg-marfim-card text-tinta-ter border-marfim-border opacity-60'
        }`}
        title={
          vegan
            ? 'Nenhum ingrediente de origem animal marcado — receita classificada como vegana.'
            : 'Sem laticínios, ovos, peixe e mel, o selo Vegana aparece automaticamente.'
        }
      >
        <Leaf className="w-3.5 h-3.5" />
        <span>Vegana</span>
        {vegan && <Check className="w-3 h-3 ml-0.5" />}
      </div>
      <p className="text-[11px] text-tinta-ter leading-relaxed">
        O selo <strong>Vegana</strong> é exibido automaticamente quando nenhum ingrediente de origem
        animal (laticínios, ovos, peixe, mel) está marcado.
      </p>
    </div>
  )
}

/** Small badges for the recipe detail page, in the verde/bronze/marfim palette. */
export const DietaryBadges: React.FC<{ state: DietaryState }> = ({ state }) => {
  const vegan = isVegan(state)
  const glutenFree = !state.contains_gluten
  const dairyFree = !state.contains_dairy
  const hasAny =
    vegan ||
    state.contains_gluten ||
    state.contains_dairy ||
    state.contains_eggs ||
    state.contains_fish ||
    state.contains_honey

  if (!hasAny) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {vegan && (
        <Badge className="bg-verde-subtle text-verde border border-verde/30 text-[11px] gap-1 px-2.5 py-0.5">
          <Leaf className="w-3 h-3" />
          Vegana
        </Badge>
      )}
      {glutenFree && !vegan && (
        <Badge className="bg-marfim-card text-verde border border-verde/20 text-[11px] gap-1 px-2.5 py-0.5">
          <Wheat className="w-3 h-3" />
          Sem glúten
        </Badge>
      )}
      {dairyFree && !vegan && (
        <Badge className="bg-marfim-card text-bronze border border-bronze/20 text-[11px] gap-1 px-2.5 py-0.5">
          <MilkOff className="w-3 h-3" />
          Sem laticínios
        </Badge>
      )}
      {state.contains_gluten && (
        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] gap-1 px-2.5 py-0.5">
          <Wheat className="w-3 h-3" />
          Com glúten
        </Badge>
      )}
      {state.contains_dairy && (
        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] gap-1 px-2.5 py-0.5">
          <MilkOff className="w-3 h-3" />
          Com laticínios
        </Badge>
      )}
      {state.contains_eggs && (
        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] gap-1 px-2.5 py-0.5">
          <Egg className="w-3 h-3" />
          Com ovos
        </Badge>
      )}
      {state.contains_fish && (
        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] gap-1 px-2.5 py-0.5">
          <Fish className="w-3 h-3" />
          Com peixe
        </Badge>
      )}
      {state.contains_honey && (
        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] gap-1 px-2.5 py-0.5">
          <Droplet className="w-3 h-3" />
          Com mel
        </Badge>
      )}
    </div>
  )
}
