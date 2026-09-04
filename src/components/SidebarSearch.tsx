import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  BookOpen,
  FolderTree,
  Flame,
  Package,
  Loader2,
  X,
  CornerDownLeft,
} from 'lucide-react'
import {
  performGlobalSearch,
  GlobalSearchResults,
  GlobalSearchResultItem,
} from '@/services/globalSearch'

interface SidebarSearchProps {
  onItemSelect?: () => void
  placeholder?: string
  className?: string
  shortcutHint?: boolean
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({
  onItemSelect,
  placeholder = 'Buscar no acervo...',
  className = '',
  shortcutHint = true,
}) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flattened ordered list for keyboard navigation
  const flatItems = React.useMemo<GlobalSearchResultItem[]>(() => {
    if (!results) return []
    return [
      ...results.recipes,
      ...results.categories,
      ...results.techniques,
      ...results.ingredients,
    ]
  }, [results])

  // Debounced search trigger
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(null)
      setLoading(false)
      setIsOpen(false)
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await performGlobalSearch(trimmed)
        setResults(res)
        setIsOpen(true)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Erro na busca global:', err)
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => clearTimeout(timeout)
  }, [query])

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (item: GlobalSearchResultItem) => {
      setIsOpen(false)
      setQuery('')
      navigate(item.url)
      onItemSelect?.()
    },
    [navigate, onItemSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (results && results.total > 0) {
        setIsOpen(true)
        return
      }
    }

    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
      return
    }

    if (!isOpen || flatItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const current = flatItems[selectedIndex]
      if (current) {
        handleSelect(current)
      }
    }
  }

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: GlobalSearchResultItem[],
    emptyMessage?: string,
  ) => {
    if (items.length === 0 && !emptyMessage) return null

    return (
      <div className="py-1.5 first:pt-1 last:pb-1">
        <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-bronze-light/80">
          {icon}
          <span>{title}</span>
          <span className="ml-auto text-[9px] font-mono text-white/40">{items.length}</span>
        </div>
        {items.length === 0 && emptyMessage ? (
          <p className="px-3 py-1.5 text-xs text-white/40 italic">{emptyMessage}</p>
        ) : (
          items.map((item) => {
            const index = flatItems.indexOf(item)
            const isSelected = index === selectedIndex

            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors rounded-md ${
                  isSelected
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate leading-snug">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                {item.badge && (
                  <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-bronze-light border border-white/10">
                    {item.badge}
                  </span>
                )}
                {isSelected && <CornerDownLeft className="w-3 h-3 text-bronze shrink-0" />}
              </button>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-white/50 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results && results.total > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white placeholder-white/45 text-xs rounded-lg pl-9 pr-14 py-2 border border-white/15 focus:border-bronze focus:outline-none transition-all"
          aria-label="Busca global no acervo"
        />

        {/* Right side indicators: spinner, clear button or shortcut hint */}
        <div className="absolute right-2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-bronze" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults(null)
                setIsOpen(false)
                inputRef.current?.focus()
              }}
              className="text-white/50 hover:text-white p-0.5 rounded"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : shortcutHint ? (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/15 pointer-events-none">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          ) : null}
        </div>
      </div>

      {/* Floating Results Panel */}
      {isOpen && results && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#1e1c16] text-marfim border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 max-h-[70vh] flex flex-col">
          {results.total === 0 ? (
            <div className="p-4 text-center space-y-1">
              <p className="text-xs text-white/70 font-medium">Nenhum resultado encontrado</p>
              <p className="text-[11px] text-white/40">
                Não localizamos itens para &ldquo;{query}&rdquo; em receitas, categorias, técnicas
                ou ingredientes.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto divide-y divide-white/10 p-1">
              {renderSection(
                'Receitas',
                <BookOpen className="w-3 h-3 text-bronze" />,
                results.recipes,
              )}
              {renderSection(
                'Categorias',
                <FolderTree className="w-3 h-3 text-bronze" />,
                results.categories,
              )}
              {renderSection(
                'Técnicas',
                <Flame className="w-3 h-3 text-bronze" />,
                results.techniques,
              )}
              {renderSection(
                'Ingredientes',
                <Package className="w-3 h-3 text-bronze" />,
                results.ingredients,
              )}
            </div>
          )}

          {/* Panel footer with navigation hints */}
          <div className="px-3 py-1.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
            <span>
              {results.total} {results.total === 1 ? 'resultado' : 'resultados'}
            </span>
            <div className="flex items-center gap-2">
              <span>↑↓ Navegar</span>
              <span>↵ Abrir</span>
              <span>Esc Fechar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
