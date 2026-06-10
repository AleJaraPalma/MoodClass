import { redirect } from 'next/navigation'
import { createClient, getOrCreatePerfil } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const usuario = await getOrCreatePerfil(supabase, user)

  const rol = usuario?.rol || user.user_metadata?.rol || 'estudiante'
  if (rol !== 'docente') {
    redirect('/dashboard/estudiante')
  }

  const fallbackUsuario = usuario || {
    id: user.id,
    email: user.email || '',
    nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Docente',
    rol: 'docente' as const,
    carrera: null,
    sede: null,
    created_at: new Date().toISOString()
  }

  // Fetch asignaturas first, then sesiones
  const { data: asignaturas } = await supabase
    .from('asignaturas')
    .select('*')
    .eq('docente_id', user.id)

  const asignaturaIds = (asignaturas ?? []).map((a: { id: string }) => a.id)

  const { data: sesiones } = asignaturaIds.length > 0
    ? await supabase
        .from('sesiones')
        .select('*, asignaturas(nombre, codigo)')
        .in('asignatura_id', asignaturaIds)
        .order('fecha', { ascending: false })
        .limit(50)
    : { data: [] }


  return (
    <ReportesClient
      usuario={fallbackUsuario}
      initialSesiones={sesiones ?? []}
      asignaturas={asignaturas ?? []}
    />
  )
}
