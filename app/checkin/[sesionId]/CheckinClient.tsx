'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { DIMENSIONES } from '@/lib/types'
import type { Sesion, Mood, MoodCheckin } from '@/lib/types'
import DimensionCard from '@/components/DimensionCard'
import { Sparkles, Lock, CheckCircle2, ArrowRight } from 'lucide-react'
import DimensionIcon from '@/components/DimensionIcon'

interface Props {
  sesion: Sesion
  mood: Mood
}

type DimensionValues = {
  energia: number
  foco: number
  animo: number
  claridad: number
  confianza: number
  motivacion: number
  memoria: number
}

const DEFAULT_VALUES: DimensionValues = {
  energia: 0, foco: 0, animo: 0, claridad: 0, confianza: 0, motivacion: 0, memoria: 0,
}

export default function CheckinClient({ sesion, mood }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [primerNombre, setPrimerNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [values, setValues] = useState<DimensionValues>(DEFAULT_VALUES)
  const [campoAbierto, setCampoAbierto] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [existingEntrada, setExistingEntrada] = useState<MoodCheckin | null>(null)
  const [tipo] = useState<'entrada' | 'adicional' | 'salida'>(mood.tipo)

  const isClosed = mood.estado === 'cerrado' || sesion.estado_clase === 'cerrada'

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.push(`/login?redirectTo=/checkin/${mood.id}`)
        return
      }
      setUser(u)

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', u.id)
        .single()

      if (perfil?.nombre) {
        setPrimerNombre(perfil.nombre.trim().split(/\s+/)[0])
      }

      // 1. Check if student already submitted a response for this specific mood
      const { data: currentCheckin } = await supabase
        .from('mood_checkins')
        .select('*')
        .eq('mood_id', mood.id)
        .eq('estudiante_id', u.id)
        .maybeSingle()

      if (currentCheckin) {
        setValues({
          energia: currentCheckin.energia,
          foco: currentCheckin.foco,
          animo: currentCheckin.animo,
          claridad: currentCheckin.claridad,
          confianza: currentCheckin.confianza,
          motivacion: currentCheckin.motivacion,
          memoria: currentCheckin.memoria,
        })
        setSubmitted(true)
      }

      // 2. If it is a salida check-in, load the corresponding entrance check-in for comparison
      if (mood.tipo === 'salida') {
        const { data: moodsInSesion } = await supabase
          .from('moods')
          .select('*')
          .eq('sesion_id', mood.sesion_id)

        const entranceMood = moodsInSesion?.find((m) => m.tipo === 'entrada')
        if (entranceMood) {
          const { data: entChk } = await supabase
            .from('mood_checkins')
            .select('*')
            .eq('mood_id', entranceMood.id)
            .eq('estudiante_id', u.id)
            .maybeSingle()
          if (entChk) setExistingEntrada(entChk)
        }
      }

      setLoading(false)
    }
    init()
  }, [mood, supabase.auth, router])

  function setValue(key: keyof DimensionValues, val: number) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function allFilled() {
    return Object.values(values).every((v) => v > 0)
  }

  async function handleSubmit() {
    if (!user) return
    if (!allFilled()) {
      toast.error('Por favor selecciona un valor en cada dimensión')
      return
    }
    setSubmitting(true)

    // Insert response into mood_checkins
    const { error: checkinErr } = await supabase.from('mood_checkins').insert({
      mood_id: mood.id,
      estudiante_id: user.id,
      ...values,
      campo_abierto: campoAbierto.trim() || null,
    })

    if (checkinErr) {
      toast.error('Error al enviar: ' + checkinErr.message)
      setSubmitting(false)
      return
    }

    // Upsert into attendance table to mark student present in the session
    await supabase.from('asistencia').upsert({
      sesion_id: sesion.id,
      estudiante_id: user.id,
      presente: true,
    }, { onConflict: 'sesion_id,estudiante_id' })

    toast.success('¡Check-in enviado!')
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FF] font-sans">
        <div className="text-center anim-fade-in">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-12 w-12 text-indigo-600 animate-pulse" />
          </div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest font-sora">Cargando check-in...</div>
        </div>
      </div>
    )
  }

  if (isClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FF] p-6 font-sans">
        <div className="card p-10 text-center max-w-md bg-white border border-slate-100 shadow-xl anim-scale-in">
          <div className="flex justify-center mb-4 text-indigo-950">
            <Lock className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-extrabold text-indigo-950 font-sora mb-2">Sesión cerrada</h2>
          <p className="text-slate-500 text-xs leading-relaxed">Esta sesión de clases ya no acepta más respuestas de check-in.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    const entradaData = tipo === 'salida' ? existingEntrada : { ...values }

    return (
      <div className="checkin-page p-6 pb-20 font-sans">
        <div className="max-w-md mx-auto anim-fade-up">
          {/* Header */}
          <div className="text-center mb-8 pt-8">
            <div className="flex justify-center mb-4 text-indigo-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-extrabold font-sora text-indigo-950 mb-1">¡Excelente trabajo!</h1>
            <p className="text-slate-500 text-sm">
              {tipo === 'salida' ? 'Tu ticket de salida ha sido guardado' : 'Tu check-in de entrada ha sido guardado'}
            </p>
          </div>

          {/* Resumen */}
          {tipo === 'salida' && entradaData ? (
            <div>
              <h2 className="text-center font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">
                Comparativa: Entrada vs Salida
              </h2>
              {DIMENSIONES.map((dim) => {
                const entVal = (entradaData as Record<string, number>)[dim.key] || 0
                const salVal = (values as Record<string, number>)[dim.key] || 0
                const diff = salVal - entVal
                return (
                  <div key={dim.key} className="card p-5 mb-4 bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                        <span style={{ color: dim.color }}>
                          <DimensionIcon iconName={dim.icon} size={16} />
                        </span>
                        <span>{dim.label}</span>
                      </span>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                        diff > 0
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : diff < 0
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                      }`}>
                        {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '='}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Entrada</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((g) => (
                            <div key={g} className="w-full h-3 rounded-md"
                              style={{
                                backgroundColor: g <= entVal ? dim.color : 'rgba(0,0,0,0.04)',
                                opacity: g <= entVal ? 0.95 : 1
                              }} />
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 self-center shrink-0" />
                      <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Salida</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((g) => (
                            <div key={g} className="w-full h-3 rounded-md"
                              style={{
                                backgroundColor: g <= salVal ? dim.color : 'rgba(0,0,0,0.04)',
                                opacity: g <= salVal ? 0.95 : 1
                              }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <h2 className="text-center font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">
                Tu estado actual
              </h2>
              <div className="space-y-4">
                {DIMENSIONES.map((dim) => {
                  const val = (values as Record<string, number>)[dim.key] || 0
                  return (
                    <div key={dim.key} className="card p-5 flex items-center justify-between bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span style={{ color: dim.color }}>
                          <DimensionIcon iconName={dim.icon} size={20} />
                        </span>
                        <span className="font-bold text-indigo-950 text-sm font-sora">{dim.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((g) => (
                            <div key={g} className="w-5 h-5 rounded-md"
                              style={{
                                backgroundColor: g <= val ? dim.color : 'rgba(0,0,0,0.04)',
                                filter: g <= val ? `drop-shadow(0 0 4px ${dim.glowColor})` : 'none'
                              }} />
                          ))}
                        </div>
                        <span className="text-xs font-extrabold font-sora px-2.5 py-0.5 rounded-full" style={{ color: dim.color, backgroundColor: `${dim.color}12` }}>
                          {val}/5
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const questions = DIMENSIONES.map((d) => {
    if (mood.preguntas && (mood.preguntas as unknown as Record<string, string>)[d.key]) {
      return (mood.preguntas as unknown as Record<string, string>)[d.key]
    }
    return tipo === 'entrada' ? d.questionEntrada : d.questionSalida
  })

  const filled = Object.values(values).filter((v) => v > 0).length

  return (
    <div className="checkin-page pb-36 font-sans">
      {/* Header */}
      <div className="checkin-header py-4 px-6 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 group">
              <Sparkles className="h-5 w-5 text-indigo-600 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-extrabold font-sora text-indigo-950">
                MoodClass
              </span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
              Ticket de {tipo} · {sesion.tipo_actividad}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold text-indigo-600 font-sora">
              {filled}/7
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">completado</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar w-full">
        <div className="progress-fill"
          style={{ width: `${(filled / 7) * 100}%` }} />
      </div>

      {/* Title + Disclaimer */}
      <div className="px-6 pt-10 pb-6 max-w-md mx-auto text-center anim-fade-up">
        {primerNombre && (
          <p className="text-2xl font-extrabold font-sora text-indigo-950 mb-1">
            ¡Bienvenido/a,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
              {primerNombre}
            </span>!
          </p>
        )}
        <h1 className="text-2xl font-extrabold font-sora text-indigo-950 mb-2">
          {tipo === 'entrada'
            ? '¿Cómo llegas hoy?'
            : tipo === 'salida'
            ? '¿Cómo te vas de la clase?'
            : `¿Cómo te sentiste en esta actividad de ${(mood.tipo_actividad || 'hoy').toLowerCase()}?`}
        </h1>
        <p className="text-slate-500 text-xs leading-relaxed mb-1">
          {tipo === 'entrada'
            ? 'Responde con honestidad marcando tus niveles en estas 7 dimensiones socioemocionales.'
            : tipo === 'salida'
            ? 'Tómate un momento para reflexionar sobre los niveles en estas dimensiones al salir de clases.'
            : `Tómate un momento para reflexionar sobre los niveles en estas dimensiones al terminar esta actividad de ${(mood.tipo_actividad || 'hoy').toLowerCase()}.`}
        </p>
        <p className="text-slate-400 text-xs leading-relaxed mb-4">
          Ilumina las gemas según cómo te sientes en cada dimensión
        </p>
        {/* Privacy disclaimer */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-left">
          <p className="text-[10px] text-indigo-700 leading-relaxed">
            <strong className="font-bold">Privacidad:</strong> Tus respuestas son anónimas para el docente. Solo se utilizan para monitorear el bienestar colectivo del curso. Nadie puede ver tu respuesta individual.
          </p>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="px-4 max-w-md mx-auto space-y-5">
        {DIMENSIONES.map((dim, i) => (
          <DimensionCard
            key={dim.key}
            dimension={dim}
            value={(values as Record<string, number>)[dim.key]}
            onChange={(val) => setValue(dim.key as keyof DimensionValues, val)}
            question={questions[i]}
            index={i}
          />
        ))}
      </div>

      {/* Campo abierto opcional */}
      <div className="px-4 max-w-md mx-auto mt-4">
        <div className="card p-5 bg-white border border-slate-100 shadow-sm">
          <label className="field-label mb-2 block">
            ¿Hay algo que quieras compartir? <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={campoAbierto}
            onChange={e => setCampoAbierto(e.target.value)}
            className="input-field"
            placeholder="Escíbelo aquí si lo deseas. Tu respuesta es completamente anónima..."
            rows={3}
            maxLength={500}
          />
          <p className="text-[10px] text-slate-400 mt-1.5">Máximo 500 caracteres. Completamente opcional y anónimo.</p>
        </div>
      </div>

      {/* Submit button - floating submit-bar */}
      <div className="submit-bar">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !allFilled()}
            className="btn-primary w-full py-4 text-xs tracking-wider uppercase font-extrabold"
            style={{
              opacity: allFilled() ? 1 : 0.6,
              cursor: allFilled() ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Enviando...' : allFilled() ? (
              <span className="flex items-center justify-center gap-1.5">
                Enviar check-in <ArrowRight className="h-4 w-4" />
              </span>
            ) : (
              `Completa las ${7 - filled} dimensiones restantes`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
