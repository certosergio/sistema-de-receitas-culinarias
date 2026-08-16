import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRecipeById, createRecipe, updateRecipe, getRecipeCoverUrl } from '@/services/recipes'
import { getCategories } from '@/services/categories'
import { getTechniques } from '@/services/techniques'
import { Category, Technique, IngredientItem, RecipeFormData } from '@/types'
import { RecipePlaceholder } from '@/components/RecipePlaceholder'
import ImportRecipeDialog from '@/components/ImportRecipeDialog'
import { DietaryChips } from '@/components/DietaryBadges'
import { emptyDietary, type DietaryFlagKey, type DietaryState } from '@/lib/dietary'
import type { ParsedRecipe } from '@/lib/recipeImport'
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  Clock,
  Users,
  Award,
  DollarSign,
  Zap,
  ChefHat,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Wand2,
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
import { toast } from '@/hooks/use-toast'

const RecipeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [categories, setCategories] = useState<Category[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState('')
  const [technique, setTechnique] = useState('')
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil')
  const [yieldQuantity, setYieldQuantity] = useState<number | string>('')
  const [yieldUnit, setYieldUnit] = useState<
    'porções' | 'unidades' | 'fatias' | 'xícaras' | 'kg' | 'g' | 'L' | 'ml'
  >('porções')
  const [portions, setPortions] = useState('')
  const [prepMinutes, setPrepMinutes] = useState<number | string>('')
  const [cookMinutes, setCookMinutes] = useState<number | string>('')
  const [cost, setCost] = useState<number | string>('')
  const [calories, setCalories] = useState<number | string>('')
  const [protein, setProtein] = useState<number | string>('')
  const [carbs, setCarbs] = useState<number | string>('')
  const [fat, setFat] = useState<number | string>('')
  const [tips, setTips] = useState('')

  // Dietary restriction flags (migration 0006).
  const [dietary, setDietary] = useState<Required<DietaryState>>(emptyDietary())

  // Import-from-URL dialog.
  const [importOpen, setImportOpen] = useState(false)

  // Dynamic Lists
  const [ingredients, setIngredients] = useState<IngredientItem[]>([
    { name: '', quantity: '', unit: 'g' },
  ])
  const [method, setMethod] = useState<string[]>([''])

  // Cover image management
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load select options & recipe details if editing
  useEffect(() => {
    async function init() {
      try {
        const [cats, techs] = await Promise.all([getCategories(), getTechniques()])
        setCategories(cats)
        setTechniques(techs)

        if (id) {
          const rec = await getRecipeById(id)
          setTitle(rec.title || '')
          setSummary(rec.summary || '')
          setCategory(rec.category || '')
          setTechnique(rec.technique || '')
          setDifficulty(rec.difficulty || 'Fácil')
          setYieldQuantity(rec.yield_quantity !== undefined ? rec.yield_quantity : '')
          setYieldUnit(rec.yield_unit || 'porções')
          setPortions(rec.portions || '')
          setPrepMinutes(rec.prep_minutes !== undefined ? rec.prep_minutes : '')
          setCookMinutes(rec.cook_minutes !== undefined ? rec.cook_minutes : '')
          setCost(rec.cost !== undefined ? rec.cost : '')
          setCalories(rec.calories !== undefined ? rec.calories : '')
          setProtein(rec.protein !== undefined ? rec.protein : '')
          setCarbs(rec.carbs !== undefined ? rec.carbs : '')
          setFat(rec.fat !== undefined ? rec.fat : '')
          setTips(rec.tips || '')

          setDietary({
            contains_gluten: Boolean(rec.contains_gluten),
            contains_dairy: Boolean(rec.contains_dairy),
            contains_eggs: Boolean(rec.contains_eggs),
            contains_fish: Boolean(rec.contains_fish),
            contains_honey: Boolean(rec.contains_honey),
          })

          if (Array.isArray(rec.ingredients) && rec.ingredients.length > 0) {
            setIngredients(rec.ingredients)
          }
          if (Array.isArray(rec.method) && rec.method.length > 0) {
            setMethod(rec.method)
          }

          const existingUrl = getRecipeCoverUrl(rec)
          if (existingUrl) {
            setExistingCoverUrl(existingUrl)
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar formulário:', err)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar a receita para edição.',
          variant: 'destructive',
        })
        navigate('/receitas')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, navigate])

  // Handle Cover image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation: 2MB max
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem de capa deve ter no máximo 2MB.',
        variant: 'destructive',
      })
      return
    }

    // Validation: type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Envie uma imagem nos formatos JPG, PNG ou WebP.',
        variant: 'destructive',
      })
      return
    }

    setCoverFile(file)
    setRemoveCover(false)
    const url = URL.createObjectURL(file)
    setCoverPreviewUrl(url)
  }

  const handleRemoveImage = () => {
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setExistingCoverUrl(null)
    setRemoveCover(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Live total time calculation
  const totalMinutes = useMemo(() => {
    const p = Number(prepMinutes) || 0
    const c = Number(cookMinutes) || 0
    return p + c
  }, [prepMinutes, cookMinutes])

  // Dynamic ingredients operations
  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: 'g' }])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) {
      setIngredients([{ name: '', quantity: '', unit: 'g' }])
      return
    }
    setIngredients(ingredients.filter((_, idx) => idx !== index))
  }

  const updateIngredient = (index: number, field: keyof IngredientItem, value: string) => {
    const copy = [...ingredients]
    copy[index] = { ...copy[index], [field]: value }
    setIngredients(copy)
  }

  // Dynamic method steps operations
  const addStep = () => {
    setMethod([...method, ''])
  }

  const removeStep = (index: number) => {
    if (method.length === 1) {
      setMethod([''])
      return
    }
    setMethod(method.filter((_, idx) => idx !== index))
  }

  const updateStep = (index: number, val: string) => {
    const copy = [...method]
    copy[index] = val
    setMethod(copy)
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === method.length - 1) return

    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const copy = [...method]
    const temp = copy[index]
    copy[index] = copy[targetIdx]
    copy[targetIdx] = temp
    setMethod(copy)
  }

  // Dietary toggle handler
  const handleDietaryChange = (key: DietaryFlagKey, value: boolean) => {
    setDietary((prev) => ({ ...prev, [key]: value }))
  }

  // Apply imported recipe to the form fields (user can still edit before save).
  const handleImportConfirm = (parsed: ParsedRecipe) => {
    if (parsed.title) setTitle(parsed.title)
    if (parsed.summary) setSummary(parsed.summary)
    if (parsed.yield_quantity !== undefined) setYieldQuantity(parsed.yield_quantity)
    if (parsed.yield_unit) setYieldUnit(parsed.yield_unit as typeof yieldUnit)
    if (parsed.portions) setPortions(parsed.portions)
    if (parsed.prep_minutes !== undefined && parsed.prep_minutes !== '')
      setPrepMinutes(parsed.prep_minutes)
    if (parsed.cook_minutes !== undefined && parsed.cook_minutes !== '')
      setCookMinutes(parsed.cook_minutes)
    if (parsed.difficulty) setDifficulty(parsed.difficulty as typeof difficulty)
    if (parsed.tips) setTips(parsed.tips)
    if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
      setIngredients(parsed.ingredients)
    }
    if (Array.isArray(parsed.method) && parsed.method.length > 0) {
      setMethod(parsed.method)
    }
    toast({
      title: 'Receita preenchida',
      description: 'Revise os campos importados e ajuste antes de salvar.',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'O título da receita é obrigatório'
    }

    if (!category) {
      newErrors.category = 'Selecione uma categoria'
    }

    if (!technique) {
      newErrors.technique = 'Selecione uma técnica de preparo'
    }

    const cleanIngredients = ingredients.filter((i) => i.name && i.name.trim())
    if (cleanIngredients.length === 0) {
      newErrors.ingredients = 'Adicione ao menos um ingrediente'
    }

    const cleanMethod = method.filter((m) => m && m.trim())
    if (cleanMethod.length === 0) {
      newErrors.method = 'Adicione ao menos um passo no modo de preparo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast({
        title: 'Verifique os campos',
        description: 'Preencha todas as informações obrigatórias assinaladas.',
        variant: 'destructive',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)

    const formData: RecipeFormData = {
      title,
      summary,
      category,
      technique,
      difficulty,
      yield_quantity: yieldQuantity,
      yield_unit: yieldUnit,
      portions,
      prep_minutes: prepMinutes,
      cook_minutes: cookMinutes,
      cost,
      calories,
      protein,
      carbs,
      fat,
      ingredients,
      method,
      tips,
      contains_gluten: dietary.contains_gluten,
      contains_dairy: dietary.contains_dairy,
      contains_eggs: dietary.contains_eggs,
      contains_fish: dietary.contains_fish,
      contains_honey: dietary.contains_honey,
      coverFile,
      removeCover,
    }

    try {
      let savedRecipe
      if (isEditing && id) {
        savedRecipe = await updateRecipe(id, formData)
        toast({
          title: 'Receita atualizada',
          description: 'As alterações foram salvas na ficha técnica com sucesso.',
        })
      } else {
        savedRecipe = await createRecipe(formData)
        toast({
          title: 'Receita registrada',
          description: 'A nova ficha técnica foi adicionada ao acervo.',
        })
      }
      navigate(`/receitas/${savedRecipe.id}`)
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
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <Loader2 className="w-9 h-9 animate-spin text-verde" />
        <p className="font-serif italic text-tinta-sec">Carregando dados da receita...</p>
      </div>
    )
  }

  // Selected category and technique models for live preview
  const selectedCatObj = categories.find((c) => c.id === category)
  const selectedTechObj = techniques.find((t) => t.id === technique)
  const displayCover = coverPreviewUrl || existingCoverUrl

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <Link
            to={isEditing ? `/receitas/${id}` : '/receitas'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-tinta-ter hover:text-tinta transition-colors mb-1.5 uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
            {isEditing ? 'Editar Ficha Técnica' : 'Nova Receita & Ficha Técnica'}
          </h1>
          <p className="text-sm text-tinta-sec mt-0.5">
            Preencha os dados gastronômicos, métricas e instruções de preparo do acervo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={submitting}
            className="border-bronze/40 text-bronze hover:bg-bronze-subtle rounded-xl gap-2"
            title="Importar de URL ou texto"
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Importar Receita</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEditing ? `/receitas/${id}` : '/receitas')}
            disabled={submitting}
            className="border-marfim-border text-tinta rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md px-5 min-w-[140px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                <span>Salvar Receita</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: FORM (LEFT 8 COLS) + LIVE PREVIEW SIDEBAR (RIGHT 4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAIN FORM */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8">
          {/* SECTION 1: INFORMAÇÕES BÁSICAS */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
            <div className="flex items-center gap-3 border-b border-marfim-border pb-4">
              <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde font-serif font-bold text-base flex items-center justify-center">
                1
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-tinta">Informações Básicas</h2>
                <p className="text-xs text-tinta-sec">
                  Título, apresentação, classificação e foto de capa.
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="label-caps block mb-1.5">
                Título da Receita <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) setErrors({ ...errors, title: '' })
                }}
                placeholder="Ex.: Risoto de Cogumelos Porcini e Trufas"
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

            {/* Summary */}
            <div>
              <Label htmlFor="summary" className="label-caps block mb-1.5">
                Resumo ou Apresentação
              </Label>
              <Textarea
                id="summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Breve descrição gastronômica, perfil de sabor e contexto do prato..."
                className="bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde text-sm leading-relaxed"
              />
            </div>

            {/* Category and Technique selects */}
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

            {/* Cover image upload */}
            <div>
              <Label className="label-caps block mb-1.5">
                Imagem de Capa (JPG, PNG ou WebP, máx. 2MB)
              </Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              {displayCover ? (
                <div className="relative rounded-2xl overflow-hidden border border-marfim-border aspect-[16/8] group">
                  <img src={displayCover} alt="Capa" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-tinta/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-tinta hover:bg-white/90 rounded-xl text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Alterar imagem
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveImage}
                      className="rounded-xl text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-marfim-border hover:border-bronze rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-marfim/40 hover:bg-marfim-card/50 transition-all flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center text-bronze border border-marfim-border">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium text-tinta">
                    Clique para selecionar uma imagem de capa
                  </div>
                  <p className="text-xs text-tinta-ter">JPG, PNG ou WebP de até 2MB</p>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2: FICHA TÉCNICA (METRICS) */}
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
                  Rendimento, tempos, custos e tabela nutricional.
                </p>
              </div>
            </div>

            {/* Rendimento e Unidade */}
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
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  placeholder="Ex.: 4"
                  className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                />
              </div>

              <div>
                <Label htmlFor="yieldUnit" className="label-caps block mb-1.5">
                  Unidade
                </Label>
                <Select
                  value={yieldUnit}
                  onValueChange={(val) =>
                    setYieldUnit(
                      val as
                        | 'porções'
                        | 'unidades'
                        | 'fatias'
                        | 'xícaras'
                        | 'kg'
                        | 'g'
                        | 'L'
                        | 'ml',
                    )
                  }
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
                  value={portions}
                  onChange={(e) => setPortions(e.target.value)}
                  placeholder="Ex.: 1 prato de 250g"
                  className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                />
              </div>
            </div>

            {/* Tempos de Preparo, Cozimento e Total automático */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="prepMinutes" className="label-caps block mb-1.5">
                  Tempo Preparo (min)
                </Label>
                <Input
                  id="prepMinutes"
                  type="number"
                  min="0"
                  value={prepMinutes}
                  onChange={(e) => setPrepMinutes(e.target.value)}
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
                  value={cookMinutes}
                  onChange={(e) => setCookMinutes(e.target.value)}
                  placeholder="Ex.: 25"
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

            {/* Dificuldade & Custo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficulty" className="label-caps block mb-1.5">
                  Dificuldade
                </Label>
                <Select
                  value={difficulty}
                  onValueChange={(val) => setDifficulty(val as 'Fácil' | 'Médio' | 'Difícil')}
                >
                  <SelectTrigger className="h-11 bg-marfim/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-marfim-border rounded-xl">
                    <SelectItem value="Fácil">Fácil</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Difícil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cost" className="label-caps block mb-1.5">
                  Custo Estimado (R$)
                </Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Ex.: 45.00"
                  className="h-11 bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde"
                />
              </div>
            </div>

            {/* Tabela Nutricional por porção */}
            <div className="p-4 rounded-xl bg-marfim border border-marfim-border space-y-3">
              <span className="label-caps text-xs block">
                Valor Nutricional por Porção (Opcional)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label
                    htmlFor="calories"
                    className="text-[11px] text-tinta-sec font-semibold block mb-1"
                  >
                    Calorias (kcal)
                  </Label>
                  <Input
                    id="calories"
                    type="number"
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="350"
                    className="h-10 bg-white rounded-lg text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="protein"
                    className="text-[11px] text-tinta-sec font-semibold block mb-1"
                  >
                    Proteínas (g)
                  </Label>
                  <Input
                    id="protein"
                    type="number"
                    min="0"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="12.5"
                    className="h-10 bg-white rounded-lg text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="carbs"
                    className="text-[11px] text-tinta-sec font-semibold block mb-1"
                  >
                    Carboidratos (g)
                  </Label>
                  <Input
                    id="carbs"
                    type="number"
                    min="0"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="45.0"
                    className="h-10 bg-white rounded-lg text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="fat"
                    className="text-[11px] text-tinta-sec font-semibold block mb-1"
                  >
                    Gorduras (g)
                  </Label>
                  <Input
                    id="fat"
                    type="number"
                    min="0"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="8.0"
                    className="h-10 bg-white rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: INGREDIENTES */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-marfim-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde font-serif font-bold text-base flex items-center justify-center">
                  3
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-tinta">Ingredientes</h2>
                  <p className="text-xs text-tinta-sec">
                    Mise en place com quantidades e unidades exatas.
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
                <span>Adicionar item</span>
              </Button>
            </div>

            {errors.ingredients && (
              <p className="text-xs text-red-600 font-medium">{errors.ingredients}</p>
            )}

            <div className="space-y-3">
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 sm:gap-3 p-2 bg-marfim/30 rounded-xl border border-marfim-border/70"
                >
                  <div className="w-20 sm:w-24 shrink-0">
                    <Input
                      placeholder="Qtd (ex: 200)"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                      className="h-10 bg-white rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="w-24 sm:w-28 shrink-0">
                    <Input
                      placeholder="Un (ex: g, ml)"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                      className="h-10 bg-white rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="Nome do ingrediente (ex.: Queijo Parmesão ralado)"
                      value={ing.name}
                      onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                      className="h-10 bg-white rounded-lg text-xs"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(idx)}
                    className="h-9 w-9 text-tinta-ter hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                    title="Remover linha"
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

          {/* SECTION 4: MODO DE PREPARO */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-marfim-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-bronze-subtle text-bronze font-serif font-bold text-base flex items-center justify-center">
                  4
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-tinta">Modo de Preparo</h2>
                  <p className="text-xs text-tinta-sec">
                    Etapas numeradas e detalhadas de execução.
                  </p>
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
                <span>Adicionar passo</span>
              </Button>
            </div>

            {errors.method && <p className="text-xs text-red-600 font-medium">{errors.method}</p>}

            <div className="space-y-3">
              {method.map((step, idx) => (
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
                      disabled={idx === method.length - 1}
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

          {/* SECTION 5: DICAS DO CHEF */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
            <div className="flex items-center gap-3 border-b border-marfim-border pb-4">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-serif font-bold text-base flex items-center justify-center">
                5
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-tinta">Dicas do Chef</h2>
                <p className="text-xs text-tinta-sec">
                  Segredos de ponto, conservação e harmonização (opcional).
                </p>
              </div>
            </div>

            <Textarea
              rows={3}
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              placeholder="Ex.: Secar a pele muito bem antes de grelhar para obter máxima crocância..."
              className="bg-marfim/30 focus:bg-white rounded-xl focus-visible:ring-verde text-sm leading-relaxed"
            />
          </section>

          {/* SECTION 6: RESTRIÇÕES ALIMENTARES */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
            <div className="flex items-center gap-3 border-b border-marfim-border pb-4">
              <div className="w-8 h-8 rounded-full bg-verde-subtle text-verde font-serif font-bold text-base flex items-center justify-center">
                6
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-tinta">Restrições Alimentares</h2>
                <p className="text-xs text-tinta-sec">
                  Marque os alérgenos e ingredientes de origem animal presentes na receita.
                </p>
              </div>
            </div>

            <DietaryChips state={dietary} onChange={handleDietaryChange} />
          </section>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditing ? `/receitas/${id}` : '/receitas')}
              disabled={submitting}
              className="border-marfim-border text-tinta rounded-xl"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={submitting}
              className="bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md px-8 py-6 text-base"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Salvando ficha técnica...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>{isEditing ? 'Atualizar Receita' : 'Salvar Receita'}</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* RIGHT SIDEBAR: LIVE PREVIEW OF FICHA TÉCNICA */}
        <aside className="lg:col-span-4 sticky top-20 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-bronze/40 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-marfim-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-bronze" />
                <h3 className="font-serif text-lg font-bold text-tinta">Prévia ao Vivo</h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-bronze font-bold bg-bronze-subtle px-2 py-0.5 rounded-full">
                Ficha Técnica
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div className="aspect-[16/9] rounded-xl overflow-hidden bg-marfim-card relative border border-marfim-border">
              {displayCover ? (
                <img src={displayCover} alt="Prévia" className="w-full h-full object-cover" />
              ) : (
                <RecipePlaceholder className="w-full h-full" iconSize="sm" />
              )}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold bg-tinta/80 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {difficulty}
                </span>
                {totalMinutes > 0 && (
                  <span className="text-[10px] font-semibold bg-verde/90 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {totalMinutes} min
                  </span>
                )}
              </div>
            </div>

            {/* Title & Category info */}
            <div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {selectedCatObj && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-marfim-card text-tinta-sec border border-marfim-border">
                    {selectedCatObj.name}
                  </span>
                )}
                {selectedTechObj && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bronze-subtle text-tinta border border-bronze/20">
                    {selectedTechObj.name}
                  </span>
                )}
              </div>
              <h4 className="font-serif text-lg font-bold text-tinta leading-tight">
                {title.trim() || 'Título da Receita'}
              </h4>
              <p className="text-xs text-tinta-sec line-clamp-2 mt-1">
                {summary.trim() || 'Apresentação curta da receita aparecerá aqui...'}
              </p>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-marfim-border/70 text-xs">
              <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                <span className="label-caps block text-[9px] text-tinta-ter">Rendimento</span>
                <span className="font-serif text-base font-bold text-tinta">
                  {yieldQuantity ? `${yieldQuantity} ${yieldUnit}` : '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                <span className="label-caps block text-[9px] text-tinta-ter">Tempo Total</span>
                <span className="font-serif text-base font-bold text-tinta">
                  {totalMinutes} min
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                <span className="label-caps block text-[9px] text-tinta-ter">Custo Est.</span>
                <span className="font-serif text-base font-bold text-tinta">
                  {cost ? `R$ ${Number(cost).toFixed(2).replace('.', ',')}` : '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-marfim border border-marfim-border">
                <span className="label-caps block text-[9px] text-tinta-ter">Calorias</span>
                <span className="font-serif text-base font-bold text-tinta">
                  {calories ? `${calories} kcal` : '-'}
                </span>
              </div>
            </div>

            {/* Live Counts */}
            <div className="flex items-center justify-between text-xs text-tinta-ter pt-1">
              <span>
                <strong>{ingredients.filter((i) => i.name.trim()).length}</strong> ingredientes
              </span>
              <span>
                <strong>{method.filter((m) => m.trim()).length}</strong> passos
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Import recipe modal */}
      <ImportRecipeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onConfirm={handleImportConfirm}
      />
    </div>
  )
}

export default RecipeForm
