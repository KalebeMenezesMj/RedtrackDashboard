/**
 * Middleware Next.js — Edge Runtime
 * - Protege rotas do dashboard → /login
 * - Protege /admin/dashboard   → /admin
 * - Registra visitas (fire-and-forget)
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// ---------------------------------------------------------------------------
// Helpers JWT (inline no middleware para Edge Runtime)
// ---------------------------------------------------------------------------

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? 'dev-secret-troque-em-producao'
  )
}

async function hasValidJWT(token: string | undefined, role: 'admin' | 'dash'): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === role
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Padrões a ignorar no rastreamento
// ---------------------------------------------------------------------------

const SKIP_TRACK = [
  /^\/_next\//,
  /^\/api\//,
  /^\/admin/,
  /^\/login/,
  /\.ico$/, /\.png$/, /\.jpg$/, /\.jpeg$/, /\.webp$/, /\.svg$/,
  /\.woff2?$/, /\.ttf$/, /\.css$/, /\.js$/,
  /^\/favicon/, /^\/images\//,
]

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Proteção do dashboard principal ────────────────────────────────────
  const isDash =
    pathname === '/' ||
    pathname.startsWith('/campanhas') ||
    pathname.startsWith('/analise-criativos')

  if (isDash) {
    const token = request.cookies.get('dash_session')?.value
    if (!await hasValidJWT(token, 'dash')) {
      const url = new URL('/login', request.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Redireciona /login → / se já autenticado
  if (pathname === '/login') {
    const token = request.cookies.get('dash_session')?.value
    if (await hasValidJWT(token, 'dash')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── 2. Proteção do painel admin ───────────────────────────────────────────
  if (pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('admin_session')?.value
    if (!await hasValidJWT(token, 'admin')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Redireciona /admin → /admin/dashboard se já autenticado
  if (pathname === '/admin') {
    const token = request.cookies.get('admin_session')?.value
    if (await hasValidJWT(token, 'admin')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  // ── 3. Rastreamento de visitas ────────────────────────────────────────────
  if (!SKIP_TRACK.some(p => p.test(pathname))) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0'

    const payload = JSON.stringify({
      ip,
      userAgent: request.headers.get('user-agent')      ?? '',
      path:      pathname,
      referrer:  request.headers.get('referer')         ?? '',
      language:  request.headers.get('accept-language') ?? '',
      timestamp: new Date().toISOString(),
      country:   request.headers.get('x-vercel-ip-country') ||
                 request.headers.get('cf-ipcountry')         ||
                 (request as unknown as { geo?: { country?: string } }).geo?.country || '',
      city:      request.headers.get('x-vercel-ip-city') ||
                 (request as unknown as { geo?: { city?: string } }).geo?.city || '',
    })

    fetch(new URL('/api/admin/track', request.url).toString(), {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-track-secret': process.env.INTERNAL_TOKEN ?? '',
      },
      body: payload,
    }).catch(() => {})
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
