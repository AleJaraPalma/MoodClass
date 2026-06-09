'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { DIMENSIONES } from '@/lib/types'
import {
  Sparkles, ArrowRight, X, QrCode, Brain, BarChart3,
  Bell, Presentation, GraduationCap, CheckCircle2, Loader2
} from 'lucide-react'
import DimensionIcon from '@/components/DimensionIcon'

// ──────────────────────────────────────────────────────────────────────────
// DEMO MODAL
// ──────────────────────────────────────────────────────────────────────────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState('')
  const [institucion, setInstitucion] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      await fetch('https://formsubmit.co/ajax/aajara@inacap.cl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          nombre,
          institucion,
          email,
          _subject: 'Solicitud de demo MoodClass',
          _template: 'table',
        }),
      })
      setSent(true)
    } catch {
      // Silent — mostrar éxito de todas formas (el form se envió)
      setSent(true)
    }
    setSending(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card p-8 w-full max-w-md bg-white border border-slate-100 shadow-2xl anim-scale-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-extrabold font-sora text-indigo-950 mb-2">¡Solicitud enviada!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Nos comunicaremos contigo en las próximas 24 horas para coordinar la demo.
            </p>
            <button onClick={onClose} className="btn-primary mt-6 px-8 py-2.5 text-xs uppercase tracking-wider font-semibold">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Demo personalizada</span>
              </div>
              <h2 className="text-xl font-extrabold font-sora text-indigo-950">Solicitar demo</h2>
              <p className="text-xs text-slate-400 mt-1">Te mostraremos MoodClass en acción con tu contexto real.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Nombre completo</label>
                <input required value={nombre} onChange={e => setNombre(e.target.value)}
                  className="input-field" placeholder="Dra. Ana García" />
              </div>
              <div>
                <label className="field-label">Institución</label>
                <input required value={institucion} onChange={e => setInstitucion(e.target.value)}
                  className="input-field" placeholder="Universidad / Institución" />
              </div>
              <div>
                <label className="field-label">Correo electrónico</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field" placeholder="tu@universidad.cl" />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full py-3.5 mt-2 text-sm tracking-wider uppercase font-semibold flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <>Enviar solicitud <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// HOW IT WORKS — steps
// ──────────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: '01',
    icon: QrCode,
    color: '#4F46E5',
    bg: '#EEF2FF',
    title: 'El docente inicia la clase',
    desc: 'Con un clic, MoodClass genera un código QR único para la sesión. Se proyecta en pantalla y los estudiantes lo escanean desde su teléfono.',
    visual: (
      <svg viewBox="0 0 120 120" className="w-20 h-20" fill="none">
        <rect width="120" height="120" rx="16" fill="#EEF2FF" />
        <rect x="20" y="20" width="36" height="36" rx="4" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="2" />
        <rect x="28" y="28" width="20" height="20" rx="2" fill="#4F46E5" />
        <rect x="64" y="20" width="36" height="36" rx="4" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="2" />
        <rect x="72" y="28" width="20" height="20" rx="2" fill="#4F46E5" />
        <rect x="20" y="64" width="36" height="36" rx="4" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="2" />
        <rect x="28" y="72" width="20" height="20" rx="2" fill="#4F46E5" />
        <rect x="64" y="64" width="10" height="10" rx="2" fill="#4F46E5" />
        <rect x="78" y="64" width="10" height="10" rx="2" fill="#4F46E5" />
        <rect x="64" y="78" width="10" height="10" rx="2" fill="#4F46E5" />
        <rect x="78" y="78" width="10" height="10" rx="2" fill="#4F46E5" />
        <rect x="92" y="64" width="10" height="10" rx="2" fill="#06B6D4" />
        <rect x="92" y="78" width="10" height="10" rx="2" fill="#06B6D4" />
        <rect x="64" y="92" width="10" height="10" rx="2" fill="#06B6D4" />
        <rect x="78" y="92" width="10" height="10" rx="2" fill="#06B6D4" />
        <rect x="92" y="92" width="10" height="10" rx="2" fill="#4F46E5" />
      </svg>
    ),
  },
  {
    number: '02',
    icon: Brain,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    title: 'El estudiante hace check-in',
    desc: 'En segundos, responde 7 dimensiones socioemocionales — energía, foco, ánimo, claridad, confianza, motivación y memoria — de forma anónima y segura.',
    visual: (
      <svg viewBox="0 0 120 120" className="w-20 h-20" fill="none">
        <rect width="120" height="120" rx="16" fill="#F5F3FF" />
        {[0,1,2,3,4,5,6].map((i) => (
          <g key={i}>
            <rect x="16" y={16 + i * 14} width="88" height="10" rx="5" fill="#8B5CF6" fillOpacity="0.12" />
            <rect x="16" y={16 + i * 14} width={30 + (i % 3) * 20} height="10" rx="5"
              fill={i < 4 ? '#8B5CF6' : '#06B6D4'} fillOpacity="0.8" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    number: '03',
    icon: BarChart3,
    color: '#06B6D4',
    bg: '#ECFEFF',
    title: 'El docente ve el mood en vivo',
    desc: 'La vista en tiempo real muestra el estado emocional colectivo del curso, actualizada cada 10 segundos. Identifica quién necesita atención antes de que sea tarde.',
    visual: (
      <svg viewBox="0 0 120 120" className="w-20 h-20" fill="none">
        <rect width="120" height="120" rx="16" fill="#ECFEFF" />
        {[
          { x: 20, h: 60, color: '#4F46E5' },
          { x: 38, h: 80, color: '#06B6D4' },
          { x: 56, h: 45, color: '#8B5CF6' },
          { x: 74, h: 90, color: '#10B981' },
          { x: 92, h: 65, color: '#F59E0B' },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={110 - b.h} width="14" height={b.h} rx="4" fill={b.color} fillOpacity="0.85" />
        ))}
        <line x1="14" y1="110" x2="110" y2="110" stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.3" />
      </svg>
    ),
  },
  {
    number: '04',
    icon: Bell,
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'El sistema detecta patrones',
    desc: 'MoodClass cruza sesiones, identifica tendencias y genera alertas tempranas cuando un grupo muestra baja energía, foco o motivación persistente.',
    visual: (
      <svg viewBox="0 0 120 120" className="w-20 h-20" fill="none">
        <rect width="120" height="120" rx="16" fill="#ECFDF5" />
        <circle cx="60" cy="52" r="28" fill="#10B981" fillOpacity="0.12" stroke="#10B981" strokeWidth="2" />
        <path d="M46 52 Q53 42 60 52 Q67 62 74 52" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="60" cy="52" r="4" fill="#10B981" />
        <rect x="44" y="84" width="32" height="10" rx="5" fill="#10B981" fillOpacity="0.2" />
        <rect x="50" y="84" width="20" height="10" rx="5" fill="#10B981" fillOpacity="0.7" />
        <circle cx="93" cy="30" r="10" fill="#EF4444" />
        <text x="93" y="34" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">!</text>
      </svg>
    ),
  },
]

// ──────────────────────────────────────────────────────────────────────────
// DIMENSION DESCRIPTIONS
// ──────────────────────────────────────────────────────────────────────────
const DIM_DESCRIPTIONS: Record<string, string> = {
  energia: 'vitalidad física',
  foco: 'atención disponible',
  animo: 'estado emocional',
  claridad: 'lucidez mental',
  confianza: 'seguridad académica',
  motivacion: 'ganas de estar aquí',
  memoria: 'conexión con lo aprendido',
}

// ──────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ──────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [showModal, setShowModal] = useState(false)
  const howRef = useRef<HTMLDivElement>(null)

  function scrollToHow() {
    howRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="min-h-screen flex flex-col relative overflow-x-hidden font-sans bg-[#F8F9FF]">
      {/* Background blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full filter blur-[100px] opacity-[0.22] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4F46E5 0%, #06B6D4 100%)' }} />
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full filter blur-[120px] opacity-[0.18] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1 0%, #06B6D4 100%)' }} />

      {/* ── NAVBAR ── */}
      <div className="w-full sticky top-0 z-50 bg-[#F8F9FF]/20 backdrop-blur-md border-b border-indigo-100/10">
        <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <Sparkles className="h-6 w-6 text-indigo-600 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-xl font-extrabold tracking-tight text-indigo-950 font-sora">
              Mood<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Class</span>
            </span>
          </div>
          <Link href="/login" className="btn-primary text-xs tracking-wider uppercase font-semibold px-5 py-2.5 rounded-xl">
            Iniciar sesión
          </Link>
        </header>
      </div>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-8 anim-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          Inteligencia socioemocional para el aula
        </div>

        <h1 className="text-4xl md:text-[3.5rem] font-extrabold mb-8 leading-[1.12] text-indigo-950 font-sora tracking-tight max-w-4xl mx-auto anim-fade-up">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#06B6D4]">
            Inteligencia Socioemocional
          </span>{' '}
          para el Aprendizaje
        </h1>

        <p className="text-base md:text-lg text-slate-500 mb-10 max-w-3xl mx-auto leading-relaxed anim-fade-up delay-1">
          Cada clase es una oportunidad de ver lo que nadie ve. MoodClass transforma el estado emocional de tus estudiantes en información real — para que puedas enseñar con propósito, intervenir a tiempo y construir aulas donde todos pertenecen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center anim-fade-up delay-2 mb-16">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-sm tracking-wide font-bold px-8 py-3.5 rounded-xl w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Solicitar demo <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={scrollToHow}
            className="btn-secondary text-sm tracking-wide font-bold px-8 py-3.5 rounded-xl w-full sm:w-auto"
          >
            ¿Cómo funciona?
          </button>
        </div>

        {/* 7 Dimensions grid */}
        <div className="anim-fade-up delay-3 w-full">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            Mide 7 dimensiones clave de bienestar académico
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 max-w-5xl mx-auto">
            {DIMENSIONES.map((dim, i) => (
              <div
                key={dim.key}
                className="card p-4 flex flex-col items-center justify-center text-center bg-white transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                style={{ borderBottom: `3px solid ${dim.color}cc`, animationDelay: `${i * 0.08}s` }}
              >
                <div className="mb-2.5" style={{ color: dim.color }}>
                  <DimensionIcon iconName={dim.icon} size={26} />
                </div>
                <span className="text-xs font-bold font-sora text-slate-700 leading-tight">{dim.label}</span>
                <span className="text-[9px] text-slate-400 mt-1 font-semibold leading-tight">
                  {DIM_DESCRIPTIONS[dim.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={howRef} id="como-funciona" className="w-full py-20 md:py-28 z-10 relative">
        {/* Section bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FF] via-white to-[#F8F9FF] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-5">
              <BarChart3 className="h-3.5 w-3.5" /> Flujo completo
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-sora text-indigo-950 mb-4 leading-tight">
              De la emoción al dato,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
                en tiempo real
              </span>
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
              Cuatro pasos simples que transforman el estado emocional invisible de tus estudiantes en información accionable para mejorar cada clase.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={i}
                  className="card p-6 bg-white border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {/* Step number + icon */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: step.bg }}>
                      <Icon className="h-6 w-6" style={{ color: step.color }} />
                    </div>
                    <span className="text-3xl font-black font-sora leading-none"
                      style={{ color: `${step.color}22` }}>
                      {step.number}
                    </span>
                  </div>

                  {/* Visual illustration */}
                  <div className="flex justify-center mb-5">
                    {step.visual}
                  </div>

                  <h3 className="font-extrabold text-indigo-950 font-sora text-sm mb-2 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed flex-1">
                    {step.desc}
                  </p>

                  {/* Connector arrow (except last) */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:flex absolute right-[-20px] top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Roles */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Presentation,
                color: '#4F46E5',
                bg: '#EEF2FF',
                title: 'Para docentes',
                points: [
                  'Vista en vivo del estado emocional del curso',
                  'Comparativa entrada/salida por clase',
                  'Historial de sesiones y tendencias',
                  'Alertas tempranas de grupos en riesgo',
                ],
              },
              {
                icon: GraduationCap,
                color: '#06B6D4',
                bg: '#ECFEFF',
                title: 'Para estudiantes',
                points: [
                  'Check-in anónimo y sin juicios',
                  'Reflexión emocional al inicio y fin de clase',
                  'Sin app que instalar — solo escanear QR',
                  'Contribuye a un aula más consciente',
                ],
              },
            ].map((role, i) => {
              const Icon = role.icon
              return (
                <div key={i} className="card p-7 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: role.bg }}>
                      <Icon className="h-6 w-6" style={{ color: role.color }} />
                    </div>
                    <h3 className="font-extrabold text-indigo-950 font-sora text-base">{role.title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {role.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: role.color }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-sm tracking-wide font-bold px-10 py-4 rounded-xl inline-flex items-center gap-2"
            >
              Solicitar demo personalizada <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-indigo-50/50 py-6 text-center text-xs text-slate-400 z-10 mt-auto">
        <div>© {new Date().getFullYear()} MoodClass. Todos los derechos reservados.</div>
      </footer>

      {/* Demo Modal */}
      {showModal && <DemoModal onClose={() => setShowModal(false)} />}
    </main>
  )
}
