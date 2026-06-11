'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Asignatura, Seccion, Sesion, Usuario, Checkin } from '@/lib/types'
import QRCode from 'qrcode'
import {
  BookOpen, Radio, ArrowRight, X, Clock, Calendar, Play, CheckCircle2,
  MapPin, BookMarked, Plus, ChevronRight, ChevronLeft, LayoutGrid, Dices, Loader2,
  ArrowDownCircle, ArrowUpCircle, Smile, Meh, Frown
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import HeaderPerfil from '@/components/HeaderPerfil'

interface Props {
  usuario: Usuario
  secciones: Seccion[]
  asignaturas: Asignatura[]
  sesionesActivas: (Sesion & { asignaturas?: { nombre: string; codigo: string } })[]
  today: string
}

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
const DIA_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
}
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function parseFecha(fechaStr: string): Date {
  const [year, month, day] = fechaStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatWeekRange(monday: Date): string {
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  const sameMonth = monday.getMonth() === saturday.getMonth()
  const sameYear = monday.getFullYear() === saturday.getFullYear()
  if (sameMonth) {
    return `${monday.getDate()} – ${saturday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`
  }
  if (sameYear) {
    return `${monday.getDate()} ${MESES[monday.getMonth()].slice(0, 3)} – ${saturday.getDate()} ${MESES[saturday.getMonth()].slice(0, 3)} ${monday.getFullYear()}`
  }
  return `${monday.getDate()} ${MESES[monday.getMonth()].slice(0, 3)} ${monday.getFullYear()} – ${saturday.getDate()} ${MESES[saturday.getMonth()].slice(0, 3)} ${saturday.getFullYear()}`
}

function getTodayDia(): string {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return days[new Date().getDay()]
}

function getDiaSemanaFromFecha(fechaStr: string): string {
  if (!fechaStr) return 'lunes'
  const [year, month, day] = fechaStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return days[date.getDay()]
}

function formatHora(hora: string): string {
  // hora viene como "HH:MM:SS"
  const [h, m] = hora.split(':')
  const hNum = parseInt(h)
  const ampm = hNum >= 12 ? 'PM' : 'AM'
  const h12 = hNum % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export default function DocenteDashboardClient({
  usuario,
  secciones: initialSecciones,
  asignaturas: initialAsignaturas,
  sesionesActivas: initialSesionesActivas,
  today
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [secciones, setSecciones] = useState(initialSecciones)
  const [asignaturas, setAsignaturas] = useState(initialAsignaturas)
  const [sesionesActivas, setSesionesActivas] = useState(initialSesionesActivas)
  const [checkinsHoy, setCheckinsHoy] = useState<Checkin[]>([])
  const [loadingCheckins, setLoadingCheckins] = useState(true)

  useEffect(() => {
    async function loadCheckins() {
      const sesionIds = sesionesActivas.map(s => s.id)
      if (sesionIds.length === 0) {
        setLoadingCheckins(false)
        return
      }
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .in('sesion_id', sesionIds)
      if (!error && data) {
        setCheckinsHoy(data as Checkin[])
      }
      setLoadingCheckins(false)
    }
    loadCheckins()
  }, [sesionesActivas, supabase])

  // Modal: nueva sección
  const [showSeccionModal, setShowSeccionModal] = useState(false)
  const [seccionForm, setSeccionForm] = useState({
    codigo_asignatura: '',
    nombre_asignatura: '',
    subseccion: '',
    sala: '',
    dia_semana: 'lunes' as typeof DIAS_SEMANA[number],
    hora_inicio: '10:30',
    hora_fin: '12:00',
    fecha_inicio_semestre: '',
    fecha_fin_semestre: '',
  })

  // Modal: nueva asignatura simple
  const [showAsigModal, setShowAsigModal] = useState(false)
  const [asigForm, setAsigForm] = useState({ nombre: '', codigo: '', descripcion: '' })
  const [loadingAsig, setLoadingAsig] = useState(false)

  // Iniciar clase
  const [iniciando, setIniciando] = useState<string | null>(null)

  const todayDia = getDiaSemanaFromFecha(today)

  // Semana seleccionada en el calendario
  const [weekOffset, setWeekOffset] = useState(0)
  const currentMonday = getMonday(parseFecha(today))
  const weekStart = new Date(currentMonday)
  weekStart.setDate(currentMonday.getDate() + weekOffset * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 5)
  const weekStartStr = toDateStr(weekStart)
  const weekEndStr = toDateStr(weekEnd)
  const seccionesSemana = secciones.filter(s => {
    if (!s.fecha_inicio_semestre || !s.fecha_fin_semestre) return true
    return s.fecha_inicio_semestre <= weekEndStr && s.fecha_fin_semestre >= weekStartStr
  })

  // Sesiones de hoy (por día de semana de la sección)
  const seccionesHoy = secciones.filter(s => s.dia_semana === todayDia)

  const entradas = checkinsHoy.filter(c => c.tipo === 'entrada')
  const salidas = checkinsHoy.filter(c => c.tipo === 'salida')

  function getAvgMood(list: Checkin[]) {
    if (list.length === 0) return null
    let sum = 0
    list.forEach(c => {
      sum += (c.energia + c.foco + c.animo + c.claridad + c.confianza + c.motivacion + c.memoria) / 7
    })
    return sum / list.length
  }

  const entradaMood = getAvgMood(entradas)
  const salidaMood = getAvgMood(salidas)

  function moodColor(val: number) {
    if (val >= 4) return '#10B981' // emerald
    if (val >= 3) return '#F59E0B' // amber
    return '#EF4444' // red
  }

  function getMoodEmoji(mood: number | null) {
    if (mood === null) return '—'
    if (mood >= 4.5) return '🤩'
    if (mood >= 4) return '😊'
    if (mood >= 3) return '😐'
    return '🙁'
  }

  // Encontrar sesión activa/programada para una sección hoy
  function getSesionDeSecccion(seccionId: string) {
    return sesionesActivas.find(s => s.seccion_id === seccionId && s.fecha === today)
  }

  async function handleIniciarClase(seccion: Seccion) {
    setIniciando(seccion.id)

    // Buscar sesión programada para hoy en esta sección
    let sesionHoy = getSesionDeSecccion(seccion.id)

    if (!sesionHoy) {
      // Buscar la asignatura correspondiente
      const asig = asignaturas.find(a => a.codigo === seccion.codigo_asignatura)
      if (!asig) {
        toast.error('No se encontró la asignatura para esta sección')
        setIniciando(null)
        return
      }

      // Crear sesión con estado_clase = 'preparada'
      // LiveClient se encarga de crear el primer mood y pasar a 'en_curso'
      const { data: nuevaSesion, error } = await supabase
        .from('sesiones')
        .insert({
          asignatura_id: asig.id,
          seccion_id: seccion.id,
          fecha: today,
          estado: 'activa',
          estado_clase: 'preparada',
          tipo_actividad: 'Clase',
        })
        .select('*, asignaturas(nombre, codigo)')
        .single()

      if (error || !nuevaSesion) {
        toast.error('Error al iniciar clase')
        setIniciando(null)
        return
      }
      sesionHoy = nuevaSesion as typeof sesionHoy
    } else {
      // Activar la sesión programada
      const { error } = await supabase
        .from('sesiones')
        .update({ estado: 'activa', estado_clase: 'preparada' })
        .eq('id', sesionHoy.id)

      if (error) {
        toast.error('Error al activar sesión')
        setIniciando(null)
        return
      }
      sesionHoy = { ...sesionHoy, estado: 'activa' }
    }

    if (!sesionHoy) {
      toast.error('No se pudo iniciar la clase')
      setIniciando(null)
      return
    }

    toast.success('¡Clase iniciada! Preparando sala en vivo...')
    router.push(`/live/${sesionHoy.id}`)
  }


  async function handleCreateAsignatura(e: React.FormEvent) {
    e.preventDefault()
    setLoadingAsig(true)
    const { data, error } = await supabase
      .from('asignaturas')
      .insert({ ...asigForm, docente_id: usuario.id })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else {
      setAsignaturas([data, ...asignaturas])
      setShowAsigModal(false)
      setAsigForm({ nombre: '', codigo: '', descripcion: '' })
      toast.success('Asignatura creada')
    }
    setLoadingAsig(false)
  }

  function generateCode() {
    setAsigForm(f => ({ ...f, codigo: Math.random().toString(36).substring(2, 7).toUpperCase() }))
  }

  async function handleCreateSeccion(e: React.FormEvent) {
    e.preventDefault()

    // Buscar asignatura con el código
    let asig = asignaturas.find(a => a.codigo === seccionForm.codigo_asignatura)

    if (!asig) {
      // Crear asignatura automáticamente
      const { data: newAsig, error: asigErr } = await supabase
        .from('asignaturas')
        .insert({
          nombre: seccionForm.nombre_asignatura,
          codigo: seccionForm.codigo_asignatura,
          docente_id: usuario.id,
        })
        .select()
        .single()

      if (asigErr || !newAsig) {
        toast.error('Error creando asignatura: ' + asigErr?.message)
        return
      }
      asig = newAsig
      setAsignaturas(prev => [newAsig, ...prev])
    }

    const { data: nuevaSeccion, error: secErr } = await supabase
      .from('secciones')
      .insert({
        ...seccionForm,
        hora_inicio: `${seccionForm.hora_inicio}:00`,
        hora_fin: `${seccionForm.hora_fin}:00`,
        docente_id: usuario.id,
      })
      .select()
      .single()

    if (secErr || !nuevaSeccion) {
      toast.error('Error creando sección: ' + secErr?.message)
      return
    }

    // Generar sesiones del semestre
    if (asig) {
      const { data: count, error: genErr } = await supabase.rpc('generate_sesiones_semestre', {
        p_seccion_id: nuevaSeccion.id,
        p_asignatura_id: asig.id,
      })

      if (!genErr) {
        toast.success(`Sección creada con ${count} clases programadas`)
      } else {
        toast.success('Sección creada')
      }
    } else {
      toast.success('Sección creada')
    }

    setSecciones(prev => [...prev, nuevaSeccion])
    setShowSeccionModal(false)
    setSeccionForm({
      codigo_asignatura: '', nombre_asignatura: '', subseccion: '', sala: '',
      dia_semana: 'lunes', hora_inicio: '10:30', hora_fin: '12:00',
      fecha_inicio_semestre: '', fecha_fin_semestre: '',
    })
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FF] font-sans">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-100 shadow-sm px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-indigo-950 font-sora">
              Mood<span className="text-indigo-600">Class</span> Panel Docente
            </span>
          </div>
          <HeaderPerfil nombre={usuario.nombre} />
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 anim-fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-indigo-950 font-sora">
                Hola, {usuario.nombre.split(' ')[0]}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowSeccionModal(true)}
                className="btn-primary px-4 py-2.5 text-[11px] tracking-wider uppercase font-semibold flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Nueva sección
              </button>
              <button
                onClick={() => setShowAsigModal(true)}
                className="btn-secondary px-4 py-2.5 text-[11px] tracking-wider uppercase font-semibold flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" /> Nueva asignatura
              </button>
            </div>
          </div>

          {/* Cards de métricas superiores (4 en fila) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 anim-fade-up delay-1">
            {/* Card 1: Check-in Entrada */}
            <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
              <ArrowDownCircle className="h-6 w-6 text-indigo-600" />
              <div className="mt-4">
                <div className="text-2xl font-extrabold font-sora leading-none text-indigo-950">
                  {entradas.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Check-in Entrada</div>
              </div>
            </div>

            {/* Card 2: Ticket Salida */}
            <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
              <ArrowUpCircle className="h-6 w-6 text-teal-600" />
              <div className="mt-4">
                <div className="text-2xl font-extrabold font-sora leading-none text-indigo-950">
                  {salidas.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Ticket Salida</div>
              </div>
            </div>

            {/* Card 3: Mood Entrada */}
            <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
              <span className="text-2xl" style={{ filter: entradaMood ? 'none' : 'grayscale(100%)' }}>
                {getMoodEmoji(entradaMood)}
              </span>
              <div className="mt-4">
                <div className="text-2xl font-extrabold font-sora leading-none" style={{ color: entradaMood ? '#F59E0B' : '#64748B' }}>
                  {entradaMood ? `${entradaMood.toFixed(1)}/5` : '—'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Mood Entrada</div>
              </div>
            </div>

            {/* Card 4: Mood Salida */}
            <div className="card p-5 bg-white border border-slate-100 shadow-sm flex flex-col justify-between rounded-2xl">
              <span className="text-2xl grayscale">
                {getMoodEmoji(salidaMood)}
              </span>
              <div className="mt-4">
                <div className="text-2xl font-extrabold font-sora leading-none text-slate-400">
                  {salidaMood ? `${salidaMood.toFixed(1)}/5` : '—'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Mood Salida</div>
              </div>
            </div>
          </div>

      {/* Lista de asignaturas */}
      {asignaturas.length > 0 && (
        <div className="mb-10 anim-fade-up delay-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Mis asignaturas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {asignaturas.map(asig => (
              <Link
                key={asig.id}
                href={`/asignatura/${asig.id}`}
                className="card p-5 block bg-white hover:no-underline group relative overflow-hidden border border-slate-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.08))', border: '1px solid rgba(79,70,229,0.12)' }}>
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="badge badge-blue">{asig.codigo}</span>
                </div>
                <h3 className="font-extrabold text-base text-indigo-950 mb-1 font-sora tracking-tight group-hover:text-indigo-600 transition-colors">
                  {asig.nombre}
                </h3>
                {asig.descripcion && (
                  <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">{asig.descripcion}</p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
                  Ver sesiones <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Clases de hoy */}
      <div className="mb-10 anim-fade-up delay-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          Clases de hoy — {DIA_LABELS[todayDia] || todayDia}
        </h2>

        {seccionesHoy.length === 0 ? (
          <div className="card p-8 text-center bg-white border border-slate-100 max-w-xl shadow-sm flex flex-col items-center">
            <Clock className="h-10 w-10 text-indigo-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No tienes clases programadas para hoy</p>
            <p className="text-xs text-slate-400 mt-1">Crea una sección para generar tu agenda semanal automáticamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {seccionesHoy.map((seccion) => {
              const sesion = getSesionDeSecccion(seccion.id)
              const isActive = sesion?.estado === 'activa' || sesion?.estado === 'entrada_cerrada'
              const isIniciando = iniciando === seccion.id

              return (
                <div key={seccion.id} className={`card p-6 bg-white border shadow-sm flex items-start justify-between gap-4 ${isActive ? 'border-indigo-200 ring-1 ring-indigo-200/50' : 'border-slate-100'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-extrabold text-indigo-950 font-sora text-base truncate">
                        {seccion.nombre_asignatura}
                      </span>
                      {seccion.subseccion && (
                        <span className="badge badge-blue text-[10px]">Secc. {seccion.subseccion}</span>
                      )}
                      {isActive && (
                        <span className="badge badge-green animate-pulse flex items-center gap-1 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                          En curso
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatHora(seccion.hora_inicio)} – {formatHora(seccion.hora_fin)}
                      </span>
                      {seccion.sala && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {seccion.sala}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {seccion.codigo_asignatura}
                    </div>
                  </div>

                  {isActive && sesion ? (
                    <Link
                      href={`/live/${sesion.id}`}
                      className="btn-primary px-4 py-2.5 text-[11px] tracking-wider uppercase font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Radio className="h-3.5 w-3.5" /> Ver Live
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleIniciarClase(seccion)}
                      disabled={isIniciando}
                      className="btn-primary px-4 py-2.5 text-[11px] tracking-wider uppercase font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      {isIniciando ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {isIniciando ? 'Iniciando...' : 'Iniciar clase'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Vista semanal de todas las secciones */}
      <div className="anim-fade-up delay-4">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-indigo-500" />
            Todas las secciones
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-500 min-w-[150px] text-center capitalize">
              {formatWeekRange(weekStart)}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 h-8 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        {secciones.length === 0 ? (
          <div className="card p-16 text-center bg-white border border-slate-100 max-w-2xl mx-auto shadow-sm flex flex-col items-center">
            <LayoutGrid className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-lg font-bold text-indigo-950 mb-2">Aún no tienes secciones</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Crea tu primera sección para generar automáticamente las clases del semestre y activar el sistema de check-in
            </p>
            <button
              onClick={() => setShowSeccionModal(true)}
              className="btn-primary px-6 py-3 text-xs tracking-wider uppercase font-semibold"
            >
              + Crear primera sección
            </button>
          </div>
        ) : seccionesSemana.length === 0 ? (
          <div className="card p-8 text-center bg-white border border-slate-100 shadow-sm flex flex-col items-center">
            <Clock className="h-10 w-10 text-indigo-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No hay secciones programadas para esta semana</p>
          </div>
        ) : (
          <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden select-none">
            {/* Columna de Horas */}
            <div className="w-14 shrink-0 border-r border-slate-100 bg-slate-50/50 pt-10 relative">
              {HOURS.map(hour => (
                <div key={hour} className="h-16 relative pr-2 flex items-start justify-end">
                  <span className="absolute right-2 -top-2 text-[9px] font-bold text-slate-400 font-mono">
                    {`${hour}:00`}
                  </span>
                  {hour === HOURS[HOURS.length - 1] && (
                    <span className="absolute right-2 top-14 text-[9px] font-bold text-slate-400 font-mono">
                      {`${hour + 1}:00`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid de Días */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Cabecera de Días */}
              <div className="grid grid-cols-6 border-b border-slate-100 bg-slate-50/30">
                {DIAS_SEMANA.map(dia => {
                  const isToday = weekOffset === 0 && dia === todayDia
                  return (
                    <div key={dia} className={`py-3 text-center border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center ${isToday ? 'bg-indigo-50/40' : ''}`}>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {DIA_LABELS[dia].substring(0, 3)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Cuerpo del Calendario */}
              <div className="relative h-[960px] grid grid-cols-6">
                {/* Líneas de fondo del grid (divisores de hora y 15 min) */}
                <div className="absolute inset-0 pointer-events-none flex flex-col">
                  {HOURS.map(hour => (
                    <div key={hour} className="h-16 border-b border-slate-100/70 relative w-full last:border-b-0">
                      {/* 15 min dividers */}
                      <div className="absolute top-[16px] left-0 right-0 border-b border-dashed border-slate-100/30 w-full" />
                      <div className="absolute top-[32px] left-0 right-0 border-b border-dashed border-slate-100/30 w-full" />
                      <div className="absolute top-[48px] left-0 right-0 border-b border-dashed border-slate-100/30 w-full" />
                    </div>
                  ))}
                </div>

                {/* Columnas de los días */}
                {DIAS_SEMANA.map(dia => {
                  const isToday = weekOffset === 0 && dia === todayDia
                  const secsDelDia = seccionesSemana.filter(s => s.dia_semana === dia)

                  return (
                    <div key={dia} className={`relative border-r border-slate-100 last:border-r-0 h-full ${isToday ? 'bg-indigo-50/10' : ''}`}>
                      {secsDelDia.map(sec => {
                        const [startH, startM] = sec.hora_inicio.split(':').map(Number)
                        const [endH, endM] = sec.hora_fin.split(':').map(Number)

                        const startMin = (startH * 60 + startM) - 480
                        const endMin = (endH * 60 + endM) - 480

                        const top = (startMin * 64) / 60
                        const height = ((endMin - startMin) * 64) / 60

                        // Color de la asignatura basado en su código
                        let hash = 0
                        for (let i = 0; i < sec.codigo_asignatura.length; i++) {
                          hash = sec.codigo_asignatura.charCodeAt(i) + ((hash << 5) - hash)
                        }
                        const colorPalettes = [
                          { border: 'border-l-indigo-500 border-indigo-100', bg: 'bg-indigo-50/60 text-indigo-950', hover: 'hover:bg-indigo-100/80 hover:border-indigo-200' },
                          { border: 'border-l-emerald-500 border-emerald-100', bg: 'bg-emerald-50/60 text-emerald-950', hover: 'hover:bg-emerald-100/80 hover:border-emerald-200' },
                          { border: 'border-l-sky-500 border-sky-100', bg: 'bg-sky-50/60 text-sky-950', hover: 'hover:bg-sky-100/80 hover:border-sky-200' },
                          { border: 'border-l-amber-500 border-amber-100', bg: 'bg-amber-50/60 text-amber-950', hover: 'hover:bg-amber-100/80 hover:border-amber-200' },
                          { border: 'border-l-rose-500 border-rose-100', bg: 'bg-rose-50/60 text-rose-950', hover: 'hover:bg-rose-100/80 hover:border-rose-200' },
                          { border: 'border-l-violet-500 border-violet-100', bg: 'bg-violet-50/60 text-violet-950', hover: 'hover:bg-violet-100/80 hover:border-violet-200' },
                        ]
                        const color = colorPalettes[Math.abs(hash) % colorPalettes.length]

                        return (
                          <div
                            key={sec.id}
                            onClick={() => router.push(`/asignatura/${asignaturas.find(a => a.codigo === sec.codigo_asignatura)?.id || '#'}`)}
                            className={`absolute left-1 right-1 p-2 rounded-xl border border-l-4 ${color.border} ${color.bg} ${color.hover} transition-all cursor-pointer shadow-xs flex flex-col justify-between overflow-hidden group select-none`}
                            style={{ top: `${top}px`, height: `${height}px` }}
                            title={`${sec.nombre_asignatura} (${sec.codigo_asignatura})`}
                          >
                            <div className="flex-1 min-h-0">
                              <div className="text-[9px] font-extrabold leading-tight uppercase line-clamp-2">
                                {sec.nombre_asignatura}
                              </div>
                              {sec.sala && (
                                <div className="text-[8px] font-bold text-slate-500 flex items-center gap-0.5 mt-1">
                                  <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                                  <span className="truncate">{sec.sala}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[8px] font-extrabold text-slate-400 shrink-0 mt-1 flex items-center gap-0.5 font-mono">
                              <Clock className="h-2.5 w-2.5" />
                              {sec.hora_inicio.substring(0, 5)} - {sec.hora_fin.substring(0, 5)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: nueva sección */}
      {showSeccionModal && (
        <div className="modal-overlay">
          <div className="card p-8 w-full max-w-lg bg-white border border-slate-100 shadow-2xl anim-scale-in relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowSeccionModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-extrabold font-sora text-indigo-950">Nueva sección</h2>
              <p className="text-xs text-slate-400 mt-1">Define horario, sala y fechas de semestre. Las clases se generarán automáticamente.</p>
            </div>

            <form onSubmit={handleCreateSeccion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Código asignatura</label>
                  <input required value={seccionForm.codigo_asignatura}
                    onChange={e => setSeccionForm(f => ({ ...f, codigo_asignatura: e.target.value.toUpperCase() }))}
                    className="input-field" placeholder="Ej: FCIU101" />
                </div>
                <div>
                  <label className="field-label">Subsección</label>
                  <input value={seccionForm.subseccion}
                    onChange={e => setSeccionForm(f => ({ ...f, subseccion: e.target.value }))}
                    className="input-field" placeholder="Ej: A, B, 01" />
                </div>
              </div>

              <div>
                <label className="field-label">Nombre de la asignatura</label>
                <input required value={seccionForm.nombre_asignatura}
                  onChange={e => setSeccionForm(f => ({ ...f, nombre_asignatura: e.target.value }))}
                  className="input-field" placeholder="Ej: Formación Ciudadana" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Día de la semana</label>
                  <select value={seccionForm.dia_semana}
                    onChange={e => setSeccionForm(f => ({ ...f, dia_semana: e.target.value as typeof DIAS_SEMANA[number] }))}
                    className="input-field">
                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{DIA_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Sala</label>
                  <input value={seccionForm.sala}
                    onChange={e => setSeccionForm(f => ({ ...f, sala: e.target.value }))}
                    className="input-field" placeholder="Ej: Sala 203" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Hora inicio</label>
                  <input type="time" required value={seccionForm.hora_inicio}
                    onChange={e => setSeccionForm(f => ({ ...f, hora_inicio: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="field-label">Hora fin</label>
                  <input type="time" required value={seccionForm.hora_fin}
                    onChange={e => setSeccionForm(f => ({ ...f, hora_fin: e.target.value }))}
                    className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Inicio semestre</label>
                  <input type="date" required value={seccionForm.fecha_inicio_semestre}
                    onChange={e => setSeccionForm(f => ({ ...f, fecha_inicio_semestre: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="field-label">Fin semestre</label>
                  <input type="date" required value={seccionForm.fecha_fin_semestre}
                    onChange={e => setSeccionForm(f => ({ ...f, fecha_fin_semestre: e.target.value }))}
                    className="input-field" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowSeccionModal(false)} className="btn-secondary flex-1 py-3 text-xs uppercase tracking-wider font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1 py-3 text-xs uppercase tracking-wider font-semibold">
                  Crear sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: nueva asignatura */}
      {showAsigModal && (
        <div className="modal-overlay">
          <div className="card p-8 w-full max-w-md bg-white border border-slate-100 shadow-2xl anim-scale-in relative">
            <button
              onClick={() => setShowAsigModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-extrabold font-sora text-indigo-950">Nueva asignatura</h2>
              <p className="text-xs text-slate-400 mt-1">Ingresa los datos para registrar la asignatura</p>
            </div>

            <form onSubmit={handleCreateAsignatura} className="space-y-5">
              <div>
                <label className="field-label">Nombre de la asignatura</label>
                <input required value={asigForm.nombre}
                  onChange={e => setAsigForm(f => ({ ...f, nombre: e.target.value }))}
                  className="input-field" placeholder="Ej: Cálculo I" />
              </div>

              <div>
                <label className="field-label">Código</label>
                <div className="flex gap-2">
                  <input required value={asigForm.codigo}
                    onChange={e => setAsigForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                    className="input-field" placeholder="Ej: MAT101" maxLength={10} />
                  <button type="button" onClick={generateCode} className="btn-secondary px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Dices className="h-4 w-4 text-indigo-600" /> Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="field-label">Descripción (opcional)</label>
                <textarea value={asigForm.descripcion}
                  onChange={e => setAsigForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input-field" placeholder="Breve descripción" rows={3} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowAsigModal(false)} className="btn-secondary flex-1 py-3 text-xs uppercase tracking-wider font-semibold">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingAsig} className="btn-primary flex-1 py-3 text-xs uppercase tracking-wider font-semibold"
                  style={{ opacity: loadingAsig ? 0.75 : 1 }}>
                  {loadingAsig ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
