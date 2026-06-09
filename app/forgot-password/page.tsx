'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError('No fue posible enviar el correo. Verifica que el email esté registrado.')
      return
    }

    setSent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FF] relative overflow-hidden font-sans">

      {/* Background gradients */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] rounded-full filter blur-[80px] opacity-[0.15] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4F46E5 0%, #06B6D4 100%)' }} />
      <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] rounded-full filter blur-[80px] opacity-[0.15] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1 0%, #EC4899 100%)' }} />

      <div className="w-full max-w-md z-10 anim-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <Sparkles className="h-6 w-6 text-indigo-600 transition-transform duration-300 group-hover:rotate-12" />
            <span className="text-2xl font-extrabold tracking-tight text-indigo-950 font-sora">
              Mood<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Class</span>
            </span>
          </Link>
        </div>

        <div className="card bg-white border border-slate-100 shadow-xl overflow-hidden anim-scale-in">

          {!sent ? (
            /* ── FORM STATE ── */
            <>
              {/* Header */}
              <div className="px-8 pt-8 pb-6 text-center border-b border-slate-50">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
                  <Mail className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-xl font-extrabold font-sora text-indigo-950 mb-2">
                  Recuperar contraseña
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Ingresa tu email institucional y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
                <div>
                  <label className="field-label">Correo electrónico institucional</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="tu@inacap.cl"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                    <span className="text-red-500 text-sm font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-sm tracking-wider uppercase font-semibold flex items-center justify-center gap-1.5"
                  style={{ opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <>Enviar instrucciones <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors duration-200"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            </>
          ) : (
            /* ── SUCCESS STATE ── */
            <div className="px-8 py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-extrabold font-sora text-indigo-950 mb-3">
                ¡Revisa tu correo!
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-2">
                Te enviamos un email con instrucciones a:
              </p>
              <p className="text-sm font-bold text-indigo-700 mb-5 bg-indigo-50 px-3 py-1.5 rounded-lg">
                {email}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mb-8">
                El enlace expirará en 1 hora. Si no lo ves en tu bandeja, revisa la carpeta de spam.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          ¿Problemas para ingresar?{' '}
          <span className="text-indigo-600 font-semibold">Contacta a tu coordinador académico.</span>
        </p>
      </div>
    </main>
  )
}
