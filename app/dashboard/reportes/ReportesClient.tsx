'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  BarChart2, TrendingUp, Users, Calendar, Sparkles, HelpCircle,
  LogOut, Bell, Settings, ChevronDown, BookOpen, AlertTriangle,
  CheckCircle2, Clock, Brain, Lightbulb, Loader2, ChevronRight,
  BarChart as BarChartIcon, Radio, Layers
} from 'lucide-react'
import type { Usuario, Seccion } from '@/lib/types'
import { DIMENSIONES } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Sesion {
  id: string
  fecha: string
  tipo_actividad: string
  estado: string
  asignatura_id: string
  seccion_id?: string
  clase_numero?: number
  asignaturas?: { nombre: string; codigo: string }
}

interface MoodData {
  id: string
  tipo: 'entrada' | 'adicional' | 'salida'
  tipo_actividad?: string
  descripcion_actividad?: string
  orden: number
  created_at: string
  closed_at?: string
  checkins: {
    estudiante_id: string
    energia: number; foco: number; animo: number; claridad: number
    confianza: number; motivacion: number; memoria: number
    campo_abierto?: string
  }[]
}

interface ReporteIA {
  resumen: string
  recomendaciones: { titulo: string; descripcion: string; urgencia: string }[]
}

interface Props {
  usuario: Usuario
  secciones: Seccion[]
}

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DIM_KEYS = ['energia', 'foco', 'animo', 'claridad', 'confianza', 'motivacion', 'memoria'] as const
const DIM_COLORS: Record<string, string> = {
  energia: '#F59E0B', foco: '#3B82F6', animo: '#EC4899',
  claridad: '#10B981', confianza: '#8B5CF6', motivacion: '#84CC16', memoria: '#6366F1',
}

const MOOD_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']

const TABS = [
  { id: 'mood', label: 'Por Mood', icon: Radio },
  { id: 'resumen', label: 'Resumen de Clase', icon: Layers },
  { id: 'historico', label: 'Histórico', icon: TrendingUp },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAvg(checkins: MoodData['checkins'], key: string): number {
  if (!checkins.length) return 0
  return checkins.reduce((s, c) => s + ((c as unknown as Record<string, number>)[key] ?? 0), 0) / checkins.length
}

function calcMoodAvgs(checkins: MoodData['checkins']): Record<string, number> {
  return Object.fromEntries(DIM_KEYS.map(k => [k, calcAvg(checkins, k)]))
}

function overallAvg(avgs: Record<string, number>): number {
  return DIM_KEYS.reduce((s, k) => s + (avgs[k] ?? 0), 0) / 7
}

// ── Word Cloud (custom, no D3) ────────────────────────────────────────────────

const STOPWORDS = new Set([
  'que', 'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'me', 'mi', 'se',
  'con', 'un', 'una', 'es', 'por', 'para', 'del', 'al', 'pero', 'muy', 'más',
  'no', 'si', 'como', 'fue', 'lo', 'le', 'su', 'ya', 'hay', 'bien', 'todo',
  'cuando', 'también', 'porque', 'esta', 'este', 'ha', 'era', 'he', 'ser',
])

function buildWordCloud(texts: string[]): { word: string; count: number; color: string }[] {
  const freq: Record<string, number> = {}
  texts.forEach(text => {
    text.toLowerCase()
      .replace(/[^a-záéíóúüñ\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] ?? 0) + 1 })
  })

  const POSITIVE = ['bien', 'genial', 'bueno', 'excelente', 'tranquilo', 'motivado', 'entendí', 'claro', 'listo', 'contento', 'feliz', 'aprendí']
  const NEGATIVE = ['mal', 'cansado', 'difícil', 'confundido', 'perdido', 'estresado', 'agotado', 'nervioso', 'aburrido', 'nada', 'poco']

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([word, count]) => ({
      word,
      count,
      color: POSITIVE.some(p => word.includes(p)) ? '#10B981'
        : NEGATIVE.some(n => word.includes(n)) ? '#EF4444'
        : '#6366F1',
    }))
}

// ── Custom Tooltip para Radar ─────────────────────────────────────────────────

const RadarTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; color?: string }[] }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-4 py-3 text-xs">
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color ?? '#6366F1' }} />
          <span className="font-bold text-slate-700">{p.name}:</span>
          <span className="font-extrabold" style={{ color: p.color ?? '#6366F1' }}>{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Distribution Bar Data ─────────────────────────────────────────────────────

function buildDistributionData(checkins: MoodData['checkins'], dimKey: string) {
  const counts = [0, 0, 0, 0, 0]
  checkins.forEach(c => {
    const v = (c as unknown as Record<string, number>)[dimKey] ?? 0
    if (v >= 1 && v <= 5) counts[v - 1]++
  })
  return counts.map((count, i) => ({ label: String(i + 1), count }))
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReportesClient({ usuario, secciones }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [selectedSeccionId, setSelectedSeccionId] = useState<string>('')
  const [sesionesClase, setSesionesClase] = useState<Sesion[]>([])
  const [loadingSesiones, setLoadingSesiones] = useState(false)
  const [selectedSesionId, setSelectedSesionId] = useState<string>('')
  const [tab, setTab] = useState<'mood' | 'resumen' | 'historico'>('mood')
  const [moodsData, setMoodsData] = useState<MoodData[]>([])
  const [totalInscritos, setTotalInscritos] = useState(0)
  const [loadingData, setLoadingData] = useState(false)
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null)
  const [reporteIA, setReporteIA] = useState<ReporteIA | null>(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [historicoData, setHistoricoData] = useState<{ fecha: string; avg: number; sesion_id: string }[]>([])

  const selectedSesion = sesionesClase.find(s => s.id === selectedSesionId)

  // ── Load clases (sesiones con datos) for selected curso ──────────────────

  const loadSesionesClase = useCallback(async (seccionId: string) => {
    setLoadingSesiones(true)
    setSesionesClase([])
    setSelectedSesionId('')
    setMoodsData([])
    setSelectedMoodId(null)
    setReporteIA(null)

    try {
      const { data: sesionesRaw } = await supabase
        .from('sesiones')
        .select('*, asignaturas(nombre, codigo)')
        .eq('seccion_id', seccionId)
        .order('fecha', { ascending: false })

      if (!sesionesRaw?.length) return

      const sesionIds = sesionesRaw.map(s => s.id)
      const { data: moods } = await supabase
        .from('moods')
        .select('id, sesion_id')
        .in('sesion_id', sesionIds)

      const moodIds = (moods ?? []).map(m => m.id)
      let sesionIdsConDatos = new Set<string>()

      if (moodIds.length) {
        const { data: checkins } = await supabase
          .from('mood_checkins')
          .select('mood_id')
          .in('mood_id', moodIds)

        const moodIdsConRespuestas = new Set((checkins ?? []).map(c => c.mood_id))
        sesionIdsConDatos = new Set(
          (moods ?? [])
            .filter(m => moodIdsConRespuestas.has(m.id))
            .map(m => m.sesion_id)
        )
      }

      setSesionesClase(sesionesRaw.filter(s => sesionIdsConDatos.has(s.id)))
    } finally {
      setLoadingSesiones(false)
    }
  }, [supabase])

  useEffect(() => {
    if (selectedSeccionId) loadSesionesClase(selectedSeccionId)
  }, [selectedSeccionId, loadSesionesClase])

  // ── Load mood data for selected session ──────────────────────────────────

  const loadSesionData = useCallback(async (sesionId: string) => {
    if (!sesionId) return
    setLoadingData(true)
    setReporteIA(null)
    setSelectedMoodId(null)

    try {
      // Load moods
      const { data: moods } = await supabase
        .from('moods')
        .select('*')
        .eq('sesion_id', sesionId)
        .order('orden', { ascending: true })

      if (!moods?.length) { setMoodsData([]); return }

      // Load checkins for all moods at once
      const moodIds = moods.map(m => m.id)
      const { data: checkins } = await supabase
        .from('mood_checkins')
        .select('*')
        .in('mood_id', moodIds)

      const moodMap: Record<string, MoodData['checkins']> = {}
      moodIds.forEach(id => { moodMap[id] = [] })
      checkins?.forEach(c => {
        if (moodMap[c.mood_id]) moodMap[c.mood_id].push(c)
      })

      const enriched: MoodData[] = moods.map(m => ({
        ...m,
        checkins: moodMap[m.id] ?? [],
      }))

      setMoodsData(enriched)

      const moodsConDatos = enriched.filter(m => m.estado === 'cerrado' || m.checkins.length > 0)
      setSelectedMoodId(moodsConDatos[0]?.id ?? enriched[0]?.id ?? null)

      // Load total inscritos
      const sesion = sesionesClase.find(s => s.id === sesionId)
      if (sesion?.asignatura_id) {
        const { count } = await supabase
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('asignatura_id', sesion.asignatura_id)
        setTotalInscritos(count ?? 0)
      }
    } finally {
      setLoadingData(false)
    }
  }, [sesionesClase, supabase])

  useEffect(() => {
    if (selectedSesionId) loadSesionData(selectedSesionId)
  }, [selectedSesionId, loadSesionData])

  // ── Load historico ────────────────────────────────────────────────────────

  const loadHistorico = useCallback(async () => {
    if (!selectedSesion?.asignatura_id) return
    const { data: allSesiones } = await supabase
      .from('sesiones')
      .select('id, fecha, asignatura_id')
      .eq('asignatura_id', selectedSesion.asignatura_id)
      .order('fecha', { ascending: true })
      .limit(20)

    if (!allSesiones?.length) return

    const results: { fecha: string; avg: number; sesion_id: string }[] = []

    for (const ses of allSesiones) {
      const { data: moods } = await supabase.from('moods').select('id').eq('sesion_id', ses.id)
      const moodIds = (moods ?? []).map((m: { id: string }) => m.id)
      if (!moodIds.length) { results.push({ fecha: ses.fecha, avg: 0, sesion_id: ses.id }); continue }

      const { data: cks } = await supabase.from('mood_checkins').select('energia,foco,animo,claridad,confianza,motivacion,memoria').in('mood_id', moodIds)
      if (!cks?.length) { results.push({ fecha: ses.fecha, avg: 0, sesion_id: ses.id }); continue }

      const avg = DIM_KEYS.reduce((sum, k) => sum + cks.reduce((s: number, c: Record<string, number>) => s + (c[k] ?? 0), 0) / cks.length, 0) / 7
      results.push({ fecha: ses.fecha, avg: parseFloat(avg.toFixed(2)), sesion_id: ses.id })
    }

    setHistoricoData(results)
  }, [selectedSesion?.asignatura_id, supabase])

  useEffect(() => {
    if (tab === 'historico') loadHistorico()
  }, [tab, loadHistorico])

  // ── Generate IA report ────────────────────────────────────────────────────

  async function handleGenerarReporte() {
    if (!moodsData.length) return
    setLoadingIA(true)
    try {
      const allCheckins = moodsData.flatMap(m => m.checkins)
      const promedios = calcMoodAvgs(allCheckins)
      const campos = allCheckins.map(c => c.campo_abierto).filter(Boolean) as string[]

      const res = await fetch('/api/generar-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promedios,
          campos_abiertos: campos,
          tipo_actividad: selectedSesion?.tipo_actividad ?? 'Clase',
          respondieron: allCheckins.length,
          total_alumnos: totalInscritos,
          nombre_asignatura: selectedSesion?.asignaturas?.nombre,
        }),
      })

      const data = await res.json()
      setReporteIA(data)
    } finally {
      setLoadingIA(false)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const selectedMood = moodsData.find(m => m.id === selectedMoodId) ?? null
  const moodsConDatos = moodsData.filter(m => m.estado === 'cerrado' || m.checkins.length > 0)
  const allCheckins = moodsData.flatMap(m => m.checkins)
  const globalAvgs = calcMoodAvgs(allCheckins)

  // Radar data: one entry per dimension, with a value per mood
  const radarData = DIMENSIONES.map(dim => {
    const entry: Record<string, number | string> = { dim: dim.label }
    moodsData.forEach(m => {
      entry[`mood_${m.id}`] = parseFloat(calcAvg(m.checkins, dim.key).toFixed(2))
    })
    return entry
  })

  // Word cloud
  const wordCloud = buildWordCloud(allCheckins.map(c => c.campo_abierto ?? '').filter(Boolean))

  // Alerts
  const allStudentCheckins: Record<string, { avgs: Record<string, number>; campos: string[] }> = {}
  allCheckins.forEach(c => {
    if (!allStudentCheckins[c.estudiante_id]) allStudentCheckins[c.estudiante_id] = { avgs: {}, campos: [] }
    DIM_KEYS.forEach(k => {
      allStudentCheckins[c.estudiante_id].avgs[k] = (allStudentCheckins[c.estudiante_id].avgs[k] ?? 0) + ((c as unknown as Record<string, number>)[k] ?? 0)
    })
    if (c.campo_abierto) allStudentCheckins[c.estudiante_id].campos.push(c.campo_abierto)
  })

  const alertasRojas = Object.entries(allStudentCheckins).filter(([, d]) => {
    const dims = DIM_KEYS.filter(k => (d.avgs[k] / (allCheckins.filter(c => c.estudiante_id === Object.keys(allStudentCheckins)[0]).length || 1)) < 2.5)
    return dims.length >= 2
  }).length

  const noParticiparon = totalInscritos - Object.keys(allStudentCheckins).length

  // Distribution data for selected mood
  const distData = selectedMood ? DIMENSIONES.map(dim => ({
    dim: dim.label,
    color: dim.color,
    data: buildDistributionData(selectedMood.checkins, dim.key),
  })) : []

  const moodLabel: Record<string, string> = { entrada: 'Entrada', adicional: 'Adicional', salida: 'Ticket de Salida' }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-[#F8F9FF] font-sans">

      {/* Sidebar */}
      <aside className="w-[60px] bg-[#1A1A2E] flex flex-col items-center py-6 justify-between shrink-0 sticky top-0 h-screen z-40">
        <div className="flex flex-col gap-6 items-center w-full">
          <div className="text-indigo-400 mb-2"><Sparkles className="h-6 w-6" /></div>
          <Link href="/dashboard/docente" title="Dashboard" className="text-slate-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-950/50 transition-colors">
            <BarChartIcon className="h-5 w-5" />
          </Link>
          <button title="Estudiantes" className="text-slate-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-950/50 transition-colors"><Users className="h-5 w-5" /></button>
          <button title="Clases" className="text-slate-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-950/50 transition-colors"><Calendar className="h-5 w-5" /></button>
          <button title="Reportes" className="text-indigo-400 bg-indigo-950/60 p-2 rounded-xl transition-colors"><TrendingUp className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-6 items-center w-full">
          <button title="Ayuda" className="text-slate-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-950/50 transition-colors"><HelpCircle className="h-5 w-5" /></button>
          <button title="Cerrar sesión" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-red-950/20 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-100 shadow-sm px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-indigo-950 font-sora">Mood<span className="text-indigo-600">Class</span></span>
            <span className="text-slate-300 mx-1">·</span>
            <span className="text-xs font-semibold text-slate-500">Reportes</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors relative">
              <Bell className="h-5 w-5" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>
            <button className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors"><Settings className="h-5 w-5" /></button>
            <div className="h-8 w-px bg-slate-100" />
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm uppercase">
                {usuario.nombre.charAt(0)}
              </div>
              <span className="hidden sm:inline-block max-w-[150px] truncate">{usuario.nombre}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6 anim-fade-up">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Análisis
              </div>
              <h1 className="text-2xl font-extrabold text-indigo-950 font-sora">Reportes de Clase</h1>
              <p className="text-slate-500 text-xs mt-1">Visualiza el estado socioemocional de tus estudiantes por sesión y dimensión</p>
            </div>
          </div>

          {/* Cascading selectors: Curso → Clase → Mood */}
          <div className="card p-5 bg-white border border-slate-100 shadow-sm rounded-2xl mb-6 anim-fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Curso */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <BookOpen className="h-4 w-4" /> Curso
                </label>
                <div className="relative">
                  <select
                    value={selectedSeccionId}
                    onChange={e => setSelectedSeccionId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-9"
                  >
                    <option value="">Selecciona un curso</option>
                    {secciones.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre_asignatura}
                        {s.subseccion ? ` — ${s.subseccion}` : ''}
                        {' '}({DIAS_LABEL[s.dia_semana] ?? s.dia_semana} {s.hora_inicio?.slice(0, 5)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Clase */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <Calendar className="h-4 w-4" /> Clase
                </label>
                <div className="relative">
                  <select
                    value={selectedSesionId}
                    onChange={e => setSelectedSesionId(e.target.value)}
                    disabled={!selectedSeccionId || loadingSesiones}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!selectedSeccionId && <option value="">Primero elige un curso</option>}
                    {selectedSeccionId && loadingSesiones && <option value="">Cargando clases...</option>}
                    {selectedSeccionId && !loadingSesiones && (
                      <>
                        <option value="">
                          {sesionesClase.length === 0 ? 'Sin clases con datos' : 'Selecciona una clase'}
                        </option>
                        {sesionesClase.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.clase_numero ? `Clase ${s.clase_numero}` : 'Clase'} — {s.fecha} {s.tipo_actividad ? `(${s.tipo_actividad})` : ''}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <Radio className="h-4 w-4" /> Mood
                </label>
                <div className="relative">
                  <select
                    value={selectedMoodId ?? ''}
                    onChange={e => setSelectedMoodId(e.target.value || null)}
                    disabled={!selectedSesionId || loadingData || moodsConDatos.length === 0}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!selectedSesionId && <option value="">Primero elige una clase</option>}
                    {selectedSesionId && loadingData && <option value="">Cargando moods...</option>}
                    {selectedSesionId && !loadingData && moodsConDatos.length === 0 && <option value="">Sin moods con datos</option>}
                    {selectedSesionId && !loadingData && moodsConDatos.map(m => (
                      <option key={m.id} value={m.id}>
                        {moodLabel[m.tipo] ?? m.tipo} #{m.orden} ({m.checkins.length} resp.)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quick stats */}
            {allCheckins.length > 0 && (
              <div className="flex gap-4 text-xs font-bold mt-4 pt-4 border-t border-slate-100">
                <span className="text-emerald-600">{allCheckins.length}<span className="text-slate-400 font-normal"> resp.</span></span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600">{totalInscritos}<span className="text-slate-400 font-normal"> inscritos</span></span>
                <span className="text-indigo-600">{moodsData.length}<span className="text-slate-400 font-normal"> moods</span></span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100/80 rounded-xl p-1 mb-6 w-fit">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as typeof tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    tab === t.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />{t.label}
                </button>
              )
            })}
          </div>

          {/* Loading */}
          {loadingData && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loadingData && selectedSesionId && moodsData.length === 0 && (
            <div className="card p-12 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center">
              <BarChart2 className="h-12 w-12 text-slate-200 mb-4" />
              <h3 className="font-bold text-indigo-950 font-sora text-lg mb-2">Sin datos para esta sesión</h3>
              <p className="text-slate-400 text-sm max-w-sm">No hay moods registrados o los estudiantes aún no han respondido. Inicia una sesión en vivo para capturar datos.</p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* TAB: POR MOOD                                  */}
          {/* ═══════════════════════════════════════════════ */}
          {!loadingData && tab === 'mood' && moodsData.length > 0 && (
            <div className="space-y-6 anim-fade-up">
              {selectedMood && (
                <>
                  {/* ── RADAR CHART ── */}
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3 card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      <h3 className="font-extrabold text-indigo-950 font-sora mb-1 text-base flex items-center gap-2">
                        <Radio className="h-5 w-5 text-indigo-600" />
                        Radar Emocional
                        {moodsData.length > 1 && <span className="text-xs font-normal text-slate-400 ml-1">— comparación entre moods</span>}
                      </h3>
                      <p className="text-[11px] text-slate-400 mb-4">Valores promedio de 1 a 5 por dimensión</p>
                      <ResponsiveContainer width="100%" height={340}>
                        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                          <defs>
                            {moodsData.map((m, i) => (
                              <radialGradient key={m.id} id={`grad_${i}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor={MOOD_COLORS[i % MOOD_COLORS.length]} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={MOOD_COLORS[i % MOOD_COLORS.length]} stopOpacity={0.05} />
                              </radialGradient>
                            ))}
                          </defs>
                          <PolarGrid stroke="#E2E8F0" />
                          <PolarAngleAxis
                            dataKey="dim"
                            tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 5]}
                            tick={{ fontSize: 9, fill: '#94A3B8' }}
                            tickCount={6}
                          />
                          {moodsData.map((m, i) => (
                            <Radar
                              key={m.id}
                              name={`${moodLabel[m.tipo] ?? m.tipo} #${m.orden}`}
                              dataKey={`mood_${m.id}`}
                              stroke={MOOD_COLORS[i % MOOD_COLORS.length]}
                              fill={MOOD_COLORS[i % MOOD_COLORS.length]}
                              fillOpacity={0.18}
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: MOOD_COLORS[i % MOOD_COLORS.length], strokeWidth: 2, stroke: '#fff' }}
                            />
                          ))}
                          <Tooltip content={(props) => <RadarTooltip {...(props as unknown as Parameters<typeof RadarTooltip>[0])} />} />
                          {moodsData.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />}
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Dimension scores list */}
                    <div className="xl:col-span-2 card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      <h3 className="font-extrabold text-indigo-950 font-sora mb-4 text-base">Scores por Dimensión</h3>
                      <div className="space-y-3.5">
                        {DIMENSIONES.map(dim => {
                          const val = calcAvg(selectedMood.checkins, dim.key)
                          return (
                            <div key={dim.key}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                  <span>{dim.icon}</span>{dim.label}
                                </span>
                                <span className="text-sm font-extrabold" style={{ color: val < 2.5 ? '#EF4444' : val < 3.5 ? '#F59E0B' : '#10B981' }}>
                                  {val.toFixed(1)}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${(val / 5) * 100}%`, backgroundColor: dim.color }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">Promedio General</span>
                          <span className="text-xl font-extrabold font-sora" style={{
                            color: overallAvg(calcMoodAvgs(selectedMood.checkins)) < 2.5 ? '#EF4444'
                              : overallAvg(calcMoodAvgs(selectedMood.checkins)) < 3.5 ? '#F59E0B' : '#10B981'
                          }}>
                            {overallAvg(calcMoodAvgs(selectedMood.checkins)).toFixed(1)}<span className="text-xs text-slate-400 font-normal">/5</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── DISTRIBUTION BARS ── */}
                  <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <h3 className="font-extrabold text-indigo-950 font-sora mb-1 text-base flex items-center gap-2">
                      <BarChartIcon className="h-5 w-5 text-indigo-600" /> Distribución de Respuestas
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-5">Cuántos alumnos respondieron cada valor (1–5) por dimensión</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                      {distData.map(({ dim, color, data }) => (
                        <div key={dim}>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2 text-center" style={{ color }}>{dim}</p>
                          <ResponsiveContainer width="100%" height={100}>
                            <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barSize={14}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} allowDecimals={false} />
                              <Tooltip
                                cursor={{ fill: '#F8FAFF' }}
                                content={({ active, payload, label }) =>
                                  active && payload?.length ? (
                                    <div className="text-xs bg-white border border-slate-100 shadow-sm rounded-lg px-2 py-1">
                                      <span className="font-bold" style={{ color }}>{label} pts:</span>{' '}
                                      <span className="font-extrabold">{payload[0].value} alumnos</span>
                                    </div>
                                  ) : null
                                }
                              />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {data.map((_, i) => (
                                  <Cell key={i} fill={color} fillOpacity={0.3 + i * 0.15} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── ALERTS + WORD CLOUD ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Alertas */}
                    <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      <h3 className="font-extrabold text-indigo-950 font-sora mb-4 text-base flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-rose-500" /> Alertas de Atención
                      </h3>
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${alertasRojas > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${alertasRojas > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                            <AlertTriangle className={`h-4 w-4 ${alertasRojas > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-700">{alertasRojas} alumno{alertasRojas !== 1 ? 's' : ''} con 2+ dimensiones bajo 2.5</p>
                            <p className="text-[10px] text-slate-400">Requieren atención emocional inmediata</p>
                          </div>
                          {alertasRojas > 0 && (
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">{alertasRojas}</span>
                          )}
                        </div>

                        <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${noParticiparon > 0 ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-700">{noParticiparon} no participaron</p>
                            <p className="text-[10px] text-slate-400">No respondieron ningún mood de esta sesión</p>
                          </div>
                          {noParticiparon > 0 && (
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-extrabold">{noParticiparon}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-emerald-50 border-emerald-100">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-700">{selectedMood.checkins.length} respondieron este mood</p>
                            <p className="text-[10px] text-slate-400">
                              {totalInscritos > 0 ? `${Math.round((selectedMood.checkins.length / totalInscritos) * 100)}% de participación` : 'Sin datos de inscripción'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Word Cloud */}
                    <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      <h3 className="font-extrabold text-indigo-950 font-sora mb-1 text-base">Nube de Palabras</h3>
                      <p className="text-[11px] text-slate-400 mb-4">Desde el campo abierto — colores según sentimiento</p>
                      {wordCloud.length > 0 ? (
                        <div className="flex flex-wrap gap-2 items-center justify-center min-h-[160px] py-4">
                          {wordCloud.map(({ word, count, color }) => {
                            const maxCount = wordCloud[0].count
                            const size = 10 + (count / maxCount) * 20
                            return (
                              <span
                                key={word}
                                className="font-bold rounded-full px-2 py-0.5 transition-all hover:scale-110 cursor-default"
                                style={{
                                  fontSize: `${size}px`,
                                  color,
                                  backgroundColor: `${color}12`,
                                }}
                                title={`${word}: ${count} veces`}
                              >
                                {word}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center min-h-[160px] text-slate-300">
                          <p className="text-sm">Sin comentarios abiertos en este mood</p>
                        </div>
                      )}
                      <div className="flex gap-3 mt-3 justify-center">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Positivo</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Neutro</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Negativo</span>
                      </div>
                    </div>
                  </div>

                  {/* ── IA REPORT ── */}
                  <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-extrabold text-indigo-950 font-sora text-base flex items-center gap-2">
                        <Brain className="h-5 w-5 text-indigo-600" /> Análisis con IA
                        <span className="text-[10px] font-normal text-slate-400 ml-1">claude-sonnet-4-5</span>
                      </h3>
                      <button
                        onClick={handleGenerarReporte}
                        disabled={loadingIA}
                        className="btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 12px rgba(79,70,229,0.2)' }}
                      >
                        {loadingIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {loadingIA ? 'Analizando...' : reporteIA ? 'Regenerar' : 'Generar análisis'}
                      </button>
                    </div>

                    {reporteIA ? (
                      <div className="space-y-5">
                        {/* Resumen */}
                        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
                          <p className="text-sm text-indigo-900 leading-relaxed font-medium">{reporteIA.resumen}</p>
                        </div>

                        {/* Recomendaciones */}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">3 Recomendaciones Pedagógicas</p>
                          <div className="space-y-3">
                            {reporteIA.recomendaciones?.map((r, i) => {
                              const urgColor = r.urgencia === 'alta' ? { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badge: 'Alta' }
                                : r.urgencia === 'media' ? { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', badge: 'Media' }
                                : { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', badge: 'Baja' }
                              return (
                                <div key={i} className="flex gap-3 p-4 rounded-xl border"
                                  style={{ backgroundColor: urgColor.bg, borderColor: urgColor.border }}>
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0 mt-0.5"
                                    style={{ backgroundColor: urgColor.text }}>{i + 1}</div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-xs font-extrabold text-slate-800">{r.titulo}</p>
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                        style={{ color: urgColor.text, backgroundColor: `${urgColor.border}` }}>
                                        {urgColor.badge}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">{r.descripcion}</p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Lightbulb className="h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Genera un análisis automático con IA</p>
                        <p className="text-xs text-slate-300 mt-1 max-w-xs">Claude analizará los promedios y comentarios para darte recomendaciones pedagógicas personalizadas</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* TAB: RESUMEN DE CLASE                          */}
          {/* ═══════════════════════════════════════════════ */}
          {!loadingData && tab === 'resumen' && moodsData.length > 0 && (
            <div className="space-y-6 anim-fade-up">

              {/* Metric cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Moods registrados', value: moodsData.length, color: '#6366F1', icon: Radio },
                  { label: 'Total respuestas', value: allCheckins.length, color: '#10B981', icon: CheckCircle2 },
                  { label: 'Sin participar', value: noParticiparon, color: '#94A3B8', icon: Clock },
                  { label: 'Promedio general', value: `${overallAvg(globalAvgs).toFixed(1)}/5`, color: overallAvg(globalAvgs) >= 3.5 ? '#10B981' : overallAvg(globalAvgs) >= 2.5 ? '#F59E0B' : '#EF4444', icon: TrendingUp },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="card p-5 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <Icon className="h-5 w-5 mb-3" style={{ color }} />
                    <div className="text-2xl font-extrabold font-sora" style={{ color }}>{value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Consolidated radar */}
              <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="font-extrabold text-indigo-950 font-sora mb-1 text-base">Radar Consolidado de la Clase</h3>
                <p className="text-[11px] text-slate-400 mb-4">Promedio de todos los moods y todos los alumnos</p>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={DIMENSIONES.map(d => ({
                    dim: d.label,
                    valor: parseFloat(calcAvg(allCheckins, d.key).toFixed(2)),
                  }))} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: '#94A3B8' }} tickCount={6} />
                    <Radar name="Clase" dataKey="valor" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={2.5}
                      dot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} />
                    <Tooltip content={(props) => <RadarTooltip {...(props as unknown as Parameters<typeof RadarTooltip>[0])} />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Comparison entrada vs salida */}
              {moodsData.some(m => m.tipo === 'entrada') && moodsData.some(m => m.tipo === 'salida') && (() => {
                const entrada = moodsData.find(m => m.tipo === 'entrada')!
                const salida = moodsData.find(m => m.tipo === 'salida')!
                const compData = DIMENSIONES.map(d => ({
                  dim: d.label.slice(0, 4),
                  entrada: parseFloat(calcAvg(entrada.checkins, d.key).toFixed(2)),
                  salida: parseFloat(calcAvg(salida.checkins, d.key).toFixed(2)),
                  color: d.color,
                }))
                return (
                  <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <h3 className="font-extrabold text-indigo-950 font-sora mb-4 text-base">Entrada vs Salida</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={compData} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="dim" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickCount={6} />
                        <Tooltip
                          content={({ active, payload, label }) =>
                            active && payload?.length ? (
                              <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-3 py-2 text-xs">
                                <p className="font-bold mb-1">{label}</p>
                                {payload.map((p, i) => (
                                  <p key={i} style={{ color: p.color }} className="font-bold">
                                    {p.name}: {Number(p.value).toFixed(1)}
                                  </p>
                                ))}
                              </div>
                            ) : null
                          }
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <Bar dataKey="entrada" name="Entrada" fill="#6366F1" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                        <Bar dataKey="salida" name="Salida" fill="#10B981" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* TAB: HISTÓRICO                                 */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'historico' && (
            <div className="space-y-6 anim-fade-up">
              {historicoData.length > 0 ? (
                <div className="card p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                  <h3 className="font-extrabold text-indigo-950 font-sora mb-1 text-base">Evolución del Mood — {selectedSesion?.asignaturas?.nombre}</h3>
                  <p className="text-[11px] text-slate-400 mb-5">Promedio general de bienestar por clase a lo largo del semestre</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={historicoData.map(d => ({ ...d, fecha: d.fecha.slice(5) }))} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickCount={6} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-3 py-2 text-xs">
                              <p className="font-bold mb-1">Clase {label}</p>
                              <p className="font-extrabold text-indigo-600">Mood: {Number(payload[0].value).toFixed(2)}/5</p>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="avg" name="Mood Promedio" radius={[6, 6, 0, 0]}>
                        {historicoData.map((entry, i) => (
                          <Cell key={i} fill={entry.avg >= 3.5 ? '#10B981' : entry.avg >= 2.5 ? '#F59E0B' : '#EF4444'} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 justify-center">
                    {[['#10B981', 'Bien (≥3.5)'], ['#F59E0B', 'Regular (2.5–3.5)'], ['#EF4444', 'Bajo (<2.5)']].map(([c, l]) => (
                      <span key={l} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card p-10 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center">
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                  <p className="text-slate-400 text-sm">Cargando historial de la asignatura...</p>
                </div>
              )}
            </div>
          )}

        </div>{/* /content */}
      </div>{/* /main */}
    </div>
  )
}
