import { redirect } from 'next/navigation'
import { createClient, getOrCreatePerfil } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import DocenteDashboardClient from './DocenteDashboardClient'

export default async function DocenteDashboardPage() {
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
    .select('*, asignaturas(nombre, codigo), secciones(hora_fin)')
    .in('estado', ['programada', 'activa', 'entrada_cerrada'])
    .order('fecha', { ascending: true })

  // Sesiones en curso para detectar clases sin ticket de salida y sin cerrar
  const sesionesEnCurso = (sesionesHoy || []).filter(s => s.estado_clase === 'en_curso')
  let salidasCerradas: string[] = []
  if (sesionesEnCurso.length > 0) {
    const { data: moodsSalida } = await supabase
      .from('moods')
      .select('sesion_id')
      .in('sesion_id', sesionesEnCurso.map(s => s.id))
      .eq('tipo', 'salida')
      .eq('estado', 'cerrado')
    salidasCerradas = (moodsSalida || []).map(m => m.sesion_id)
  }

  return (
    <div className="min-h-screen">
      <Navbar usuario={fallbackUsuario} />
      <DocenteDashboardClient
        usuario={fallbackUsuario}
        secciones={secciones || []}
        asignaturas={asignaturas || []}
        sesionesActivas={sesionesHoy || []}
        salidasCerradas={salidasCerradas}
        today={today}
      />
    </div>
  )
}
