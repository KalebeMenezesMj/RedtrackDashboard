/**
 * POST /api/auth  → login do dashboard principal
 * DELETE /api/auth → logout do dashboard principal
 *
 * Credenciais lidas de variáveis de ambiente (nunca hardcoded).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createDashSession, destroyDashSession, safeEqual } from '@/lib/session'

const COOKIE = 'dash_session'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as {
      username?: string
      password?: string
    }

    const envUser = process.env.DASH_USERNAME ?? ''
    const envPass = process.env.DASH_PASSWORD ?? ''

    const validUser = envUser.length > 0 && safeEqual(username ?? '', envUser)
    const validPass = envPass.length > 0 && safeEqual(password ?? '', envPass)

    if (!validUser || !validPass) {
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json({ ok: false, error: 'Usuário ou senha inválidos.' }, { status: 401 })
    }

    const token = createDashSession()

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   8 * 60 * 60,
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro interno.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  destroyDashSession(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
