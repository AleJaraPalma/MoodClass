import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Middleware] ERROR CRÍTICO: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el servidor!')
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...cookieOptions } = options
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  console.log(`[Middleware] Ruta: ${pathname}`)
  console.log(`[Middleware] variables de entorno - URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Definida' : 'FALTANTE'}, AnonKey: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definida' : 'FALTANTE'}`)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('[Middleware] Error en getUser():', error.message || error)
  } else {
    console.log(`[Middleware] Usuario autenticado: ${user ? user.email : 'Ninguno'}`)
  }

  const publicRoutes = ['/login', '/', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some((route) => pathname === route)
  const isCheckinRoute = pathname.startsWith('/checkin/')
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticRoute = pathname.startsWith('/_next') || pathname.startsWith('/favicon')

  if (isStaticRoute) return supabaseResponse

  if (!user && !isPublicRoute && !isCheckinRoute && !isApiRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
