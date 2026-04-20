/**
 * GET /api/admin/stats
 * Retorna estatísticas de visitas. Requer sessão válida.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { getStats } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!validateSession(token)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 })
  }

  const stats = getStats()
  return NextResponse.json({ ok: true, stats })
}
