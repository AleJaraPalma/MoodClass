'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, ShieldCheck, Eye, EyeOff, ArrowRight,
  Loader2, CheckCircle2, AlertTriangle, ArrowLeft
} from 'lucide-react'

// ── Password strength indicator ───────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Al menos un número', ok: /\d/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length

  if (!password) return null

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < score
              ? score === 1 ? 'bg-red-400'
                : score === 2 ? 'bg-amber-400'
                : 'bg-emerald-400'
              : 'bg-slate-100'
          }`} />
        ))}
      </div>
      <div className="space-y-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${c.ok ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reset password form ───────────────────────────────────────────────────────

function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  // Supabase sends the session via URL hash (#access_token=...&type=recovery)
  // onAuthStateChange fires with event 'PASSWORD_RECOVERY' when the token is valid
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
      if (event === 'SIGNED_IN') {
        // Also accept SIGNED_IN in case the hash is processed differently
        setSessionReady(true)
      }
    })

    // Check if there's already an active session (user arrived from email link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    // If after 5 seconds we still have no session, mark as token error
    const timer = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setTokenError(true)
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError('No fue posible actualizar la contraseña: ' + updateError.message)
      return
    }

    setSuccess(true)

    // Redirect to login after 2.5 seconds
    setTimeout(() => router.push('/login'), 2500)
  }

  // ── Token error state ─────────────────────────────────────────────────────

  if (tokenError) {
    return (
      <div className="px-8 py-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-extrabold font-sora text-indigo-950 mb-3">
          Enlace inválido o expirado
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-8">
          El enlace de recuperación no es válido o ya expiró (válido por 1 hora). Solicita uno nuevo desde la página de recuperación.
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary px-6 py-3 text-sm font-semibold flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}
        >
          Solicitar nuevo enlace <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
        </Link>
      </div>
    )
  }

  // ── Loading state (waiting for token) ────────────────────────────────────

  if (!sessionReady && !success) {
    return (
      <div className="px-8 py-16 flex flex-col items-center text-center">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm text-slate-500">Verificando enlace de recuperación...</p>
      </div>
    )
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="px-8 py-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-extrabold font-sora text-indigo-950 mb-3">
          ¡Contraseña actualizada!
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-2">
          Tu contraseña fue actualizada correctamente.
        </p>
        <p className="text-xs text-slate-400 mb-6">Redirigiendo al inicio de sesión...</p>
        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
      </div>
    )
  }

  // ── Form state ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 text-center border-b border-slate-50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-extrabold font-sora text-indigo-950 mb-2">
          Nueva contraseña
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Elige una contraseña segura para tu cuenta MoodClass.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

        {/* New password */}
        <div>
          <label className="field-label">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field pr-10"
              placeholder="Mínimo 8 caracteres"
              autoFocus
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Confirm password */}
        <div>
          <label className="field-label">Confirmar contraseña</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={`input-field pr-10 transition-colors ${
                confirm && confirm !== password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''
              }`}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="mt-1.5 text-[11px] text-red-500 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Las contraseñas no coinciden
            </p>
          )}
          {confirm && confirm === password && password.length >= 8 && (
            <p className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Las contraseñas coinciden
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="text-sm text-red-700 font-medium">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password || !confirm || password !== confirm || password.length < 8}
          className="btn-primary w-full py-3.5 text-sm tracking-wider uppercase font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Actualizando...</>
          ) : (
            <>Actualizar contraseña <ArrowRight className="h-4 w-4" /></>
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
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
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
          <Suspense fallback={
            <div className="px-8 py-16 flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Cargando...</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          El enlace de recuperación expira en <span className="font-semibold">1 hora</span>.
        </p>
      </div>
    </main>
  )
}
