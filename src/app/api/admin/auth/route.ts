/**
 * POST /api/admin/auth  → login
 * DELETE /api/admin/auth → logout
 *
 * Credenciais lidas de variáveis de ambiente (nunca hardcoded).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSession, destroySession, safeEqual } from '@/lib/session'

const COOKIE = 'admin_session'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as {
      username?: string
      password?: string
    }

    const envUser = process.env.ADMIN_USERNAME ?? ''
    const envPass = process.env.ADMIN_PASSWORD ?? ''

    const validUser = envUser.length > 0 && safeEqual(username ?? '', envUser)
    const validPass = envPass.length > 0 && safeEqual(password ?? '', envPass)

    if (!validUser || !validPass) {
      // Delay artificial para dificultar brute-force
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json({ ok: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const token = createSession()

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   8 * 60 * 60,   // 8 horas em segundos
      // secure: true,           // habilitar em produção HTTPS
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro interno.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  destroySession(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
