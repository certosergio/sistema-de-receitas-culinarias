import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  Loader2,
  Tag,
  Leaf,
  Wheat,
  MilkOff,
  Egg,
  Fish,
  Droplet,
  Bird,
  Shrimp,
  X,
} from 'lucide-react'
import { Collection, Recipe } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getCollectionRecipes } from '@/services/collections'
import { isVegan, type DietaryState, type DietaryFlagKey } from '@/lib/dietary'

interface EtiquetasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection: Collection | null
}

/** Maps each animal-origin flag to a label + icon for the etiqueta footer. */
const ANIMAL_FLAG_META: {
  key: DietaryFlagKey
  label: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'contains_dairy', label: 'Laticínio', Icon: MilkOff },
  { key: 'contains_eggs', label: 'Ovos', Icon: Egg },
  { key: 'contains_fish', label: 'Peixe', Icon: Fish },
  { key: 'contains_honey', label: 'Mel', Icon: Droplet },
  { key: 'contains_ave', label: 'Ave', Icon: Bird },
  { key: 'contains_camarao', label: 'Camarão', Icon: Shrimp },
]

/**
 * A single identification etiqueta. Elegant and sober, matching the verde /
 * bronze / marfim palette and serifed typography. Designed to be readable on
 * screen and to print cleanly. Corners are kept clean and square — no rounded
 * edges or ornamental vertex decorations.
 */
