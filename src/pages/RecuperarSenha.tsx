import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  UtensilsCrossed,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const RecuperarSenha: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [smtpWarning, setSmtpWarning] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const validate = () => {
    setEmailError(null)
    setError(null)
    setSmtpWarning(null)

    if (!email.trim()) {
      setEmailError('Informe seu e-mail cadastrado.')
      return false
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Informe um e-mail válido.')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)
    setSmtpWarning(null)

    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (err: unknown) {
      console.error('Erro na recuperação de senha:', err)
      const rawMsg = getErrorMessage(err, '')

      // PocketBase sem SMTP configurado retorna erro de conexão/envio de email (Failed to send password reset email / connection refused / SMTP)
      if (
        /smtp|mail|send password reset|connection refused|dial tcp/i.test(rawMsg) ||
        /failed to send/i.test(rawMsg)
      ) {
        setSmtpWarning(
          'O servidor PocketBase precisa de um serviço de SMTP configurado para disparar e-mails. No ambiente local, configure o SMTP no painel admin (Settings > Mail settings) ou redefina a senha diretamente pela listagem de usuários.',
        )
      } else {
        // Mensagem discreta para segurança (não revelar se o email existe)
        // Mas se for erro grave de rede/servidor, exibir orientação
        setSubmitted(true)
      }
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
            Recuperação de Acesso
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-9 border border-marfim-border/40">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-tinta">Recuperar senha</h2>
            <p className="text-sm text-tinta-sec mt-1 leading-relaxed">
              Informe seu e-mail cadastrado. Se houver uma conta correspondente, você receberá as
              instruções para redefinição.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-950">Solicitação enviada!</p>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Se o endereço <strong>{email}</strong> estiver cadastrado em nosso acervo,
                    enviamos um link para redefinir sua senha. Verifique também a caixa de spam.
                  </p>
                </div>
              </div>

              <div className="text-xs text-tinta-ter bg-marfim/40 p-3 rounded-xl border border-marfim-border flex items-start gap-2">
                <Info className="w-4 h-4 text-bronze shrink-0 mt-0.5" />
                <span>
                  No ambiente de desenvolvimento local com PocketBase, o link de redefinição aponta
                  para a tela de nova senha.
                </span>
              </div>

              <div className="pt-2">
                <Link to="/login" className="w-full block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 border-marfim-border text-tinta hover:bg-marfim rounded-xl gap-2 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para o login</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {smtpWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-amber-950">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Configuração de envio de e-mail (SMTP)</span>
                  </div>
                  <p className="leading-relaxed">{smtpWarning}</p>
                  <p className="text-[11px] text-amber-800 italic">
                    Dica: Você também pode redefinir a senha do usuário local diretamente pelo
                    painel administrativo do PocketBase em <code>/_/</code>.
                  </p>
                </div>
              )}

              <div>
                <Label
                  htmlFor="recoveryEmail"
                  className="text-xs uppercase tracking-wider text-tinta-sec font-semibold"
                >
                  E-mail cadastrado
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 text-tinta-ter absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="recoveryEmail"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError(null)
                    }}
                    placeholder="chef@culinaria.com"
                    className={`pl-9 h-11 bg-marfim/30 focus:bg-white rounded-lg transition-all ${
                      emailError
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : 'focus-visible:ring-verde'
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{emailError}</p>
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
                    <span>Enviando link...</span>
                  </>
                ) : (
                  <span>Enviar link de recuperação</span>
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

export default RecuperarSenha
