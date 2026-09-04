import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bookmark,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ArrowRight,
  Loader2,
  BookOpen,
} from 'lucide-react'
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  CollectionWithCount,
} from '@/services/collections'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
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

const Colecoes: React.FC = () => {
  const navigate = useNavigate()
  const [collections, setCollections] = useState<CollectionWithCount[]>([])
  const [loading, setLoading] = useState(true)

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CollectionWithCount | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<CollectionWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const list = await getCollections()
      setCollections(list)
    } catch (err) {
      console.error('Erro ao carregar coleções:', err)
      toast({
        title: 'Erro ao carregar coleções',
        description: 'Não foi possível buscar suas coleções.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('collections', () => {
    load()
  })
  useRealtime('collection_recipes', () => {
    load()
  })

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setNameError('')
    setModalOpen(true)
  }

  const openEdit = (col: CollectionWithCount) => {
    setEditing(col)
    setName(col.name)
    setDescription(col.description || '')
    setNameError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('O nome da coleção é obrigatório')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateCollection(editing.id, { name: trimmedName, description: description.trim() })
        toast({
          title: 'Coleção atualizada',
          description: `A coleção "${trimmedName}" foi atualizada com sucesso.`,
        })
      } else {
        await createCollection({ name: trimmedName, description: description.trim() })
        toast({
          title: 'Coleção criada',
          description: `A coleção "${trimmedName}" foi criada.`,
        })
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      console.error('Erro ao salvar coleção:', err)
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.name) {
        setNameError(fieldErrors.name)
      }
      toast({
        title: 'Falha ao salvar coleção',
        description: getErrorMessage(err, 'Não foi possível salvar a coleção. Tente novamente.'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (col: CollectionWithCount) => {
    setToDelete(col)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCollection(toDelete.id)
      toast({
        title: 'Coleção excluída',
        description: `A coleção "${toDelete.name}" foi removida.`,
      })
      setDeleteOpen(false)
      load()
    } catch (err: unknown) {
      console.error('Erro ao excluir coleção:', err)
      toast({
        title: 'Erro ao excluir coleção',
        description: getErrorMessage(err, 'Não foi possível excluir a coleção.'),
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
          <span className="label-caps block mb-1">Organize seu Acervo</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-tinta tracking-tight">
              Coleções
            </h1>
            <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium">
              {collections.length} {collections.length === 1 ? 'coleção' : 'coleções'}
            </span>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-bronze hover:bg-bronze-hover text-white shadow-md font-medium rounded-xl px-4 py-5 gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Coleção</span>
        </Button>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-2" />
          <p className="text-sm font-serif italic text-tinta-sec">Carregando suas coleções...</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <div className="w-20 h-20 rounded-full bg-bronze-subtle border border-bronze/30 flex items-center justify-center mx-auto mb-5">
            <Bookmark className="w-10 h-10 text-bronze" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-tinta">Nenhuma coleção criada</h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-2 mb-6 leading-relaxed">
            Crie coleções temáticas para agrupar receitas favoritas — por estação, técnica, ocasião
            ou qualquer critério que desejar.
          </p>
          <Button
            onClick={openCreate}
            className="bg-verde hover:bg-verde-hover text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira coleção
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collections.map((col) => (
            <div
              key={col.id}
              className="bg-white rounded-2xl p-6 border border-marfim-border shadow-card card-hover-lift flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-verde" />
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-verde-subtle text-verde border border-verde/20 flex items-center justify-center shadow-xs">
                    <Bookmark className="w-6 h-6" />
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
                        onClick={() => openEdit(col)}
                        className="cursor-pointer text-xs rounded-lg py-2 flex items-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5 text-bronze" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => confirmDelete(col)}
                        className="cursor-pointer text-xs rounded-lg py-2 text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-serif text-xl font-bold text-tinta leading-tight group-hover:text-verde transition-colors line-clamp-2">
                  {col.name}
                </h3>
                <p className="text-xs text-tinta-sec line-clamp-3 mt-2 leading-relaxed">
                  {col.description || 'Sem descrição informada para esta coleção.'}
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-marfim-border/70 flex items-center justify-between text-xs">
                <span className="font-medium text-tinta-ter flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-bronze" />
                  {col.recipeCount || 0} {(col.recipeCount || 0) === 1 ? 'receita' : 'receitas'}
                </span>
                <button
                  onClick={() => navigate(`/colecoes/${col.id}`)}
                  className="font-semibold text-verde group-hover:text-verde-hover flex items-center gap-1"
                >
                  <span>Abrir</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD]">
              {editing ? 'Editar Coleção' : 'Nova Coleção'}
            </DialogTitle>
            <DialogDescription className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
              Agrupe receitas por tema, estação, técnica ou qualquer critério que desejar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label htmlFor="colName" className="label-caps block mb-1">
                Nome da Coleção <span className="text-red-500">*</span>
              </Label>
              <Input
                id="colName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="Ex.: Receitas de Inverno / Menu de Natal"
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
              <Label htmlFor="colDesc" className="label-caps block mb-1">
                Descrição
              </Label>
              <Textarea
                id="colDesc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito desta coleção..."
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
                ) : editing ? (
                  'Salvar alterações'
                ) : (
                  'Criar coleção'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta dark:text-[#EFE9DD]">
              Excluir coleção?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
              Tem certeza que deseja remover a coleção{' '}
              <strong className="text-tinta dark:text-[#EFE9DD]">
                &ldquo;{toDelete?.name}&rdquo;
              </strong>
              ? As receitas não serão excluídas, apenas desvinculadas desta coleção.
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

export default Colecoes
