import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRecipeById, deleteRecipe, getRecipeCoverUrl } from '@/services/recipes'
import { Recipe } from '@/types'
import { RecipePlaceholder } from '@/components/RecipePlaceholder'
import {
  Clock,
  Users,
  Award,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  MoreVertical,
  Flame,
  Scale,
  DollarSign,
  Zap,
  Lightbulb,
  ChefHat,
  Calendar,
  User,
  Loader2,
  CheckCircle2,
  Download,
} from 'lucide-react'
import { RecipeActions } from '@/components/RecipeActions'
import { exportRecipePdf } from '@/lib/recipePdf'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportPdf = async () => {
    if (!recipe) return
    setExportingPdf(true)
    // Defer to next tick so the spinner state can render before the CPU-bound work.
    try {
      await new Promise((r) => setTimeout(r, 50))
      exportRecipePdf(recipe)
      toast({
        title: 'PDF gerado',
        description: 'A ficha técnica foi exportada com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast({
        title: 'Falha na exportação',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setExportingPdf(false)
    }
  }

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return
      try {
        setLoading(true)
        const data = await getRecipeById(id)
        setRecipe(data)
      } catch (err) {
        console.error('Erro ao buscar receita:', err)
        toast({
          title: 'Receita não encontrada',
          description: 'A receita solicitada não foi localizada no acervo.',
          variant: 'destructive',
        })
        navigate('/receitas')
      } finally {
        setLoading(false)
      }
    }
    loadRecipe()
  }, [id, navigate])

  const handleDelete = async () => {
    if (!recipe) return
    try {
      setIsDeleting(true)
      await deleteRecipe(recipe.id)
      toast({
        title: 'Receita excluída',
        description: `A receita "${recipe.title}" foi removida com sucesso.`,
      })
      navigate('/receitas')
    } catch (err) {
      console.error('Erro ao excluir receita:', err)
      toast({
        title: 'Falha ao excluir',
        description: 'Não foi possível excluir o registro. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-verde" />
        <p className="font-serif italic text-tinta-sec">Consultando ficha técnica...</p>
      </div>
    )
  }

  if (!recipe) return null

  const coverUrl = getRecipeCoverUrl(recipe)

  // Format date in pt-BR
  const formattedCreated = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(recipe.created))

  const totalTime =
    (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0) || recipe.total_minutes || 0

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* TOP NAVIGATION BAR */}
      <div className="flex items-center justify-between">
        <Link
          to="/receitas"
          className="inline-flex items-center gap-2 text-sm font-medium text-tinta-sec hover:text-tinta transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Voltar ao Acervo</span>
        </Link>

        {/* Action Menu (...) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/receitas/${recipe.id}/editar`)}
            className="hidden sm:inline-flex border-marfim-border bg-white text-tinta rounded-xl gap-2 h-10 text-xs font-semibold shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-bronze" />
            <span>Editar Receita</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="hidden sm:inline-flex border-marfim-border bg-white text-tinta rounded-xl gap-2 h-10 text-xs font-semibold shadow-xs"
          >
            {exportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-bronze" />
            ) : (
              <Download className="w-3.5 h-3.5 text-bronze" />
            )}
            <span>{exportingPdf ? 'Gerando...' : 'Exportar PDF'}</span>
          </Button>

          {/* Favorite & collection actions */}
          <RecipeActions recipeId={recipe.id} size="md" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-white border-marfim-border rounded-xl shadow-xs text-tinta"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-white border-marfim-border rounded-xl shadow-dropdown p-1.5"
            >
              <DropdownMenuItem
                onClick={() => navigate(`/receitas/${recipe.id}/editar`)}
                className="cursor-pointer text-xs rounded-lg py-2 flex items-center gap-2"
              >
                <Edit className="w-3.5 h-3.5 text-bronze" />
                <span>Editar receita</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/receitas/nova')}
                className="cursor-pointer text-xs rounded-lg py-2 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-verde" />
                <span>Nova receita</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="cursor-pointer text-xs rounded-lg py-2 text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir receita</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-marfim-border min-h-[360px] md:min-h-[420px] flex flex-col justify-end">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <RecipePlaceholder className="absolute inset-0 w-full h-full" iconSize="lg" />
        )}

        {/* Deep gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-tinta via-tinta/65 to-transparent" />

        {/* Overlaid Hero Content */}
        <div className="relative z-10 p-6 sm:p-8 md:p-12 space-y-3.5 max-w-4xl">
          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {recipe.expand?.category && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                {recipe.expand.category.name}
              </span>
            )}
            {recipe.expand?.technique && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bronze/80 backdrop-blur-md text-white border border-bronze-light/40">
                {recipe.expand.technique.name}
              </span>
            )}
            {recipe.difficulty && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-verde/80 backdrop-blur-md text-white border border-verde-light/40">
                {recipe.difficulty}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
            {recipe.title}
          </h1>

          {/* Summary */}
          {recipe.summary && (
            <p className="text-sm sm:text-base md:text-lg text-white/80 font-light leading-relaxed max-w-3xl">
              {recipe.summary}
            </p>
          )}

          {/* Author meta */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-white/60 font-medium">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-bronze-light" />
              Registrada por {recipe.expand?.author?.name || 'Chef do Acervo'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-bronze-light" />
              {formattedCreated}
            </span>
          </div>
        </div>
      </div>

      {/* FICHA TÉCNICA (THE MASTER CARD) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-bronze/40 shadow-card space-y-8 relative overflow-hidden">
        {/* Subtle decorative gold badge in corner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-marfim-border pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bronze/15 text-bronze flex items-center justify-center border border-bronze/30">
              <Award className="w-5 h-5 text-bronze" />
            </div>
            <div>
              <span className="label-caps block text-[10px]">Especificação Gastronômica</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
                Ficha Técnica
              </h2>
            </div>
          </div>
          <span className="text-xs font-serif italic text-tinta-sec">
            Padrão de acervo profissional
          </span>
        </div>

        {/* Technical Data Grid (2 cols mobile, 4 cols desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {/* Rendimento */}
          <div className="p-4 rounded-2xl bg-marfim border border-marfim-border space-y-1">
            <div className="flex items-center gap-1.5 text-tinta-ter">
              <Users className="w-4 h-4 text-bronze" />
              <span className="label-caps text-[10px]">Rendimento</span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
              {recipe.yield_quantity || '-'}{' '}
              <span className="text-base font-sans font-normal text-tinta-sec">
                {recipe.yield_unit || ''}
              </span>
            </div>
          </div>

          {/* Porção */}
          <div className="p-4 rounded-2xl bg-marfim border border-marfim-border space-y-1">
            <div className="flex items-center gap-1.5 text-tinta-ter">
              <Scale className="w-4 h-4 text-bronze" />
              <span className="label-caps text-[10px]">Porção Unitária</span>
            </div>
            <div className="font-serif text-xl sm:text-2xl font-bold text-tinta line-clamp-1">
              {recipe.portions || 'Não especificada'}
            </div>
          </div>

          {/* Tempo de Preparo */}
          <div className="p-4 rounded-2xl bg-marfim border border-marfim-border space-y-1">
            <div className="flex items-center gap-1.5 text-tinta-ter">
              <Clock className="w-4 h-4 text-verde" />
              <span className="label-caps text-[10px]">Preparo</span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
              {recipe.prep_minutes !== undefined ? `${recipe.prep_minutes} min` : '-'}
            </div>
          </div>

          {/* Tempo de Cozimento */}
          <div className="p-4 rounded-2xl bg-marfim border border-marfim-border space-y-1">
            <div className="flex items-center gap-1.5 text-tinta-ter">
              <Flame className="w-4 h-4 text-amber-600" />
              <span className="label-caps text-[10px]">Cozimento</span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
              {recipe.cook_minutes !== undefined ? `${recipe.cook_minutes} min` : '-'}
            </div>
          </div>

          {/* Tempo Total em Destaque */}
          <div className="p-4 rounded-2xl bg-verde text-white border border-verde-light space-y-1 col-span-2 sm:col-span-1 shadow-md">
            <div className="flex items-center gap-1.5 text-marfim/80">
              <Zap className="w-4 h-4 text-bronze-light" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-bronze-light">
                Tempo Total
              </span>
            </div>
            <div className="font-serif text-3xl font-bold text-white">{totalTime} min</div>
          </div>

          {/* Dificuldade */}
          <div className="p-4 rounded-2xl bg-marfim border border-marfim-border space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-tinta-ter">
              <ChefHat className="w-4 h-4 text-bronze" />
              <span className="label-caps text-[10px]">Dificuldade</span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
              {recipe.difficulty || 'Média'}
            </div>
          </div>

          {/* Custo Estimado */}
          <div className="p-4 rounded-2xl bg-marfim border border-marfim-border space-y-1 col-span-2 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-tinta-ter">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <span className="label-caps text-[10px]">Custo Estimado</span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-tinta">
              {recipe.cost
                ? `R$ ${Number(recipe.cost).toFixed(2).replace('.', ',')}`
                : 'Não calculado'}
            </div>
          </div>
        </div>

        {/* Nutritional Breakdown Bar */}
        <div className="p-5 sm:p-6 rounded-2xl bg-marfim-card border border-marfim-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="label-caps text-xs">Valor Nutricional por porção</span>
            <span className="text-xs font-mono text-tinta-sec">Estimativa de macronutrientes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            {/* Calorias */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-tinta-sec">Calorias</span>
                <span className="font-bold text-tinta">{recipe.calories || 0} kcal</span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden border border-marfim-border">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, ((recipe.calories || 0) / 800) * 100)}%` }}
                />
              </div>
            </div>

            {/* Proteínas */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-tinta-sec">Proteínas</span>
                <span className="font-bold text-tinta">{recipe.protein || 0} g</span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden border border-marfim-border">
                <div
                  className="h-full bg-rose-600 rounded-full"
                  style={{ width: `${Math.min(100, ((recipe.protein || 0) / 60) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carboidratos */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-tinta-sec">Carboidratos</span>
                <span className="font-bold text-tinta">{recipe.carbs || 0} g</span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden border border-marfim-border">
                <div
                  className="h-full bg-sky-600 rounded-full"
                  style={{ width: `${Math.min(100, ((recipe.carbs || 0) / 100) * 100)}%` }}
                />
              </div>
            </div>

            {/* Gorduras */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-tinta-sec">Gorduras</span>
                <span className="font-bold text-tinta">{recipe.fat || 0} g</span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden border border-marfim-border">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${Math.min(100, ((recipe.fat || 0) / 50) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMNS: INGREDIENTS & METHOD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* INGREDIENTS (5 cols) */}
        <section className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-marfim-border pb-4">
            <div>
              <span className="label-caps block text-[10px]">Mise en place</span>
              <h2 className="font-serif text-2xl font-bold text-tinta">Ingredientes</h2>
            </div>
            <span className="text-xs font-mono text-tinta-ter bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border">
              {Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0} itens
            </span>
          </div>

          <div className="space-y-3">
            {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-marfim-card/60 transition-colors border-b border-marfim-border/40 last:border-0"
                >
                  <span className="w-2 h-2 rounded-full bg-bronze shrink-0 mt-2" />
                  <div className="flex-1 text-sm leading-relaxed text-tinta">
                    {(ing.quantity || ing.unit) && (
                      <strong className="font-semibold text-tinta mr-1.5 font-mono text-xs sm:text-sm bg-marfim-card px-1.5 py-0.5 rounded border border-marfim-border">
                        {ing.quantity} {ing.unit}
                      </strong>
                    )}
                    <span>{ing.name}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-tinta-sec italic">Nenhum ingrediente informado.</p>
            )}
          </div>
        </section>

        {/* METHOD (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-marfim-border pb-4">
            <div>
              <span className="label-caps block text-[10px]">Execução Culinária</span>
              <h2 className="font-serif text-2xl font-bold text-tinta">Modo de Preparo</h2>
            </div>
            <span className="text-xs font-mono text-tinta-ter bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border">
              {Array.isArray(recipe.method) ? recipe.method.length : 0} passos
            </span>
          </div>

          <div className="space-y-6">
            {Array.isArray(recipe.method) && recipe.method.length > 0 ? (
              recipe.method.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 group">
                  <div className="w-9 h-9 rounded-full bg-verde-subtle text-verde font-serif font-bold text-base flex items-center justify-center shrink-0 border border-verde/20 shadow-xs group-hover:bg-verde group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm sm:text-base leading-relaxed text-tinta">{step}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-tinta-sec italic">Nenhum passo informado.</p>
            )}
          </div>
        </section>
      </div>

      {/* DICAS DO CHEF (IF ANY) */}
      {recipe.tips && (
        <section className="bg-gradient-to-br from-[#FAF5EE] to-[#F5ECE0] rounded-3xl p-6 sm:p-8 border-2 border-bronze/40 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-bronze-dark">
            <div className="w-8 h-8 rounded-full bg-bronze/20 flex items-center justify-center text-bronze">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-xl font-bold text-tinta">Dicas do Chef</h3>
          </div>
          <p className="text-sm sm:text-base text-tinta-sec leading-relaxed italic pl-10 border-l-2 border-bronze/40">
            &ldquo;{recipe.tips}&rdquo;
          </p>
        </section>
      )}

      {/* BOTTOM ACTION BUTTONS */}
      <div className="pt-6 border-t border-marfim-border flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/receitas')}
          className="border-marfim-border text-tinta rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Voltar ao Acervo</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="bg-tinta hover:bg-tinta/90 text-marfim rounded-xl shadow-md px-5"
          >
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            <span>{exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
          </Button>

          <Button
            onClick={() => navigate(`/receitas/${recipe.id}/editar`)}
            className="bg-verde hover:bg-verde-hover text-white rounded-xl shadow-md px-5"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span>Editar Receita</span>
          </Button>

          <Button
            onClick={() => navigate('/receitas/nova')}
            className="bg-bronze hover:bg-bronze-hover text-white rounded-xl shadow-md px-5"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Nova Receita</span>
          </Button>
        </div>
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border-marfim-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta">
              Excluir receita do acervo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec text-sm">
              Esta ação removerá permanentemente a ficha técnica de{' '}
              <strong className="text-tinta">&ldquo;{recipe.title}&rdquo;</strong> do acervo
              culinário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default RecipeDetail
