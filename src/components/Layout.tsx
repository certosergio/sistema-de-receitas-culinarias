import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  UtensilsCrossed,
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Flame,
  Heart,
  Bookmark,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return parts[0].substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'BC'
  }

  const navItems = [
    { label: 'Painel', to: '/', icon: LayoutDashboard },
    { label: 'Receitas', to: '/receitas', icon: BookOpen },
    { label: 'Categorias', to: '/categorias', icon: FolderTree },
    { label: 'Técnicas de Preparo', to: '/tecnicas', icon: Flame },
    { label: 'Planejador', to: '/planejador', icon: CalendarDays },
    { label: 'Favoritos', to: '/favoritos', icon: Heart },
    { label: 'Coleções', to: '/colecoes', icon: Bookmark },
  ]

  const isNavActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-marfim flex flex-col lg:flex-row text-tinta selection:bg-bronze-subtle selection:text-tinta">
      {/* DESKTOP SIDEBAR (≥ 1024px) */}
      <aside className="hidden lg:flex w-[264px] shrink-0 bg-tinta text-marfim flex-col justify-between fixed top-0 bottom-0 left-0 z-30 shadow-2xl border-r border-tinta/20">
        <div>
          {/* Brand Header */}
          <div className="p-6 pb-5 border-b border-white/10">
            <Link to="/" className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-full bg-verde flex items-center justify-center border border-bronze shadow-inner text-bronze group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5 text-bronze" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl tracking-tight text-white font-semibold leading-tight">
                  Biblioteca Culinária
                </span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-bronze-light/80 font-medium mt-0.5">
                  Acervo &amp; Fichas Técnicas
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const active = isNavActive(item.to)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    active
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-bronze rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? 'text-bronze' : 'text-white/50 group-hover:text-white/80'
                    }`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Quick Action Button */}
          <div className="px-4 pt-4">
            <Button
              onClick={() => navigate('/receitas/nova')}
              className="w-full bg-bronze hover:bg-bronze-hover text-white shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2 rounded-lg py-5 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Receita</span>
            </Button>
          </div>
        </div>

        {/* User Card at Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors text-left group outline-none focus-visible:ring-2 focus-visible:ring-bronze">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-verde border border-bronze/40 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {getInitials(user?.name, user?.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate group-hover:text-bronze-light transition-colors">
                      {user?.name || 'Chef'}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {user?.email || 'usuario@culinaria.com'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-56 bg-tinta border-white/15 text-white shadow-2xl rounded-xl p-1.5 mb-2"
            >
              <DropdownMenuLabel className="text-xs text-white/60 font-normal px-2 py-1.5">
                Conectado como{' '}
                <strong className="text-white font-medium block truncate">{user?.email}</strong>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:text-red-300 focus:bg-white/10 cursor-pointer rounded-lg px-2 py-2 text-sm flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* TOPBAR MOBILE (< 1024px) */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-marfim-border/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-verde flex items-center justify-center border border-bronze text-bronze">
            <UtensilsCrossed className="w-4 h-4 text-bronze" />
          </div>
          <div>
            <span className="font-serif text-lg font-semibold text-tinta leading-none block">
              Biblioteca Culinária
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-bronze block font-medium">
              Acervo &amp; Fichas
            </span>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg text-tinta hover:bg-marfim-card transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-tinta/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative w-4/5 max-w-xs bg-tinta text-marfim flex flex-col justify-between h-full shadow-2xl z-10 animate-fade-in-right">
            <div>
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-verde flex items-center justify-center border border-bronze text-bronze">
                    <UtensilsCrossed className="w-4 h-4 text-bronze" />
                  </div>
                  <span className="font-serif text-lg font-semibold text-white">
                    Biblioteca Culinária
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-white/70 hover:text-white"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav */}
              <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                  const active = isNavActive(item.to)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-white/10 text-white font-semibold border-l-4 border-bronze'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-bronze' : 'text-white/60'}`} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="px-4 pt-2">
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/receitas/nova')
                  }}
                  className="w-full bg-bronze hover:bg-bronze-hover text-white font-medium flex items-center justify-center gap-2 rounded-lg py-5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova Receita</span>
                </Button>
              </div>
            </div>

            {/* Mobile User Card */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-verde border border-bronze/40 flex items-center justify-center text-xs font-semibold text-white">
                  {getInitials(user?.name, user?.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user?.name || 'Chef'}</p>
                  <p className="text-xs text-white/50 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full border-white/20 text-red-300 hover:bg-white/10 hover:text-red-200 justify-start gap-2 h-9 text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da conta</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 lg:ml-[264px] flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="w-full border-t border-marfim-border py-6 text-center text-xs text-tinta-ter bg-marfim/60">
          <p className="max-w-[1400px] mx-auto px-4">
            Biblioteca Culinária — acervo de receitas e fichas técnicas &copy;{' '}
            {new Date().getFullYear()}
          </p>
        </footer>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => navigate('/receitas/nova')}
          className="w-14 h-14 rounded-full bg-bronze hover:bg-bronze-hover text-white flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all border-2 border-white"
          aria-label="Criar nova receita"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  )
}

export default Layout
