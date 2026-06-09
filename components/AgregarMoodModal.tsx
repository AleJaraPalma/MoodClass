'use client'

import { useState } from 'react'
import {
  X, Sparkles, Loader2, ChevronDown, FileText, Users2, Clock,
  Zap, AlertTriangle, CheckCircle2, Brain
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PreguntasGeneradas {
  energia: string
  foco: string
  animo: string
  claridad: string
  confianza: string
  motivacion: string
  memoria: string
}

export interface AgregarMoodData {
  tipo_actividad: string
  modalidad: string
  duracion: string
  complejidad: string
  descripcion_actividad: string
  preguntas: PreguntasGeneradas
}

interface Props {
  onClose: () => void
  onConfirm: (data: AgregarMoodData) => Promise<void>
}

// ── Options ──────────────────────────────────────────────────────────────────

const TIPOS_ACTIVIDAD = [
  'Presentación grupal',
  'Trabajo grupal',
  'Evaluación sumativa',
  'Interrogación',
  'Debate',
  'Plenario',
  'Juego',
  'Salida a terreno',
  'Otra actividad',
]

const MODALIDADES = [
  'Individual',
  'Parejas',
  'Grupos pequeños',
  'Curso completo',
]

const DURACIONES = [
  '10 min',
  '20 min',
  '30 min',
  '45 min',
  '60 min',
  'Más de 60 min',
]

const COMPLEJIDADES = ['Baja', 'Media', 'Alta']

const DIMENSION_LABELS: Record<keyof PreguntasGeneradas, string> = {
  energia: 'Energía',
  foco: 'Foco',
  animo: 'Ánimo',
  claridad: 'Claridad',
  confianza: 'Confianza',
  motivacion: 'Motivación',
  memoria: 'Memoria',
}

const DIMENSION_COLORS: Record<keyof PreguntasGeneradas, string> = {
  energia: '#F59E0B',
  foco: '#3B82F6',
  animo: '#EC4899',
  claridad: '#8B5CF6',
  confianza: '#06B6D4',
  motivacion: '#10B981',
  memoria: '#F97316',
}

// ── Select Component ──────────────────────────────────────────────────────────

function SelectField({
  label, value, onChange, options, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all pr-9"
          required={required}
        >
          <option value="">Selecciona...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgregarMoodModal({ onClose, onConfirm }: Props) {
  const [tipoActividad, setTipoActividad] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [duracion, setDuracion] = useState('')
  const [complejidad, setComplejidad] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [step, setStep] = useState<'form' | 'generating' | 'preview'>('form')
  const [preguntas, setPreguntas] = useState<PreguntasGeneradas | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)

  const canGenerate = tipoActividad && descripcion.trim().length >= 10

  // ── Generate questions via Claude ────────────────────────────────────────

  async function handleGenerarPreguntas() {
    if (!canGenerate) return
    setStep('generating')
    setError(null)

    try {
      const res = await fetch('/api/generar-preguntas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_actividad: tipoActividad,
          modalidad: modalidad || 'no especificada',
          duracion: duracion || 'no especificada',
          complejidad: complejidad || 'no especificada',
          descripcion_actividad: descripcion,
        }),
      })

      const data = await res.json()

      if (data.error && !data.preguntas) {
        throw new Error(data.error)
      }

      setPreguntas(data.preguntas as PreguntasGeneradas)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando preguntas')
      setStep('form')
    }
  }

  // ── Activate mood ─────────────────────────────────────────────────────────

  async function handleActivar() {
    if (!preguntas) return
    setActivating(true)
    try {
      await onConfirm({
        tipo_actividad: tipoActividad,
        modalidad,
        duracion,
        complejidad,
        descripcion_actividad: descripcion,
        preguntas,
      })
    } finally {
      setActivating(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden anim-scale-in">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFF 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-indigo-950 font-sora leading-tight">
                Agregar Mood
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Claude generará preguntas adaptadas a tu actividad
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">

          {/* ── STEP: Form ── */}
          {(step === 'form' || step === 'generating') && (
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <SelectField
                    label="Tipo de actividad"
                    value={tipoActividad}
                    onChange={setTipoActividad}
                    options={TIPOS_ACTIVIDAD}
                    required
                  />
                </div>
                <SelectField
                  label="Modalidad"
                  value={modalidad}
                  onChange={setModalidad}
                  options={MODALIDADES}
                />
                <SelectField
                  label="Duración estimada"
                  value={duracion}
                  onChange={setDuracion}
                  options={DURACIONES}
                />
                <div className="col-span-2">
                  <SelectField
                    label="Nivel de complejidad"
                    value={complejidad}
                    onChange={setComplejidad}
                    options={COMPLEJIDADES}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Descripción de la actividad<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none placeholder:text-slate-400"
                  placeholder="Describe brevemente la actividad — esto ayudará a generar preguntas más precisas para medir el estado emocional de tus estudiantes"
                  required
                />
                <div className={`text-[10px] font-bold text-right transition-colors ${
                  descripcion.trim().length < 10 ? 'text-slate-300' : 'text-emerald-500'
                }`}>
                  {descripcion.trim().length < 10
                    ? `${10 - descripcion.trim().length} caracteres más para continuar`
                    : '✓ Listo para generar'}
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 leading-relaxed">
                  <strong>ALMA</strong>, nuestro MoodBot, generará 7 preguntas adaptadas —
                  una por cada dimensión emocional — basadas en la actividad que describes.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: Generating ── */}
          {step === 'generating' && (
            <div className="px-6 pb-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-indigo-950 font-sora text-sm">Generando preguntas...</p>
                <p className="text-xs text-slate-400 mt-1">
                  Claude está personalizando las 7 dimensiones para esta actividad
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: Preview ── */}
          {step === 'preview' && preguntas && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">7 preguntas generadas por Claude</span>
                <button
                  onClick={() => setStep('form')}
                  className="ml-auto text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  ← Volver y editar
                </button>
              </div>

              {/* Activity summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex flex-wrap gap-3">
                  <span><strong>Actividad:</strong> {tipoActividad}</span>
                  {modalidad && <span><strong>Modalidad:</strong> {modalidad}</span>}
                  {duracion && <span><strong>Duración:</strong> {duracion}</span>}
                  {complejidad && <span><strong>Complejidad:</strong> {complejidad}</span>}
                </div>
                <p className="text-slate-500 italic">&ldquo;{descripcion}&rdquo;</p>
              </div>

              {/* Questions list */}
              <div className="space-y-2.5">
                {(Object.entries(preguntas) as [keyof PreguntasGeneradas, string][]).map(([key, pregunta]) => (
                  <div key={key}
                    className="flex items-start gap-3 p-3.5 rounded-xl border"
                    style={{
                      backgroundColor: `${DIMENSION_COLORS[key]}0A`,
                      borderColor: `${DIMENSION_COLORS[key]}30`,
                    }}>
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-extrabold mt-0.5"
                      style={{ backgroundColor: DIMENSION_COLORS[key] }}
                    >
                      {DIMENSION_LABELS[key].charAt(0)}
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider mb-1"
                        style={{ color: DIMENSION_COLORS[key] }}>
                        {DIMENSION_LABELS[key]}
                      </div>
                      <p className="text-sm text-slate-700 font-medium leading-snug">{pregunta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button onClick={onClose}
            className="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">
            Cancelar
          </button>

          {step === 'form' && (
            <button
              onClick={handleGenerarPreguntas}
              disabled={!canGenerate}
              className="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canGenerate
                  ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
                  : undefined,
                boxShadow: canGenerate ? '0 4px 12px rgba(79,70,229,0.25)' : undefined,
              }}
            >
              <Sparkles className="h-4 w-4" />
              Preguntas con ALMA
            </button>
          )}

          {step === 'preview' && preguntas && (
            <button
              onClick={handleActivar}
              disabled={activating}
              className="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
              }}
            >
              {activating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Activando...</>
              ) : (
                <><Zap className="h-4 w-4" /> Activar Mood</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
