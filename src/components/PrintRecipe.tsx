import { createPortal } from 'react-dom'
import { Recipe } from '@/types'

interface PrintPortalProps {
  recipe: Recipe
  coverUrl: string | null
}

const WEEKDAYS_LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
]

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso)
    return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
  } catch {
    return ''
  }
}

/**
 * A print-only rendering of the recipe ficha técnica, portaled into
 * #print-root so the @media print CSS can reveal just it. Renders nothing
 * on screen (the container is hidden by default via the print stylesheet,
 * but we also keep it visually hidden on screen to be safe).
 */
export const PrintRecipe: React.FC<PrintPortalProps> = ({ recipe, coverUrl }) => {
  const totalTime =
    (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0) || recipe.total_minutes || 0

  // Custo total: soma dos custos individuais dos ingredientes (com fallback
  // para o campo recipe.cost legado quando não houver custos por ingrediente).
  const ingredientsTotalCost = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.reduce((sum, ing) => {
        const c = typeof ing.cost === 'number' ? ing.cost : 0
        return sum + (isNaN(c) ? 0 : c)
      }, 0)
    : 0
  const displayCost = ingredientsTotalCost > 0 ? ingredientsTotalCost : recipe.cost || 0
  const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`

  return createPortal(
    <div className="font-sans text-tinta bg-white max-w-[820px] mx-auto px-2 py-2 text-[12px] leading-relaxed">
      {/* HEADER */}
      <header className="print-avoid-break pb-3 border-b-2 border-bronze/40">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="uppercase tracking-[0.18em] text-[9px] font-semibold text-bronze">
              Biblioteca Culinária — Ficha Técnica
            </span>
            <h1 className="font-serif text-3xl font-bold text-tinta leading-tight mt-1">
              {recipe.title}
            </h1>
            <p className="text-[11px] text-tinta-sec mt-1">
              {recipe.expand?.category?.name || ''}
              {recipe.expand?.category?.name && recipe.expand?.technique?.name ? ' · ' : ''}
              {recipe.expand?.technique?.name || ''}
              {recipe.difficulty ? ` · ${recipe.difficulty}` : ''}
            </p>
          </div>
          {coverUrl && (
            <img
              src={coverUrl}
              alt={recipe.title}
              className="w-32 h-24 object-cover rounded-md border border-marfim-border shrink-0"
            />
          )}
        </div>
      </header>

      {/* TECHNICAL DATA GRID */}
      <section className="print-avoid-break mt-4">
        <h2 className="font-serif text-base font-bold text-tinta border-b border-marfim-border pb-1 mb-2">
          Dados técnicos
        </h2>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <div className="border border-marfim-border rounded-md p-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Rendimento
            </div>
            <div className="font-serif text-base font-bold text-tinta">
              {recipe.yield_quantity || '-'} {recipe.yield_unit || ''}
            </div>
          </div>
          <div className="border border-marfim-border rounded-md p-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Porção
            </div>
            <div className="font-serif text-sm font-bold text-tinta leading-tight">
              {recipe.portions || '-'}
            </div>
          </div>
          <div className="border border-marfim-border rounded-md p-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Preparo
            </div>
            <div className="font-serif text-base font-bold text-tinta">
              {recipe.prep_minutes !== undefined ? `${recipe.prep_minutes} min` : '-'}
            </div>
          </div>
          <div className="border border-marfim-border rounded-md p-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Cozimento
            </div>
            <div className="font-serif text-base font-bold text-tinta">
              {recipe.cook_minutes !== undefined ? `${recipe.cook_minutes} min` : '-'}
            </div>
          </div>
          <div className="border border-marfim-border rounded-md p-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Tempo total
            </div>
            <div className="font-serif text-base font-bold text-tinta">{totalTime} min</div>
          </div>
          <div className="border border-marfim-border rounded-md p-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Dificuldade
            </div>
            <div className="font-serif text-base font-bold text-tinta">
              {recipe.difficulty || '-'}
            </div>
          </div>
          <div className="border border-marfim-border rounded-md p-2 col-span-2">
            <div className="uppercase text-[8px] tracking-wider text-tinta-ter font-semibold">
              Custo estimado
            </div>
            <div className="font-serif text-base font-bold text-tinta">
              {displayCost > 0 ? formatBRL(displayCost) : '-'}
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMNS: INGREDIENTS + METHOD */}
      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="print-avoid-break">
          <h2 className="font-serif text-base font-bold text-tinta border-b border-marfim-border pb-1 mb-2">
            Ingredientes
          </h2>
          <ul className="space-y-1 text-[11px] text-tinta">
            {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="flex gap-1.5">
                  <span className="text-bronze">•</span>
                  <span className="flex-1">
                    {(ing.quantity || ing.unit) && (
                      <strong className="font-semibold mr-1">
                        {ing.quantity} {ing.unit}
                      </strong>
                    )}
                    {ing.name}
                  </span>
                  <span className="font-mono text-[10px] text-tinta-sec shrink-0 ml-2">
                    {typeof ing.cost === 'number' && !isNaN(ing.cost) && ing.cost > 0
                      ? formatBRL(ing.cost)
                      : '—'}
                  </span>
                </li>
              ))
            ) : (
              <li className="italic text-tinta-ter">Nenhum ingrediente informado.</li>
            )}
          </ul>
          {ingredientsTotalCost > 0 && (
            <div className="mt-2 pt-1.5 border-t border-marfim-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-tinta uppercase tracking-wider">
                Custo total
              </span>
              <span className="font-serif text-sm font-bold text-verde">
                {formatBRL(ingredientsTotalCost)}
              </span>
            </div>
          )}
        </div>
        <div>
          <h2 className="font-serif text-base font-bold text-tinta border-b border-marfim-border pb-1 mb-2">
            Modo de preparo
          </h2>
          <ol className="space-y-2 text-[11px] text-tinta">
            {Array.isArray(recipe.method) && recipe.method.length > 0 ? (
              recipe.method.map((step, idx) => (
                <li key={idx} className="flex gap-2 print-avoid-break">
                  <span className="font-serif font-bold text-bronze shrink-0">{idx + 1}.</span>
                  <span className="flex-1">{step}</span>
                </li>
              ))
            ) : (
              <li className="italic text-tinta-ter">Nenhum passo informado.</li>
            )}
          </ol>
        </div>
      </section>

      {/* TIPS */}
      {recipe.tips && (
        <section className="print-avoid-break mt-4 border border-marfim-border rounded-md p-3">
          <h2 className="font-serif text-base font-bold text-tinta mb-1">Dicas do Chef</h2>
          <p className="text-[11px] text-tinta-sec italic">&ldquo;{recipe.tips}&rdquo;</p>
        </section>
      )}

      {/* FOOTER */}
      <footer className="mt-6 pt-2 border-t border-marfim-border flex items-center justify-between text-[9px] text-tinta-ter">
        <span>Biblioteca Culinária — Acervo &amp; Fichas Técnicas</span>
        <span>{fmtDate(new Date().toISOString())}</span>
      </footer>
    </div>,
    document.getElementById('print-root')!,
  )
}
