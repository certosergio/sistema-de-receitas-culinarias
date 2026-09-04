import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from '@/services/ingredients'
import { getIngredientCategories } from '@/services/ingredientCategories'
import { Ingredient, IngredientCategory } from '@/types'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  Hash,
  DollarSign,
  Scale,
  FolderTree,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const COMMON_UNITS = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'unidade', label: 'Unidade (un)' },
  { value: 'xícara', label: 'Xícara' },
  { value: 'colher de sopa', label: 'Colher de sopa' },
  { value: 'colher de chá', label: 'Colher de chá' },
  { value: 'pitada', label: 'Pitada' },
  { value: 'custom', label: 'Outra unidade...' },
]

function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

function formatQuantity(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0'
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(val)
}

const IngredientsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategoryFilter = searchParams.get('categoria') || 'all'

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter)

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [unidadeSelect, setUnidadeSelect] = useState('g')
  const [customUnidade, setCustomUnidade] = useState('')
  const [quantidadeUnitaria, setQuantidadeUnitaria] = useState<string>('1')
  const [custoUnitario, setCustoUnitario] = useState<string>('0')
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [ings, cats] = await Promise.all([getIngredients(), getIngredientCategories()])
      setIngredients(ings)
      setCategories(cats)
    } catch (err) {
      console.error('Erro ao carregar ingredientes:', err)
      toast({
        title: 'Erro ao carregar ingredientes',
        description: 'Não foi possível carregar a lista de ingredientes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Sync category filter with search param
  useEffect(() => {
    const cat = searchParams.get('categoria')
    if (cat && cat !== categoryFilter) {
      setCategoryFilter(cat)
    }
  }, [searchParams])

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val)
    if (val === 'all') {
      searchParams.delete('categoria')
    } else {
      searchParams.set('categoria', val)
    }
    setSearchParams(searchParams, { replace: true })
  }

  const categoryMap = useMemo(() => {
    const map = new Map<string, IngredientCategory>()
    categories.forEach((c) => map.set(c.id, c))
    return map
  }, [categories])

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      // Category filter
      if (categoryFilter !== 'all' && ing.categoria_id !== categoryFilter) {
        return false
      }
      // Search filter (by code or name)
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = ing.codigo?.toLowerCase().includes(q)
        const matchNome = ing.nome?.toLowerCase().includes(q)
        const catName = (
          ing.expand?.categoria_id?.name ||
          categoryMap.get(ing.categoria_id)?.name ||
          ''
        ).toLowerCase()
        const matchCat = catName.includes(q)
        if (!matchCode && !matchNome && !matchCat) return false
      }
      return true
    })
  }, [ingredients, categoryFilter, search, categoryMap])

  const openCreateModal = () => {
    setEditingIngredient(null)
    setCodigo('')
    setNome('')
    setCategoriaId(categoryFilter !== 'all' ? categoryFilter : categories[0]?.id || '')
    setUnidadeSelect('g')
    setCustomUnidade('')
    setQuantidadeUnitaria('1')
    setCustoUnitario('0')
    setFormErrors({})
    setModalOpen(true)
  }

  const openEditModal = (ing: Ingredient) => {
    setEditingIngredient(ing)
    setCodigo(ing.codigo)
    setNome(ing.nome)
    setCategoriaId(ing.categoria_id)

    // Check if unit is in COMMON_UNITS
    const isCommon = COMMON_UNITS.some((u) => u.value !== 'custom' && u.value === ing.unidade)
    if (isCommon) {
      setUnidadeSelect(ing.unidade || 'g')
      setCustomUnidade('')
    } else {
      setUnidadeSelect('custom')
      setCustomUnidade(ing.unidade || '')
    }

    setQuantidadeUnitaria(
      ing.quantidade_unitaria !== undefined ? String(ing.quantidade_unitaria) : '1',
    )
    setCustoUnitario(ing.custo_unitario !== undefined ? String(ing.custo_unitario) : '0')
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    const trimmedCodigo = codigo.trim()
    const trimmedNome = nome.trim()
    const finalUnidade = (unidadeSelect === 'custom' ? customUnidade : unidadeSelect).trim()

    if (!trimmedCodigo) {
      errors.codigo = 'O código é obrigatório.'
    }
    if (!trimmedNome) {
      errors.nome = 'O nome do ingrediente é obrigatório.'
    }
    if (!categoriaId) {
      errors.categoria_id = 'Selecione uma categoria de ingrediente.'
    }

    const parsedQtd = parseFloat(quantidadeUnitaria.replace(',', '.'))
    if (isNaN(parsedQtd) || parsedQtd < 0) {
      errors.quantidade_unitaria = 'Informe uma quantidade válida (>= 0).'
    }

    const parsedCusto = parseFloat(custoUnitario.replace(',', '.'))
    if (isNaN(parsedCusto) || parsedCusto < 0) {
      errors.custo_unitario = 'Informe um custo válido (>= 0).'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    try {
      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, {
          codigo: trimmedCodigo,
          nome: trimmedNome,
          categoria_id: categoriaId,
          unidade: finalUnidade,
          quantidade_unitaria: parsedQtd,
          custo_unitario: parsedCusto,
        })
        toast({
          title: 'Ingrediente atualizado',
          description: `O ingrediente "${trimmedNome}" foi atualizado com sucesso.`,
        })
      } else {
        await createIngredient({
          codigo: trimmedCodigo,
          nome: trimmedNome,
          categoria_id: categoriaId,
          unidade: finalUnidade,
          quantidade_unitaria: parsedQtd,
          custo_unitario: parsedCusto,
        })
        toast({
          title: 'Ingrediente cadastrado',
          description: `O ingrediente "${trimmedNome}" foi adicionado com sucesso.`,
        })
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error('Erro ao salvar ingrediente:', err)
      const fieldErrors = extractFieldErrors(err)
      const newErrors: Record<string, string> = {}

      if (fieldErrors.codigo) {
        newErrors.codigo = fieldErrors.codigo
      }
      if (fieldErrors.nome) {
        newErrors.nome = fieldErrors.nome
      }
      if (fieldErrors.categoria_id) {
        newErrors.categoria_id = fieldErrors.categoria_id
      }

      const errMsg = getErrorMessage(err, 'Erro ao salvar ingrediente.')
      if (/já existe um ingrediente com este código|unique/i.test(errMsg)) {
        newErrors.codigo = 'Já existe um ingrediente com este código.'
      }

      setFormErrors(newErrors)

      toast({
        title: 'Falha ao salvar ingrediente',
        description: newErrors.codigo || errMsg || 'Verifique as informações e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (ing: Ingredient) => {
    setIngredientToDelete(ing)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!ingredientToDelete) return
    setDeleting(true)
    try {
      await deleteIngredient(ingredientToDelete.id)
      toast({
        title: 'Ingrediente excluído',
        description: `O ingrediente "${ingredientToDelete.nome}" foi removido com sucesso.`,
      })
      setDeleteDialogOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error('Erro ao excluir ingrediente:', err)
      toast({
        title: 'Erro ao excluir ingrediente',
        description: getErrorMessage(err, 'Não foi possível excluir o ingrediente selecionado.'),
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
          <span className="label-caps block mb-1">Fichas &amp; Custos</span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tinta tracking-tight">
              Ingredientes
            </h1>
            <span className="text-xs font-mono bg-marfim-card px-2.5 py-1 rounded-full border border-marfim-border text-tinta font-medium">
              {ingredients.length} itens cadastrados
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openCreateModal}
            className="bg-bronze hover:bg-bronze-hover text-white shadow-md font-medium rounded-xl px-4 py-5 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Ingrediente</span>
          </Button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-tinta-ter absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Buscar por nome, código ou categoria..."
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

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-tinta-ter shrink-0 hidden sm:block" />
          <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
            <SelectTrigger className="w-full sm:w-[240px] h-11 bg-white border-marfim-border rounded-xl text-xs font-medium">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* INGREDIENTS TABLE / CARDS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-marfim-border shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-verde mb-2" />
          <p className="text-sm font-serif italic text-tinta-sec">
            Carregando lista de ingredientes...
          </p>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-marfim-border shadow-card">
          <Package className="w-12 h-12 text-tinta-ter mx-auto mb-3" />
          <h3 className="font-serif text-2xl font-bold text-tinta">
            Nenhum ingrediente encontrado
          </h3>
          <p className="text-sm text-tinta-sec max-w-md mx-auto mt-1 mb-6">
            {search || categoryFilter !== 'all'
              ? 'Nenhum ingrediente corresponde aos filtros aplicados.'
              : 'Comece cadastrando matérias-primas e insumos com seus respectivos custos unitários.'}
          </p>
          <Button onClick={openCreateModal} className="bg-verde text-white rounded-xl">
            + Cadastrar Ingrediente
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-marfim-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-marfim-border bg-marfim/40 text-tinta-sec font-serif text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Código</th>
                  <th className="py-3.5 px-4 font-semibold">Nome</th>
                  <th className="py-3.5 px-4 font-semibold">Categoria</th>
                  <th className="py-3.5 px-4 font-semibold">Unidade</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Qtd. Unitária</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Custo Unitário</th>
                  <th className="py-3.5 px-4 font-semibold text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marfim-border/70">
                {filteredIngredients.map((ing) => {
                  const cat = ing.expand?.categoria_id || categoryMap.get(ing.categoria_id)

                  return (
                    <tr key={ing.id} className="hover:bg-marfim/30 transition-colors group">
                      <td className="py-3.5 px-4 font-mono text-xs text-tinta-ter">
                        <span className="bg-marfim-card px-2 py-0.5 rounded border border-marfim-border font-medium text-tinta">
                          {ing.codigo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-tinta">{ing.nome}</td>
                      <td className="py-3.5 px-4">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-bronze-subtle text-bronze border border-bronze/20">
                            <FolderTree className="w-3 h-3" />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-xs text-tinta-ter italic">Sem categoria</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-tinta-sec font-mono text-xs">
                        {ing.unidade || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-tinta">
                        {formatQuantity(ing.quantidade_unitaria)}{' '}
                        <span className="text-tinta-ter">{ing.unidade || ''}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-verde">
                        {formatCurrency(ing.custo_unitario)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(ing)}
                            title="Editar ingrediente"
                            className="h-8 w-8 text-tinta-ter hover:text-bronze hover:bg-bronze-subtle rounded-lg"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(ing)}
                            title="Excluir ingrediente"
                            className="h-8 w-8 text-tinta-ter hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-marfim/30 border-t border-marfim-border text-xs text-tinta-ter flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Exibindo <strong>{filteredIngredients.length}</strong> de{' '}
              <strong>{ingredients.length}</strong> ingredientes
            </span>
            <span className="italic">
              Custos utilizados no cálculo automático de fichas técnicas.
            </span>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white dark:bg-[#1E1C16] rounded-2xl border-marfim-border dark:border-[#322F26] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-tinta dark:text-[#EFE9DD]">
              {editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}
            </DialogTitle>
            <DialogDescription className="text-xs text-tinta-sec dark:text-[#B5AE9F]">
              Preencha os dados do insumo com código de controle, categoria e custo unitário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Grid 2 cols: Código e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ingCodigo" className="label-caps block mb-1">
                  Código <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-tinta-ter absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="ingCodigo"
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value)
                      if (formErrors.codigo) {
                        setFormErrors((prev) => ({ ...prev, codigo: '' }))
                      }
                    }}
                    placeholder="Ex.: ING-001"
                    className={`pl-9 h-10 font-mono text-sm bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white dark:focus:bg-[#15140F] rounded-xl ${
                      formErrors.codigo ? 'border-red-500' : 'focus-visible:ring-verde'
                    }`}
                  />
                </div>
                {formErrors.codigo && (
                  <p className="text-xs text-red-600 dark:text-[#E0806B] mt-1 font-medium">
                    {formErrors.codigo}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="ingCategoria" className="label-caps block mb-1">
                  Categoria <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={categoriaId}
                  onValueChange={(val) => {
                    setCategoriaId(val)
                    if (formErrors.categoria_id) {
                      setFormErrors((prev) => ({ ...prev, categoria_id: '' }))
                    }
                  }}
                >
                  <SelectTrigger
                    id="ingCategoria"
                    className={`h-10 bg-marfim/30 dark:bg-[#221F18]/60 rounded-xl text-xs font-medium ${
                      formErrors.categoria_id ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.categoria_id && (
                  <p className="text-xs text-red-600 dark:text-[#E0806B] mt-1 font-medium">
                    {formErrors.categoria_id}
                  </p>
                )}
              </div>
            </div>

            {/* Nome */}
            <div>
              <Label htmlFor="ingNome" className="label-caps block mb-1">
                Nome do Ingrediente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ingNome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (formErrors.nome) {
                    setFormErrors((prev) => ({ ...prev, nome: '' }))
                  }
                }}
                placeholder="Ex.: Farinha de Trigo Especial 00, Manteiga Sem Sal"
                className={`h-11 bg-marfim/30 dark:bg-[#221F18]/60 focus:bg-white dark:focus:bg-[#15140F] rounded-xl ${
                  formErrors.nome ? 'border-red-500' : 'focus-visible:ring-verde'
                }`}
              />
              {formErrors.nome && (
                <p className="text-xs text-red-600 dark:text-[#E0806B] mt-1 font-medium">
                  {formErrors.nome}
                </p>
              )}
            </div>

            {/* Unidade */}
            <div>
              <Label className="label-caps block mb-1">Unidade de Medida</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={unidadeSelect} onValueChange={(val) => setUnidadeSelect(val)}>
                  <SelectTrigger className="h-10 bg-marfim/30 dark:bg-[#221F18]/60 rounded-xl text-xs font-medium">
                    <SelectValue placeholder="Selecione a unidade..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-marfim-border rounded-xl shadow-dropdown">
                    {COMMON_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {unidadeSelect === 'custom' && (
                  <Input
                    placeholder="Digite a unidade (ex.: maço, lata)..."
                    value={customUnidade}
                    onChange={(e) => setCustomUnidade(e.target.value)}
                    className="h-10 bg-marfim/30 dark:bg-[#221F18]/60 rounded-xl text-xs"
                  />
                )}
              </div>
            </div>

            {/* Quantidade unitária e Custo unitário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ingQtd" className="label-caps block mb-1">
                  Quantidade Unitária
                </Label>
                <div className="relative">
                  <Scale className="w-4 h-4 text-tinta-ter absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="ingQtd"
                    type="number"
                    step="any"
                    min="0"
                    value={quantidadeUnitaria}
                    onChange={(e) => {
                      setQuantidadeUnitaria(e.target.value)
                      if (formErrors.quantidade_unitaria) {
                        setFormErrors((prev) => ({
                          ...prev,
                          quantidade_unitaria: '',
                        }))
                      }
                    }}
                    placeholder="1"
                    className={`pl-9 h-10 font-mono text-sm bg-marfim/30 dark:bg-[#221F18]/60 rounded-xl ${
                      formErrors.quantidade_unitaria ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {formErrors.quantidade_unitaria && (
                  <p className="text-xs text-red-600 dark:text-[#E0806B] mt-1 font-medium">
                    {formErrors.quantidade_unitaria}
                  </p>
                )}
                <span className="text-[11px] text-tinta-ter mt-0.5 block">
                  Ex.: 1 (para 1 kg ou 1 un) ou 1000 (para 1000 g).
                </span>
              </div>

              <div>
                <Label htmlFor="ingCusto" className="label-caps block mb-1">
                  Custo da Quantidade Unitária (R$)
                </Label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-tinta-ter absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="ingCusto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={custoUnitario}
                    onChange={(e) => {
                      setCustoUnitario(e.target.value)
                      if (formErrors.custo_unitario) {
                        setFormErrors((prev) => ({
                          ...prev,
                          custo_unitario: '',
                        }))
                      }
                    }}
                    placeholder="0.00"
                    className={`pl-9 h-10 font-mono text-sm bg-marfim/30 dark:bg-[#221F18]/60 rounded-xl ${
                      formErrors.custo_unitario ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {formErrors.custo_unitario && (
                  <p className="text-xs text-red-600 dark:text-[#E0806B] mt-1 font-medium">
                    {formErrors.custo_unitario}
                  </p>
                )}
                <span className="text-[11px] text-tinta-ter mt-0.5 block">
                  Ex.: 18.50 para o custo do pacote/quantidade.
                </span>
              </div>
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
                className="bg-verde dark:bg-[#24392C] hover:bg-verde-hover dark:hover:bg-[#2F4B3A] text-white dark:text-[#EFE9DD] rounded-xl min-w-[110px]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingIngredient ? (
                  'Salvar alterações'
                ) : (
                  'Cadastrar'
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
              Excluir ingrediente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tinta-sec dark:text-[#B5AE9F] text-sm">
              Tem certeza que deseja remover o ingrediente{' '}
              <strong className="text-tinta dark:text-[#EFE9DD]">
                &ldquo;{ingredientToDelete?.nome}&rdquo;
              </strong>{' '}
              (código: {ingredientToDelete?.codigo})? Esta ação não pode ser desfeita.
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

export default IngredientsPage
