import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UtensilsCrossed, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const Register: React.FC = () => {
  const { register, user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    passwordConfirm?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const validate = () => {
    const errs: typeof errors = {}

    if (!name.trim()) {
      errs.name = 'Informe seu nome completo'
    }

    if (!email.trim()) {
      errs.email = 'Informe seu e-mail'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Informe um e-mail válido'
    }

    if (!password) {
      errs.password = 'Informe uma senha'
    } else if (password.length < 8) {
      errs.password = 'A senha deve ter no mínimo 8 caracteres'
    }

    if (!passwordConfirm) {
      errs.passwordConfirm = 'Confirme sua senha'
    } else if (password !== passwordConfirm) {
      errs.passwordConfirm = 'As senhas não coincidem'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setIsSubmitting(true)
    try {
      await register(name, email, password, passwordConfirm)
      navigate('/')
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      if (errorObj?.message?.includes('email')) {
        setError('Este e-mail já está em uso por outra conta.')
      } else {
        setError('Erro ao criar conta. Verifique os dados e tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-tinta flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow & vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,75,58,0.35)_0%,rgba(28,27,23,0.95)_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md my-8">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-verde border-2 border-bronze text-bronze shadow-xl mb-4">
            <UtensilsCrossed className="w-8 h-8 text-bronze" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-marfim tracking-tight">
            Biblioteca Culinária
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-bronze-light font-medium mt-1">
            Criar Nova Conta
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-9 border border-marfim-border/40">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-tinta">Cadastrar acervo</h2>
            <p className="text-sm text-tinta-sec mt-0.5">
              Crie seu perfil para registrar e organizar receitas com fichas técnicas.
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
                htmlFor="name"
                className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
              >
                Nome completo
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="Chef Sérgio"
                className={`mt-1.5 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                  errors.name
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-verde'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.name}</p>
              )}
            </div>

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
                  if (errors.email) setErrors({ ...errors, email: undefined })
                }}
                placeholder="seuemail@exemplo.com"
                className={`mt-1.5 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                  errors.email
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-verde'
                }`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <Label
                htmlFor="password"
                className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
              >
                Senha (mínimo 8 caracteres)
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: undefined })
                }}
                placeholder="••••••••"
                className={`mt-1.5 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                  errors.password
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-verde'
                }`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.password}</p>
              )}
            </div>

            <div>
              <Label
                htmlFor="passwordConfirm"
                className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
              >
                Confirmar senha
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value)
                  if (errors.passwordConfirm) setErrors({ ...errors, passwordConfirm: undefined })
                }}
                placeholder="••••••••"
                className={`mt-1.5 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                  errors.passwordConfirm
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-verde'
                }`}
                disabled={isSubmitting}
              />
              {errors.passwordConfirm && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.passwordConfirm}</p>
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
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Criar conta</span>
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-marfim-border text-center">
            <p className="text-sm text-tinta-sec">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-bronze font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
