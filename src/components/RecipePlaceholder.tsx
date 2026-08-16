import React from 'react'
import { Utensils } from 'lucide-react'

interface RecipePlaceholderProps {
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
}

export const RecipePlaceholder: React.FC<RecipePlaceholderProps> = ({
  className = 'h-48 w-full',
  iconSize = 'md',
}) => {
  const iconDimensions =
    iconSize === 'sm' ? 'w-6 h-6' : iconSize === 'lg' ? 'w-16 h-16' : 'w-10 h-10'

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#1E3326] via-[#2F4B3A] to-[#8C6433] flex items-center justify-center ${className}`}
    >
      {/* Decorative concentric circles subtle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-48 h-48 rounded-full border border-white/30" />
        <div className="absolute w-72 h-72 rounded-full border border-white/20" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-marfim/90 p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-black/20 backdrop-blur-xs flex items-center justify-center border border-bronze/40 mb-1 shadow-inner">
          <Utensils className={`${iconDimensions} text-bronze-light`} />
        </div>
        <span className="text-[11px] uppercase tracking-widest text-bronze-light font-medium mt-1">
          Biblioteca Culinária
        </span>
      </div>
    </div>
  )
}
