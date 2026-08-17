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
import { RecipeCardDietary } from '@/components/RecipeCardDietary'
import type { DietaryState } from '@/lib/dietary'
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
      <div className="min-h-screen bg-marfim dark:bg-[#15140F] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-verde dark:text-[#A9C4B5] mb-3" />
        <p className="font-serif italic text-tinta-sec dark:text-[#B5AE9F]">
          Abrindo coleção compartilhada...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-marfim dark:bg-[#15140F] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-verde-subtle dark:bg-[#1E3326] border border-verde/20 dark:border-[#3F614C]/40 flex items-center justify-center mx-auto mb-5">
          <BookOpen className="w-10 h-10 text-verde dark:text-[#A9C4B5]" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-tinta dark:text-[#EFE9DD] mb-2">
          Coleção não encontrada
        </h1>
        <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] max-w-md mb-6 leading-relaxed">
          O link de compartilhamento é inválido, expirou ou foi desativado pelo autor. Solicite um
          novo link caso queira acessar esta coleção.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-verde dark:bg-[#24392C] hover:bg-verde-hover dark:hover:bg-[#2F4B3A] text-white dark:text-[#EFE9DD] rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início</span>
        </a>
      </div>
    )
  }

  const { collection, recipes } = data

  return (
    <div className="min-h-screen bg-marfim dark:bg-[#15140F] flex flex-col text-tinta dark:text-[#EFE9DD]">
      {/* BANNER — "Coleção compartilhada da Biblioteca Culinária" */}
      <div className="w-full bg-verde dark:bg-[#1E3326] border-b border-bronze/30 dark:border-[#D4A86A]/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-center">
          <Share2 className="w-3.5 h-3.5 text-bronze-light dark:text-[#E3BD84]" />
          <span className="text-[11px] sm:text-xs font-medium tracking-wide text-marfim/90 dark:text-[#EFE9DD]/90">
            Coleção compartilhada da Biblioteca Culinária
          </span>
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-white dark:bg-[#1E1C16] border-b border-marfim-border dark:border-[#322F26] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-verde dark:bg-[#24392C] flex items-center justify-center border border-bronze dark:border-[#D4A86A]/40 text-bronze dark:text-[#D4A86A] shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-bronze dark:text-[#D4A86A]" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-bronze dark:text-[#D4A86A] font-semibold">
              Biblioteca Culinária — Coleção Compartilhada
            </span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-tinta dark:text-[#EFE9DD] tracking-tight leading-tight">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-sm sm:text-base text-tinta-sec dark:text-[#B5AE9F] leading-relaxed max-w-3xl mt-3">
              {collection.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-tinta-sec dark:text-[#B5AE9F] font-medium">
            <span className="flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
              Curadoria de {collection.author || 'Chef do Acervo'}
            </span>
            <span className="text-marfim-border dark:text-[#322F26]">•</span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
              {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
            </span>
          </div>
        </div>
      </header>

      {/* RECIPES GRID */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {recipes.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1C16] rounded-2xl p-12 text-center border border-dashed border-marfim-border dark:border-[#322F26] shadow-card">
            <BookOpen className="w-12 h-12 text-tinta-ter dark:text-[#8F887B] mx-auto mb-3" />
            <h3 className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD]">
              Coleção vazia
            </h3>
            <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] max-w-md mx-auto mt-2">
              Esta coleção ainda não possui receitas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setSelected(recipe)}
                className="group block bg-white dark:bg-[#1E1C16] rounded-xl overflow-hidden border border-marfim-border dark:border-[#322F26] shadow-card card-hover-lift transition-all duration-300 flex flex-col h-full text-left"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-marfim-card dark:bg-[#221F18]">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-tinta/50 dark:from-[#0E0D0A]/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  {recipe.difficulty && (
                    <span className="absolute top-3 left-3 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-tinta/80 dark:bg-[#15140F]/90 text-marfim dark:text-[#EFE9DD] backdrop-blur-md border border-white/20 dark:border-white/15">
                      {recipe.difficulty}
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      {recipe.category && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-marfim-card dark:bg-[#221F18] text-tinta-sec dark:text-[#B5AE9F] border border-marfim-border dark:border-[#322F26]">
                          {recipe.category}
                        </span>
                      )}
                      {recipe.technique && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-verde-subtle dark:bg-[#1E3326] text-verde dark:text-[#A9C4B5] border border-verde/20 dark:border-[#3F614C]/40">
                          {recipe.technique}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-tinta dark:text-[#EFE9DD] leading-snug line-clamp-2 group-hover:text-verde dark:group-hover:text-[#A9C4B5] transition-colors">
                      {recipe.title}
                    </h3>
                    {recipe.summary && (
                      <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] line-clamp-2 mt-2 leading-relaxed">
                        {recipe.summary}
                      </p>
                    )}
                    <div className="mt-2.5">
                      <RecipeCardDietary state={recipe as DietaryState} />
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-marfim-border/70 dark:border-[#322F26] flex items-center justify-between text-xs text-tinta-ter dark:text-[#8F887B] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
                      {recipe.total_minutes ? `${recipe.total_minutes} min` : 'Tempo s/ inf.'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
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
      <footer className="w-full border-t border-marfim-border dark:border-[#322F26] py-6 text-center text-xs text-tinta-ter dark:text-[#8F887B] bg-white/60 dark:bg-[#1E1C16]/60">
        <p className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
          Compartilhado via Biblioteca Culinária
        </p>
      </footer>

      {/* RECIPE DETAIL DIALOG */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Ficha técnica resumida da receita {selected.title}.
              </DialogDescription>
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-tinta-ter dark:text-[#8F887B] hover:text-tinta dark:hover:text-[#EFE9DD] hover:bg-marfim-card dark:hover:bg-[#221F18] transition-colors z-10"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-tinta/60 dark:from-[#0E0D0A]/80 to-transparent" />
                </div>
              )}

              <DialogHeader className="px-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {selected.category && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-marfim-card dark:bg-[#221F18] text-tinta-sec dark:text-[#B5AE9F] border border-marfim-border dark:border-[#322F26]">
                      {selected.category}
                    </span>
                  )}
                  {selected.technique && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-verde-subtle dark:bg-[#1E3326] text-verde dark:text-[#A9C4B5] border border-verde/20 dark:border-[#3F614C]/40">
                      {selected.technique}
                    </span>
                  )}
                  {selected.difficulty && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-tinta/80 dark:bg-[#15140F]/90 text-marfim dark:text-[#EFE9DD] border border-white/20 dark:border-white/15">
                      {selected.difficulty}
                    </span>
                  )}
                </div>
                <DialogTitle className="font-serif text-2xl sm:text-3xl font-bold text-tinta dark:text-[#EFE9DD] leading-tight">
                  {selected.title}
                </DialogTitle>
                {selected.summary && (
                  <DialogDescription className="text-sm text-tinta-sec dark:text-[#B5AE9F] leading-relaxed pt-1">
                    {selected.summary}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Technical data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1 py-3">
                <div className="p-3 rounded-xl bg-marfim dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26]">
                  <div className="flex items-center gap-1 text-tinta-ter dark:text-[#8F887B]">
                    <Users className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Rendimento
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD]">
                    {selected.yield_quantity || '-'}{' '}
                    <span className="text-xs font-sans font-normal text-tinta-sec dark:text-[#B5AE9F]">
                      {selected.yield_unit || ''}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26]">
                  <div className="flex items-center gap-1 text-tinta-ter dark:text-[#8F887B]">
                    <Clock className="w-3.5 h-3.5 text-verde dark:text-[#A9C4B5]" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Preparo
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD]">
                    {selected.prep_minutes ? `${selected.prep_minutes} min` : '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26]">
                  <div className="flex items-center gap-1 text-tinta-ter dark:text-[#8F887B]">
                    <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-[#E0C068]" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Cozimento
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD]">
                    {selected.cook_minutes ? `${selected.cook_minutes} min` : '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-verde dark:bg-[#24392C] text-white dark:text-[#EFE9DD] border border-verde-light dark:border-[#3F614C]/40">
                  <div className="flex items-center gap-1 text-marfim/80 dark:text-[#EFE9DD]/80">
                    <Zap className="w-3.5 h-3.5 text-bronze-light dark:text-[#E3BD84]" />
                    <span className="text-[9px] uppercase tracking-wider font-bold text-bronze-light dark:text-[#E3BD84]">
                      Total
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-white dark:text-[#EFE9DD]">
                    {selected.total_minutes || 0} min
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26] col-span-2">
                  <div className="flex items-center gap-1 text-tinta-ter dark:text-[#8F887B]">
                    <Scale className="w-3.5 h-3.5 text-bronze dark:text-[#D4A86A]" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Porção
                    </span>
                  </div>
                  <div className="font-serif text-base font-bold text-tinta dark:text-[#EFE9DD] line-clamp-1">
                    {selected.portions || 'Não especificada'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-marfim dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26] col-span-2">
                  <div className="flex items-center gap-1 text-tinta-ter dark:text-[#8F887B]">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-700 dark:text-[#6FAE86]" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">Custo</span>
                  </div>
                  <div className="font-serif text-base font-bold text-tinta dark:text-[#EFE9DD]">
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
                    className="p-2 rounded-lg bg-marfim-card dark:bg-[#221F18] border border-marfim-border dark:border-[#322F26] text-center"
                  >
                    <div className="text-[9px] uppercase tracking-wider text-tinta-ter dark:text-[#8F887B] font-semibold">
                      {n.label}
                    </div>
                    <div className="font-serif text-sm font-bold text-tinta dark:text-[#EFE9DD]">
                      {n.value || 0} {n.unit}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ingredients + Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 px-1 pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD] border-b border-marfim-border dark:border-[#322F26] pb-1.5 mb-2">
                    Ingredientes
                  </h3>
                  <ul className="space-y-1.5 text-sm text-tinta dark:text-[#EFE9DD]">
                    {Array.isArray(selected.ingredients) && selected.ingredients.length > 0 ? (
                      selected.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex gap-1.5">
                          <span className="text-bronze dark:text-[#D4A86A]">•</span>
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
                      <li className="italic text-tinta-ter dark:text-[#8F887B]">
                        Nenhum ingrediente informado.
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD] border-b border-marfim-border dark:border-[#322F26] pb-1.5 mb-2">
                    Modo de preparo
                  </h3>
                  <ol className="space-y-2 text-sm text-tinta dark:text-[#EFE9DD]">
                    {Array.isArray(selected.method) && selected.method.length > 0 ? (
                      selected.method.map((step, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="font-serif font-bold text-bronze dark:text-[#D4A86A] shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="flex-1">{step}</span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-tinta-ter dark:text-[#8F887B]">
                        Nenhum passo informado.
                      </li>
                    )}
                  </ol>
                </div>
              </div>

              {/* Tips */}
              {selected.tips && (
                <div className="mx-1 mb-2 rounded-xl border border-bronze/30 dark:border-[#D4A86A]/30 bg-bronze-subtle/40 dark:bg-[#3A2E1C]/55 p-4">
                  <div className="flex items-center gap-2 text-bronze-dark dark:text-[#D4A86A] mb-1">
                    <Lightbulb className="w-4 h-4" />
                    <h3 className="font-serif text-base font-bold text-tinta dark:text-[#EFE9DD]">
                      Dicas do Chef
                    </h3>
                  </div>
                  <p className="text-sm text-tinta-sec dark:text-[#B5AE9F] italic leading-relaxed">
                    &ldquo;{selected.tips}&rdquo;
                  </p>
                </div>
              )}

              <div className="px-1 pt-2 border-t border-marfim-border dark:border-[#322F26] text-center">
                <Link
                  to="/"
                  className="text-xs text-tinta-ter dark:text-[#8F887B] hover:text-bronze dark:hover:text-[#D4A86A] transition-colors inline-flex items-center gap-1"
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
