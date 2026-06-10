import { redirect } from 'next/navigation'
import { createClient, getOrCreatePerfil } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const usuario = await getOrCreatePerfil(supabase, user)
  const rol = usuario?.rol || user.user_metadata?.rol || 'estudiante'

  if (rol === 'docente') {
    redirect('/dashboard/docente')
  } else {
    redirect('/dashboard/estudiante')
  }
}
