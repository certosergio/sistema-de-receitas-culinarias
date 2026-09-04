import React from 'react'
import { AlertTriangle, CheckCircle2, Sliders } from 'lucide-react'
import { formatBRL } from '@/lib/recipeUtils'

interface CostAlertBadgeProps {
  costPerPortion: number | null
  limit: number | null
  size?: 'sm' | 'md'
  showStatusText?: boolean
  className?: string
  onConfigureClick?: () => void
}

/**
 * Badge elegante e discreto para status de custo por porção em relação ao limite estipulado.
 * - Excede o limite: âmbar avermelhado sutil com ícone de alerta
 * - Dentro do limite: verde sutil com ícone de check
 * - Sem limite configurado: texto neutro ou convite discreto para configurar
 */
export const CostAlertBadge: React.FC<CostAlertBadgeProps> = ({
  costPerPortion,
  limit,
  size = 'sm',
  showStatusText = true,
  className = '',
  onConfigureClick,
}) => {
  // Se a receita não tem custo por porção calculado
  if (costPerPortion === null || costPerPortion <= 0) {
    return null
  }

  // Sem limite configurado
  if (limit === null || limit <= 0) {
    if (!onConfigureClick) return null
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onConfigureClick()
        }}
        className={`inline-flex items-center gap-1 text-[10px] text-tinta-ter hover:text-bronze underline-offset-2 hover:underline transition-colors ${className}`}
        title="Defina uma meta de custo por porção para ativar os alertas automáticos"
      >
        <Sliders className="w-3 h-3 text-tinta-ter/70" />
        <span>Definir teto</span>
      </button>
    )
  }

  const isExceeded = costPerPortion > limit
  const diff = Math.abs(costPerPortion - limit)

  if (isExceeded) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded-full border transition-colors ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-rose-50/90 text-rose-800 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 ${className}`}
        title={`Custo por porção (${formatBRL(costPerPortion)}) excede a meta de ${formatBRL(limit)} (+${formatBRL(diff)}/un)`}
      >
        <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
        {showStatusText ? <span>Acima do teto (+{formatBRL(diff)})</span> : <span>Acima</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-full border transition-colors ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } bg-emerald-50/80 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 ${className}`}
      title={`Custo por porção (${formatBRL(costPerPortion)}) dentro do teto de ${formatBRL(limit)}`}
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
      {showStatusText ? <span>Dentro do teto</span> : <span>No teto</span>}
    </span>
  )
}
