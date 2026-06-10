import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Supabase Server Client] ERROR: Faltan variables de entorno de Supabase en el servidor!')
    throw new Error('Faltan variables de entorno de Supabase en el servidor.')
  }
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const { domain, sameSite, ...cookieOptions } = options
              cookieStore.set(name, value, { ...cookieOptions, sameSite: 'lax' })
            })
          } catch {
            // Server Component – ignore
          }
        },
      },
    }
  )
}

export async function getOrCreatePerfil(supabase: any, user: any) {
  if (!user) return null

  try {
    let { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!usuario) {
      const defaultRol = user.user_metadata?.rol || 'estudiante'
      const defaultNombre = user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario'

      const { data: nuevoUsuario, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id: user.id,
          email: user.email!,
          nombre: defaultNombre,
          rol: defaultRol,
        })
        .select('*')
        .single()

      if (nuevoUsuario) {
        usuario = nuevoUsuario
      } else {
        console.error('Error al insertar perfil en getOrCreatePerfil:', insertError)
      }
    }

    return usuario
  } catch (err) {
    console.error('Error en getOrCreatePerfil:', err)
    return null
  }
}
