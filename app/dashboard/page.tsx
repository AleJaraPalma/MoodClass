import { redirect } from 'next/navigation'
import { createClient, getOrCreatePerfil } from '@/lib/supabase/server'

export default async function DashboardPage() {
  console.log('[DashboardPage] Iniciando comprobación de sesión...')
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('[DashboardPage] Error obteniendo usuario:', error.message || error)
  }

  console.log('[DashboardPage] Usuario obtenido:', user ? user.email : 'Ninguno')

  if (!user) {
    console.log('[DashboardPage] Sin sesión válida. Redirigiendo a /login...')
    redirect('/login')
  }

  const usuario = await getOrCreatePerfil(supabase, user)
  const rol = usuario?.rol || user.user_metadata?.rol || 'estudiante'
  console.log('[DashboardPage] Rol determinado:', rol)

  if (rol === 'docente') {
    redirect('/dashboard/docente')
  } else {
    redirect('/dashboard/estudiante')
  }
}
