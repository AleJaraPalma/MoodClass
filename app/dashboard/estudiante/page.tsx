import { redirect } from 'next/navigation'
import { createClient, getOrCreatePerfil } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import EstudianteDashboardClient from './EstudianteDashboardClient'

export default async function EstudianteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const usuario = await getOrCreatePerfil(supabase, user)

  const rol = usuario?.rol || user.user_metadata?.rol || 'estudiante'
  if (rol === 'docente') {
    redirect('/dashboard/docente')
  }

  const fallbackUsuario = usuario || {
    id: user.id,
    email: user.email || '',
    nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
    rol: 'estudiante' as const,
    carrera: null,
    sede: null,
    created_at: new Date().toISOString()
  }

  // Fetch enrolled asignaturas
  const { data: inscripciones } = await supabase
    .from('inscripciones')
    .select('*, asignaturas(*)')
    .eq('estudiante_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch recent checkins
  const { data: checkins } = await supabase
    .from('checkins')
    .select('*, sesiones(*, asignaturas(nombre))')
    .eq('estudiante_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen">
      <Navbar usuario={fallbackUsuario} />
      <EstudianteDashboardClient
        usuario={fallbackUsuario}
        inscripciones={inscripciones || []}
        checkins={checkins || []}
      />
    </div>
  )
}
