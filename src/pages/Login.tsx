import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UtensilsCrossed, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const Login: React.FC = () => {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const validate = () => {
    let valid = true
    setEmailError(null)
    setPasswordError(null)

    if (!email.trim()) {
      setEmailError('Informe seu e-mail')
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Informe um e-mail válido')
      valid = false
    }

    if (!password) {
      setPasswordError('Informe sua senha')
      valid = false
    }

    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(
        errorObj?.message?.includes('Failed to authenticate')
          ? 'E-mail ou senha incorretos. Verifique suas credenciais.'
          : 'Não foi possível entrar. Verifique seus dados e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-tinta flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow & vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,75,58,0.35)_0%,rgba(28,27,23,0.95)_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Decorative culinary texture subtle */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-verde border-2 border-bronze text-bronze shadow-xl mb-4">
            <UtensilsCrossed className="w-8 h-8 text-bronze" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-marfim tracking-tight">
            Biblioteca Culinária
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-bronze-light font-medium mt-1">
            Acervo &amp; Fichas Técnicas
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-9 border border-marfim-border/40">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-tinta">Acessar acervo</h2>
            <p className="text-sm text-tinta-sec mt-0.5">
              Entre com suas credenciais para gerenciar suas receitas.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="email"
                className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError(null)
                }}
                placeholder="exemplo@culinaria.com"
                className={`mt-1.5 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                  emailError
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-verde'
                }`}
                disabled={isSubmitting}
              />
              {emailError && <p className="text-xs text-red-600 mt-1 font-medium">{emailError}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
                >
                  Senha
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError(null)
                }}
                placeholder="••••••••"
                className={`mt-1.5 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                  passwordError
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-verde'
                }`}
                disabled={isSubmitting}
              />
              {passwordError && (
                <p className="text-xs text-red-600 mt-1 font-medium">{passwordError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-verde hover:bg-verde-hover text-white font-medium rounded-xl mt-6 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-base flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no acervo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Demo access badge */}
        <div className="mt-6 text-center">
          <p className="text-xs text-marfim/60">
            Acesso rápido de teste:{' '}
            <span className="text-bronze-light font-mono font-medium">certosergio@gmail.com</span> /{' '}
            <span className="text-bronze-light font-mono font-medium">Skip@Pass</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
