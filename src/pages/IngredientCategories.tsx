import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getIngredientCategories,
  createIngredientCategory,
  updateIngredientCategory,
  deleteIngredientCategory,
} from '@/services/ingredientCategories'
import { getIngredients } from '@/services/ingredients'
import { IngredientCategory, Ingredient } from '@/types'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Tags,
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  ArrowRight,
  Loader2,
  MoreVertical,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const IngredientCategories: React.FC = () => {
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal Create/Edit State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<IngredientCategory | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<IngredientCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [catList, ingList] = await Promise.all([
        getIngredientCategories(),
        getIngredients().catch(() => [] as Ingredient[]),
      ])
      setCategories(catList)
      setIngredients(ingList)
    } catch (err) {
      console.error('Erro ao carregar categorias de ingredientes:', err)
      toast({
        title: 'Erro ao carregar categorias',
        description: 'Não foi possível buscar as categorias de ingredientes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Count ingredients per category
  const countMap = useMemo(() => {
    const map: Record<string, number> = {}
    ingredients.forEach((ing) => {
      if (ing.categoria_id) {
        map[ing.categoria_id] = (map[ing.categoria_id] || 0) + 1
      }
    })
    return map
  }, [ingredients])

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    )
  }, [categories, search])

  const openCreateModal = () => {
    setEditingCategory(null)
    setName('')
    setDescription('')
    setNameError('')
    setModalOpen(true)
  }

  const openEditModal = (cat: IngredientCategory) => {
    setEditingCategory(cat)
    setName(cat.name)
    setDescription(cat.description || '')
    setNameError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('O nome da categoria é obrigatório')
      return
    }

    setSaving(true)
    try {
      if (editingCategory) {
        await updateIngredientCategory(editingCategory.id, {
          name: trimmedName,
          description: description.trim(),
        })
        toast({
          title: 'Categoria atualizada',
          description: `A categoria de ingredientes "${trimmedName}" foi atualizada com sucesso.`,
        })
      } else {
        await createIngredientCategory({
          name: trimmedName,
          description: description.trim(),
        })
        toast({
          title: 'Categoria criada',
          description: `A categoria de ingredientes "${trimmedName}" foi adicionada com sucesso.`,
        })
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error('Erro ao salvar categoria de ingredientes:', err)
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.name) {
        setNameError(fieldErrors.name)
      } else if (fieldErrors.slug) {
        setNameError('Já existe uma categoria cadastrada com este nome ou identificador.')
      }

      const friendlyMsg = getErrorMessage(
        err,
        'Não foi possível salvar a categoria de ingredientes. Verifique as informações e tente novamente.',
      )

      toast({
        title: 'Falha ao salvar categoria',
        description: friendlyMsg,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (cat: IngredientCategory) => {
    const count = countMap[cat.id] || 0
    if (count > 0) {
      toast({
        title: 'Exclusão bloqueada',
        description: `Esta categoria possui ${count} ingrediente(s) vinculado(s). Reatribua-os antes de excluir.`,
        variant: 'destructive',
      })
      return
    }
    setCategoryToDelete(cat)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    setDeleting(true)
    try {
      await deleteIngredientCategory(categoryToDelete.id)
      toast({
        title: 'Categoria excluída',
        description: `A categoria "${categoryToDelete.name}" foi removida.`,
      })
      setDeleteDialogOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error('Erro ao excluir categoria:', err)
      toast({
        title: 'Erro ao excluir categoria',
        description: getErrorMessage(err, 'Não foi possível excluir a categoria selecionada.'),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-marfim-border">
        <div>
          <span className="label-caps block mb-1">Insumos &amp; Matérias-Primas</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
              Categorias de Ingredientes
            </h1>
            <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium">
              {categories.length} categorias
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openCreateModal}
            className="bg-bronze hover:bg-bronze-hover text-white shadow-md font-medium rounded-xl px-4 py-5 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Categoria</span>
          </Button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-tinta-ter absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Buscar categoria por nome ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white border-marfim-border rounded-xl focus-visible:ring-verde text-sm shadow-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-ter hover:text-tinta"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CATEGORIES GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-2" />
          <p className="text-sm font-serif italic text-tinta-sec">
            Carregando categorias de ingredientes...
          </p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <Tags className="w-12 h-12 text-tinta-ter mx-auto mb-3" />
          <h3 className="font-serif text-2xl font-bold text-tinta">Nenhuma categoria encontrada</h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-1 mb-6">
            Não encontramos categorias de ingredientes correspondentes ao termo pesquisado.
          </p>
          <Button onClick={openCreateModal} className="bg-verde text-white rounded-xl">
            + Adicionar Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.map((cat) => {
            const count = countMap[cat.id] || 0

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-6 border border-marfim-border shadow-card card-hover-lift flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent top color strip */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-bronze" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-bronze-subtle text-bronze border border-bronze/30 flex items-center justify-center shadow-xs">
                      <Tags className="w-6 h-6" />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-tinta-ter hover:text-tinta rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white border-marfim-border rounded-xl shadow-dropdown p-1.5"
                      >
                        <DropdownMenuItem
                          onClick={() => openEditModal(cat)}
                          className="cursor-pointer text-xs rounded-lg py-2 flex items-center gap-2"
                        >
                          <Edit className="w-3.5 h-3.5 text-bronze" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmDelete(cat)}
                          className="cursor-pointer text-xs rounded-lg py-2 text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-tinta leading-tight group-hover:text-verde transition-colors">
                    {cat.name}
                  </h3>

                  <p className="text-xs text-tinta-sec line-clamp-3 mt-2 leading-relaxed">
                    {cat.description ||
                      'Sem descrição cadastrada para esta categoria de ingredientes.'}
                  </p>
                </div>

                {/* Footer Link & Count */}
                <div className="pt-5 mt-5 border-t border-marfim-border/70 flex items-center justify-between text-xs">
                  <span className="font-medium text-tinta-ter flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-bronze" />
                    {count} {count === 1 ? 'ingrediente' : 'ingredientes'}
                  </span>

                  <Link
                    to={`/ingredientes?categoria=${cat.id}`}
                    className="font-semibold text-verde group-hover:text-verde-hover flex items-center gap-1"
                  >
                    <span>Ver ingredientes</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CREATE / EDIT */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD]">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
              Defina a classificação para organizar os ingredientes e insumos do acervo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label htmlFor="catName" className="label-caps block mb-1">
                Nome da Categoria <span className="text-red-500">*</span>
              </Label>
              <Input
                id="catName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="Ex.: Laticínios, Farinhas, Especiarias, Carnes"
                className={`h-11 bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white dark:focus:bg-[#15140F] rounded-xl ${
                  nameError
                    ? 'border-red-500 dark:border-[#E0806B]/60'
                    : 'focus-visible:ring-verde dark:focus-visible:ring-[#3F614C]/60'
                }`}
              />
              {nameError && (
                <p className="text-xs text-red-600 dark:text-[#E0806B] mt-1 font-medium">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="catDesc" className="label-caps block mb-1">
                Descrição
              </Label>
              <Textarea
                id="catDesc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o tipo de insumos ou produtos pertencentes a este grupo..."
                className="bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white dark:focus:bg-[#15140F] rounded-xl text-xs leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-marfim-border dark:border-[#322F26]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-xl border-marfim-border dark:border-[#322F26] text-tinta dark:text-[#EFE9DD]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-verde dark:bg-[#24392C] hover:bg-verde-hover dark:hover:bg-[#2F4B3A] text-white dark:text-[#EFE9DD] rounded-xl min-w-[100px]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingCategory ? (
                  'Salvar alterações'
                ) : (
                  'Criar categoria'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DELETE */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta dark:text-[#EFE9DD]">
              Excluir categoria de ingredientes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
              Tem certeza que deseja remover a categoria{' '}
              <strong className="text-tinta dark:text-[#EFE9DD]">
                &ldquo;{categoryToDelete?.name}&rdquo;
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl border-marfim-border dark:border-[#322F26] text-tinta dark:text-[#EFE9DD]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 dark:bg-[#B4553F] hover:bg-red-700 dark:hover:bg-[#9A4634] text-white dark:text-[#EFE9DD] rounded-xl"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default IngredientCategories
