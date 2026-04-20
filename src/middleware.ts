/**
 * Middleware Next.js
 * - Registra visitas de páginas (fire-and-forget para /api/admin/track)
 * - Protege /admin/dashboard redirecionando para /admin se não autenticado
 */

import { NextRequest, NextResponse } from 'next/server'

// Rotas que NÃO devem ser rastreadas
const SKIP = [
  /^\/_next\//,
  /^\/api\//,
  /^\/admin/,
  /\.ico$/,
  /\.png$/, /\.jpg$/, /\.jpeg$/, /\.webp$/, /\.svg$/,
  /\.woff2?$/, /\.ttf$/,
  /\.css$/, /\.js$/,
  /^\/favicon/,
  /^\/images\//,
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Proteção do painel admin ──────────────────────────────────────────────
  if (pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('admin_session')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // A validação real do token é feita pela rota — aqui só checa presença
    // (validação completa em src/app/admin/dashboard/page.tsx via server component)
  }

  // ── Rastreamento de visitas ──────────────────────────────────────────────
  if (!SKIP.some(p => p.test(pathname))) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0'

    const payload = JSON.stringify({
      ip,
      userAgent:  request.headers.get('user-agent')       ?? '',
      path:       pathname,
      referrer:   request.headers.get('referer')          ?? '',
      language:   request.headers.get('accept-language')  ?? '',
      timestamp:  new Date().toISOString(),
      country:    request.headers.get('x-vercel-ip-country') ||
                  request.headers.get('cf-ipcountry')         ||
                  request.geo?.country || '',
      city:       request.headers.get('x-vercel-ip-city') ||
                  request.geo?.city    || '',
    })

    // Fire-and-forget — não bloqueia a resposta
    fetch(new URL('/api/admin/track', request.url).toString(), {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-track-secret':  process.env.INTERNAL_TOKEN ?? '',
      },
      body: payload,
    }).catch(() => { /* silencioso */ })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Captura todas as rotas exceto assets estáticos do Next.js
     */
    '/((?!_next/static|_next/image).*)',
  ],
}
