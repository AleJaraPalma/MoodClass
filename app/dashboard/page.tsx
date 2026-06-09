import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!usuario) {
    // Profile doesn't exist yet - redirect to complete profile
    redirect('/register')
  }

  if (usuario.rol === 'docente') {
    redirect('/dashboard/docente')
  } else {
    redirect('/dashboard/estudiante')
  }
}
