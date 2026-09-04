import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  UtensilsCrossed,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const RedefinirSenha: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Token de recuperação ausente ou inválido. Solicite um novo link.')
      return
    }

    if (password.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setError('A confirmação de senha não confere.')
      return
    }

    setIsSubmitting(true)

    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      setSuccess(true)
    } catch (err: unknown) {
      console.error('Erro ao redefinir senha:', err)
      const msg = getErrorMessage(err, 'Token expirado ou inválido. Solicite uma nova recuperação.')
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-tinta flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,75,58,0.35)_0%,rgba(28,27,23,0.95)_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-verde border-2 border-bronze text-bronze shadow-xl mb-4">
            <UtensilsCrossed className="w-8 h-8 text-bronze" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-marfim tracking-tight">
            Biblioteca Culinária
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-bronze-light font-medium mt-1">
            Redefinição de Senha
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-9 border border-marfim-border/40">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-tinta">Criar nova senha</h2>
            <p className="text-sm text-tinta-sec mt-1 leading-relaxed">
              Digite e confirme sua nova senha para retomar o acesso ao seu acervo.
            </p>
          </div>

          {!token ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-amber-950">Link incompleto</p>
                <p className="leading-relaxed">
                  Não encontramos o token de segurança na URL. Verifique se o link foi copiado por
                  completo do seu e-mail.
                </p>
              </div>

              <Link to="/recuperar-senha" className="block">
                <Button className="w-full bg-verde text-white rounded-xl">
                  Solicitar novo link de recuperação
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-950">Senha alterada com sucesso!</p>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Sua nova credencial foi atualizada. Você já pode fazer login na Biblioteca
                    Culinária.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-verde hover:bg-verde-hover text-white rounded-xl"
              >
                Ir para a tela de login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Nova Senha */}
              <div>
                <Label
                  htmlFor="newPassword"
                  className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
                >
                  Nova Senha
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 text-tinta-ter absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pl-9 pr-10 h-11 bg-marfim/30 focus:bg-white rounded-lg focus-visible:ring-verde"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-ter hover:text-tinta"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
                >
                  Confirmar Nova Senha
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 text-tinta-ter absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="pl-9 pr-10 h-11 bg-marfim/30 focus:bg-white rounded-lg focus-visible:ring-verde"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-verde hover:bg-verde-hover text-white font-medium rounded-xl mt-6 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-base flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redefinindo senha...</span>
                  </>
                ) : (
                  <span>Salvar nova senha</span>
                )}
              </Button>

              <div className="pt-3 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-tinta-sec hover:text-bronze transition-colors font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default RedefinirSenha
