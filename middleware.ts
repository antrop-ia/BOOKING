import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const BETO_COOKIE = 'beto_session'
const BETO_MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

/**
 * Middleware centraliza 2 responsabilidades:
 *   1. /reservar — garante o cookie beto_session (sem forcar a pagina a
 *      ser dinamica, o HTML continua cacheado; so o Set-Cookie e adicionado).
 *   2. /admin/* — exige sessao Supabase Auth valida, redirect para /admin/login
 *      quando nao houver.
 */

function ensureBetoCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (request.cookies.has(BETO_COOKIE)) return response
  response.cookies.set(BETO_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: BETO_MAX_AGE,
  })
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas publicas que usam o Beto — garante o cookie beto_session.
  // Cobre tanto a pagina quanto as API routes do chat, porque Route Handlers
  // em Next.js 16 Edge nao conseguem criar cookies de forma confiavel.
  if (
    pathname === '/reservar' ||
    pathname.startsWith('/reservar/') ||
    pathname.startsWith('/api/beto/')
  ) {
    return ensureBetoCookie(request, NextResponse.next({ request }))
  }

  // Login do admin e publico
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Resto de /admin exige auth
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/reservar',
    '/reservar/:path*',
    '/api/beto/:path*',
    '/admin/:path*',
  ],
}
