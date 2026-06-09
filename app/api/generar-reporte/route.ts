import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      promedios,          // { energia: 3.2, foco: 4.1, ... }
      campos_abiertos,    // string[]
      tipo_actividad,
      respondieron,
      total_alumnos,
      nombre_asignatura,
      moods_info,         // [{ tipo, tipo_actividad, promedios }]
    } = body

    if (!promedios || !tipo_actividad) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const dimNames = ['Energía', 'Foco', 'Ánimo', 'Claridad', 'Confianza', 'Motivación', 'Memoria']
    const dimKeys =  ['energia', 'foco', 'animo', 'claridad', 'confianza', 'motivacion', 'memoria']

    // Dimensiones críticas (bajo 2.5)
    const criticas = dimKeys.filter(k => (promedios[k] ?? 0) < 2.5)
    const bajas = dimKeys.filter(k => (promedios[k] ?? 0) >= 2.5 && (promedios[k] ?? 0) < 3.2)
    const altas = dimKeys.filter(k => (promedios[k] ?? 0) >= 4.0)

    const promedioGeneral = dimKeys.reduce((s, k) => s + (promedios[k] ?? 0), 0) / 7

    // Muestra de comentarios (máx 15 para no inflar el prompt)
    const muestraComentarios = (campos_abiertos || [])
      .filter((t: string) => t && t.trim().length > 3)
      .slice(0, 15)

    const prompt = `Eres un psicólogo educativo experto en bienestar estudiantil en contextos universitarios técnicos (INACAP).

## Datos de la sesión
- **Asignatura:** ${nombre_asignatura ?? 'Sin especificar'}
- **Tipo de actividad:** ${tipo_actividad}
- **Participación:** ${respondieron} de ${total_alumnos} alumnos respondieron (${Math.round((respondieron/total_alumnos)*100)}%)
- **Promedio general:** ${promedioGeneral.toFixed(1)}/5

## Promedios por dimensión (escala 1-5)
${dimKeys.map(k => {
  const v = promedios[k]?.toFixed(1) ?? '—'
  const dim = dimNames[dimKeys.indexOf(k)]
  const flag = criticas.includes(k) ? ' ⚠️ CRÍTICO' : bajas.includes(k) ? ' ↘ bajo' : altas.includes(k) ? ' ✓ bien' : ''
  return `- ${dim}: ${v}${flag}`
}).join('\n')}

${criticas.length > 0 ? `## Dimensiones críticas (<2.5): ${criticas.map(k => dimNames[dimKeys.indexOf(k)]).join(', ')}` : ''}

${muestraComentarios.length > 0 ? `## Comentarios abiertos de los alumnos (muestra)\n${muestraComentarios.map((t: string, i: number) => `${i+1}. "${t}"`).join('\n')}` : '## Sin comentarios abiertos esta sesión'}

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

    return NextResponse.json({
      resumen: parsed.resumen,
      recomendaciones: parsed.recomendaciones,
      meta: {
        modelo: 'claude-sonnet-4-5-20250929',
        promedio_general: promedioGeneral,
        dimensiones_criticas: criticas,
      },
    })
  } catch (err) {
    console.error('[/api/generar-reporte] Error:', err)
    return NextResponse.json({
      error: 'Error generando reporte',
      detail: err instanceof Error ? err.message : String(err),
      resumen: 'No fue posible generar el análisis automático en este momento.',
      recomendaciones: [
        { titulo: 'Revisar dimensiones bajas', descripcion: 'Identifica las dimensiones con promedios menores a 3.0 y prioriza actividades de reencuadre emocional.', urgencia: 'media' },
        { titulo: 'Apertura de diálogo', descripcion: 'Destina 5 minutos al inicio de la próxima clase para preguntar cómo llegaron los estudiantes.', urgencia: 'baja' },
        { titulo: 'Seguimiento individual', descripcion: 'Contacta proactivamente a los alumnos que no respondieron el check-in.', urgencia: 'baja' },
      ],
    }, { status: 200 })
  }
}
