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
    .select('*, asignaturas(*)')
    .eq('id', sesionId)
    .single()

  if (!sesion) notFound()

  // Verify ownership
  if (sesion.asignaturas?.docente_id !== user.id) redirect('/dashboard')

  // Load all moods for this session (history + active)
  const { data: moods } = await supabase
    .from('moods')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('orden', { ascending: true })

  // Find the active mood
  const moodActivo = moods?.find(m => m.estado === 'activo') ?? null

  // Load mood_estados for the active mood (who has responded)
  const { data: moodEstados } = moodActivo
    ? await supabase
        .from('mood_estados')
        .select('*, usuarios(nombre)')
        .eq('mood_id', moodActivo.id)
    : { data: [] }

  // Load mood_checkins for the active mood
  const { data: moodCheckins } = moodActivo
    ? await supabase
        .from('mood_checkins')
        .select('*')
        .eq('mood_id', moodActivo.id)
    : { data: [] }

  // Load ALL enrolled students (source of truth for the students list)
  const { data: inscripciones } = await supabase
    .from('inscripciones')
    .select('estudiante_id, usuarios(id, nombre, email)')
    .eq('asignatura_id', sesion.asignatura_id)

  // ── Fetch last_sign_in_at from auth.users (requires service_role) ──────────
  // Build a set of all student auth user IDs from inscripciones
  const estudianteIds = (inscripciones ?? []).map(i => i.estudiante_id).filter(Boolean)

  const neverLoggedInSet = new Set<string>()

  if (estudianteIds.length > 0) {
    try {
      const adminClient = createAdminClient()
      // Fetch auth users in one call using listUsers and filter client-side
      // (Admin API supports listing all users; we filter by ID)
      const { data: authData } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      })
      const authUsers = authData?.users ?? []
      const authMap = new Map(authUsers.map(u => [u.id, u.last_sign_in_at ?? null]))

      for (const id of estudianteIds) {
        const lastSignIn = authMap.get(id)
        if (!lastSignIn) neverLoggedInSet.add(id)
      }
    } catch {
      // If admin call fails (e.g. env var missing), degrade gracefully — all shown as active
    }
  }

  const neverLoggedIn = Array.from(neverLoggedInSet)

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
    />
  )
}
