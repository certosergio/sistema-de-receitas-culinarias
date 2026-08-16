import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getRecipes } from '@/services/recipes'
import { getCategories } from '@/services/categories'
import { getTechniques } from '@/services/techniques'
import { Recipe, Category, Technique } from '@/types'
import { RecipeCard } from '@/components/RecipeCard'
import {
  BookOpen,
  FolderTree,
  Flame,
  PieChart,
  Plus,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const Index: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)
        const [recList, catList, techList] = await Promise.all([
          getRecipes({ sort: 'recentes' }),
          getCategories(),
          getTechniques(),
        ])
        if (isMounted) {
          setRecipes(recList)
          setCategories(catList)
          setTechniques(techList)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  // Formatted date in pt-BR
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  // Average yield calculation
  const totalYield = recipes.reduce((acc, r) => acc + (r.yield_quantity || 0), 0)
  const recipesWithYield = recipes.filter((r) => (r.yield_quantity || 0) > 0).length
  const avgYield = recipesWithYield > 0 ? (totalYield / recipesWithYield).toFixed(1) : '-'

  const recentRecipes = recipes.slice(0, 6)

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* HEADER WITH GREETING & QUICK CTA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-marfim-border">
        <div>
          <span className="label-caps block mb-1">Visão Geral do Acervo</span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-tinta tracking-tight">
            {getGreeting()}, {user?.name || 'Chef'}
          </h1>
          <p className="text-sm sm:text-base text-tinta-sec capitalize mt-1.5 font-serif italic">
            {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/receitas/nova')}
            className="hidden sm:inline-flex bg-bronze hover:bg-bronze-hover text-white shadow-md hover:shadow-lg font-medium rounded-xl px-5 py-6 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Receita</span>
          </Button>
        </div>
      </div>

      {/* STATS CARDS (2x2 Mobile, 4 Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Receitas */}
        <Link
          to="/receitas"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-marfim-border shadow-card card-hover-lift group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label-caps">Total de Receitas</span>
            <div className="w-10 h-10 rounded-full bg-verde-subtle text-verde flex items-center justify-center group-hover:bg-verde group-hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-tinta">
            {loading ? '-' : recipes.length}
          </div>
          <p className="text-xs text-tinta-sec mt-1">Registradas no acervo</p>
        </Link>

        {/* Total Categorias */}
        <Link
          to="/categorias"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-marfim-border shadow-card card-hover-lift group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label-caps">Categorias</span>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-700 group-hover:text-white transition-colors">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-tinta">
            {loading ? '-' : categories.length}
          </div>
          <p className="text-xs text-tinta-sec mt-1">Seções gastronômicas</p>
        </Link>

        {/* Total Técnicas */}
        <Link
          to="/tecnicas"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-marfim-border shadow-card card-hover-lift group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label-caps">Técnicas</span>
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-700 flex items-center justify-center group-hover:bg-orange-700 group-hover:text-white transition-colors">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-tinta">
            {loading ? '-' : techniques.length}
          </div>
          <p className="text-xs text-tinta-sec mt-1">Métodos de preparo</p>
        </Link>

        {/* Rendimento Médio */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-marfim-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="label-caps">Rendimento Médio</span>
            <div className="w-10 h-10 rounded-full bg-marfim-card text-tinta-sec flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-tinta">
            {loading ? '-' : `${avgYield}`}
          </div>
          <p className="text-xs text-tinta-sec mt-1">Porções por receita</p>
        </div>
      </div>

      {/* RECENT RECIPES SECTION */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="label-caps block mb-0.5">Últimas adições</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
              Adicionadas Recentemente
            </h2>
          </div>
          <Link
            to="/receitas"
            className="text-sm font-medium text-bronze hover:text-bronze-hover flex items-center gap-1 group"
          >
            <span>Ver todo o acervo</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-marfim-border">
            <Loader2 className="w-8 h-8 animate-spin text-verde" />
          </div>
        ) : recentRecipes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-marfim-border">
            <Sparkles className="w-10 h-10 text-bronze mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-tinta">Nenhuma receita cadastrada</h3>
            <p className="text-sm text-tinta-sec max-w-md mx-auto mt-1 mb-5">
              Comece agora registrando sua primeira receita com ficha técnica detalhada.
            </p>
            <Button
              onClick={() => navigate('/receitas/nova')}
              className="bg-verde hover:bg-verde-hover text-white rounded-xl"
            >
              + Nova Receita
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      {/* CATEGORIES & TECHNIQUES EXPLORATION BARS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Categories Chips */}
        <section className="bg-white p-6 sm:p-7 rounded-2xl border border-marfim-border shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-marfim-border/70 pb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-verde" />
              <h3 className="font-serif text-xl font-bold text-tinta">Categorias do Acervo</h3>
            </div>
            <Link to="/categorias" className="text-xs font-semibold text-bronze hover:underline">
              Ver todas
            </Link>
          </div>
          <p className="text-xs text-tinta-sec leading-relaxed">
            Navegue pelas seções gastronômicas do acervo e descubra receitas por tipo de prato:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/receitas?categoria=${cat.id}`}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-marfim text-tinta hover:bg-verde hover:text-white border border-marfim-border transition-all shadow-xs"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Techniques Chips */}
        <section className="bg-white p-6 sm:p-7 rounded-2xl border border-marfim-border shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-marfim-border/70 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-bronze" />
              <h3 className="font-serif text-xl font-bold text-tinta">Técnicas em Destaque</h3>
            </div>
            <Link to="/tecnicas" className="text-xs font-semibold text-bronze hover:underline">
              Ver todas
            </Link>
          </div>
          <p className="text-xs text-tinta-sec leading-relaxed">
            Filtre seu acervo pelo método de cozimento e transformação culinária:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {techniques.map((tech) => (
              <Link
                key={tech.id}
                to={`/receitas?tecnica=${tech.id}`}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-bronze-subtle text-tinta hover:bg-bronze hover:text-white border border-bronze/20 transition-all shadow-xs"
              >
                {tech.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Index
