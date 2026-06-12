'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTodaySantiago } from '@/lib/timezone'
import toast from 'react-hot-toast'
import type { Asignatura, Sesion, Usuario } from '@/lib/types'
import QRCode from 'qrcode'
import {
  Calendar, Radio, Users, ArrowLeft, ArrowRight, Clock, CheckCircle2,
  X, Play, BookOpen, CalendarDays, Loader2
} from 'lucide-react'

interface Props {
  usuario: Usuario
  asignatura: Asignatura
  sesiones: Sesion[]
  inscripciones: Array<{ usuarios: Usuario | null }>
}

const TIPOS_ACTIVIDAD = ['Clase', 'Taller', 'Evaluación', 'Laboratorio', 'Seminario', 'Otro']

export default function AsignaturaClient({ usuario, asignatura, sesiones: initial, inscripciones }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [sesiones, setSesiones] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [tipoActividad, setTipoActividad] = useState('Clase')
  const [tema, setTema] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [iniciando, setIniciando] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sesiones' | 'estudiantes'>('sesiones')

  async function handleIniciarSesion(sesion: Sesion) {
    setIniciando(sesion.id)

    const { error } = await supabase
      .from('sesiones')
      .update({ estado: 'activa' })
      .eq('id', sesion.id)

    if (error) {
      toast.error('Error al iniciar clase')
      setIniciando(null)
      return
    }

    // Generar QR si no tiene
    let qrDataUrl = sesion.qr_code
    if (!qrDataUrl) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const checkinUrl = `${base}/checkin/${sesion.id}`
      qrDataUrl = await QRCode.toDataURL(checkinUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#4F46E5', light: '#FFFFFF' },
      })
      await supabase.from('sesiones').update({ qr_code: qrDataUrl }).eq('id', sesion.id)
    }

    toast.success('¡Clase iniciada!')
    router.push(`/live/${sesion.id}`)
  }

  async function handleCreateSesion(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: sesion, error } = await supabase
      .from('sesiones')
      .insert({
        asignatura_id: asignatura.id,
        tipo_actividad: tipoActividad,
        tema: tema || null,
        objetivo: objetivo || null,
        estado: 'activa',
        fecha: getTodaySantiago(),
      })
      .select()
      .single()

    if (error || !sesion) {
      toast.error('Error al crear sesión')
      setLoading(false)
      return
    }

    // Generate QR code URL
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const checkinUrl = `${base}/checkin/${sesion.id}`
    const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#4F46E5', light: '#FFFFFF' },
    })

    await supabase
      .from('sesiones')
      .update({ qr_code: qrDataUrl })
      .eq('id', sesion.id)

    setSesiones([{ ...sesion, qr_code: qrDataUrl }, ...sesiones])
    setShowModal(false)
    setTema(''); setObjetivo('')
    toast.success('Sesión creada con QR')
    setLoading(false)
  }

  function estadoBadge(estado: string) {
    if (estado === 'programada') {
      return (
        <span className="badge bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> Programada
        </span>
      )
    }
    if (estado === 'activa') {
      return (
        <span className="badge badge-green flex items-center gap-1.5 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Activa
        </span>
      )
    }
    if (estado === 'entrada_cerrada') {
      return (
        <span className="badge badge-amber flex items-center gap-1">
          <Clock className="h-3 w-3" /> Ticket salida
        </span>
      )
    }
    return (
      <span className="badge bg-slate-50 text-slate-400 border border-slate-200 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Cerrada
      </span>
    )
  }

  const sesionesActivas = sesiones.filter(s => s.estado === 'activa' || s.estado === 'entrada_cerrada')
  const sesionesProgramadas = sesiones.filter(s => s.estado === 'programada')
  const sesionesCerradas = sesiones.filter(s => s.estado === 'cerrada')

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 font-sans">
      {/* Header */}
      <div className="mb-8 anim-fade-up">
        <Link href="/dashboard/docente" className="link text-xs font-bold uppercase tracking-wider mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-extrabold text-indigo-950 font-sora">{asignatura.nombre}</h1>
              <span className="badge badge-blue">
                {asignatura.codigo}
              </span>
            </div>
            {asignatura.descripcion && (
              <p className="text-sm text-slate-500 mt-1">{asignatura.descripcion}</p>
            )}
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary px-5 py-3 text-xs tracking-wider uppercase font-semibold self-start sm:self-auto">
            + Nueva sesión manual
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-10 anim-fade-up delay-1">
        {[
          { label: 'Total sesiones', value: sesiones.length, icon: Calendar, color: 'indigo' },
          { label: 'Programadas', value: sesionesProgramadas.length, icon: CalendarDays, color: 'slate' },
          { label: 'Activas', value: sesionesActivas.length, icon: Radio, color: 'emerald' },
          { label: 'Estudiantes', value: inscripciones.length, icon: Users, color: 'cyan' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-5 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: s.color === 'indigo' ? '#EEF2FF' : s.color === 'emerald' ? '#ECFDF5' : s.color === 'cyan' ? '#ECFEFF' : '#F8FAFC',
                  color: s.color === 'indigo' ? '#4F46E5' : s.color === 'emerald' ? '#10B981' : s.color === 'cyan' ? '#06B6D4' : '#64748B'
                }}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-indigo-950 font-sora">{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="tab-group mb-8 anim-fade-up delay-2">
        <button
          onClick={() => setActiveTab('sesiones')}
          className={`tab-btn ${activeTab === 'sesiones' ? 'active' : ''}`}
        >
          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Sesiones de Clase</span>
        </button>
        <button
          onClick={() => setActiveTab('estudiantes')}
          className={`tab-btn ${activeTab === 'estudiantes' ? 'active' : ''}`}
        >
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Alumnos Inscritos</span>
        </button>
      </div>

      {/* Sesiones tab */}
      {activeTab === 'sesiones' && (
        <div className="anim-fade-up delay-3">
          {sesiones.length === 0 ? (
            <div className="card p-16 text-center bg-white border border-slate-100 max-w-xl mx-auto shadow-sm flex flex-col items-center">
              <Calendar className="h-12 w-12 text-indigo-600 mb-4" />
              <h2 className="text-base font-bold text-indigo-950 mb-2">No hay sesiones en esta asignatura</h2>
              <p className="text-slate-500 text-xs mb-6 max-w-xs mx-auto">
                Si creaste la asignatura desde una sección, las sesiones se generan automáticamente.
                También puedes crear una sesión manual.
              </p>
              <button onClick={() => setShowModal(true)} className="btn-primary px-6 py-2.5 text-xs tracking-wider uppercase font-semibold">
                + Crear sesión manual
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sesiones.map((sesion) => (
                <div key={sesion.id}
                  className={`card p-5 bg-white border flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm hover:-translate-y-0.5 ${sesion.estado === 'activa' ? 'border-emerald-200' : sesion.estado === 'programada' ? 'border-slate-100 opacity-80' : 'border-slate-100'}`}
                >
                  <div className="flex items-center gap-5">
                    {sesion.qr_code ? (
                      <div className="p-1 border border-slate-100 rounded-xl bg-white shadow-xs shrink-0">
                        <img src={sesion.qr_code} alt="QR Code" className="w-14 h-14 rounded-lg object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 shrink-0 border border-slate-100">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className="font-extrabold text-indigo-950 font-sora">
                          {sesion.clase_numero ? `Clase ${sesion.clase_numero}` : sesion.tipo_actividad}
                        </span>
                        {estadoBadge(sesion.estado)}
                      </div>
                      {sesion.tema && (
                        <div className="text-xs text-slate-600 font-medium mb-0.5">
                          Tema: {sesion.tema}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 capitalize">
                        {new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 self-end md:self-auto">
                    {sesion.estado === 'programada' ? (
                      <button
                        onClick={() => handleIniciarSesion(sesion)}
                        disabled={iniciando === sesion.id}
                        className="btn-primary px-5 py-2.5 text-xs tracking-wider uppercase font-semibold flex items-center gap-1.5"
                      >
                        {iniciando === sesion.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Iniciar clase
                      </button>
                    ) : sesion.estado !== 'cerrada' ? (
                      <Link
                        href={`/live/${sesion.id}`}
                        className="btn-primary px-5 py-2.5 text-xs tracking-wider uppercase font-semibold flex items-center gap-1.5"
                      >
                        <Radio className="h-3.5 w-3.5" /> Vista Live
                      </Link>
                    ) : (
                      <Link
                        href={`/live/${sesion.id}`}
                        className="btn-secondary px-5 py-2.5 text-xs tracking-wider uppercase font-semibold flex items-center gap-1.5"
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> Ver Reporte
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estudiantes tab */}
      {activeTab === 'estudiantes' && (
        <div className="anim-fade-up delay-3">
          {inscripciones.length === 0 ? (
            <div className="card p-16 text-center bg-white border border-slate-100 max-w-xl mx-auto shadow-sm flex flex-col items-center">
              <Users className="h-12 w-12 text-indigo-600 mb-4" />
              <h2 className="text-base font-bold text-indigo-950 mb-2">No hay estudiantes inscritos</h2>
              <p className="text-slate-500 text-xs">
                Comparte el código de la asignatura con tus alumnos: <strong className="text-indigo-600 font-bold">{asignatura.codigo}</strong>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {inscripciones.map((insc, i) => (
                <div key={i} className="card p-4 bg-white border border-slate-100 flex items-center gap-3.5 shadow-xs">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
                    {insc.usuarios?.nombre?.charAt(0) || '?'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-indigo-950 text-sm truncate font-sora leading-tight">{insc.usuarios?.nombre || 'Estudiante'}</div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">{insc.usuarios?.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal crear sesión manual */}
      {showModal && (
        <div className="modal-overlay">
          <div className="card p-8 w-full max-w-md bg-white border border-slate-100 shadow-2xl anim-scale-in relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-extrabold font-sora text-indigo-950">Nueva sesión</h2>
              <p className="text-xs text-slate-400 mt-1">Crea una sesión de clases y genera el código QR de acceso</p>
            </div>

            <form onSubmit={handleCreateSesion} className="space-y-5">
              <div>
                <label className="field-label">Tipo de actividad</label>
                <select
                  value={tipoActividad}
                  onChange={(e) => setTipoActividad(e.target.value)}
                  className="input-field"
                >
                  {TIPOS_ACTIVIDAD.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Tema de la clase (opcional)</label>
                <input
                  value={tema}
                  onChange={e => setTema(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Derechos fundamentales"
                />
              </div>

              <div>
                <label className="field-label">Objetivo de la clase (opcional)</label>
                <textarea
                  value={objetivo}
                  onChange={e => setObjetivo(e.target.value)}
                  className="input-field"
                  placeholder="¿Qué esperamos lograr hoy?"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3 text-xs uppercase tracking-wider font-semibold">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5"
                  style={{ opacity: loading ? 0.75 : 1 }}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generando QR...</>
                  ) : (
                    <><Play className="h-4 w-4" /> Iniciar + QR</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
