/**
 * GET /api/facebook/accounts
 *
 * Returns all tokens with their ad accounts (for settings page).
 * Uses dash session (normal users).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashSession } from '@/lib/session'
import { listTokensWithAccounts } from '@/lib/facebook-db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('dash_session')?.value
  if (!await validateDashSession(token)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const tokens = await listTokensWithAccounts()
    // Mask tokens before sending to client
    const safe = tokens.map(t => ({
      ...t,
      token: t.token.slice(0, 8) + '…' + t.token.slice(-4),
    }))
    return NextResponse.json({ tokens: safe })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
