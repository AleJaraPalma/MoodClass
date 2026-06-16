import { redirect, notFound } from 'next/navigation'
import { createClient, getOrCreatePerfil } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import LiveClient from './LiveClient'

export default async function LivePage({ params }: { params: Promise<{ sesionId: string }> }) {
  const { sesionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const usuario = await getOrCreatePerfil(supabase, user)
  if (!usuario) redirect('/login')

  const { data: sesion } = await supabase
    .from('sesiones')
    .select('*, asignaturas(*), secciones(tipo, nombre_evento, tipo_evento, descripcion_evento)')
    .eq('id', sesionId)
    .single()

  if (!sesion) notFound()

  if (sesion.asignaturas?.docente_id !== user.id) redirect('/dashboard')

  const esEvento = (sesion.secciones as { tipo?: string } | null)?.tipo === 'evento'

  const { data: moods } = await supabase
    .from('moods')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('orden', { ascending: true })

  const moodActivo = moods?.find(m => m.estado === 'activo') ?? null

  const { data: moodEstados } = moodActivo
    ? await supabase
        .from('mood_estados')
        .select('*, usuarios(nombre)')
        .eq('mood_id', moodActivo.id)
    : { data: [] }

  const { data: moodCheckins } = moodActivo
    ? await supabase
        .from('mood_checkins')
        .select('*')
        .eq('mood_id', moodActivo.id)
    : { data: [] }

  // For events: no pre-enrolled students
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inscripciones: any[] = []
  let neverLoggedIn: string[] = []

  if (!esEvento) {
    const { data: ins } = await supabase
      .from('inscripciones')
      .select('estudiante_id, usuarios(id, nombre, email)')
      .eq('asignatura_id', sesion.asignatura_id)

    inscripciones = ins ?? []

    const estudianteIds = inscripciones.map((i) => i.estudiante_id as string).filter(Boolean)

    if (estudianteIds.length > 0) {
      try {
        const adminClient = createAdminClient()
        const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const authUsers = authData?.users ?? []
        const authMap = new Map(authUsers.map(u => [u.id, u.last_sign_in_at ?? null]))

        const neverSet = new Set<string>()
        for (const id of estudianteIds) {
          if (!authMap.get(id)) neverSet.add(id)
        }
        neverLoggedIn = Array.from(neverSet)
      } catch {
        // Degrade gracefully
      }
    }
  }

  const seccionInfo = sesion.secciones as {
    tipo?: string
    nombre_evento?: string
    tipo_evento?: string
    descripcion_evento?: string
  } | null

  return (
    <LiveClient
      sesion={sesion}
      usuario={usuario}
      initialMoods={moods || []}
      initialMoodActivo={moodActivo}
      initialMoodEstados={moodEstados || []}
      initialMoodCheckins={moodCheckins || []}
      initialInscritos={inscripciones || []}
      neverLoggedIn={neverLoggedIn}
      esEvento={esEvento}
      nombreEvento={seccionInfo?.nombre_evento ?? undefined}
      tipoEvento={seccionInfo?.tipo_evento ?? undefined}
    />
  )
}