const Etiqueta: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const state: DietaryState = {
    contains_gluten: recipe.contains_gluten,
    contains_dairy: recipe.contains_dairy,
    contains_eggs: recipe.contains_eggs,
    contains_fish: recipe.contains_fish,
    contains_honey: recipe.contains_honey,
    contains_ave: recipe.contains_ave,
    contains_camarao: recipe.contains_camarao,
  }
  const vegan = isVegan(state)
  const hasGluten = Boolean(state.contains_gluten)

  // Active animal-origin flags (Laticínio, Ovos, Peixe, Mel, Ave, Camarão)
  const activeAnimal = ANIMAL_FLAG_META.filter((m) => state[m.key])

  return (
    <article className="etiqueta print-avoid-break flex flex-col bg-white dark:bg-[#1E1C16] border border-marfim-border dark:border-[#322F26] rounded-none shadow-sm">
      <div className="flex flex-col flex-1 px-5 py-4">
        {/* Discreet recipe code (db id) */}
        <div className="flex items-center justify-end mb-2">
          <span className="font-mono text-[9px] text-tinta-ter dark:text-[#8F887B] tracking-wide select-all">
            #{recipe.id.slice(-8).toUpperCase()}
          </span>
        </div>

        {/* Recipe name — featured */}
        <h3 className="font-serif text-lg font-bold text-tinta dark:text-[#EFE9DD] leading-tight mb-2">
          {recipe.title}
        </h3>

        {/* Summary / description */}
        <p className="text-[11px] text-tinta-sec dark:text-[#B5AE9F] leading-relaxed flex-1 line-clamp-[6]">
          {recipe.summary || 'Sem resumo cadastrado.'}
        </p>

        {/* Footer: dietary indicators */}
        <footer className="mt-3 pt-2.5 border-t border-dashed border-marfim-border dark:border-[#322F26]">
          {vegan ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-verde-subtle text-verde border border-verde/30">
                <Leaf className="w-3 h-3" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-verde">
                Prato Vegano
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeAnimal.map(({ key, label, Icon }) => (
                <span
                  key={key}
                  title={label}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-bronze/30 bg-bronze-subtle text-bronze"
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Gluten indicator — shown alongside either vegan or animal flags */}
          {hasGluten && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                title="Contém glúten"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-300 dark:border-[#C29A3B]/40 bg-amber-50 dark:bg-[#3A3220] text-amber-800 dark:text-[#E0C068]"
              >
                <Wheat className="w-3 h-3" />
                <span className="text-[9px] font-semibold uppercase tracking-wide">Glúten</span>
              </span>
            </div>
          )}
        </footer>
      </div>
    </article>
  )
}

/**
 * Print-only sheet of all etiquetas, portaled into #print-root so the
 * @media print CSS reveals just it. Renders exactly 6 etiquetas per A4 page
 * (a 3-column × 2-row grid). Each chunk of 6 recipes is wrapped in a
 * "page" container that forces a page break after it (except the last).
 * Only the grid of etiquetas is rendered — no header, title or instructions —
 * so the printed page contains nothing but the etiquetas.
 */
const LABELS_PER_PAGE = 8

const EtiquetasPrintSheet: React.FC<{ recipes: Recipe[] }> = ({ recipes }) => {
  // Group recipes into chunks of 8 — one chunk per printed A4 page.
  const pages: Recipe[][] = []
  for (let i = 0; i < recipes.length; i += LABELS_PER_PAGE) {
    pages.push(recipes.slice(i, i + LABELS_PER_PAGE))
  }

  return createPortal(
    <div className="etiquetas-print-wrapper font-sans text-tinta bg-white">
      {pages.map((pageRecipes, pageIdx) => (
        <div
          key={pageIdx}
          className="etiquetas-print-page etiquetas-print-grid grid grid-cols-2 grid-rows-4 gap-[4mm] min-h-0"
          style={
            pageIdx < pages.length - 1
              ? { breakAfter: 'page', pageBreakAfter: 'always' }
              : undefined
          }
        >
          {pageRecipes.map((recipe) => (
            <Etiqueta key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ))}
    </div>,
    document.getElementById('print-root')!,
  )
}

export const EtiquetasDialog: React.FC<EtiquetasDialogProps> = ({
  open,
  onOpenChange,
  collection,
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!open || !collection) return
    let cancelled = false
    setLoading(true)
    getCollectionRecipes(collection.id)
      .then((recs) => {
        if (!cancelled) setRecipes(recs)
      })
      .catch((err) => {
        console.error('Erro ao carregar receitas para etiquetas:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, collection])

  const handlePrint = () => {
    setPrinting(true)
    // Allow the print sheet to render into #print-root before opening the
    // print dialog.
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 150)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-marfim rounded-2xl border-marfim-border sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="pr-10">
            <DialogTitle className="font-serif text-2xl font-bold text-tinta flex items-center gap-2">
              <Tag className="w-5 h-5 text-bronze" />
              Etiquetas de Identificação
            </DialogTitle>
            <DialogDescription className="text-xs text-tinta-sec">
              {collection?.name
                ? `Etiquetas para as receitas da coleção “${collection.name}”.`
                : 'Visualize e imprima etiquetas para cada receita da coleção.'}
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-marfim-border">
            <span className="text-[11px] text-tinta-ter">
              {loading
                ? 'Carregando…'
                : `${recipes.length} ${recipes.length === 1 ? 'etiqueta' : 'etiquetas'}`}
            </span>
            <Button
              onClick={handlePrint}
              disabled={loading || printing || recipes.length === 0}
              className="bg-verde hover:bg-verde-hover text-white rounded-xl h-9 gap-2 text-xs font-semibold"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Imprimir Etiquetas</span>
            </Button>
          </div>

          {/* Etiquetas grid (on-screen preview) */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-verde" />
                <p className="font-serif italic text-tinta-sec text-sm">Preparando etiquetas…</p>
              </div>
            ) : recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2 text-center">
                <Tag className="w-10 h-10 text-tinta-ter" />
                <p className="font-serif text-lg text-tinta">Sem receitas para etiquetar</p>
                <p className="text-xs text-tinta-sec max-w-sm">
                  Esta coleção ainda não contém receitas. Adicione receitas para gerar etiquetas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((recipe) => (
                  <Etiqueta key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>

          {/* Close affordance for clarity on large dialog */}
          <div className="flex justify-end pt-2 border-t border-marfim-border">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-9 gap-2 text-xs"
            >
              <X className="w-4 h-4" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only sheet (revealed by @media print) */}
      {printing && collection && recipes.length > 0 && <EtiquetasPrintSheet recipes={recipes} />}
    </>
  )
}

export default EtiquetasDialog
