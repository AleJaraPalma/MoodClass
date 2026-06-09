import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CheckinClient from './CheckinClient'

export default async function CheckinPage({ params }: { params: Promise<{ sesionId: string }> }) {
  const { sesionId } = await params
  const supabase = await createClient()

  // First, find the active or targeted mood by id
  const { data: mood } = await supabase
    .from('moods')
    .select('*')
    .eq('id', sesionId)
    .single()

  if (!mood) notFound()

  // Fetch the related session
  const { data: sesion } = await supabase
    .from('sesiones')
    .select('*, asignaturas(nombre, codigo)')
    .eq('id', mood.sesion_id)
    .single()

  if (!sesion) notFound()

  return <CheckinClient sesion={sesion} mood={mood} />
}

