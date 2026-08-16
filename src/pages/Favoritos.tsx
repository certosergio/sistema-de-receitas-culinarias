import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Loader2, BookOpen, ArrowRight } from 'lucide-react'
import { fetchFavoriteRecipes } from '@/services/favorites'
import { Recipe } from '@/types'
import { RecipeCard } from '@/components/RecipeCard'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'

const Favoritos: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      const list = await fetchFavoriteRecipes()
      setRecipes(list)
    } catch (err) {
      console.error('Erro ao carregar favoritos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Refresh when a favorite is added/removed elsewhere.
  useRealtime('favorites', () => {
    load()
  })

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <span className="label-caps block mb-1">Suas Receitas Preferidas</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-tinta tracking-tight">
              Favoritos
            </h1>
            <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium">
              {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-3" />
          <p className="text-sm font-serif italic text-tinta-sec">Carregando seus favoritos...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <div className="w-20 h-20 rounded-full bg-bronze-subtle border border-bronze/30 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-10 h-10 text-bronze" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-tinta">Nenhum favorito ainda</h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-2 mb-6 leading-relaxed">
            Toque no coração de uma receita para guardá-la aqui. Seus favoritos ficam sempre à mão
            para consulta rápida.
          </p>
          <Button asChild className="bg-verde hover:bg-verde-hover text-white rounded-xl">
            <Link to="/receitas">
              <BookOpen className="w-4 h-4 mr-2" />
              Explorar receitas
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Favoritos
