/**
 * DELETE /api/admin/facebook/tokens/[id]  — remove a token + all its ad accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { deleteToken } from '@/lib/facebook-db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('admin_session')?.value
  if (!await validateSession(token)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  try {
    await deleteToken(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
