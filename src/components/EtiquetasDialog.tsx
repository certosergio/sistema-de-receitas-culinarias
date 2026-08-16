import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Loader2, Tag, Leaf, Wheat, MilkOff, Egg, Fish, Droplet, X } from 'lucide-react'
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
  { key: 'contains_dairy', label: 'Laticínios', Icon: MilkOff },
  { key: 'contains_eggs', label: 'Ovos', Icon: Egg },
  { key: 'contains_fish', label: 'Peixe', Icon: Fish },
  { key: 'contains_honey', label: 'Mel', Icon: Droplet },
]

/**
 * A single identification etiqueta. Elegant and sober, matching the verde /
 * bronze / marfim palette and serifed typography. Designed to be readable on
 * screen and to print cleanly.
 */
const Etiqueta: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const state: DietaryState = {
    contains_gluten: recipe.contains_gluten,
    contains_dairy: recipe.contains_dairy,
    contains_eggs: recipe.contains_eggs,
    contains_fish: recipe.contains_fish,
    contains_honey: recipe.contains_honey,
  }
  const vegan = isVegan(state)
  const hasGluten = Boolean(state.contains_gluten)

  // Active animal-origin flags (Laticínios, Ovos, Peixe, Mel)
  const activeAnimal = ANIMAL_FLAG_META.filter((m) => state[m.key])

  return (
    <article className="etiqueta print-avoid-break flex flex-col bg-white border border-marfim-border rounded-lg overflow-hidden shadow-sm">
      {/* Top accent bar */}
      <div className="h-1.5 bg-verde" />

      <div className="flex flex-col flex-1 px-5 py-4">
        {/* Discreet recipe code (db id) */}
        <div className="flex items-center justify-between mb-2">
          <span className="label-caps text-[9px] text-bronze flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />
            Receita
          </span>
          <span className="font-mono text-[9px] text-tinta-ter tracking-wide select-all">
            #{recipe.id.slice(-8).toUpperCase()}
          </span>
        </div>

        {/* Recipe name — featured */}
        <h3 className="font-serif text-xl font-bold text-tinta leading-tight mb-1.5">
          {recipe.title}
        </h3>

        {/* Summary / description */}
        <p className="text-[11px] text-tinta-sec leading-relaxed flex-1 line-clamp-[6]">
          {recipe.summary || 'Sem resumo cadastrado.'}
        </p>

        {/* Footer: dietary indicators */}
        <footer className="mt-3 pt-2.5 border-t border-dashed border-marfim-border">
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
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800"
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
 * @media print CSS reveals just it. Renders a 3-column grid of etiquetas.
 */
const EtiquetasPrintSheet: React.FC<{ collection: Collection; recipes: Recipe[] }> = ({
  collection,
  recipes,
}) => {
  return createPortal(
    <div className="font-sans text-tinta bg-white">
      <header className="pb-2 mb-3 border-b-2 border-bronze/40">
        <span className="uppercase tracking-[0.18em] text-[9px] font-semibold text-bronze">
          Biblioteca Culinária — Etiquetas de Identificação
        </span>
        <h1 className="font-serif text-2xl font-bold text-tinta leading-tight mt-1">
          {collection.name}
        </h1>
        <p className="text-[10px] text-tinta-ter mt-0.5">
          {recipes.length} {recipes.length === 1 ? 'etiqueta' : 'etiquetas'} ·{' '}
          {new Date().toLocaleDateString('pt-BR')}
        </p>
      </header>

      <div className="etiquetas-print-grid grid grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <Etiqueta key={recipe.id} recipe={recipe} />
        ))}
      </div>
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
      {printing && collection && recipes.length > 0 && (
        <EtiquetasPrintSheet collection={collection} recipes={recipes} />
      )}
    </>
  )
}

export default EtiquetasDialog
