/**
 * PATCH /api/facebook/accounts/[id]
 * Body: { enabled: boolean }
 *
 * Toggles whether an ad account is included in analyses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashSession } from '@/lib/session'
import { setAdAccountEnabled } from '@/lib/facebook-db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('dash_session')?.value
  if (!await validateDashSession(token)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const { enabled } = await req.json() as { enabled: boolean }

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: '"enabled" deve ser boolean' }, { status: 400 })
  }

  try {
    await setAdAccountEnabled(id, enabled)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
