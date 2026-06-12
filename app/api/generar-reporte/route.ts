import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DIM_NAMES: Record<string, string> = {
  energia: 'Energía', foco: 'Foco', animo: 'Ánimo', claridad: 'Claridad',
  confianza: 'Confianza', motivacion: 'Motivación', memoria: 'Memoria',
}
const DIM_KEYS = ['energia', 'foco', 'animo', 'claridad', 'confianza', 'motivacion', 'memoria']

export async function POST(req: NextRequest) {
  try {
    const { mood_id } = await req.json()
    if (!mood_id) {
      return NextResponse.json({ error: 'Falta mood_id' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: mood, error: moodErr } = await supabase
      .from('moods')
      .select('*, sesiones!moods_sesion_id_fkey(asignatura_id, tipo_actividad, asignaturas(nombre))')
      .eq('id', mood_id)
      .single()

    // Diagnóstico activo para detectar fallos de update/select en moods
    if (moodErr || !mood) {
      console.error('[generar-reporte] select fallo:', moodErr?.message, mood_id)
      return NextResponse.json({ error: 'Mood no encontrado' }, { status: 404 })
    }

    // Reporte ya generado: inmutable, se devuelve tal cual
    if (mood.reporte_ia) {
      const parsed = JSON.parse(mood.reporte_ia)
      return NextResponse.json({
        resumen: parsed.resumen,
        recomendaciones: parsed.recomendaciones,
        generado_at: mood.reporte_ia_generado_at,
      })
    }

    // Solo se genera al cerrar el mood
    if (mood.estado !== 'cerrado') {
      return NextResponse.json({ pendiente: true }, { status: 200 })
    }

    const sesionInfo = mood.sesiones as unknown as { asignatura_id: string; tipo_actividad: string; asignaturas?: { nombre: string } } | null
    const asignaturaId = sesionInfo?.asignatura_id

    const { data: checkins } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('mood_id', mood_id)

    const { count: totalAlumnos } = asignaturaId
      ? await supabase.from('inscripciones').select('*', { count: 'exact', head: true }).eq('asignatura_id', asignaturaId)
      : { count: 0 }

    const promedios: Record<string, number> = {}
    DIM_KEYS.forEach(k => {
      promedios[k] = checkins?.length
        ? checkins.reduce((s, c) => s + (c[k] ?? 0), 0) / checkins.length
        : 0
    })

    const criticas = DIM_KEYS.filter(k => promedios[k] < 2.5)
    const bajas = DIM_KEYS.filter(k => promedios[k] >= 2.5 && promedios[k] < 3.2)
    const altas = DIM_KEYS.filter(k => promedios[k] >= 4.0)
    const promedioGeneral = DIM_KEYS.reduce((s, k) => s + promedios[k], 0) / 7

    const muestraComentarios = (checkins ?? [])
      .map(c => c.campo_abierto)
      .filter((t): t is string => !!t && t.trim().length > 3)
      .slice(0, 15)

    const respondieron = checkins?.length ?? 0
    const totalAlumnosNum = totalAlumnos ?? 0
    const nombreAsignatura = sesionInfo?.asignaturas?.nombre ?? 'Sin especificar'
    const tipoActividad = mood.tipo_actividad ?? sesionInfo?.tipo_actividad ?? 'Clase'

    const prompt = `Eres un psicólogo educativo experto en bienestar estudiantil en contextos universitarios técnicos (INACAP).

## Datos de la sesión
- **Asignatura:** ${nombreAsignatura}
- **Tipo de actividad:** ${tipoActividad}
- **Participación:** ${respondieron} de ${totalAlumnosNum} alumnos respondieron (${totalAlumnosNum > 0 ? Math.round((respondieron / totalAlumnosNum) * 100) : 0}%)
- **Promedio general:** ${promedioGeneral.toFixed(1)}/5

## Promedios por dimensión (escala 1-5)
${DIM_KEYS.map(k => {
  const v = promedios[k].toFixed(1)
  const flag = criticas.includes(k) ? ' ⚠️ CRÍTICO' : bajas.includes(k) ? ' ↘ bajo' : altas.includes(k) ? ' ✓ bien' : ''
  return `- ${DIM_NAMES[k]}: ${v}${flag}`
}).join('\n')}

${criticas.length > 0 ? `## Dimensiones críticas (<2.5): ${criticas.map(k => DIM_NAMES[k]).join(', ')}` : ''}

${muestraComentarios.length > 0 ? `## Comentarios abiertos de los alumnos (muestra)\n${muestraComentarios.map((t, i) => `${i + 1}. "${t}"`).join('\n')}` : '## Sin comentarios abiertos esta sesión'}

## Tu tarea
1. Escribe un **resumen diagnóstico** del estado socioemocional del curso en exactamente 2-3 oraciones. Sé empático, preciso y accionable. Menciona lo que se observa en los datos, no solo las dimensiones.
2. Proporciona exactamente **3 recomendaciones pedagógicas** concretas y accionables para el docente, ordenadas por urgencia. Cada recomendación debe:
   - Tener un título corto (máx 5 palabras)
   - Tener una descripción de 1-2 oraciones
   - Ser específica para esta actividad y contexto
   - Ser implementable en la próxima clase o en el cierre de esta

## Formato de respuesta
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "resumen": "Texto del resumen diagnóstico en 2-3 oraciones.",
  "recomendaciones": [
    {
      "titulo": "Título corto",
      "descripcion": "Descripción de la recomendación.",
      "urgencia": "alta" | "media" | "baja"
    },
    {
      "titulo": "Título corto",
      "descripcion": "Descripción de la recomendación.",
      "urgencia": "alta" | "media" | "baja"
    },
    {
      "titulo": "Título corto",
      "descripcion": "Descripción de la recomendación.",
      "urgencia": "alta" | "media" | "baja"
    }
  ]
}`

    let resumen: string
    let recomendaciones: { titulo: string; descripcion: string; urgencia: string }[]

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const textBlock = message.content.find(b => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude')

      const jsonMatch = textBlock.text.trim().match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')

      const parsed = JSON.parse(jsonMatch[0])
      resumen = parsed.resumen
      recomendaciones = parsed.recomendaciones
    } catch (iaErr) {
      console.error('[/api/generar-reporte] IA error:', iaErr)
      resumen = 'No fue posible generar el análisis automático en este momento.'
      recomendaciones = [
        { titulo: 'Revisar dimensiones bajas', descripcion: 'Identifica las dimensiones con promedios menores a 3.0 y prioriza actividades de reencuadre emocional.', urgencia: 'media' },
        { titulo: 'Apertura de diálogo', descripcion: 'Destina 5 minutos al inicio de la próxima clase para preguntar cómo llegaron los estudiantes.', urgencia: 'baja' },
        { titulo: 'Seguimiento individual', descripcion: 'Contacta proactivamente a los alumnos que no respondieron el check-in.', urgencia: 'baja' },
      ]
    }

    const reporte = { resumen, recomendaciones }
    const generadoAt = new Date().toISOString()

    const { data: updateData, error: updateErr } = await supabase
      .from('moods')
      .update({ reporte_ia: JSON.stringify(reporte), reporte_ia_generado_at: generadoAt })
      .eq('id', mood_id)
      .select()

    // Diagnóstico activo para detectar fallos de update/select en moods
    if (updateErr || !updateData?.length) {
      console.error(
        '[generar-reporte] update no persistio:',
        updateErr?.message,
        'filas:', updateData?.length,
        'mood_id:', mood_id,
        'auth.uid presente:', !!user?.id
      )
    }

    return NextResponse.json({ resumen, recomendaciones, generado_at: generadoAt })
  } catch (err) {
    console.error('[/api/generar-reporte] Error:', err)
    return NextResponse.json({
      error: 'Error generando reporte',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
