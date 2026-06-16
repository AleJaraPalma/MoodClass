import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import CheckinClient from './CheckinClient'

export default async function CheckinPage({ params }: { params: Promise<{ sesionId: string }> }) {
  const { sesionId } = await params
  // Use admin client so anonymous event participants can access without auth cookies
  const supabase = createAdminClient()

  const { data: mood } = await supabase
    .from('moods')
    .select('*')
    .eq('id', sesionId)
    .single()

  if (!mood) notFound()

  const { data: sesion } = await supabase
    .from('sesiones')
    .select('*, asignaturas(nombre, codigo), secciones(tipo, nombre_evento, tipo_evento)')
    .eq('id', mood.sesion_id)
    .single()

  if (!sesion) notFound()

  const esEvento = sesion.secciones?.tipo === 'evento'

  return (
    <CheckinClient
      sesion={sesion}
      mood={mood}
      esEvento={esEvento}
      nombreEvento={sesion.secciones?.nombre_evento ?? undefined}
      tipoEvento={sesion.secciones?.tipo_evento ?? undefined}
    />
  )
}
