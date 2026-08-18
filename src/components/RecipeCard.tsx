import React from 'react'
import { Link } from 'react-router-dom'
import { Recipe } from '@/types'
import { getRecipeCoverUrl, isRecipeComplete } from '@/services/recipes'
import { RecipePlaceholder } from './RecipePlaceholder'
import { RecipeActions } from './RecipeActions'
import { Clock, Users, Award, ChefHat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RecipeCardDietary } from './RecipeCardDietary'
import { SelectionToggle } from './SelectionToggle'

interface RecipeCardProps {
  recipe: Recipe
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const coverUrl = getRecipeCoverUrl(recipe)
  const isComplete = isRecipeComplete(recipe)

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'Fácil':
        return 'bg-emerald-800/90 text-emerald-100 border-emerald-600/30'
      case 'Médio':
        return 'bg-amber-800/90 text-amber-100 border-amber-600/30'
      case 'Difícil':
        return 'bg-rose-900/90 text-rose-100 border-rose-700/30'
      default:
        return 'bg-tinta/80 text-marfim border-white/20'
    }
  }

  return (
    <Link
      to={`/receitas/${recipe.id}`}
      className="group block bg-white rounded-xl overflow-hidden border border-marfim-border shadow-card card-hover-lift transition-all duration-300 flex flex-col h-full"
    >
      {/* Cover Image / Placeholder container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-marfim-card">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <RecipePlaceholder className="w-full h-full" />
        )}

        {/* Gradient Veil */}
        <div className="absolute inset-0 bg-gradient-to-t from-tinta/60 via-transparent to-transparent opacity-60 dark:opacity-80 dark:group-hover:opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Badges on Top */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          {recipe.difficulty && (
            <span
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs border ${getDifficultyColor(
                recipe.difficulty,
              )}`}
            >
              {recipe.difficulty}
            </span>
          )}

          {isComplete && (
            <span className="ml-auto inline-flex items-center gap-1 bg-gradient-to-r from-amber-600 to-amber-700 text-amber-50 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md border border-amber-400/40 tracking-wider uppercase">
              <Award className="w-3 h-3 text-amber-200" />
              <span>Ficha Completa</span>
            </span>
          )}
        </div>

        {/* Favorite & collection actions (top-right, below badges) */}
        <div className="absolute top-3 right-3 mt-7 pointer-events-auto">
          <RecipeActions recipeId={recipe.id} size="sm" />
        </div>

        {/* Dietary icons (bottom-left of cover) */}
        <div className="absolute bottom-3 left-3 pointer-events-none">
          <RecipeCardDietary state={recipe} />
        </div>
      </div>
      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Technique Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {recipe.expand?.category && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-marfim-card dark:bg-[#221F18] text-tinta-sec dark:text-[#B5AE9F] border border-marfim-border dark:border-[#322F26]">
                {recipe.expand.category.name}
              </span>
            )}
            {recipe.expand?.technique && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-verde-subtle dark:bg-verde-dark-subtle text-verde dark:text-[#A9C4B5] border border-verde/20 dark:border-verde/40">
                {recipe.expand.technique.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl font-bold text-tinta dark:text-[#EFE9DD] leading-snug line-clamp-2 group-hover:text-verde dark:group-hover:text-[#A9C4B5] transition-colors">
            {recipe.title}
          </h3>

          {/* Summary */}
          {recipe.summary && (
            <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] line-clamp-2 mt-2 leading-relaxed">
              {recipe.summary}
            </p>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="pt-4 mt-4 border-t border-marfim-border/70 dark:border-[#322F26] flex items-center justify-between text-xs text-tinta-ter dark:text-[#8F887B] font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-bronze" />
            <span>{recipe.total_minutes ? `${recipe.total_minutes} min` : 'Tempo s/ inf.'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-bronze" />
            <span>
              {recipe.yield_quantity
                ? `${recipe.yield_quantity} ${recipe.yield_unit || 'porções'}`
                : recipe.portions || 'Rendimento s/ inf.'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
