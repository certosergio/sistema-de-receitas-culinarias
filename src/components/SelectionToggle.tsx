import React from 'react'
import { Star } from 'lucide-react'
import { useSelection } from '@/contexts/SelectionContext'
import { toast } from '@/hooks/use-toast'

interface SelectionToggleProps {
  recipeId: string
  /** 'sm' for the card corner; 'md' for the detail action bar. */
  size?: 'sm' | 'md'
  /** When true, renders a labelled button (used on the detail page). */
  labelled?: boolean
  className?: string
}

/**
 * Bookmark/star toggle that adds a recipe to the user's personal selection.
 * On the card it is a small icon button (top-left corner); on the detail
 * page it is a labelled outline button in the action bar.
 */
export const SelectionToggle: React.FC<SelectionToggleProps> = ({
  recipeId,
  size = 'sm',
  labelled = false,
  className = '',
}) => {
  const { isSelected, toggleSelection } = useSelection()
  const selected = isSelected(recipeId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const willSelect = !selected
    try {
      await toggleSelection(recipeId)
      toast({
        title: willSelect ? 'Adicionada à seleção' : 'Removida da seleção',
        description: willSelect
          ? 'A receita agora aparece em Receitas Selecionadas.'
          : 'A receita foi retirada da sua seleção.',
      })
    } catch {
      toast({
        title: 'Não foi possível atualizar a seleção',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    }
  }

  if (labelled) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-xs font-semibold shadow-xs transition-all active:scale-95 ${
          selected
            ? 'bg-bronze/15 border-bronze/40 text-bronze hover:bg-bronze/20 dark:bg-bronze/15 dark:border-bronze/40 dark:text-bronze'
            : 'bg-white border-marfim-border text-tinta hover:bg-marfim-card dark:bg-[#1E1C16] dark:border-[#322F26] dark:text-[#EFE9DD] dark:hover:bg-[#221F18]'
        } ${className}`}
      >
        <Star
          className={`w-4 h-4 ${selected ? 'fill-current text-bronze' : 'text-bronze'}`}
          strokeWidth={2}
        />
        <span>{selected ? 'Remover da seleção' : 'Adicionar à seleção'}</span>
      </button>
    )
  }

  const btnSize = size === 'md' ? 'w-10 h-10' : 'w-8 h-8'
  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={selected ? 'Remover da seleção' : 'Adicionar à seleção'}
      title={selected ? 'Remover da seleção' : 'Adicionar à seleção'}
      className={`${btnSize} rounded-full flex items-center justify-center backdrop-blur-md border shadow-xs transition-all active:scale-90 ${className} ${
        selected
          ? 'bg-bronze/95 border-bronze-light/50 text-white hover:bg-bronze-hover'
          : 'bg-white/85 dark:bg-[#1E1C16]/85 border-white/40 dark:border-[#322F26] text-bronze hover:bg-white dark:hover:bg-[#221F18]'
      }`}
    >
      <Star className={`${iconSize} ${selected ? 'fill-current' : ''}`} strokeWidth={2} />
    </button>
  )
}

export default SelectionToggle
