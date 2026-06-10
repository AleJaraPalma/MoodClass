'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  Sparkles, ArrowRight, Presentation, GraduationCap,
  Eye, EyeOff, ShieldCheck, Loader2
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD MODAL (primer login)
// ──────────────────────────────────────────────────────────────────────────
function ChangePasswordModal({ redirectTo, onClose }: { redirectTo: string; onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirmPass) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newPass.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPass,
      data: { password_change_required: false },
    })

    if (error) {
      toast.error('Error al cambiar contraseña: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('¡Contraseña actualizada exitosamente!')
    window.location.href = redirectTo
  }

  return (
    <div className="modal-overlay">
      <div className="card p-8 w-full max-w-md bg-white border border-indigo-100 shadow-2xl anim-scale-in">
        <div className="flex flex-col items-center mb-7 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold font-sora text-indigo-950 mb-2">
            Cambia tu contraseña temporal
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
            Por seguridad, debes establecer una contraseña personal antes de continuar.
            No podrás usar <strong>MoodClass2026</strong> como contraseña definitiva.
          </p>
        </div>

        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="field-label">Nueva contraseña</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                required
                minLength={8}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="input-field pr-10"
                placeholder="Mínimo 8 caracteres"
                autoFocus
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="field-label">Confirmar contraseña</label>
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              className="input-field"
              placeholder="Repite la nueva contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 mt-2 text-sm tracking-wider uppercase font-semibold flex items-center justify-center gap-2"
            style={{ opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Actualizando...</>
            ) : (
              <>Actualizar y continuar <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// LOGIN FORM
// ──────────────────────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const supabase = createClient()

  const [rol, setRol] = useState<'estudiante' | 'docente'>('estudiante')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false)

  // Auto-redirect if already logged in (handles session sync in production)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.href = redirectTo
      }
    })
  }, [supabase])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    console.log('[Login] window.location.origin:', window.location.origin)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    console.log('[Login] signInWithPassword result:', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userEmail: data?.user?.email,
      error: error ? { message: error.message, status: error.status } : null,
      sessionExpiresAt: data?.session?.expires_at,
    })

    if (typeof document !== 'undefined') {
      const cookieNames = document.cookie.split(';').map(c => c.split('=')[0].trim())
      console.log('[Login] Document cookies:', cookieNames)
    }

    if (error) {
      toast.error('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    if (!data.user) {
      toast.error('No se pudo autenticar. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Verificar si el rol del perfil coincide con el seleccionado
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (perfil && perfil.rol !== rol) {
      toast(`Ingresando como ${perfil.rol === 'docente' ? 'Docente' : 'Estudiante'} según tu perfil registrado.`, {
        icon: 'ℹ️',
        duration: 4000,
      })
    }

    // Detectar si el usuario debe cambiar contraseña (primer login)
    const meta = data.user.user_metadata
    if (meta?.password_change_required === true) {
      setLoading(false)
      setNeedsPasswordChange(true)
      return
    }

    // Usar window.location.href para garantizar sincronización de cookies en producción
    window.location.href = redirectTo
  }

  return (
    <>
      <div className={`card border shadow-xl anim-scale-in overflow-hidden transition-all duration-300 ${
        rol === 'docente'
          ? 'bg-indigo-50/60 border-indigo-100'
          : 'bg-violet-50/60 border-violet-100'
      }`}>
        {/* Role selector tabs */}
        <div className="grid grid-cols-2">
          {[
            { key: 'estudiante' as const, label: 'Estudiante', icon: GraduationCap, sub: 'Hago check-ins de clase',
              activeBg: 'bg-violet-50', activeBorder: 'border-violet-500', activeIcon: 'text-violet-600', activeText: 'text-violet-950' },
            { key: 'docente' as const, label: 'Docente', icon: Presentation, sub: 'Gestiono mis cursos',
              activeBg: 'bg-indigo-50', activeBorder: 'border-indigo-600', activeIcon: 'text-indigo-600', activeText: 'text-indigo-950' },
          ].map((r) => {
            const Icon = r.icon
            const active = rol === r.key
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRol(r.key)}
                className={`py-5 px-4 flex flex-col items-center gap-2 transition-all duration-200 border-b-2 ${
                  active
                    ? `${r.activeBg} ${r.activeBorder}`
                    : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-6 w-6 transition-colors ${active ? r.activeIcon : 'text-slate-400'}`} />
                <div>
                  <div className={`text-sm font-bold transition-colors ${active ? r.activeText : 'text-slate-500'}`}>
                    {r.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 transition-colors ${active ? 'text-slate-500' : 'text-slate-400'}`}>{r.sub}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Credentials form */}
        <form onSubmit={handleLogin} className="p-7 space-y-4">
          <div>
            <label className="field-label">Correo electrónico institucional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@inacap.cl"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="field-label">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 mt-2 text-sm tracking-wider uppercase font-semibold flex items-center justify-center gap-1.5 transition-all duration-300"
            style={{
              opacity: loading ? 0.75 : 1,
              background: rol === 'docente'
                ? 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)'
                : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              boxShadow: rol === 'docente'
                ? '0 4px 14px rgba(79,70,229,0.35)'
                : '0 4px 14px rgba(124,58,237,0.35)',
            }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Ingresando...</>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Ingresar como {rol === 'docente' ? 'Docente' : 'Estudiante'}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>

          <div className="text-center pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-slate-400 hover:text-indigo-600 transition-colors duration-200 underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>

      {/* Password change modal — primer login */}
      {needsPasswordChange && (
        <ChangePasswordModal
          redirectTo={redirectTo}
          onClose={() => setNeedsPasswordChange(false)}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// PAGE
// ──────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FF] relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] rounded-full filter blur-[80px] opacity-[0.18] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4F46E5 0%, #06B6D4 100%)' }} />
      <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] rounded-full filter blur-[80px] opacity-[0.18] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1 0%, #06B6D4 100%)' }} />

      <div className="w-full max-w-md z-10 anim-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <Sparkles className="h-6 w-6 text-indigo-600 transition-transform duration-300 group-hover:rotate-12" />
            <span className="text-2xl font-extrabold tracking-tight text-indigo-950 font-sora">
              Mood<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Class</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold font-sora text-indigo-950 mb-2 leading-tight">
            Ingresar a la <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">plataforma</span>
          </h1>
          <p className="text-sm text-slate-500">Selecciona tu rol y escribe tus credenciales</p>
        </div>

        <Suspense fallback={
          <div className="card p-8 bg-white border border-slate-100 shadow-xl text-center text-sm text-slate-500">
            Cargando formulario...
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          ¿Problemas para ingresar?{' '}
          <span className="text-indigo-600 font-semibold">Contacta a tu coordinador académico.</span>
        </p>
      </div>
    </main>
  )
}
