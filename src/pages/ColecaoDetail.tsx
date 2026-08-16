import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Bookmark, ArrowLeft, Edit, Trash2, MoreVertical, Loader2, BookOpen } from 'lucide-react'
import {
  getCollectionById,
  getCollectionRecipes,
  updateCollection,
  deleteCollection,
} from '@/services/collections'
import { Collection, Recipe } from '@/types'
import { RecipeCard } from '@/components/RecipeCard'
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
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

const ColecaoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const [col, recs] = await Promise.all([getCollectionById(id), getCollectionRecipes(id)])
      setCollection(col)
      setRecipes(recs)
    } catch (err) {
      console.error('Erro ao carregar coleção:', err)
      toast({
        title: 'Coleção não encontrada',
        description: 'A coleção solicitada não foi localizada.',
        variant: 'destructive',
      })
      navigate('/colecoes')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('collection_recipes', () => {
    load()
  })

  const openEdit = () => {
    if (!collection) return
    setName(collection.name)
    setDescription(collection.description || '')
    setNameError('')
    setEditOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collection) return
    if (!name.trim()) {
      setNameError('O nome da coleção é obrigatório')
      return
    }
    setSaving(true)
    try {
      await updateCollection(collection.id, { name, description })
      toast({ title: 'Coleção atualizada', description: `Agora se chama "${name}".` })
      setEditOpen(false)
      load()
    } catch (err: unknown) {
      console.error('Erro ao salvar coleção:', err)
      const errorObj = err as { message?: string }
      toast({
        title: 'Falha ao salvar',
        description: errorObj?.message || 'Erro ao processar solicitação.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!collection) return
    setDeleting(true)
    try {
      await deleteCollection(collection.id)
      toast({ title: 'Coleção excluída', description: `"${collection.name}" foi removida.` })
      navigate('/colecoes')
    } catch (err: unknown) {
      console.error('Erro ao excluir coleção:', err)
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro ao excluir',
        description: errorObj?.message || 'Não foi possível excluir a coleção.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-verde" />
        <p className="font-serif italic text-tinta-sec">Abrindo coleção...</p>
      </div>
    )
  }

  if (!collection) return null

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* TOP NAV */}
      <div className="flex items-center justify-between">
        <Link
          to="/colecoes"
          className="inline-flex items-center gap-2 text-sm font-medium text-tinta-sec hover:text-tinta transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Voltar às Coleções</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openEdit}
            className="hidden sm:inline-flex border-marfim-border bg-white text-tinta rounded-xl gap-2 h-10 text-xs font-semibold shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-bronze" />
            <span>Editar Coleção</span>
          </Button>

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
                onClick={openEdit}
                className="cursor-pointer text-xs rounded-lg py-2 flex items-center gap-2"
              >
                <Edit className="w-3.5 h-3.5 text-bronze" />
                <span>Editar coleção</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer text-xs rounded-lg py-2 text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir coleção</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-marfim-border shadow-card space-y-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-verde" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-verde-subtle text-verde border border-verde/20 flex items-center justify-center shadow-xs">
            <Bookmark className="w-6 h-6" />
          </div>
          <span className="label-caps">Coleção pessoal</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-sm sm:text-base text-tinta-sec leading-relaxed max-w-3xl">
            {collection.description}
          </p>
        )}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-bronze" />
            {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
          </span>
        </div>
      </div>

      {/* RECIPES GRID */}
      {recipes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <BookOpen className="w-12 h-12 text-tinta-ter mx-auto mb-3" />
          <h3 className="font-serif text-2xl font-bold text-tinta">Coleção vazia</h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-2 mb-6 leading-relaxed">
            Adicione receitas a esta coleção pelo menu de três pontos no card de cada receita, ou
            diretamente na ficha técnica.
          </p>
          <Button asChild className="bg-verde hover:bg-verde-hover text-white rounded-xl">
            <Link to="/receitas">Explorar receitas</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white rounded-2xl border-marfim-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-tinta">
              Editar Coleção
            </DialogTitle>
            <DialogDescription className="text-xs text-tinta-sec">
              Atualize o nome e a descrição da sua coleção.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label htmlFor="detName" className="label-caps block mb-1">
                Nome da Coleção <span className="text-red-500">*</span>
              </Label>
              <Input
                id="detName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                className={`h-11 bg-marfim/30 focus:bg-white rounded-xl ${
                  nameError ? 'border-red-500' : 'focus-visible:ring-verde'
                }`}
              />
              {nameError && <p className="text-xs text-red-600 mt-1 font-medium">{nameError}</p>}
            </div>
            <div>
              <Label htmlFor="detDesc" className="label-caps block mb-1">
                Descrição
              </Label>
              <Textarea
                id="detDesc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-marfim/30 focus:bg-white rounded-xl text-xs leading-relaxed"
              />
            </div>
            <DialogFooter className="pt-4 border-t border-marfim-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-verde hover:bg-verde-hover text-white rounded-xl min-w-[100px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border-marfim-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta">
              Excluir coleção?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec text-sm">
              Tem certeza que deseja remover a coleção{' '}
              <strong className="text-tinta">&ldquo;{collection.name}&rdquo;</strong>? As receitas
              não serão excluídas, apenas desvinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ColecaoDetail
