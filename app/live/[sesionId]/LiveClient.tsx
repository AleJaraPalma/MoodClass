'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Sesion, Mood, MoodCheckin, MoodEstado, Usuario } from '@/lib/types'
import { DIMENSIONES } from '@/lib/types'
import AgregarMoodModal, { type AgregarMoodData } from '@/components/AgregarMoodModal'
import QRCode from 'qrcode'
import {
  BookOpen, Radio, Users, Clock, Check, X, Camera,
  Target, Zap, Heart, Brain, Shield, Sprout, Sparkles,
  Plus, Ticket, AlertTriangle, CheckCircle2, Circle,
  PlayCircle, PauseCircle, MessageCircle, BarChart2, Calendar
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import HeaderPerfil from '@/components/HeaderPerfil'
import MoodAvgGem from '@/components/MoodAvgGem'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

const DIM_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  energia: Zap, foco: Target, animo: Heart,
  claridad: Brain, confianza: Shield, motivacion: Sprout, memoria: Sparkles,
}

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function nameToColor(nombre: string): string {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 55%, 45%)`
}

function AvatarCircle({
  nombre, isActivo, neverLoggedIn, topDimColor,
}: { nombre: string; isActivo: boolean; neverLoggedIn?: boolean; topDimColor?: string }) {
  const initials = getInitials(nombre)
  const bgColor = neverLoggedIn ? '#F1F5F9' : nameToColor(nombre)

  return (
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 select-none transition-all duration-500 ${
        neverLoggedIn
          ? 'border-2 border-dashed border-slate-300 text-slate-400'
          : 'text-white'
      } ${topDimColor ? 'aura-pulse' : ''}`}
      style={{
        backgroundColor: bgColor,
        ...(topDimColor
          ? ({ '--aura-color': topDimColor } as React.CSSProperties)
          : isActivo
          ? { boxShadow: '0 0 0 2px white, 0 0 0 3.5px rgba(52,211,153,0.7), 0 0 12px 3px rgba(52,211,153,0.55)' }
          : {}),
      }}
    >
      {initials}
    </div>
  )
}

interface InscripcionWithUser {
  estudiante_id: string
  usuarios: { id: string; nombre: string; email: string }[] | { id: string; nombre: string; email: string } | null
}

interface MoodEstadoWithUser extends MoodEstado {
  usuarios: { nombre: string } | null
}

interface Props {
  sesion: Sesion & { asignaturas?: { nombre: string; codigo: string; docente_id?: string } }
  usuario: Usuario
  initialMoods: Mood[]
  initialMoodActivo: Mood | null
  initialMoodEstados: MoodEstadoWithUser[]
  initialMoodCheckins: MoodCheckin[]
  initialInscritos: InscripcionWithUser[]
  neverLoggedIn: string[]
  esEvento?: boolean
  nombreEvento?: string
  tipoEvento?: string
}

function moodColor(val: number) {
  if (val >= 4) return '#10B981'
  if (val >= 3) return '#F59E0B'
  return '#EF4444'
}

function calcAvgCheckin(checkin: MoodCheckin): number {
  return (checkin.energia + checkin.foco + checkin.animo + checkin.claridad +
    checkin.confianza + checkin.motivacion + checkin.memoria) / 7
}

function topDimension(checkin: MoodCheckin): { key: string; color: string } {
  let topKey = 'energia'
  let topVal = 0
  DIMENSIONES.forEach(d => {
    const v = (checkin as unknown as Record<string, number>)[d.key] ?? 0
    if (v > topVal) { topVal = v; topKey = d.key }
  })
  const dim = DIMENSIONES.find(d => d.key === topKey)
  return { key: topKey, color: dim?.color ?? '#6366F1' }
}

