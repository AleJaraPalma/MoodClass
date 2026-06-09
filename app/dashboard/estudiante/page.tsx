import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import EstudianteDashboardClient from './EstudianteDashboardClient'

export default async function EstudianteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'estudiante') redirect('/dashboard/docente')

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
      <Navbar usuario={usuario} />
      <EstudianteDashboardClient
        usuario={usuario}
        inscripciones={inscripciones || []}
        checkins={checkins || []}
      />
    </div>
  )
}
