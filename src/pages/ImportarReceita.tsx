import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createRecipe } from '@/services/recipes'
import { getCategories } from '@/services/categories'
import { getTechniques } from '@/services/techniques'
import { Category, Technique, IngredientItem, RecipeFormData } from '@/types'
import {
  importFromText,
  parseRecipeText,
  parseIngredientLine,
  type ParsedRecipe,
} from '@/lib/recipeImport'
import {
  ArrowLeft,
  Upload,
  Loader2,
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wand2,
  ClipboardPaste,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

const ImportarReceita: React.FC = () => {
  const navigate = useNavigate()

  const [textInput, setTextInput] = useState('')

  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null)
  const [sourceLabel, setSourceLabel] = useState<string>('')

  // Select options for the save step.
  const [categories, setCategories] = useState<Category[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [category, setCategory] = useState('')
  const [technique, setTechnique] = useState('')

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const [cats, techs] = await Promise.all([getCategories(), getTechniques()])
        setCategories(cats)
        setTechniques(techs)
      } catch (err) {
        console.error('Erro ao carregar opções:', err)
      }
    }
    load()
  }, [])

  const totalMinutes = useMemo(() => {
    const p = Number(parsed?.prep_minutes) || 0
    const c = Number(parsed?.cook_minutes) || 0
    return p + c
  }, [parsed])

  // --- Parsing actions ---

  const handleParseText = () => {
    setParseError(null)
    const text = textInput.trim()
    if (!text || text.length < 20) {
      setParseError('Cole o texto completo da receita para continuar.')
      return
    }
    // Parsing is a pure local heuristic — run it synchronously instead of
    // deferring with setTimeout, which only delayed the UI feedback.
    try {
      const result = importFromText(text)
      const isEmpty =
        !result.title.trim() &&
        result.ingredients.filter((i) => i.name.trim()).length === 0 &&
        result.method.filter((m) => m.trim()).length === 0
      if (isEmpty) {
        setParseError(
          'Não foi possível estruturar a receita. Verifique se o texto contém ingredientes e modo de preparo.',
        )
        return
      }
      setParsed(result)
      setSourceLabel('Texto colado')
      toast({
        title: 'Receita estruturada',
        description: `Foram extraídos ${result.ingredients.length} ingrediente(s) e ${result.method.length} passo(s). Revise antes de salvar.`,
      })
    } catch (err) {
      console.error('Erro ao analisar texto:', err)
      setParseError('Não foi possível analisar o texto. Verifique o conteúdo e tente novamente.')
    }
  }

  const handleReset = () => {
    setParsed(null)
    setParseError(null)
    setSourceLabel('')
    setErrors({})
  }

  // --- Edit helpers on the parsed result ---

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

  const addIngredient = () => {
    setParsed((prev) =>
      prev
        ? { ...prev, ingredients: [...prev.ingredients, { name: '', quantity: '', unit: 'g' }] }
        : prev,
    )
  }

  const removeIngredient = (index: number) => {
    setParsed((prev) => {
      if (!prev) return prev
      const copy = prev.ingredients.filter((_, idx) => idx !== index)
      return { ...prev, ingredients: copy.length ? copy : [{ name: '', quantity: '', unit: 'g' }] }
    })
  }

  const updateStep = (index: number, value: string) => {
    setParsed((prev) => {
      if (!prev) return prev
      const copy = [...prev.method]
      copy[index] = value
      return { ...prev, method: copy }
    })
  }

  const addStep = () => {
    setParsed((prev) => (prev ? { ...prev, method: [...prev.method, ''] } : prev))
  }

  const removeStep = (index: number) => {
    setParsed((prev) => {
      if (!prev) return prev
      const copy = prev.method.filter((_, idx) => idx !== index)
      return { ...prev, method: copy }
    })
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    setParsed((prev) => {
      if (!prev) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.method.length - 1) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      const copy = [...prev.method]
      const tmp = copy[index]
      copy[index] = copy[target]
      copy[target] = tmp
      return { ...prev, method: copy }
    })
  }

  // Re-parse a single ingredient line on the fly when the user pastes a
  // full line into the name field.
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

  // Re-run the text parser over the full text area on demand.
  const handleReanalyze = () => {
    if (!textInput.trim()) return
    const result = parseRecipeText(textInput)
    setParsed(result)
    setSourceLabel('Texto reanalisado')
  }

  // --- Save ---

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!parsed) return false
    if (!parsed.title.trim()) newErrors.title = 'O título da receita é obrigatório'
    if (!category) newErrors.category = 'Selecione uma categoria'
    if (!technique) newErrors.technique = 'Selecione uma técnica de preparo'
    const cleanIngredients = parsed.ingredients.filter((i) => i.name && i.name.trim())
    if (cleanIngredients.length === 0) newErrors.ingredients = 'Adicione ao menos um ingrediente'
    const cleanMethod = parsed.method.filter((m) => m && m.trim())
    if (cleanMethod.length === 0) newErrors.method = 'Adicione ao menos um passo no modo de preparo'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!parsed || !validate()) {
      toast({
        title: 'Verifique os campos',
        description: 'Preencha as informações obrigatórias antes de salvar.',
        variant: 'destructive',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)
    const formData: RecipeFormData = {
      title: parsed.title,
      summary: parsed.summary,
      category,
      technique,
      difficulty: (parsed.difficulty as 'Fácil' | 'Médio' | 'Difícil') || 'Fácil',
      yield_quantity: parsed.yield_quantity,
      yield_unit: (parsed.yield_unit as RecipeFormData['yield_unit']) || 'porções',
      portions: parsed.portions,
      prep_minutes: parsed.prep_minutes,
      cook_minutes: parsed.cook_minutes,
      cost: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      ingredients: parsed.ingredients,
      method: parsed.method,
      tips: parsed.tips,
      coverFile: null,
      removeCover: false,
    }

    try {
      const saved = await createRecipe(formData)
      toast({
        title: 'Receita salva no acervo',
        description: 'A ficha técnica importada foi registrada com sucesso.',
      })
      navigate(`/receitas/${saved.id}`)
    } catch (err: unknown) {
      console.error('Erro ao salvar receita:', err)
      const errorObj = err as {
        message?: string
        data?: { data?: Record<string, { message: string }> }
      }
      if (errorObj?.data?.data) {
        const backendErrs: Record<string, string> = {}
        Object.entries(errorObj.data.data).forEach(([key, val]) => {
          backendErrs[key] = val.message
        })
        setErrors(backendErrs)
      }
      toast({
        title: 'Falha ao salvar receita',
        description: errorObj?.message || 'Verifique as informações e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // --- Render ---

  const hasParsed = Boolean(parsed)

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <Link
            to="/receitas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-tinta-ter hover:text-tinta transition-colors mb-1.5 uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao acervo</span>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
            Importar Receita
          </h1>
          <p className="text-sm text-tinta-sec mt-0.5">
            Cole o texto de uma receita que o sistema extrai a ficha técnica automaticamente.
          </p>
        </div>

        {hasParsed && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={saving}
              className="border-marfim-border text-tinta rounded-xl"
            >
              Nova importação
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md px-5 min-w-[150px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>Salvar no Acervo</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* INPUT STEP (hidden once we have a parsed result) */}
      {!hasParsed && (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="rawText" className="label-caps block mb-1.5">
                Cole aqui o texto completo da receita
              </Label>
              <Textarea
                id="rawText"
                rows={12}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Bolo de Cenoura\n\nIngredientes:\n3 cenouras médias\n2 xícaras de açúcar\n...\n\nModo de preparo:\n1. Bata as cenouras no liquidificador...\n2. Misture os ingredientes secos...`}
                className="bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde text-sm leading-relaxed font-mono"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-tinta-ter leading-relaxed flex-1">
                Mantenha os rótulos das seções (Ingredientes, Modo de preparo, Rendimento, Tempo,
                Dificuldade) para uma extração mais precisa.
              </p>
              <Button
                onClick={handleParseText}
                className="h-11 bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md px-6 min-w-[150px]"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Estruturar
              </Button>
            </div>
          </div>

          {parseError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Não foi possível importar</p>
                <p className="text-red-700 mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-marfim-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tinta">1. Forneça o conteúdo</p>
                <p className="text-xs text-tinta-sec mt-0.5">Texto bruto da receita.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-bronze-subtle text-bronze flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tinta">2. Extração automática</p>
                <p className="text-xs text-tinta-sec mt-0.5">
                  Título, ingredientes, modo, tempos e rendimento são identificados.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tinta">3. Revise e salve</p>
                <p className="text-xs text-tinta-sec mt-0.5">
                  Edite cada campo e salve como ficha técnica no acervo.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* EDITABLE PREVIEW */}
      {hasParsed && parsed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="lg:col-span-8 space-y-8"
          >
            {/* Source banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-verde-subtle border border-verde/20">
              <CheckCircle2 className="w-5 h-5 text-verde shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-verde">Receita estruturada com sucesso</p>
                <p className="text-xs text-verde/80 truncate mt-0.5">
                  <span>Fonte: {sourceLabel}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReanalyze}
                className="text-verde hover:bg-verde/10 text-xs"
              >
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                Reanalisar
              </Button>
            </div>

            {/* SECTION 1: BASIC INFO */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
              <div className="flex items-center gap-3 border-b border-marfim-border pb-4">
                <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde font-serif font-bold text-base flex items-center justify-center">
                  1
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-tinta">Informações Básicas</h2>
                  <p className="text-xs text-tinta-sec">
                    Confira o título, a apresentação e a classificação.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="label-caps block mb-1.5">
                  Título da Receita <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={parsed.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Ex.: Bolo de Cenoura com Cobertura de Chocolate"
                  className={`h-11 bg-marfim/30 focus:bg-white rounded-xl text-base ${
                    errors.title
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : 'focus-visible:ring-verde'
                  }`}
                />
                {errors.title && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="summary" className="label-caps block mb-1.5">
                  Resumo ou Apresentação
                </Label>
                <Textarea
                  id="summary"
                  rows={3}
                  value={parsed.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Breve descrição do prato..."
                  className="bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde text-sm leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="label-caps block mb-1.5">
                    Categoria <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(val) => {
                      setCategory(val)
                      if (errors.category) setErrors({ ...errors, category: '' })
                    }}
                  >
                    <SelectTrigger
                      className={`h-11 bg-marfim/30 rounded-xl ${errors.category ? 'border-red-500' : ''}`}
                    >
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{errors.category}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="technique" className="label-caps block mb-1.5">
                    Técnica de Preparo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={technique}
                    onValueChange={(val) => {
                      setTechnique(val)
                      if (errors.technique) setErrors({ ...errors, technique: '' })
                    }}
                  >
                    <SelectTrigger
                      className={`h-11 bg-marfim/30 rounded-xl ${errors.technique ? 'border-red-500' : ''}`}
                    >
                      <SelectValue placeholder="Selecione a técnica" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                      {techniques.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.technique && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{errors.technique}</p>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 2: METRICS */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
              <div className="flex items-center gap-3 border-b border-marfim-border pb-4">
                <div className="w-8 h-8 rounded-full bg-bronze-subtle text-bronze font-serif font-bold text-base flex items-center justify-center">
                  2
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-tinta">
                    Ficha Técnica &amp; Métricas
                  </h2>
                  <p className="text-xs text-tinta-sec">
                    Rendimento, tempos e dificuldade extraídos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="yieldQuantity" className="label-caps block mb-1.5">
                    Rendimento (Qtd)
                  </Label>
                  <Input
                    id="yieldQuantity"
                    type="number"
                    min="0"
                    step="any"
                    value={parsed.yield_quantity}
                    onChange={(e) => updateField('yield_quantity', e.target.value)}
                    placeholder="Ex.: 4"
                    className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                  />
                </div>
                <div>
                  <Label htmlFor="yieldUnit" className="label-caps block mb-1.5">
                    Unidade
                  </Label>
                  <Select
                    value={parsed.yield_unit || 'porções'}
                    onValueChange={(val) => updateField('yield_unit', val)}
                  >
                    <SelectTrigger className="h-11 bg-marfim/30 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-marfim-border rounded-xl">
                      <SelectItem value="porções">porções</SelectItem>
                      <SelectItem value="unidades">unidades</SelectItem>
                      <SelectItem value="fatias">fatias</SelectItem>
                      <SelectItem value="xícaras">xícaras</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="portions" className="label-caps block mb-1.5">
                    Porção Unitária
                  </Label>
                  <Input
                    id="portions"
                    value={parsed.portions}
                    onChange={(e) => updateField('portions', e.target.value)}
                    placeholder="Ex.: 1 fatia de 120g"
                    className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="prepMinutes" className="label-caps block mb-1.5">
                    Tempo Preparo (min)
                  </Label>
                  <Input
                    id="prepMinutes"
                    type="number"
                    min="0"
                    value={parsed.prep_minutes}
                    onChange={(e) => updateField('prep_minutes', e.target.value)}
                    placeholder="Ex.: 20"
                    className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                  />
                </div>
                <div>
                  <Label htmlFor="cookMinutes" className="label-caps block mb-1.5">
                    Tempo Cozimento (min)
                  </Label>
                  <Input
                    id="cookMinutes"
                    type="number"
                    min="0"
                    value={parsed.cook_minutes}
                    onChange={(e) => updateField('cook_minutes', e.target.value)}
                    placeholder="Ex.: 45"
                    className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                  />
                </div>
                <div>
                  <Label className="label-caps block mb-1.5">Tempo Total (Automático)</Label>
                  <div className="h-11 bg-verde-subtle border border-verde/20 rounded-xl flex items-center px-4 text-verde font-bold font-mono">
                    {totalMinutes} minutos
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="difficulty" className="label-caps block mb-1.5">
                  Dificuldade
                </Label>
                <Select
                  value={parsed.difficulty || 'Fácil'}
                  onValueChange={(val) => updateField('difficulty', val)}
                >
                  <SelectTrigger className="h-11 bg-marfim/30 rounded-xl">
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-marfim-border rounded-xl">
                    <SelectItem value="Fácil">Fácil</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Difícil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* SECTION 3: INGREDIENTS */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-marfim-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde font-serif font-bold text-base flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-tinta">Ingredientes</h2>
                    <p className="text-xs text-tinta-sec">
                      Ajuste quantidades e unidades. Você pode colar uma linha inteira no nome.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                  className="border-bronze/40 text-bronze hover:bg-bronze-subtle rounded-xl text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </Button>
              </div>

              {errors.ingredients && (
                <p className="text-xs text-red-600 font-medium">{errors.ingredients}</p>
              )}

              <div className="space-y-3">
                {parsed.ingredients.length === 0 && (
                  <p className="text-sm text-tinta-ter italic py-4 text-center">
                    Nenhum ingrediente extraído. Adicione manualmente.
                  </p>
                )}
                {parsed.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 sm:gap-3 p-2 bg-marfim/30 rounded-xl border border-marfim-border/70"
                  >
                    <div className="w-20 sm:w-24 shrink-0">
                      <Input
                        placeholder="Qtd"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                        className="h-10 bg-white rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="w-24 sm:w-28 shrink-0">
                      <Input
                        placeholder="Unidade"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                        className="h-10 bg-white rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        placeholder="Nome do ingrediente"
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                        onPaste={(e) => handleIngredientPaste(e, idx)}
                        className="h-10 bg-white rounded-lg text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(idx)}
                      className="h-9 w-9 text-tinta-ter hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full border-dashed border-marfim-border hover:border-bronze text-tinta-sec hover:text-bronze rounded-xl text-xs py-5"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>+ Adicionar outro ingrediente</span>
              </Button>
            </section>

            {/* SECTION 4: METHOD */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-marfim-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bronze-subtle text-bronze font-serif font-bold text-base flex items-center justify-center">
                    4
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-tinta">Modo de Preparo</h2>
                    <p className="text-xs text-tinta-sec">Etapas numeradas da execução.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  className="border-bronze/40 text-bronze hover:bg-bronze-subtle rounded-xl text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </Button>
              </div>

              {errors.method && <p className="text-xs text-red-600 font-medium">{errors.method}</p>}

              <div className="space-y-3">
                {parsed.method.length === 0 && (
                  <p className="text-sm text-tinta-ter italic py-4 text-center">
                    Nenhum passo extraído. Adicione manualmente.
                  </p>
                )}
                {parsed.method.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-marfim/30 rounded-xl border border-marfim-border/70 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-verde-subtle text-verde font-serif font-bold text-xs flex items-center justify-center shrink-0 mt-1 border border-verde/20">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Textarea
                        rows={2}
                        placeholder={`Descreva o passo ${idx + 1}...`}
                        value={step}
                        onChange={(e) => updateStep(idx, e.target.value)}
                        className="bg-white rounded-lg text-xs leading-relaxed focus-visible:ring-verde"
                      />
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, 'up')}
                        className="h-7 w-7 text-tinta-ter hover:text-tinta rounded"
                        title="Mover para cima"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === parsed.method.length - 1}
                        onClick={() => moveStep(idx, 'down')}
                        className="h-7 w-7 text-tinta-ter hover:text-tinta rounded"
                        title="Mover para baixo"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(idx)}
                        className="h-7 w-7 text-tinta-ter hover:text-red-600 hover:bg-red-50 rounded"
                        title="Remover passo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addStep}
                className="w-full border-dashed border-marfim-border hover:border-bronze text-tinta-sec hover:text-bronze rounded-xl text-xs py-5"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>+ Adicionar outro passo</span>
              </Button>
            </section>

            {/* SECTION 5: TIPS */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
              <div className="flex items-center gap-3 border-b border-marfim-border pb-4">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-serif font-bold text-base flex items-center justify-center">
                  5
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-tinta">Dicas e Notas</h2>
                  <p className="text-xs text-tinta-sec">
                    Observações extras extraídas da receita (opcional).
                  </p>
                </div>
              </div>

              <Textarea
                rows={3}
                value={parsed.tips}
                onChange={(e) => updateField('tips', e.target.value)}
                placeholder="Ex.: Para um sabor mais intenso, deixe a massa descansar por 30 minutos..."
                className="bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde text-sm leading-relaxed"
              />
            </section>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="border-marfim-border text-tinta rounded-xl"
              >
                Nova importação
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md px-8 py-6 text-base"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Salvando ficha técnica...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    <span>Salvar no Acervo</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* LIVE PREVIEW SIDEBAR */}
          <aside className="lg:col-span-4 sticky top-20 space-y-6">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-bronze/40 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-marfim-border pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-bronze" />
                  <h3 className="font-serif text-lg font-bold text-tinta">Prévia da Ficha</h3>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-bronze font-bold bg-bronze-subtle px-2 py-0.5 rounded-full">
                  Importada
                </span>
              </div>

              <div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {categories.find((c) => c.id === category) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-marfim-card text-tinta-sec border border-marfim-border">
                      {categories.find((c) => c.id === category)?.name}
                    </span>
                  )}
                  {techniques.find((t) => t.id === technique) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-bronze-subtle text-tinta border border-bronze/20">
                      {techniques.find((t) => t.id === technique)?.name}
                    </span>
                  )}
                </div>
                <h4 className="font-serif text-lg font-bold text-tinta leading-tight">
                  {parsed.title.trim() || 'Título da Receita'}
                </h4>
                <p className="text-xs text-tinta-sec line-clamp-3 mt-1">
                  {parsed.summary.trim() || 'Apresentação da receita aparecerá aqui...'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-marfim-border/70 text-xs">
                <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                  <span className="label-caps block text-[9px] text-tinta-ter">Rendimento</span>
                  <span className="font-serif text-base font-bold text-tinta">
                    {parsed.yield_quantity ? `${parsed.yield_quantity} ${parsed.yield_unit}` : '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                  <span className="label-caps block text-[9px] text-tinta-ter">Tempo Total</span>
                  <span className="font-serif text-base font-bold text-tinta">
                    {totalMinutes > 0 ? `${totalMinutes} min` : '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                  <span className="label-caps block text-[9px] text-tinta-ter">Dificuldade</span>
                  <span className="font-serif text-base font-bold text-tinta">
                    {parsed.difficulty || '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                  <span className="label-caps block text-[9px] text-tinta-ter">Porção</span>
                  <span className="font-serif text-base font-bold text-tinta truncate block">
                    {parsed.portions || '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-tinta-ter pt-1">
                <span>
                  <strong className="text-tinta">
                    {parsed.ingredients.filter((i) => i.name.trim()).length}
                  </strong>{' '}
                  ingredientes
                </span>
                <span>
                  <strong className="text-tinta">
                    {parsed.method.filter((m) => m.trim()).length}
                  </strong>{' '}
                  passos
                </span>
              </div>
            </div>

            {/* Extraction summary */}
            <div className="bg-white rounded-2xl p-5 border border-marfim-border shadow-card space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-marfim-border">
                <ClipboardPaste className="w-4 h-4 text-verde" />
                <h3 className="font-serif text-base font-bold text-tinta">Resumo da extração</h3>
              </div>
              <ExtractionRow label="Título" ok={Boolean(parsed.title.trim())} />
              <ExtractionRow
                label="Ingredientes"
                ok={parsed.ingredients.filter((i) => i.name.trim()).length > 0}
              />
              <ExtractionRow
                label="Modo de preparo"
                ok={parsed.method.filter((m) => m.trim()).length > 0}
              />
              <ExtractionRow label="Rendimento" ok={Boolean(parsed.yield_quantity)} />
              <ExtractionRow
                label="Tempos"
                ok={Boolean(parsed.prep_minutes || parsed.cook_minutes)}
              />
              <ExtractionRow label="Dificuldade" ok={Boolean(parsed.difficulty)} />
              <p className="text-[11px] text-tinta-ter pt-2 leading-relaxed">
                Campos não extraídos podem ser preenchidos manualmente antes de salvar.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

const ExtractionRow: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-tinta-sec">{label}</span>
    {ok ? (
      <Badge className="bg-verde-subtle text-verde border border-verde/20 text-[10px] gap-1 py-0 px-2">
        <CheckCircle2 className="w-3 h-3" />
        Extraído
      </Badge>
    ) : (
      <Badge className="bg-marfim-card text-tinta-ter border border-marfim-border text-[10px] py-0 px-2">
        Pendente
      </Badge>
    )}
  </div>
)

export default ImportarReceita
