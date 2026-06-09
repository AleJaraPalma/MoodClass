import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Las 7 dimensiones en orden fijo
const DIMENSIONES = [
  { key: 'energia',    label: 'Energía',    descripcion: 'nivel de vitalidad física y mental para enfrentar la actividad' },
  { key: 'foco',       label: 'Foco',       descripcion: 'capacidad de concentración y atención sostenida' },
  { key: 'animo',      label: 'Ánimo',      descripcion: 'estado emocional general y disposición afectiva' },
  { key: 'claridad',   label: 'Claridad',   descripcion: 'comprensión del contenido y los objetivos de la actividad' },
  { key: 'confianza',  label: 'Confianza',  descripcion: 'seguridad en las propias capacidades para enfrentar la actividad' },
  { key: 'motivacion', label: 'Motivación', descripcion: 'deseo interno de participar y dar lo mejor de sí' },
  { key: 'memoria',    label: 'Memoria',    descripcion: 'capacidad de recordar y conectar información relevante' },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { descripcion_actividad, tipo_actividad, modalidad, duracion, complejidad } = body

    if (!descripcion_actividad || !tipo_actividad) {
      return NextResponse.json(
        { error: 'descripcion_actividad y tipo_actividad son requeridos' },
        { status: 400 }
      )
    }

    const prompt = `Eres un experto en psicología educativa y evaluación socioemocional para aulas universitarias técnicas (INACAP).

Tu tarea es generar exactamente 7 preguntas de introspección emocional, una por cada dimensión, adaptadas específicamente al contexto de la siguiente actividad académica.

## Contexto de la actividad
- **Tipo de actividad:** ${tipo_actividad}
- **Modalidad:** ${modalidad ?? 'no especificada'}
- **Duración estimada:** ${duracion ?? 'no especificada'}
- **Nivel de complejidad:** ${complejidad ?? 'no especificado'}
- **Descripción:** ${descripcion_actividad}

## Instrucciones para las preguntas
- Cada pregunta debe estar en **segunda persona singular** (tú/te/tu)
- Deben ser **específicas a la actividad** descrita, no genéricas
- Deben poder responderse en una **escala del 1 al 5**
- Deben ser **breves** (máximo 15 palabras)
- Deben sonar **naturales y empáticas**, no formales o académicas
- NO uses "¿En qué medida..." — usa lenguajes cotidianos y directos

## Ejemplos de buenas preguntas (para una presentación grupal)
- Energía: "¿Con cuánta energía llegaste a esta presentación?"
- Foco: "¿Qué tan presente lograste estar durante la presentación de tu grupo?"
- Ánimo: "¿Cómo te sentiste emocionalmente al presentar frente al curso?"

## Las 7 dimensiones (en este orden exacto):
${DIMENSIONES.map((d, i) => `${i + 1}. **${d.label}** — ${d.descripcion}`).join('\n')}

## Formato de respuesta
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional:
{
  "preguntas": {
    "energia": "¿pregunta aquí?",
    "foco": "¿pregunta aquí?",
    "animo": "¿pregunta aquí?",
    "claridad": "¿pregunta aquí?",
    "confianza": "¿pregunta aquí?",
    "motivacion": "¿pregunta aquí?",
    "memoria": "¿pregunta aquí?"
  }
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text content
    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON — Claude might wrap in ```json ``` blocks
    const rawText = textBlock.text.trim()
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate all 7 dimensions are present
    const missingDims = DIMENSIONES.filter(d => !parsed.preguntas?.[d.key])
    if (missingDims.length > 0) {
      throw new Error(`Missing dimensions: ${missingDims.map(d => d.key).join(', ')}`)
    }

    return NextResponse.json({
      preguntas: parsed.preguntas,
      meta: {
        tipo_actividad,
        modalidad,
        descripcion_actividad,
        modelo: 'claude-sonnet-4-5-20250929',
      },
    })
  } catch (err) {
    console.error('[/api/generar-preguntas] Error:', err)
    return NextResponse.json(
      {
        error: 'Error generando preguntas',
        detail: err instanceof Error ? err.message : String(err),
        // Fallback genérico si Claude falla
        preguntas: {
          energia: '¿Cómo describes tu nivel de energía en este momento?',
          foco: '¿Qué tan concentrado/a te sientes ahora?',
          animo: '¿Cómo está tu ánimo en este momento?',
          claridad: '¿Qué tan claro/a te parece lo que se está trabajando?',
          confianza: '¿Qué tan seguro/a te sientes de tu desempeño?',
          motivacion: '¿Qué tan motivado/a estás para participar?',
          memoria: '¿Qué tan bien estás reteniendo la información?',
        },
      },
      { status: 200 } // Return 200 with fallback so UX doesn't break
    )
  }
}