function parseEventoNombre(campoAbierto: string): { nombre: string; comentario?: string } {
  const raw = campoAbierto.replace('[EVENTO] ', '')
  const colonIdx = raw.indexOf(': ')
  if (colonIdx > -1) {
    return { nombre: raw.substring(0, colonIdx), comentario: raw.substring(colonIdx + 2) }
  }
  return { nombre: raw }
}

export default function LiveClient({
  sesion: initialSesion,
  usuario,
  initialMoods,
  initialMoodActivo,
  initialMoodEstados,
  initialMoodCheckins,
  initialInscritos,
  neverLoggedIn = [],
  esEvento = false,
  nombreEvento,
  tipoEvento,
}: Props) {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [sesion, setSesion] = useState(initialSesion)
  const [moods, setMoods] = useState<Mood[]>(initialMoods)
  const [moodActivo, setMoodActivo] = useState<Mood | null>(initialMoodActivo)
  const [moodEstados, setMoodEstados] = useState<MoodEstadoWithUser[]>(initialMoodEstados)
  const [moodCheckins, setMoodCheckins] = useState<MoodCheckin[]>(initialMoodCheckins)
  const [inscritos] = useState<InscripcionWithUser[]>(initialInscritos)

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [working, setWorking] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [showAtrasoModal, setShowAtrasoModal] = useState<string | null>(null)
  const [showAgregarModal, setShowAgregarModal] = useState(false)
  const [comentarioModal, setComentarioModal] = useState<{ nombre: string; texto: string } | null>(null)
  const [reporteListo, setReporteListo] = useState<{ moodId: string; tipo: string; ok: boolean } | null>(null)

  const initialized = useRef(false)

  const generateQR = useCallback(async (moodId: string) => {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const url = `${base}/checkin/${moodId}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#4F46E5', light: '#FFFFFF' },
    })
    setQrDataUrl(dataUrl)
    return dataUrl
  }, [])

  const fetchLiveData = useCallback(async (currentMoodId?: string) => {
    const moodId = currentMoodId ?? moodActivo?.id
    if (!moodId) return

    const [estadosRes, checkinsRes, sesionRes] = await Promise.all([
      supabase.from('mood_estados').select('*, usuarios(nombre)').eq('mood_id', moodId),
      supabase.from('mood_checkins').select('*').eq('mood_id', moodId),
      supabase.from('sesiones').select('*').eq('id', sesion.id).single(),
    ])

    if (estadosRes.data) setMoodEstados(estadosRes.data as MoodEstadoWithUser[])
    if (checkinsRes.data) setMoodCheckins(checkinsRes.data as MoodCheckin[])
    if (sesionRes.data) setSesion(prev => ({ ...prev, ...sesionRes.data }))
    setLastUpdate(new Date())
  }, [moodActivo?.id, sesion.id, supabase])

  useEffect(() => {
    const interval = setInterval(() => fetchLiveData(), 10000)
    return () => clearInterval(interval)
  }, [fetchLiveData])

  useEffect(() => {
    setMounted(true)
    if (initialized.current) return
    initialized.current = true

    if (moods.length === 0 && !moodActivo) {
      iniciarClase()
    } else if (moodActivo) {
      generateQR(moodActivo.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciarClase() {
    setWorking(true)
    try {
      await supabase
        .from('sesiones')
        .update({ estado: 'activa', estado_clase: 'en_curso' })
        .eq('id', sesion.id)

      const { data: moodId, error: moodErr } = await supabase.rpc('crear_mood', {
        p_sesion_id: sesion.id,
        p_tipo: 'entrada',
        p_orden: 1,
        p_tipo_actividad: esEvento ? (tipoEvento || 'Evento') : 'Clase',
        p_descripcion_actividad: null,
      })

      if (moodErr || !moodId) {
        toast.error('Error creando mood de entrada: ' + moodErr?.message)
        return
      }

      await supabase
        .from('sesiones')
        .update({ mood_activo_id: moodId })
        .eq('id', sesion.id)

      await generateQR(moodId)

      const { data: nuevosEstados } = await supabase
        .from('mood_estados')
        .select('*, usuarios(nombre)')
        .eq('mood_id', moodId)

      const newMood: Mood = {
        id: moodId, sesion_id: sesion.id, tipo: 'entrada', estado: 'activo',
        tipo_actividad: esEvento ? (tipoEvento || 'Evento') : 'Clase', orden: 1, created_at: new Date().toISOString(),
      }

      setMoods([newMood])
      setMoodActivo(newMood)
      setMoodEstados((nuevosEstados as MoodEstadoWithUser[]) || [])
      setSesion(prev => ({ ...prev, estado: 'activa', estado_clase: 'en_curso', mood_activo_id: moodId }))
      toast.success(esEvento ? '¡Evento iniciado! QR listo para participantes.' : '¡Clase iniciada! Mood de entrada activo.')
    } finally {
      setWorking(false)
    }
  }

  async function handleTerminarMood() {
    if (!moodActivo) return
    setWorking(true)
    try {
      const { error } = await supabase.rpc('cerrar_mood', { p_mood_id: moodActivo.id })
      if (error) { toast.error('Error cerrando mood'); return }

      const closedMoodId = moodActivo.id
      const closedMoodTipo = moodActivo.tipo

      setMoods(prev => prev.map(m => m.id === closedMoodId ? { ...m, estado: 'cerrado' } : m))
      setMoodEstados([])
      setMoodCheckins([])
      setQrDataUrl(null)
      setShowQR(false)

      if (closedMoodTipo === 'salida') {
        await supabase
          .from('sesiones')
          .update({ estado: 'cerrada', estado_clase: 'cerrada' })
          .eq('id', sesion.id)
        setSesion(prev => ({ ...prev, estado: 'cerrada', estado_clase: 'cerrada' }))
        toast.success(esEvento ? 'Evento cerrado.' : 'Ticket de salida cerrado. Clase finalizada.')
      } else {
        toast.success('Mood terminado.')
      }

      setMoodActivo(null)

      let reporteOk = false
      try {
        const res = await fetch('/api/generar-reporte', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood_id: closedMoodId }),
        })
        const data = await res.json()
        reporteOk = res.ok && !data.error && !data.pendiente
      } catch {
        reporteOk = false
      }

      setReporteListo({ moodId: closedMoodId, tipo: closedMoodTipo, ok: reporteOk })
    } finally {
      setWorking(false)
    }
  }

  function handleVerReporte() {
    if (!reporteListo) return
    const params = new URLSearchParams()
    if (sesion.seccion_id) params.set('seccion', sesion.seccion_id)
    params.set('sesion', sesion.id)
    params.set('mood', reporteListo.moodId)
    setReporteListo(null)
    router.push(`/dashboard/reportes?${params.toString()}`)
  }

  function handleCerrarReporteModal() {
    const wasSalida = reporteListo?.tipo === 'salida'
    setReporteListo(null)
    if (wasSalida) router.push(esEvento ? '/dashboard/docente' : `/asignatura/${sesion.asignatura_id}`)
  }

  async function handleConfirmarMood(data: AgregarMoodData) {
    setShowAgregarModal(false)
    setWorking(true)
    try {
      const orden = moods.length + 1

      const { data: moodId, error } = await supabase.rpc('crear_mood', {
        p_sesion_id: sesion.id,
        p_tipo: 'adicional',
        p_orden: orden,
        p_tipo_actividad: data.tipo_actividad,
        p_descripcion_actividad: data.descripcion_actividad,
      })

      if (error || !moodId) { toast.error('Error creando mood: ' + error?.message); return }

      await supabase.from('moods').update({
        preguntas: data.preguntas,
        modalidad: data.modalidad || null,
        duracion: data.duracion || null,
        complejidad: data.complejidad || null,
      }).eq('id', moodId)

      await supabase.from('sesiones').update({ mood_activo_id: moodId }).eq('id', sesion.id)
      await generateQR(moodId)

      const { data: estados } = await supabase
        .from('mood_estados').select('*, usuarios(nombre)').eq('mood_id', moodId)

      const newMood: Mood = {
        id: moodId, sesion_id: sesion.id, tipo: 'adicional', estado: 'activo',
        tipo_actividad: data.tipo_actividad, descripcion_actividad: data.descripcion_actividad,
        modalidad: data.modalidad, duracion: data.duracion, complejidad: data.complejidad,
        preguntas: data.preguntas, orden, created_at: new Date().toISOString(),
      }

      setMoods(prev => [...prev, newMood])
      setMoodActivo(newMood)
      setMoodEstados((estados as MoodEstadoWithUser[]) || [])
      setMoodCheckins([])
      setShowQR(true)
      toast.success(`✨ Mood "${data.tipo_actividad}" activado con preguntas personalizadas.`)
    } finally {
      setWorking(false)
    }
  }

  async function handleIniciarTicketSalida() {
    setWorking(true)
    try {
      const orden = moods.length + 1
      const { data: moodId, error } = await supabase.rpc('crear_mood', {
        p_sesion_id: sesion.id,
        p_tipo: 'salida',
        p_orden: orden,
        p_tipo_actividad: 'Ticket de Salida',
        p_descripcion_actividad: null,
      })

      if (error || !moodId) { toast.error('Error creando ticket de salida'); return }

      await supabase.from('sesiones').update({ mood_activo_id: moodId }).eq('id', sesion.id)
      await generateQR(moodId)

      const { data: estados } = await supabase
        .from('mood_estados').select('*, usuarios(nombre)').eq('mood_id', moodId)

      const newMood: Mood = {
        id: moodId, sesion_id: sesion.id, tipo: 'salida', estado: 'activo',
        tipo_actividad: 'Ticket de Salida', orden, created_at: new Date().toISOString(),
      }

      setMoods(prev => [...prev, newMood])
      setMoodActivo(newMood)
      setMoodEstados((estados as MoodEstadoWithUser[]) || [])
      setMoodCheckins([])
      toast.success('Ticket de salida activado.')
    } finally {
      setWorking(false)
    }
  }

  async function handleMarcarAtraso(estudianteId: string) {
    const { error } = await supabase
      .from('asistencia')
      .upsert({ sesion_id: sesion.id, estudiante_id: estudianteId, presente: true, atraso: true },
        { onConflict: 'sesion_id,estudiante_id' })
    if (!error) {
      toast.success('Atraso registrado.')
      setShowAtrasoModal(null)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const estadoMap = new Map(moodEstados.map(e => [e.estudiante_id, e]))
  const checkinMap = new Map(moodCheckins.map(c => [c.estudiante_id, c]))

  // Event participants derived from checkins (campo_abierto starts with '[EVENTO]')
  const eventParticipants = esEvento
    ? moodCheckins
        .filter(c => c.campo_abierto?.startsWith('[EVENTO]'))
        .map(c => ({ ...parseEventoNombre(c.campo_abierto!), checkin: c }))
    : []

  const respondidos = esEvento ? eventParticipants.length : moodCheckins.length
  const totalInscritos = inscritos.length

  const moodLabel: Record<string, string> = {
    entrada: 'Entrada', adicional: 'Adicional', salida: 'Ticket de Salida',
  }

  const avgCheckins = moodCheckins.length > 0
    ? DIMENSIONES.reduce((acc, dim) => {
        acc[dim.key] = moodCheckins.reduce((s, c) => s + ((c as unknown as Record<string, number>)[dim.key] ?? 0), 0) / moodCheckins.length
        return acc
      }, {} as Record<string, number>)
    : null

  const moodHistorial = moods.filter(m => m.estado === 'cerrado')

  const moodAvg = moodCheckins.length > 0
    ? moodCheckins.reduce((s, c) => s + calcAvgCheckin(c), 0) / moodCheckins.length
    : null

  const checkinUrl = moodActivo
    ? `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/checkin/${moodActivo.id}`
    : ''

  return (
    <div className="min-h-screen flex bg-[#F8F9FF] font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-100 shadow-sm px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-indigo-950 font-sora">
              Mood<span className="text-indigo-600">Class</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">
              {esEvento ? 'Evento en Vivo' : 'Sala en Vivo'}
            </span>
            {moodActivo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                {moodLabel[moodActivo.tipo] ?? 'Live'}
              </span>
            )}
          </div>
          <HeaderPerfil nombre={usuario.nombre} />
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 anim-fade-up">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-1.5">
                {esEvento
                  ? <><Calendar className="h-3.5 w-3.5" /> {tipoEvento || 'Evento'}</>
                  : <><BookOpen className="h-3.5 w-3.5" /> {sesion.asignaturas?.nombre || 'Asignatura'}
                    {sesion.clase_numero && <span className="ml-1 text-slate-400">· Clase #{sesion.clase_numero}</span>}</>
                }
              </div>
              <h1 className="text-2xl font-extrabold text-indigo-950 font-sora flex items-center gap-3">
                {esEvento
                  ? <><Calendar className="h-5 w-5 text-indigo-600" /> {nombreEvento || 'Evento'}</>
                  : <><Radio className="h-5 w-5 text-indigo-600 animate-pulse" /> Vista en Vivo</>
                }
              </h1>
              <div className="text-slate-500 text-xs mt-1.5 flex flex-wrap gap-x-4 gap-y-1 items-center">
                {!esEvento && sesion.tema && <span>Tema: <strong className="text-slate-700">{sesion.tema}</strong></span>}
                <span className="text-slate-400">Auto-refresh 10s · Último: {mounted ? lastUpdate.toLocaleTimeString('es-CL') : '--:--:--'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap items-center justify-end">
              <button
                onClick={() => { if (!showQR && moodActivo) generateQR(moodActivo.id); setShowQR(v => !v) }}
                className="btn-secondary px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
              >
                {showQR ? <><X className="h-3.5 w-3.5" /> Ocultar QR</> : <><Camera className="h-3.5 w-3.5" /> Proyectar QR</>}
              </button>

              {moodActivo && (
                <button onClick={handleTerminarMood} disabled={working}
                  className="btn-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 12px rgba(249,115,22,0.25)' }}>
                  <PauseCircle className="h-3.5 w-3.5" />
                  {working ? 'Terminando...' : 'Terminar Mood'}
                </button>
              )}

              {!moodActivo && sesion.estado_clase === 'en_curso' && (
                <>
                  <button onClick={() => setShowAgregarModal(true)} disabled={working}
                    className="btn-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }}>
                    <Plus className="h-3.5 w-3.5" /> Agregar Mood
                  </button>
                  {!esEvento && (
                    <button onClick={handleIniciarTicketSalida} disabled={working}
                      className="btn-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
                      <Ticket className="h-3.5 w-3.5" /> Ticket Salida
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* QR Panel */}
          {showQR && moodActivo && qrDataUrl && (
            <div className="card p-8 mb-8 bg-white border border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-8 anim-scale-in rounded-2xl">
              <div className="p-2 border border-slate-100 rounded-2xl bg-white shadow-sm shrink-0">
                <img src={qrDataUrl} alt="QR Check-in" className="w-56 h-56 rounded-xl" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: moodActivo.tipo === 'entrada' ? '#EEF2FF' : moodActivo.tipo === 'salida' ? '#ECFDF5' : '#FFF7ED',
                    color: moodActivo.tipo === 'entrada' ? '#4F46E5' : moodActivo.tipo === 'salida' ? '#059669' : '#EA580C',
                  }}>
                  {moodLabel[moodActivo.tipo]}
                </div>
                <h2 className="text-xl font-extrabold text-indigo-950 font-sora mb-2">QR de Check-in</h2>
                <p className="text-slate-500 text-sm mb-4 leading-relaxed max-w-md">
                  {esEvento
                    ? 'Proyecta este código para que los participantes escaneen y respondan el check-in emocional. No necesitan registrarse.'
                    : 'Proyecta este código para que los estudiantes escaneen y respondan el check-in emocional.'}
                </p>
                <div className="p-3.5 rounded-xl font-mono text-xs break-all bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold max-w-md">
                  {checkinUrl}
                </div>
                <div className="mt-3 text-sm font-bold text-slate-600">
                  <span className="text-emerald-600">{respondidos}</span>
                  {esEvento
                    ? <span className="text-slate-400"> participantes han respondido</span>
                    : <span className="text-slate-400"> / {totalInscritos} han respondido</span>}
                </div>
              </div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8 anim-fade-up delay-1">
            <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div className="mt-4">
                <div className="text-3xl font-extrabold font-sora leading-none text-indigo-950">{respondidos}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">
                  {esEvento ? 'participantes' : `de ${totalInscritos} respondieron`}
                </div>
              </div>
            </div>

            {!esEvento && (
              <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
                <Circle className="h-6 w-6 text-slate-300" />
                <div className="mt-4">
                  <div className="text-3xl font-extrabold font-sora leading-none text-slate-400">
                    {totalInscritos - respondidos}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Por responder</div>
                </div>
              </div>
            )}

            {esEvento && (
              <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
                <Calendar className="h-6 w-6 text-violet-500" />
                <div className="mt-4">
                  <div className="text-sm font-extrabold font-sora leading-tight text-violet-700">
                    {tipoEvento || 'Evento'}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Sin registro previo</div>
                </div>
              </div>
            )}

            <div
              className="card p-5 pt-4 col-span-2 lg:col-span-2 border-2 shadow-sm rounded-2xl relative flex flex-col justify-end"
              style={{
                borderColor: 'rgba(99,102,241,0.18)',
                background: 'linear-gradient(135deg, rgba(79,70,229,0.05), rgba(6,182,212,0.05))',
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mood promedio</div>
              <MoodAvgGem avg={moodAvg} size={60} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Student/Participant Grid */}
            <div className="xl:col-span-2 card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl anim-fade-up delay-2">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-indigo-950 font-sora text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  {esEvento ? 'Participantes' : 'Alumnos del Curso'}
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  <span className="text-emerald-600 font-extrabold">{respondidos}</span>
                  {esEvento
                    ? ' participantes'
                    : <> de {totalInscritos} han respondido</>}
                </span>
              </div>

              {/* Event participants grid */}
              {esEvento ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {eventParticipants.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                      <Users className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">Esperando participantes...</p>
                      <p className="text-xs mt-1 text-slate-300">Aparecerán aquí cuando respondan</p>
                    </div>
                  ) : eventParticipants.map((p, i) => {
                    const topDim = topDimension(p.checkin)
                    const avg = calcAvgCheckin(p.checkin)
                    const tieneComentario = !!p.comentario?.trim()
                    return (
                      <div
                        key={i}
                        onClick={() => tieneComentario && setComentarioModal({ nombre: p.nombre, texto: p.comentario! })}
                        className={`relative text-center p-3 bg-slate-50/60 border border-slate-100 rounded-2xl flex flex-col items-center gap-1.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${tieneComentario ? 'cursor-pointer' : ''}`}
                      >
                        <AvatarCircle nombre={p.nombre} isActivo={false} topDimColor={topDim.color} />
                        <div className="text-[10px] font-bold text-slate-700 truncate w-full leading-tight text-center px-1 flex items-center justify-center gap-1">
                          {p.nombre.split(' ').slice(0, 2).join(' ')}
                          {tieneComentario && <MessageCircle className="h-3 w-3 text-indigo-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs font-extrabold" style={{ color: moodColor(avg) }}>
                            {avg.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Regular enrolled students grid */
                inscritos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Users className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No hay alumnos inscritos en esta asignatura</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {inscritos.map((ins) => {
                      const usuarioRaw = ins.usuarios
                      const usuarioObj = Array.isArray(usuarioRaw) ? usuarioRaw[0] : usuarioRaw
                      const nombre = usuarioObj?.nombre ?? ''
                      const displayName = nombre || 'Sin nombre'
                      const estudiante_id = ins.estudiante_id
                      const estado = estadoMap.get(estudiante_id)
                      const checkin = checkinMap.get(estudiante_id)
                      const avg = checkin ? calcAvgCheckin(checkin) : null
                      const topDim = checkin ? topDimension(checkin) : null
                      const isActivo = estado?.estado === 'activo'
                      const isNeverLoggedIn = neverLoggedIn.includes(estudiante_id) && !checkin && !isActivo

                      const isAtraso = moodActivo?.tipo === 'salida' && checkin && !moods.some(m => m.tipo === 'entrada')
                      const tieneComentario = !!checkin?.campo_abierto?.trim()

                      return (
                        <div
                          key={estudiante_id}
                          onClick={() => tieneComentario && setComentarioModal({ nombre: displayName, texto: checkin!.campo_abierto! })}
                          className={`relative text-center p-3 bg-slate-50/60 border border-slate-100 rounded-2xl flex flex-col items-center gap-1.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${tieneComentario ? 'cursor-pointer' : ''}`}
                        >
                          <AvatarCircle
                            nombre={displayName}
                            isActivo={isActivo}
                            neverLoggedIn={isNeverLoggedIn}
                            topDimColor={topDim?.color}
                          />

                          <div className="text-[10px] font-bold text-slate-700 truncate w-full leading-tight text-center px-1 flex items-center justify-center gap-1">
                            {displayName.split(' ').slice(0, 2).join(' ')}
                            {tieneComentario && (
                              <MessageCircle className="h-3 w-3 text-indigo-400 shrink-0" />
                            )}
                          </div>

                          {isNeverLoggedIn ? (
                            <div className="flex items-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">
                                Sin activar
                              </span>
                            </div>
                          ) : checkin ? (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-xs font-extrabold" style={{ color: moodColor(avg!) }}>
                                {avg!.toFixed(1)}
                              </span>
                            </div>
                          ) : isActivo ? (
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-[10px] text-emerald-600 font-bold">Activo</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Circle className="h-3 w-3 text-slate-300" />
                              <span className="text-[10px] text-slate-400">Pendiente</span>
                            </div>
                          )}

                          {isAtraso && (
                            <button
                              onClick={() => setShowAtrasoModal(estudiante_id)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center"
                              title="Posible atraso"
                            >
                              <AlertTriangle className="h-2.5 w-2.5 text-white" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>

            {/* Dimensiones panel */}
            <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl anim-fade-up delay-3">
              <h3 className="font-extrabold text-indigo-950 font-sora mb-5 text-base flex items-center gap-2">
                {moodActivo
                  ? <PlayCircle className="h-5 w-5 text-orange-500" />
                  : <Clock className="h-5 w-5 text-slate-400" />
                }
                Detalle de promedio por dimensiones
              </h3>

              {avgCheckins ? (
                <div className="space-y-4">
                  {DIMENSIONES.map((dim) => {
                    const val = avgCheckins[dim.key] ?? 0
                    const Icon = DIM_ICONS[dim.key] ?? Sparkles
                    return (
                      <div key={dim.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: dim.color }} />
                            {dim.label}
                          </span>
                          <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-full"
                            style={{ color: dim.color, backgroundColor: `${dim.color}18` }}>
                            {val.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full h-[6px] bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(val / 5) * 100}%`, backgroundColor: dim.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <Clock className="h-8 w-8 mb-2 opacity-30 animate-pulse" />
                  <p className="text-xs leading-relaxed">
                    {moodActivo
                      ? esEvento ? 'Esperando respuestas de los participantes...' : 'Esperando respuestas de los estudiantes...'
                      : 'Inicia un mood para ver los datos en tiempo real'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mood historial */}
          {moodHistorial.length > 0 && (
            <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl anim-fade-up delay-4">
              <h3 className="font-extrabold text-indigo-950 font-sora mb-4 text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" /> Historial de Moods
              </h3>
              <div className="flex flex-wrap gap-3">
                {moodHistorial.map((m) => (
                  <div key={m.id}
                    className="px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2"
                    style={{
                      backgroundColor: m.tipo === 'entrada' ? '#EEF2FF' : m.tipo === 'salida' ? '#ECFDF5' : '#FFF7ED',
                      borderColor: m.tipo === 'entrada' ? '#C7D2FE' : m.tipo === 'salida' ? '#A7F3D0' : '#FED7AA',
                      color: m.tipo === 'entrada' ? '#4F46E5' : m.tipo === 'salida' ? '#059669' : '#EA580C',
                    }}>
                    <Check className="h-3 w-3" />
                    {moodLabel[m.tipo]} #{m.orden}
                    {m.tipo_actividad && <span className="opacity-60">· {m.tipo_actividad}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Atraso Modal */}
      {showAtrasoModal && (
        <div className="modal-overlay" onClick={() => setShowAtrasoModal(null)}>
          <div className="card p-8 max-w-sm w-full mx-4 bg-white shadow-2xl rounded-2xl anim-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-indigo-950 font-sora text-base">¿Marcar como atraso?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Este alumno respondió el ticket de salida sin haber hecho el check-in de entrada.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAtrasoModal(null)}
                className="flex-1 btn-secondary py-2.5 text-xs font-bold uppercase tracking-wider">
                Cancelar
              </button>
              <button onClick={() => handleMarcarAtraso(showAtrasoModal)}
                className="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                Marcar Atraso
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgregarModal && (
        <AgregarMoodModal
          onClose={() => setShowAgregarModal(false)}
          onConfirm={handleConfirmarMood}
        />
      )}

      {/* Comentario Modal */}
      {comentarioModal && (
        <div className="modal-overlay" onClick={() => setComentarioModal(null)}>
          <div className="card p-8 max-w-sm w-full mx-4 bg-white shadow-2xl rounded-2xl anim-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-indigo-950 font-sora text-base">{comentarioModal.nombre}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">Respuesta abierta</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4 italic">
              &ldquo;{comentarioModal.texto}&rdquo;
            </p>
            <button onClick={() => setComentarioModal(null)}
              className="w-full btn-secondary py-2.5 text-xs font-bold uppercase tracking-wider mt-5">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Reporte Listo Modal */}
      <Dialog open={!!reporteListo} onOpenChange={(open) => { if (!open) handleCerrarReporteModal() }}>
        <DialogContent showClose={false}>
          {reporteListo?.ok ? (
            <>
              <DialogHeader>
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <DialogTitle>Mood cerrado</DialogTitle>
                  <DialogDescription>El análisis está listo.</DialogDescription>
                </div>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <button onClick={handleCerrarReporteModal}
                  className="btn-secondary h-10 box-border px-5 text-xs font-bold uppercase tracking-wider">
                  Cerrar
                </button>
                <button onClick={handleVerReporte}
                  className="btn-primary h-10 box-border px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                  <BarChart2 className="h-3.5 w-3.5" />
                  Ver reporte del mood
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <DialogTitle>Mood cerrado</DialogTitle>
                  <DialogDescription>El mood se cerró pero el análisis no se pudo generar.</DialogDescription>
                </div>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <button onClick={handleCerrarReporteModal}
                  className="btn-primary h-10 box-border px-5 text-xs font-bold uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                  Cerrar
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
