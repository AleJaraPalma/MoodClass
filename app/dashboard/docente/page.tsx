import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import DocenteDashboardClient from './DocenteDashboardClient'

export default async function DocenteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'docente') redirect('/dashboard/estudiante')

  // Fetch secciones del docente
  const { data: secciones } = await supabase
    .from('secciones')
    .select('*')
    .eq('docente_id', user.id)
    .order('dia_semana', { ascending: true })

  // Fetch asignaturas del docente (para el modal de nueva asignatura/sección)
  const { data: asignaturas } = await supabase
    .from('asignaturas')
    .select('*')
    .eq('docente_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch sesiones de hoy para mostrar botón "Iniciar" o "En curso"
  const today = new Date().toISOString().split('T')[0]
  const { data: sesionesHoy } = await supabase
    .from('sesiones')
    .select('*, asignaturas(nombre, codigo)')
    .in('estado', ['programada', 'activa', 'entrada_cerrada'])
    .order('fecha', { ascending: true })

  return (
    <div className="min-h-screen">
      <Navbar usuario={usuario} />
      <DocenteDashboardClient
        usuario={usuario}
        secciones={secciones || []}
        asignaturas={asignaturas || []}
        sesionesActivas={sesionesHoy || []}
        today={today}
      />
    </div>
  )
}
