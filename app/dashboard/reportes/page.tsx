import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'docente') redirect('/dashboard/estudiante')

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
      usuario={usuario}
      initialSesiones={sesiones ?? []}
      asignaturas={asignaturas ?? []}
    />
  )
}
