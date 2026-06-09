'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Asignatura, Checkin, Usuario } from '@/lib/types'
import { DIMENSIONES } from '@/lib/types'
import { BookOpen, CheckCircle2, Smile, Meh, Frown, History, Search, Check, X } from 'lucide-react'
import DimensionIcon from '@/components/DimensionIcon'

interface CheckinWithSesion extends Checkin {
  sesiones: { asignaturas: { nombre: string } | null } | null
}

interface Props {
  usuario: Usuario
  inscripciones: Array<{ asignaturas: Asignatura | null }>
  checkins: CheckinWithSesion[]
}

export default function EstudianteDashboardClient({ usuario, inscripciones, checkins }: Props) {
  const supabase = createClient()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [codigoBuscar, setCodigoBuscar] = useState('')
  const [asignaturaEncontrada, setAsignaturaEncontrada] = useState<Asignatura | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [inscList, setInscList] = useState(inscripciones)
  const [activeTab, setActiveTab] = useState<'asignaturas' | 'historial'>('asignaturas')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchLoading(true)
    setAsignaturaEncontrada(null)

    const { data, error } = await supabase
      .from('asignaturas')
      .select('*')
      .eq('codigo', codigoBuscar.toUpperCase())
      .single()

    if (error || !data) {
      toast.error('No se encontró ninguna asignatura con ese código')
    } else {
      setAsignaturaEncontrada(data)
    }
    setSearchLoading(false)
  }

  async function handleJoin() {
    if (!asignaturaEncontrada) return
    setJoinLoading(true)

    const alreadyEnrolled = inscList.some(
      (i) => i.asignaturas?.id === asignaturaEncontrada.id
    )
    if (alreadyEnrolled) {
      toast('Ya estás inscrito/a en esta asignatura')
      setJoinLoading(false)
      return
    }

    const { error } = await supabase.from('inscripciones').insert({
      estudiante_id: usuario.id,
      asignatura_id: asignaturaEncontrada.id,
    })

    if (error) {
      toast.error('Error al inscribirse')
    } else {
      setInscList([...inscList, { asignaturas: asignaturaEncontrada }])
      setShowJoinModal(false)
      setCodigoBuscar('')
      setAsignaturaEncontrada(null)
      toast.success(`¡Inscrito/a en ${asignaturaEncontrada.nombre}!`)
    }
    setJoinLoading(false)
  }

  function renderMoodIcon(avg: number) {
    if (avg >= 4) return <Smile className="h-6 w-6 text-emerald-600" />
    if (avg >= 3) return <Meh className="h-6 w-6 text-amber-500" />
    return <Frown className="h-6 w-6 text-rose-500" />
  }

  function checkinAvg(c: Checkin) {
    return (c.energia + c.foco + c.animo + c.claridad + c.confianza + c.motivacion + c.memoria) / 7
  }

  const avgMood = checkins.length > 0 ? checkins.reduce((acc, c) => acc + checkinAvg(c), 0) / checkins.length : 0
  const MoodIcon = avgMood >= 4 ? Smile : avgMood >= 3 ? Meh : Frown

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 anim-fade-up">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-950 font-sora">
            Hola, {usuario.nombre.split(' ')[0]}
          </h1>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1.5">
            {usuario.carrera && `${usuario.carrera}${usuario.sede ? ` · ${usuario.sede}` : ''}`}
          </p>
        </div>
        <button onClick={() => setShowJoinModal(true)} className="btn-primary px-5 py-3 text-xs tracking-wider uppercase font-semibold">
          + Inscribir asignatura
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 anim-fade-up delay-1">
        {[
          { label: 'Asignaturas', value: inscList.length, icon: BookOpen, color: 'indigo' },
          { label: 'Check-ins', value: checkins.length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Mood promedio', value: checkins.length > 0 ? `${avgMood.toFixed(1)} / 5` : '—', icon: MoodIcon, color: 'cyan' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-5 flex items-center gap-4 bg-white border border-slate-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: s.color === 'indigo' ? '#EEF2FF' : s.color === 'emerald' ? '#ECFDF5' : '#ECFEFF',
                  color: s.color === 'indigo' ? '#4F46E5' : s.color === 'emerald' ? '#10B981' : '#06B6D4'
                }}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-indigo-950 font-sora">{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="tab-group mb-8 anim-fade-up delay-2">
        <button
          onClick={() => setActiveTab('asignaturas')}
          className={`tab-btn ${activeTab === 'asignaturas' ? 'active' : ''}`}
        >
          <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Mis asignaturas</span>
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
        >
          <span className="flex items-center gap-1.5"><History className="h-4 w-4" /> Historial</span>
        </button>
      </div>

      {/* Asignaturas */}
      {activeTab === 'asignaturas' && (
        <div className="anim-fade-up delay-3">
          {inscList.length === 0 ? (
            <div className="card p-16 text-center bg-white border border-slate-100 max-w-xl mx-auto shadow-sm flex flex-col items-center">
              <BookOpen className="h-12 w-12 text-indigo-600 mb-4" />
              <h2 className="text-base font-bold text-indigo-950 mb-2">Aún no tienes asignaturas inscritas</h2>
              <p className="text-slate-500 text-xs mb-6 leading-relaxed max-w-xs mx-auto">
                Ingresa el código que te dio tu docente para unirte y participar en los check-ins de clase
              </p>
              <button onClick={() => setShowJoinModal(true)} className="btn-primary px-6 py-2.5 text-xs tracking-wider uppercase font-semibold">
                + Unirse a asignatura
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {inscList.map((insc, i) => (
                <div key={i} className="card p-6 bg-white border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.08))', border: '1px solid rgba(79,70,229,0.12)' }}>
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-indigo-950 font-sora tracking-tight">{insc.asignaturas?.nombre}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Código de sección</p>
                    </div>
                  </div>
                  <span className="badge badge-blue">
                    {insc.asignaturas?.codigo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {activeTab === 'historial' && (
        <div className="anim-fade-up delay-3">
          {checkins.length === 0 ? (
            <div className="card p-16 text-center bg-white border border-slate-100 max-w-xl mx-auto shadow-sm flex flex-col items-center">
              <History className="h-12 w-12 text-indigo-600 mb-4" />
              <h2 className="text-base font-bold text-indigo-950 mb-2">Sin check-ins registrados</h2>
              <p className="text-slate-500 text-xs">Tus respuestas emocionales aparecerán aquí a lo largo del semestre</p>
            </div>
          ) : (
            <div className="space-y-6">
              {checkins.map((c) => {
                const avg = checkinAvg(c)
                return (
                  <div key={c.id} className="card p-6 bg-white border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
                      <div>
                        <div className="font-bold text-indigo-950 font-sora">{c.sesiones?.asignaturas?.nombre || 'Asignatura'}</div>
                        <div className="text-xs text-slate-400 mt-1 font-medium">
                          {new Date(c.created_at).toLocaleDateString('es-CL', { weekday: 'long', month: 'long', day: 'numeric' })}
                          {' · '}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            c.tipo === 'entrada' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {c.tipo}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl self-start sm:self-auto">
                        <div>{renderMoodIcon(avg)}</div>
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">Mood Promedio</div>
                          <div className="text-base font-extrabold text-indigo-950 mt-1 leading-none">{avg.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">/ 5</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dimension chips display */}
                    <div className="flex gap-2.5 flex-wrap">
                      {DIMENSIONES.map((dim) => (
                        <div key={dim.key} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium"
                          style={{
                            background: `${dim.color}0A`,
                            border: `1px solid ${dim.color}1E`,
                            color: dim.color
                          }}>
                          <DimensionIcon iconName={dim.icon} className="h-4 w-4" />
                          <span className="font-bold tracking-tight">{dim.label}:</span>
                          <span className="font-extrabold">{c[dim.key]}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Join modal */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="card p-8 w-full max-w-md bg-white border border-slate-100 shadow-2xl anim-scale-in relative">
            <button
              onClick={() => { setShowJoinModal(false); setAsignaturaEncontrada(null); setCodigoBuscar('') }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-extrabold font-sora text-indigo-950">Inscribir asignatura</h2>
              <p className="text-xs text-slate-400 mt-1">Busca e inscríbete usando el código proporcionado por el docente</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 mb-4">
              <div>
                <label className="field-label">
                  Código de la asignatura
                </label>
                <input
                  required
                  value={codigoBuscar}
                  onChange={(e) => setCodigoBuscar(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="Ej: MAT101"
                  maxLength={10}
                />
              </div>
              <button type="submit" disabled={searchLoading} className="btn-secondary w-full py-2.5 text-xs tracking-wider uppercase font-semibold flex items-center justify-center gap-1.5"
                style={{ opacity: searchLoading ? 0.75 : 1 }}>
                {searchLoading ? 'Buscando...' : <span className="flex items-center justify-center gap-1.5"><Search className="h-4 w-4" /> Buscar asignatura</span>}
              </button>
            </form>

            {asignaturaEncontrada && (
              <div className="p-5 rounded-2xl mb-4 bg-indigo-50/50 border border-indigo-100 anim-fade-in">
                <div className="font-extrabold text-indigo-950 font-sora text-sm">{asignaturaEncontrada.nombre}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Código de sección: <span className="font-bold text-slate-600">{asignaturaEncontrada.codigo}</span>
                </div>
                {asignaturaEncontrada.descripcion && (
                  <div className="text-xs text-slate-500 mt-2.5 leading-relaxed">{asignaturaEncontrada.descripcion}</div>
                )}
                
                <button
                  onClick={handleJoin}
                  disabled={joinLoading}
                  className="btn-primary w-full py-3 mt-4 text-xs tracking-wider uppercase font-semibold flex items-center justify-center gap-1.5"
                  style={{ opacity: joinLoading ? 0.75 : 1 }}
                >
                  {joinLoading ? 'Inscribiendo...' : <span className="flex items-center justify-center gap-1.5"><Check className="h-4 w-4" /> Confirmar Inscripción</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
