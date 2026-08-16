import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

import Index from '@/pages/Index'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import RecipesList from '@/pages/RecipesList'
import RecipeDetail from '@/pages/RecipeDetail'
import RecipeForm from '@/pages/RecipeForm'
import Categories from '@/pages/Categories'
import Techniques from '@/pages/Techniques'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />

          {/* Protected Authenticated Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/receitas" element={<RecipesList />} />
            <Route path="/receitas/nova" element={<RecipeForm />} />
            <Route path="/receitas/:id" element={<RecipeDetail />} />
            <Route path="/receitas/:id/editar" element={<RecipeForm />} />
            <Route path="/categorias" element={<Categories />} />
            <Route path="/tecnicas" element={<Techniques />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
