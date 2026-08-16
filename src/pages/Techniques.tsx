import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getTechniques,
  createTechnique,
  updateTechnique,
  deleteTechnique,
} from '@/services/techniques'
import { getRecipes } from '@/services/recipes'
import { Technique, Recipe } from '@/types'
import {
  Flame,
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
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

const Techniques: React.FC = () => {
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal Create/Edit State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [techniqueToDelete, setTechniqueToDelete] = useState<Technique | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [techList, recList] = await Promise.all([getTechniques(), getRecipes()])
      setTechniques(techList)
      setRecipes(recList)
    } catch (err) {
      console.error('Erro ao carregar técnicas:', err)
      toast({
        title: 'Erro ao carregar técnicas',
        description: 'Não foi possível buscar as técnicas de preparo do acervo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Count recipes per technique
  const recipeCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    recipes.forEach((r) => {
      if (r.technique) {
        map[r.technique] = (map[r.technique] || 0) + 1
      }
    })
    return map
  }, [recipes])

  // Filtered techniques
  const filteredTechniques = useMemo(() => {
    if (!search.trim()) return techniques
    const q = search.toLowerCase()
    return techniques.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    )
  }, [techniques, search])

  const openCreateModal = () => {
    setEditingTechnique(null)
    setName('')
    setDescription('')
    setNameError('')
    setModalOpen(true)
  }

  const openEditModal = (tech: Technique) => {
    setEditingTechnique(tech)
    setName(tech.name)
    setDescription(tech.description || '')
    setNameError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('O nome da técnica é obrigatório')
      return
    }

    setSaving(true)
    try {
      if (editingTechnique) {
        await updateTechnique(editingTechnique.id, {
          name: name.trim(),
          description: description.trim(),
        })
        toast({
          title: 'Técnica atualizada',
          description: `A técnica "${name}" foi atualizada com sucesso.`,
        })
      } else {
        await createTechnique({
          name: name.trim(),
          description: description.trim(),
        })
        toast({
          title: 'Técnica criada',
          description: `A técnica "${name}" foi adicionada ao acervo.`,
        })
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error('Erro ao salvar técnica:', err)
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

  const confirmDelete = (tech: Technique) => {
    const count = recipeCountMap[tech.id] || 0
    if (count > 0) {
      toast({
        title: 'Exclusão bloqueada',
        description: `Esta técnica está associada a ${count} receita(s). Reatribua-as antes de excluir.`,
        variant: 'destructive',
      })
      return
    }
    setTechniqueToDelete(tech)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!techniqueToDelete) return
    setDeleting(true)
    try {
      await deleteTechnique(techniqueToDelete.id)
      toast({
        title: 'Técnica excluída',
        description: `A técnica "${techniqueToDelete.name}" foi removida.`,
      })
      setDeleteDialogOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error('Erro ao excluir técnica:', err)
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro ao excluir',
        description: errorObj?.message || 'Não foi possível excluir a técnica.',
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
          <span className="label-caps block mb-1">Métodos &amp; Processos</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
              Técnicas de Preparo
            </h1>
            <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium">
              {techniques.length} técnicas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openCreateModal}
            className="bg-bronze hover:bg-bronze-hover text-white shadow-md font-medium rounded-xl px-4 py-5 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Técnica</span>
          </Button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-tinta-ter absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Buscar técnica por nome ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white border-marfim-border rounded-xl focus-visible:ring-verde text-sm shadow-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-ter hover:text-tinta"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* TECHNIQUES GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-2" />
          <p className="text-sm font-serif italic text-tinta-sec">
            Carregando técnicas de preparo...
          </p>
        </div>
      ) : filteredTechniques.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <Flame className="w-12 h-12 text-tinta-ter mx-auto mb-3" />
          <h3 className="font-serif text-2xl font-bold text-tinta">Nenhuma técnica encontrada</h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-1 mb-6">
            Não encontramos técnicas correspondentes ao termo pesquisado.
          </p>
          <Button onClick={openCreateModal} className="bg-verde text-white rounded-xl">
            + Adicionar Técnica
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTechniques.map((tech) => {
            const count = recipeCountMap[tech.id] || 0

            return (
              <div
                key={tech.id}
                className="bg-white rounded-2xl p-6 border border-marfim-border shadow-card card-hover-lift flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent top color strip */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-bronze" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-bronze-subtle text-bronze border border-bronze/30 flex items-center justify-center shadow-xs">
                      <Flame className="w-6 h-6" />
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
                          onClick={() => openEditModal(tech)}
                          className="cursor-pointer text-xs rounded-lg py-2 flex items-center gap-2"
                        >
                          <Edit className="w-3.5 h-3.5 text-bronze" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmDelete(tech)}
                          className="cursor-pointer text-xs rounded-lg py-2 text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-tinta leading-tight group-hover:text-verde transition-colors">
                    {tech.name}
                  </h3>

                  <p className="text-xs text-tinta-sec line-clamp-3 mt-2 leading-relaxed">
                    {tech.description || 'Sem descrição cadastrada para esta técnica culinária.'}
                  </p>
                </div>

                {/* Footer Link & Count */}
                <div className="pt-5 mt-5 border-t border-marfim-border/70 flex items-center justify-between text-xs">
                  <span className="font-medium text-tinta-ter flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-bronze" />
                    {count} {count === 1 ? 'receita' : 'receitas'}
                  </span>

                  <Link
                    to={`/receitas?tecnica=${tech.id}`}
                    className="font-semibold text-verde group-hover:text-verde-hover flex items-center gap-1"
                  >
                    <span>Ver receitas</span>
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
        <DialogContent className="bg-white rounded-2xl border-marfim-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-tinta">
              {editingTechnique ? 'Editar Técnica' : 'Nova Técnica'}
            </DialogTitle>
            <DialogDescription className="text-xs text-tinta-sec">
              Cadastre métodos de cocção, transformação ou preparo térmico gastronômico.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label htmlFor="techName" className="label-caps block mb-1">
                Nome da Técnica <span className="text-red-500">*</span>
              </Label>
              <Input
                id="techName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="Ex.: Sous-vide / Braseado / Confitar"
                className={`h-11 bg-marfim/30 focus:bg-white rounded-xl ${
                  nameError ? 'border-red-500' : 'focus-visible:ring-verde'
                }`}
              />
              {nameError && <p className="text-xs text-red-600 mt-1 font-medium">{nameError}</p>}
            </div>

            <div>
              <Label htmlFor="techDesc" className="label-caps block mb-1">
                Descrição do Método
              </Label>
              <Textarea
                id="techDesc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o princípio físico, temperatura média ou aplicação culinária..."
                className="bg-marfim/30 focus:bg-white rounded-xl text-xs leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-marfim-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
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
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTechnique ? (
                  'Salvar alterações'
                ) : (
                  'Criar técnica'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DELETE */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border-marfim-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-tinta">
              Excluir técnica de preparo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec text-sm">
              Tem certeza que deseja remover a técnica{' '}
              <strong className="text-tinta">&ldquo;{techniqueToDelete?.name}&rdquo;</strong>?
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

export default Techniques
