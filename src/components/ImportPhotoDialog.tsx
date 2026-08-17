import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Camera,
  Upload,
  ImageUp,
  X,
  Loader2,
  ScanText,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  ocrImageToRecipe,
  validateImageFile,
  readImageDimensions,
  type OcrProgress,
} from '@/lib/recipeOcr'
import { parseIngredientLine, type ParsedRecipe } from '@/lib/recipeImport'
import { createRecipe } from '@/services/recipes'
import { getCategories } from '@/services/categories'
import { getTechniques } from '@/services/techniques'
import type { Category, Technique, IngredientItem, RecipeFormData } from '@/types'

type Stage = 'capture' | 'review' | 'saving'

interface ImportPhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LOW_RES_THRESHOLD = 600 // px on the shorter side

/**
 * Modal that imports a recipe from a photo: capture/upload an image, run
 * Tesseract.js OCR (por → eng fallback) entirely in the browser, then let
 * the user review and edit the structured result before saving it directly
 * to the acervo and redirecting to the ficha técnica.
 *
 * No backend involvement — OCR runs in a web worker on the client.
 */
const ImportPhotoDialog: React.FC<ImportPhotoDialogProps> = ({ open, onOpenChange }) => {
  const [stage, setStage] = useState<Stage>('capture')

  // Image + OCR state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [lowResWarning, setLowResWarning] = useState<string | null>(null)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')

  // Review state
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null)
  const [category, setCategory] = useState('')
  const [technique, setTechnique] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])

  // Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag state for the drop zone
  const [dragging, setDragging] = useState(false)

  // Load select options when the dialog opens.
  useEffect(() => {
    if (!open) return
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
  }, [open])

  // Stop the camera stream if it's running when the dialog closes or stage changes.
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => {
    if (!open) {
      stopCamera()
      resetAll()
    }
  }, [open, stopCamera])

  // Cleanup camera on unmount.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const resetAll = () => {
    setStage('capture')
    setImagePreview(null)
    setImageFile(null)
    setLowResWarning(null)
    setOcrRunning(false)
    setOcrProgress(null)
    setOcrError(null)
    setRawText('')
    setParsed(null)
    setCategory('')
    setTechnique('')
    setErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Image handling ---

  const acceptImage = useCallback(async (file: File) => {
    setOcrError(null)
    const validationError = validateImageFile(file)
    if (validationError) {
      setOcrError(
        validationError === 'too-small'
          ? 'A imagem está muito pequena. Envie uma foto maior e mais nítida.'
          : 'Selecione um arquivo de imagem válido (JPG, PNG ou WebP).',
      )
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(previewUrl)

    // Check resolution and warn (non-blocking).
    try {
      const { width, height } = await readImageDimensions(previewUrl)
      const shorter = Math.min(width, height)
      if (shorter < LOW_RES_THRESHOLD) {
        setLowResWarning(
          'A imagem está com baixa resolução, tente uma foto mais nítida para melhor extração.',
        )
      } else {
        setLowResWarning(null)
      }
    } catch {
      setLowResWarning(null)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) acceptImage(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) acceptImage(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setImageFile(null)
    setLowResWarning(null)
    setOcrError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Camera handling ---

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
      // Wait for the video element to be rendered before attaching the stream.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch((err) => console.error('Erro ao iniciar vídeo:', err))
        }
      })
    } catch (err: unknown) {
      console.error('Erro ao acessar câmera:', err)
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'captura.jpg', { type: 'image/jpeg' })
        stopCamera()
        acceptImage(file)
      },
      'image/jpeg',
      0.92,
    )
  }

  // --- OCR ---

  const handleExtract = async () => {
    if (!imageFile) return
    setOcrRunning(true)
    setOcrError(null)
    setOcrProgress({ progress: 0, status: 'Iniciando...' })
    try {
      const { text, recipe } = await ocrImageToRecipe(imageFile, (p) => setOcrProgress(p))
      setRawText(text)
      if (text.trim().length < 4) {
        throw new Error('Não foi possível extrair texto desta imagem. Tente outra foto.')
      }
      setParsed(recipe)
      setStage('review')
      toast({
        title: 'Texto extraído',
        description: `Foram identificados ${recipe.ingredients.length} ingrediente(s) e ${recipe.method.length} passo(s). Revise antes de salvar.`,
      })
    } catch (err: unknown) {
      console.error('Erro no OCR:', err)
      const msg =
        err instanceof Error ? err.message : 'Falha ao extrair texto da imagem. Tente novamente.'
      setOcrError(msg)
    } finally {
      setOcrRunning(false)
      setOcrProgress(null)
    }
  }

  // --- Review editing ---

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

  // --- Save ---

  const validate = (): boolean => {
    if (!parsed) return false
    const newErrors: Record<string, string> = {}
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
      return
    }

    setStage('saving')
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
        title: 'Receita importada por foto',
        description: 'A ficha técnica foi registrada no acervo com sucesso.',
      })
      onOpenChange(false)
      // Use a hard navigation so we leave the list page cleanly.
      window.location.assign(`/receitas/${saved.id}`)
    } catch (err: unknown) {
      console.error('Erro ao salvar receita:', err)
      setStage('review')
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
    }
  }

  const handleClose = (next: boolean) => {
    if (!next) {
      stopCamera()
      resetAll()
    }
    onOpenChange(next)
  }

  // --- Render helpers ---

  const progressPct = ocrProgress ? Math.round((ocrProgress.progress || 0) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] p-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-3 border-b border-marfim-border dark:border-[#322F26] shrink-0">
          <DialogTitle className="font-serif text-xl text-tinta dark:text-[#EFE9DD] flex items-center gap-2">
            <Camera className="w-5 h-5 text-verde dark:text-[#A9C4B5]" />
            Importar Receita por Foto
          </DialogTitle>
          <DialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
            Tire uma foto de um livro, cardápio ou receita impressa. O sistema lê o texto e monta a
            ficha técnica para você revisar.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* STAGE: CAPTURE / UPLOAD */}
          {stage === 'capture' && (
            <div className="space-y-5">
              {/* Mode switch: Camera (primary on mobile) / Upload (primary on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className={`flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl border-2 font-medium text-sm transition-all ${
                    cameraActive
                      ? 'border-verde bg-verde-subtle text-verde'
                      : 'border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/60 text-tinta dark:text-[#EFE9DD] hover:border-verde hover:bg-verde-subtle'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  <span>Usar Câmera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl border-2 border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/60 text-tinta dark:text-[#EFE9DD] hover:border-bronze hover:bg-bronze-subtle font-medium text-sm transition-all"
                >
                  <Upload className="w-5 h-5" />
                  <span>Enviar Imagem</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Camera preview */}
              {cameraActive && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border-2 border-verde/40 bg-black aspect-[4/3]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      title="Fechar câmera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full bg-verde hover:bg-verde-hover text-white rounded-xl h-11"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar Foto
                  </Button>
                  {cameraError && <ErrorBanner message={cameraError} />}
                </div>
              )}

              {/* Drop zone (shown when camera not active and no image yet) */}
              {!cameraActive && !imagePreview && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                    dragging
                      ? 'border-verde bg-verde-subtle scale-[1.01]'
                      : 'border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/40 hover:border-bronze hover:bg-bronze-subtle/40'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-[#221F18] shadow-xs flex items-center justify-center text-bronze border border-marfim-border dark:border-[#322F26] animate-pulse">
                    <ImageUp className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tinta dark:text-[#EFE9DD]">
                      Arraste uma imagem aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-tinta-ter dark:text-[#8F887B] mt-1">
                      JPG, PNG ou WebP — fotos de livros, cardápios ou receitas impressas
                    </p>
                  </div>
                </div>
              )}

              {/* Image preview before extraction */}
              {imagePreview && !cameraActive && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-marfim-border dark:border-[#322F26] bg-marfim-card">
                    <img
                      src={imagePreview}
                      alt="Prévia da foto"
                      className="w-full max-h-[40vh] object-contain bg-black/5"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      title="Remover imagem"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {lowResWarning && <WarningBanner message={lowResWarning} />}
                  {ocrError && <ErrorBanner message={ocrError} />}

                  <Button
                    type="button"
                    onClick={handleExtract}
                    disabled={ocrRunning}
                    className="w-full bg-verde hover:bg-verde-hover text-white rounded-xl h-12 text-base"
                  >
                    {ocrRunning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Analisando imagem...
                      </>
                    ) : (
                      <>
                        <ScanText className="w-5 h-5 mr-2" />
                        Extrair Receita
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* OCR progress */}
              {ocrRunning && ocrProgress && (
                <div className="space-y-3 p-5 rounded-xl bg-verde-subtle border border-verde/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-verde shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-verde">
                        {ocrProgress.status || 'Analisando imagem...'}
                      </p>
                      <p className="text-xs text-verde/80 mt-0.5">
                        Lendo a foto com OCR — isso pode levar alguns segundos.
                      </p>
                    </div>
                    <span className="text-sm font-mono font-bold text-verde shrink-0">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-verde/20 overflow-hidden">
                    <div
                      className="h-full bg-verde transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${Math.max(progressPct, 3)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE: REVIEW */}
          {stage === 'review' && parsed && (
            <div className="space-y-6">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-verde-subtle border border-verde/20">
                <CheckCircle2 className="w-5 h-5 text-verde shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-verde">
                    Receita estruturada com sucesso
                  </p>
                  <p className="text-[11px] text-verde/80 mt-0.5">
                    Revise e ajuste os campos abaixo antes de salvar no acervo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStage('capture')
                    setParsed(null)
                    clearImage()
                  }}
                  className="text-verde hover:bg-verde/10 text-xs h-8"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Nova foto
                </Button>
              </div>

              {/* Side-by-side: image thumb + raw text toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {imagePreview && (
                  <div className="rounded-xl overflow-hidden border border-marfim-border dark:border-[#322F26] bg-marfim-card max-h-48">
                    <img
                      src={imagePreview}
                      alt="Foto original"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <details className="rounded-xl border border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/40 p-3 group">
                  <summary className="text-xs font-semibold text-tinta-sec dark:text-[#B5AE9F] cursor-pointer flex items-center gap-1.5">
                    <ScanText className="w-3.5 h-3.5 text-bronze" />
                    Ver texto bruto extraído ({rawText.length} caracteres)
                  </summary>
                  <pre className="mt-2 text-[10px] leading-relaxed text-tinta-ter dark:text-[#8F887B] whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                    {rawText || '— sem texto —'}
                  </pre>
                </details>
              </div>

              {/* Basic info */}
              <div className="space-y-3">
                <SectionLabel
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  title="Informações Básicas"
                />
                <div>
                  <Label htmlFor="ocr-title" className="label-caps text-[11px] mb-1">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ocr-title"
                    value={parsed.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className={`h-10 bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white dark:focus:bg-[#15140F] rounded-lg text-sm ${
                      errors.title ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.title && <FieldError msg={errors.title} />}
                </div>
                <div>
                  <Label htmlFor="ocr-summary" className="label-caps text-[11px] mb-1">
                    Resumo
                  </Label>
                  <Textarea
                    id="ocr-summary"
                    rows={2}
                    value={parsed.summary}
                    onChange={(e) => updateField('summary', e.target.value)}
                    className="bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white rounded-lg text-xs leading-relaxed"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ocr-category" className="label-caps text-[11px] mb-1">
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(v) => {
                        setCategory(v)
                        if (errors.category) setErrors({ ...errors, category: '' })
                      }}
                    >
                      <SelectTrigger
                        className={`h-10 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg ${
                          errors.category ? 'border-red-500' : ''
                        }`}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <FieldError msg={errors.category} />}
                  </div>
                  <div>
                    <Label htmlFor="ocr-technique" className="label-caps text-[11px] mb-1">
                      Técnica <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={technique}
                      onValueChange={(v) => {
                        setTechnique(v)
                        if (errors.technique) setErrors({ ...errors, technique: '' })
                      }}
                    >
                      <SelectTrigger
                        className={`h-10 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg ${
                          errors.technique ? 'border-red-500' : ''
                        }`}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                        {techniques.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.technique && <FieldError msg={errors.technique} />}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                <SectionLabel title="Ficha Técnica & Métricas" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="label-caps text-[10px] mb-1 block">Rendimento</Label>
                    <Input
                      type="number"
                      min="0"
                      value={parsed.yield_quantity}
                      onChange={(e) => updateField('yield_quantity', e.target.value)}
                      placeholder="4"
                      className="h-9 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <Label className="label-caps text-[10px] mb-1 block">Unidade</Label>
                    <Select
                      value={parsed.yield_unit || 'porções'}
                      onValueChange={(v) => updateField('yield_unit', v)}
                    >
                      <SelectTrigger className="h-9 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg text-xs">
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
                    <Label className="label-caps text-[10px] mb-1 block">Preparo (min)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={parsed.prep_minutes}
                      onChange={(e) => updateField('prep_minutes', e.target.value)}
                      placeholder="20"
                      className="h-9 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <Label className="label-caps text-[10px] mb-1 block">Cozimento (min)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={parsed.cook_minutes}
                      onChange={(e) => updateField('cook_minutes', e.target.value)}
                      placeholder="45"
                      className="h-9 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="label-caps text-[10px] mb-1 block">Dificuldade</Label>
                    <Select
                      value={parsed.difficulty || 'Fácil'}
                      onValueChange={(v) => updateField('difficulty', v)}
                    >
                      <SelectTrigger className="h-9 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg text-xs">
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
                    <Label className="label-caps text-[10px] mb-1 block">Porção Unitária</Label>
                    <Input
                      value={parsed.portions}
                      onChange={(e) => updateField('portions', e.target.value)}
                      placeholder="1 fatia de 120g"
                      className="h-9 bg-marfim/30 dark:bg-[#221F18]/60 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel title={`Ingredientes (${parsed.ingredients.length})`} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addIngredient}
                    className="text-bronze hover:bg-bronze-subtle text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {errors.ingredients && <FieldError msg={errors.ingredients} />}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {parsed.ingredients.length === 0 && (
                    <p className="text-[11px] text-tinta-ter italic py-2 text-center">
                      Nenhum ingrediente extraído. Adicione manualmente.
                    </p>
                  )}
                  {parsed.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                        className="h-8 w-16 bg-white dark:bg-[#15140F] rounded-md text-[11px] font-mono"
                        placeholder="Qtd"
                      />
                      <Input
                        value={ing.unit}
                        onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                        className="h-8 w-20 bg-white dark:bg-[#15140F] rounded-md text-[11px]"
                        placeholder="Un"
                      />
                      <Input
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                        onPaste={(e) => handleIngredientPaste(e, idx)}
                        className="h-8 flex-1 bg-white dark:bg-[#15140F] rounded-md text-[11px]"
                        placeholder="Ingrediente"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(idx)}
                        className="h-7 w-7 text-tinta-ter hover:text-red-600 hover:bg-red-50 rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Method */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel title={`Modo de Preparo (${parsed.method.length})`} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addStep}
                    className="text-bronze hover:bg-bronze-subtle text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {errors.method && <FieldError msg={errors.method} />}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {parsed.method.length === 0 && (
                    <p className="text-[11px] text-tinta-ter italic py-2 text-center">
                      Nenhum passo extraído. Adicione manualmente.
                    </p>
                  )}
                  {parsed.method.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="font-serif font-bold text-verde shrink-0 text-xs w-5 text-right pt-1.5">
                        {idx + 1}.
                      </span>
                      <Textarea
                        rows={2}
                        value={step}
                        onChange={(e) => updateStep(idx, e.target.value)}
                        className="flex-1 bg-white dark:bg-[#15140F] rounded-md text-[11px] leading-relaxed focus-visible:ring-verde"
                        placeholder={`Passo ${idx + 1}`}
                      />
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, 'up')}
                          className="h-6 w-6 text-tinta-ter hover:text-tinta rounded"
                        >
                          <MoveUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === parsed.method.length - 1}
                          onClick={() => moveStep(idx, 'down')}
                          className="h-6 w-6 text-tinta-ter hover:text-tinta rounded"
                        >
                          <MoveDown className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(idx)}
                          className="h-6 w-6 text-tinta-ter hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <SectionLabel title="Dicas e Notas" />
                <Textarea
                  rows={2}
                  value={parsed.tips}
                  onChange={(e) => updateField('tips', e.target.value)}
                  className="bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white rounded-lg text-xs leading-relaxed"
                  placeholder="Observações extras extraídas (opcional)"
                />
              </div>

              {/* Extraction summary chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-marfim-border dark:border-[#322F26]">
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
                <ExtractionChip label="Dificuldade" ok={Boolean(parsed.difficulty)} />
              </div>
            </div>
          )}

          {/* STAGE: SAVING */}
          {stage === 'saving' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-9 h-9 animate-spin text-verde mb-3" />
              <p className="font-serif italic text-tinta-sec">Salvando ficha técnica...</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-marfim-border dark:border-[#322F26] bg-marfim/30 dark:bg-[#221F18]/40 rounded-b-2xl shrink-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={ocrRunning || stage === 'saving'}
            className="border-marfim-border dark:border-[#322F26] text-tinta dark:text-[#EFE9DD] rounded-xl"
          >
            Cancelar
          </Button>
          {stage === 'review' && (
            <Button
              onClick={handleSave}
              disabled={stage !== 'review'}
              className="bg-verde hover:bg-verde-hover text-white rounded-xl px-5"
            >
              <Save className="w-4 h-4 mr-2" />
              Importar Receita
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Small presentational helpers ---

const SectionLabel: React.FC<{ icon?: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-1.5">
    {icon}
    <span className="label-caps text-[11px] text-tinta-sec dark:text-[#B5AE9F]">{title}</span>
  </div>
)

const FieldError: React.FC<{ msg: string }> = ({ msg }) => (
  <p className="text-[11px] text-red-600 mt-0.5 font-medium">{msg}</p>
)

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs">
    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
    <p>{message}</p>
  </div>
)

const WarningBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
    <p>{message}</p>
  </div>
)

const ExtractionChip: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <Badge
    className={
      ok
        ? 'bg-verde-subtle text-verde border border-verde/20 text-[10px] gap-1 py-0 px-2'
        : 'bg-marfim-card dark:bg-[#221F18] text-tinta-ter dark:text-[#8F887B] border border-marfim-border dark:border-[#322F26] text-[10px] py-0 px-2'
    }
  >
    {ok ? <CheckCircle2 className="w-3 h-3" /> : null}
    {label}
  </Badge>
)

export default ImportPhotoDialog
