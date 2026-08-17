import React, { useState } from 'react'
import {
  importFromUrl,
  importFromText,
  parseRecipeText,
  parseIngredientLine,
  type ParsedRecipe,
} from '@/lib/recipeImport'
import type { IngredientItem } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Link2,
  FileText,
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ClipboardPaste,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

type Mode = 'url' | 'text'

interface ImportRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the reviewed/extracted recipe when the user confirms. */
  onConfirm: (parsed: ParsedRecipe) => void
}

/**
 * Modal that imports a recipe from a URL (via the backend proxy) or from
 * pasted raw text, shows a compact preview of what was extracted, and on
 * confirm hands the parsed recipe back so the parent form can be prefilled.
 *
 * The heavy extraction logic lives in `@/lib/recipeImport`; this component
 * only orchestrates the UI and lets the user switch URL/text fallback.
 */
const ImportRecipeDialog: React.FC<ImportRecipeDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [mode, setMode] = useState<Mode>('url')
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')

  const reset = () => {
    setParsed(null)
    setParseError(null)
    setSourceLabel('')
    setUrlInput('')
    setTextInput('')
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleParseUrl = async () => {
    setParseError(null)
    const url = urlInput.trim()
    if (!url) {
      setParseError('Cole a URL da receita para continuar.')
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      setParseError('A URL deve começar com http:// ou https://')
      return
    }
    setParsing(true)
    try {
      const result = await importFromUrl(url)
      setParsed(result)
      setSourceLabel(url)
      toast({
        title: 'Receita importada',
        description: `${result.ingredients.length} ingrediente(s) e ${result.method.length} passo(s) extraídos.`,
      })
    } catch (err: unknown) {
      console.error('Erro ao importar URL:', err)
      const errorObj = err as { message?: string; data?: { message?: string } }
      const msg =
        errorObj?.data?.message ||
        errorObj?.message ||
        'Não foi possível importar a receita da URL. Tente colar o texto manualmente.'
      setParseError(msg)
    } finally {
      setParsing(false)
    }
  }

  const handleParseText = () => {
    setParseError(null)
    const text = textInput.trim()
    if (!text || text.length < 20) {
      setParseError('Cole o texto completo da receita para continuar.')
      return
    }
    setParsing(true)
    setTimeout(() => {
      try {
        const result = importFromText(text)
        setParsed(result)
        setSourceLabel('Texto colado')
        toast({
          title: 'Receita estruturada',
          description: `${result.ingredients.length} ingrediente(s) e ${result.method.length} passo(s) extraídos.`,
        })
      } catch {
        setParseError('Não foi possível analisar o texto. Verifique o conteúdo e tente novamente.')
      } finally {
        setParsing(false)
      }
    }, 200)
  }

  // Light inline editing of the preview (title + summary) so the user can
  // tweak before pushing the result into the main form.
  const updateField = <K extends keyof ParsedRecipe>(key: K, value: ParsedRecipe[K]) => {
    setParsed((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateIngredient = (index: number, field: keyof IngredientItem, value: string) => {
    setParsed((prev) => {
      if (!prev) return prev
      const copy = [...prev.ingredients]
      copy[index] = { ...copy[index], [field]: value }
      return { ...prev, ingredients: copy }
    })
  }

  const handleIngredientPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = e.clipboardData.getData('text')
    if (!pasted || !pasted.includes(' ')) return
    e.preventDefault()
    const parsedIng = parseIngredientLine(pasted)
    setParsed((prev) => {
      if (!prev) return prev
      const copy = [...prev.ingredients]
      copy[index] = parsedIng
      return { ...prev, ingredients: copy }
    })
  }

  const handleConfirm = () => {
    if (!parsed) return
    // Re-run text parser fallback on confirm is unnecessary; just hand over.
    onConfirm(parsed)
    handleClose(false)
  }

  const handleReanalyze = () => {
    if (!textInput.trim()) return
    const result = parseRecipeText(textInput)
    setParsed(result)
    setSourceLabel('Texto reanalisado')
  }

  const hasParsed = Boolean(parsed)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl border-marfim-border p-0">
        <DialogHeader className="p-6 pb-3 border-b border-marfim-border">
          <DialogTitle className="font-serif text-xl text-tinta flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-verde" />
            Importar Receita
          </DialogTitle>
          <DialogDescription className="text-tinta-sec text-sm">
            Cole uma URL ou o texto de uma receita. O sistema extrai a ficha técnica e você revisa
            antes de preencher o formulário.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {!hasParsed && (
            <div className="space-y-5">
              {/* Mode tabs */}
              <div className="inline-flex p-1 bg-marfim-card rounded-xl border border-marfim-border">
                <button
                  onClick={() => setMode('url')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    mode === 'url'
                      ? 'bg-white text-verde shadow-xs'
                      : 'text-tinta-sec hover:text-tinta'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  URL do site
                </button>
                <button
                  onClick={() => setMode('text')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    mode === 'text'
                      ? 'bg-white text-verde shadow-xs'
                      : 'text-tinta-sec hover:text-tinta'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Texto da receita
                </button>
              </div>

              {mode === 'url' ? (
                <div className="space-y-3">
                  <Label htmlFor="import-url" className="label-caps">
                    Endereço (URL) da receita
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Link2 className="w-4 h-4 text-tinta-ter absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        id="import-url"
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://www.tudogostoso.com.br/receita/..."
                        className="h-11 pl-10 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleParseUrl()
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleParseUrl}
                      disabled={parsing}
                      className="h-11 bg-verde hover:bg-verde-hover text-white rounded-xl px-5"
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Importando
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-tinta-ter leading-relaxed">
                    Funciona com a maioria dos sites de receitas. Se a extração falhar, troque para
                    a aba “Texto da receita”.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="import-text" className="label-caps">
                    Cole aqui o texto completo da receita
                  </Label>
                  <Textarea
                    id="import-text"
                    rows={8}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`Bolo de Cenoura\n\nIngredientes:\n3 cenouras médias\n2 xícaras de açúcar\n...\n\nModo de preparo:\n1. Bata as cenouras no liquidificador...`}
                    className="bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde text-xs leading-relaxed font-mono"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleParseText}
                      disabled={parsing}
                      className="h-10 bg-verde hover:bg-verde-hover text-white rounded-xl px-5"
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Analisando
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Estruturar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {parsing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-7 h-7 animate-spin text-verde mr-2" />
                  <span className="text-sm font-serif italic text-tinta-sec">
                    {mode === 'url'
                      ? 'Buscando e analisando a página...'
                      : 'Estruturando a receita...'}
                  </span>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Não foi possível importar</p>
                    <p className="text-red-700 mt-0.5">{parseError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {hasParsed && parsed && (
            <div className="space-y-5">
              {/* Source banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-verde-subtle border border-verde/20">
                <CheckCircle2 className="w-4 h-4 text-verde shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-verde">
                    Receita estruturada com sucesso
                  </p>
                  <p className="text-[11px] text-verde/80 truncate flex items-center gap-1 mt-0.5">
                    <span>Fonte: {sourceLabel}</span>
                    {parsed.sourceUrl && (
                      <a
                        href={parsed.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>
                {mode === 'text' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReanalyze}
                    className="text-verde hover:bg-verde/10 text-xs h-7"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Reanalisar
                  </Button>
                )}
              </div>

              {/* Title + summary editable */}
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="prev-title" className="label-caps text-[11px] mb-1">
                    Título
                  </Label>
                  <Input
                    id="prev-title"
                    value={parsed.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="h-10 bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white dark:focus:bg-[#15140F] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="prev-summary" className="label-caps text-[11px] mb-1">
                    Resumo
                  </Label>
                  <Textarea
                    id="prev-summary"
                    rows={2}
                    value={parsed.summary}
                    onChange={(e) => updateField('summary', e.target.value)}
                    className="bg-marfim/30 focus:bg-white rounded-lg text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Metrics mini-grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <MiniMetric
                  label="Rendimento"
                  value={
                    parsed.yield_quantity ? `${parsed.yield_quantity} ${parsed.yield_unit}` : '-'
                  }
                />
                <MiniMetric
                  label="Preparo"
                  value={parsed.prep_minutes ? `${parsed.prep_minutes} min` : '-'}
                />
                <MiniMetric
                  label="Cozimento"
                  value={parsed.cook_minutes ? `${parsed.cook_minutes} min` : '-'}
                />
                <MiniMetric label="Dificuldade" value={parsed.difficulty || '-'} />
              </div>

              {/* Ingredients preview (editable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="label-caps text-[11px]">
                    Ingredientes ({parsed.ingredients.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {parsed.ingredients.length === 0 && (
                    <p className="text-[11px] text-tinta-ter italic">
                      Nenhum ingrediente extraído.
                    </p>
                  )}
                  {parsed.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                        className="h-8 w-16 bg-white rounded-md text-[11px] font-mono"
                      />
                      <Input
                        value={ing.unit}
                        onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                        className="h-8 w-20 bg-white rounded-md text-[11px]"
                      />
                      <Input
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                        onPaste={(e) => handleIngredientPaste(e, idx)}
                        className="h-8 flex-1 bg-white rounded-md text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Method preview (read-only, scrollable) */}
              <div>
                <span className="label-caps text-[11px] mb-2 block">
                  Modo de preparo ({parsed.method.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs text-tinta-sec leading-relaxed">
                  {parsed.method.length === 0 && (
                    <p className="italic text-tinta-ter">Nenhum passo extraído.</p>
                  )}
                  {parsed.method.map((step, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="font-serif font-bold text-verde shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extraction summary */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-marfim-border">
                <ExtractionChip label="Título" ok={Boolean(parsed.title.trim())} />
                <ExtractionChip
                  label="Ingredientes"
                  ok={parsed.ingredients.filter((i) => i.name.trim()).length > 0}
                />
                <ExtractionChip
                  label="Modo de preparo"
                  ok={parsed.method.filter((m) => m.trim()).length > 0}
                />
                <ExtractionChip label="Rendimento" ok={Boolean(parsed.yield_quantity)} />
                <ExtractionChip
                  label="Tempos"
                  ok={Boolean(parsed.prep_minutes || parsed.cook_minutes)}
                />
              </div>
              <p className="text-[11px] text-tinta-ter leading-relaxed flex items-start gap-1">
                <ClipboardPaste className="w-3 h-3 mt-0.5 shrink-0" />
                Ao confirmar, os campos serão preenchidos no formulário para você revisar e salvar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-marfim-border bg-marfim/30 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-marfim-border text-tinta rounded-xl"
          >
            Cancelar
          </Button>
          {hasParsed && (
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="text-tinta-sec hover:text-tinta rounded-xl"
            >
              Nova importação
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!hasParsed}
            className="bg-verde hover:bg-verde-hover text-white rounded-xl px-5"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Preencher formulário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2 rounded-lg bg-marfim border border-marfim-border">
    <span className="label-caps block text-[9px] text-tinta-ter">{label}</span>
    <span className="font-serif text-sm font-bold text-tinta truncate block">{value}</span>
  </div>
)

const ExtractionChip: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <Badge
    className={
      ok
        ? 'bg-verde-subtle text-verde border border-verde/20 text-[10px] gap-1 py-0 px-2'
        : 'bg-marfim-card text-tinta-ter border border-marfim-border text-[10px] py-0 px-2'
    }
  >
    {ok ? <CheckCircle2 className="w-3 h-3" /> : null}
    {label}
  </Badge>
)

export default ImportRecipeDialog
