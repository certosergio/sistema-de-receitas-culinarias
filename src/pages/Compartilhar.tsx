import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  UtensilsCrossed,
  BookOpen,
  Clock,
  Users,
  ChefHat,
  Loader2,
  ArrowLeft,
  Flame,
  Scale,
  DollarSign,
  Zap,
  Lightbulb,
  X,
  Share2,
} from 'lucide-react'
import { fetchSharedCollection } from '@/services/collections'
import { SharedCollection, SharedRecipe } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const Compartilhar: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [data, setData] = useState<SharedCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<SharedRecipe | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!shareToken) {
        setError(true)
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await fetchSharedCollection(shareToken)
        if (cancelled) return
        setData(res)
      } catch (err) {
        console.error('Erro ao carregar coleção compartilhada:', err)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [shareToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-marfim flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-verde mb-3" />
        <p className="font-serif italic text-tinta-sec">Abrindo coleção compartilhada...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-marfim flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-verde-subtle border border-verde/20 flex items-center justify-center mx-auto mb-5">
          <BookOpen className="w-10 h-10 text-verde" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-tinta mb-2">Coleção não encontrada</h1>
        <p className="text-sm text-tinta-sec max-w-md mb-6 leading-relaxed">
          O link de compartilhamento é inválido, expirou ou foi desativado pelo autor. Solicite um
          novo link caso queira acessar esta coleção.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-verde hover:bg-verde-hover text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início</span>
        </a>
      </div>
    )
  }

  const { collection, recipes } = data

  return (
    <div className="min-h-screen bg-marfim flex flex-col text-tinta">
      {/* HEADER */}
      <header className="bg-white border-b border-marfim-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-verde flex items-center justify-center border border-bronze text-bronze shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-bronze" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-bronze font-semibold">
              Biblioteca Culinária — Coleção Compartilhada
            </span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-tinta tracking-tight leading-tight">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-sm sm:text-base text-tinta-sec leading-relaxed max-w-3xl mt-3">
              {collection.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-tinta-sec font-medium">
            <span className="flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-bronze" />
              Curadoria de {collection.author || 'Chef do Acervo'}
            </span>
            <span className="text-marfim-border">•</span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-bronze" />
              {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
            </span>
          </div>
        </div>
      </header>

      {/* RECIPES GRID */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {recipes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
            <BookOpen className="w-12 h-12 text-tinta-ter mx-auto mb-3" />
            <h3 className="font-serif text-2xl font-bold text-tinta">Coleção vazia</h3>
            <p className="text-sm text-tinta-sec max-w-md mx-auto mt-2">
              Esta coleção ainda não possui receitas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setSelected(recipe)}
                className="group block bg-white rounded-xl overflow-hidden border border-marfim-border shadow-card card-hover-lift transition-all duration-300 flex flex-col h-full text-left"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-marfim-card">
                  {recipe.cover ? (
                    <img
                      src={recipe.cover}
                      alt={recipe.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1E3326] via-[#2F4B3A] to-[#8C6433] flex items-center justify-center">
                      <UtensilsCrossed className="w-10 h-10 text-bronze-light/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-tinta/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  {recipe.difficulty && (
                    <span className="absolute top-3 left-3 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-tinta/80 text-marfim backdrop-blur-md border border-white/20">
                      {recipe.difficulty}
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      {recipe.category && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-marfim-card text-tinta-sec border border-marfim-border">
                          {recipe.category}
                        </span>
                      )}
                      {recipe.technique && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-verde-subtle text-verde border border-verde/20">
                          {recipe.technique}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-tinta leading-snug line-clamp-2 group-hover:text-verde transition-colors">
                      {recipe.title}
                    </h3>
                  </div>
                  <div className="pt-4 mt-4 border-t border-marfim-border/70 flex items-center justify-between text-xs text-tinta-ter font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-bronze" />
                      {recipe.total_minutes ? `${recipe.total_minutes} min` : 'Tempo s/ inf.'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-bronze" />
                      {recipe.yield_quantity
                        ? `${recipe.yield_quantity} ${recipe.yield_unit || 'porções'}`
                        : recipe.portions || 'Rendimento s/ inf.'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-marfim-border py-6 text-center text-xs text-tinta-ter bg-white/60">
        <p className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-bronze" />
          Compartilhado via Biblioteca Culinária
        </p>
      </footer>

      {/* RECIPE DETAIL DIALOG */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-white rounded-2xl border-marfim-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Ficha técnica resumida da receita {selected.title}.
              </DialogDescription>
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-tinta-ter hover:text-tinta hover:bg-marfim-card transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              {selected.cover && (
                <div className="relative w-full aspect-[16/8] -mx-6 -mt-6 mb-4 overflow-hidden sm:rounded-t-2xl">
                  <img
                    src={selected.cover}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-tinta/60 to-transparent" />
                </div>
              )}

              <DialogHeader className="px-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {selected.category && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-marfim-card text-tinta-sec border border-marfim-border">
                      {selected.category}
                    </span>
                  )}
                  {selected.technique && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-verde-subtle text-verde border border-verde/20">
                      {selected.technique}
                    </span>
                  )}
                  {selected.difficulty && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-tinta/80 text-marfim border border-white/20">
                      {selected.difficulty}
                    </span>
                  )}
                </div>
                <DialogTitle className="font-serif text-2xl sm:text-3xl font-bold text-tinta leading-tight">
                  {selected.title}
                </DialogTitle>
                {selected.summary && (
                  <DialogDescription className="text-sm text-tinta-sec leading-relaxed pt-1">
                    {selected.summary}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Technical data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1 py-3">
                <div className="p-3 rounded-xl bg-marfim border border-marfim-border">
                  <div className="flex items-center gap-1 text-tinta-ter">
                    <Users className="w-3.5 h-3.5 text-bronze" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Rendimento
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-tinta">
                    {selected.yield_quantity || '-'}{' '}
                    <span className="text-xs font-sans font-normal text-tinta-sec">
                      {selected.yield_unit || ''}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim border border-marfim-border">
                  <div className="flex items-center gap-1 text-tinta-ter">
                    <Clock className="w-3.5 h-3.5 text-verde" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Preparo
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-tinta">
                    {selected.prep_minutes ? `${selected.prep_minutes} min` : '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim border border-marfim-border">
                  <div className="flex items-center gap-1 text-tinta-ter">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Cozimento
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-tinta">
                    {selected.cook_minutes ? `${selected.cook_minutes} min` : '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-verde text-white border border-verde-light">
                  <div className="flex items-center gap-1 text-marfim/80">
                    <Zap className="w-3.5 h-3.5 text-bronze-light" />
                    <span className="text-[9px] uppercase tracking-wider font-bold text-bronze-light">
                      Total
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-white">
                    {selected.total_minutes || 0} min
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim border border-marfim-border col-span-2">
                  <div className="flex items-center gap-1 text-tinta-ter">
                    <Scale className="w-3.5 h-3.5 text-bronze" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Porção
                    </span>
                  </div>
                  <div className="font-serif text-base font-bold text-tinta line-clamp-1">
                    {selected.portions || 'Não especificada'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim border border-marfim-border col-span-2">
                  <div className="flex items-center gap-1 text-tinta-ter">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">Custo</span>
                  </div>
                  <div className="font-serif text-base font-bold text-tinta">
                    {selected.cost
                      ? `R$ ${Number(selected.cost).toFixed(2).replace('.', ',')}`
                      : 'Não calculado'}
                  </div>
                </div>
              </div>

              {/* Nutritional */}
              <div className="grid grid-cols-4 gap-2 px-1 pb-3">
                {[
                  { label: 'Calorias', value: selected.calories, unit: 'kcal' },
                  { label: 'Proteínas', value: selected.protein, unit: 'g' },
                  { label: 'Carboidratos', value: selected.carbs, unit: 'g' },
                  { label: 'Gorduras', value: selected.fat, unit: 'g' },
                ].map((n) => (
                  <div
                    key={n.label}
                    className="p-2 rounded-lg bg-marfim-card border border-marfim-border text-center"
                  >
                    <div className="text-[9px] uppercase tracking-wider text-tinta-ter font-semibold">
                      {n.label}
                    </div>
                    <div className="font-serif text-sm font-bold text-tinta">
                      {n.value || 0} {n.unit}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ingredients + Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 px-1 pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-tinta border-b border-marfim-border pb-1.5 mb-2">
                    Ingredientes
                  </h3>
                  <ul className="space-y-1.5 text-sm text-tinta">
                    {Array.isArray(selected.ingredients) && selected.ingredients.length > 0 ? (
                      selected.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex gap-1.5">
                          <span className="text-bronze">•</span>
                          <span>
                            {(ing.quantity || ing.unit) && (
                              <strong className="font-semibold mr-1">
                                {ing.quantity} {ing.unit}
                              </strong>
                            )}
                            {ing.name}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-tinta-ter">Nenhum ingrediente informado.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-tinta border-b border-marfim-border pb-1.5 mb-2">
                    Modo de preparo
                  </h3>
                  <ol className="space-y-2 text-sm text-tinta">
                    {Array.isArray(selected.method) && selected.method.length > 0 ? (
                      selected.method.map((step, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="font-serif font-bold text-bronze shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="flex-1">{step}</span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-tinta-ter">Nenhum passo informado.</li>
                    )}
                  </ol>
                </div>
              </div>

              {/* Tips */}
              {selected.tips && (
                <div className="mx-1 mb-2 rounded-xl border border-bronze/30 bg-bronze-subtle/40 p-4">
                  <div className="flex items-center gap-2 text-bronze-dark mb-1">
                    <Lightbulb className="w-4 h-4" />
                    <h3 className="font-serif text-base font-bold text-tinta">Dicas do Chef</h3>
                  </div>
                  <p className="text-sm text-tinta-sec italic leading-relaxed">
                    &ldquo;{selected.tips}&rdquo;
                  </p>
                </div>
              )}

              <div className="px-1 pt-2 border-t border-marfim-border text-center">
                <Link
                  to="/"
                  className="text-xs text-tinta-ter hover:text-bronze transition-colors inline-flex items-center gap-1"
                >
                  <UtensilsCrossed className="w-3 h-3" />
                  Conheça a Biblioteca Culinária
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Compartilhar
