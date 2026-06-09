import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import AsignaturaClient from './AsignaturaClient'

export default async function AsignaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  const { data: asignatura, error: asigError } = await supabase
    .from('asignaturas')
    .select('*')
    .eq('id', id)
    .single()

  if (asigError || !asignatura) notFound()
  if (asignatura.docente_id !== user.id) redirect('/dashboard')

  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('asignatura_id', id)
    .order('fecha', { ascending: true })
    .order('clase_numero', { ascending: true })

  const { data: inscripciones } = await supabase
    .from('inscripciones')
    .select('*, usuarios(*)')
    .eq('asignatura_id', id)

  return (
    <div className="min-h-screen">
      <Navbar usuario={usuario} />
      <AsignaturaClient
        usuario={usuario}
        asignatura={asignatura}
        sesiones={sesiones || []}
        inscripciones={inscripciones || []}
      />
    </div>
  )
}
