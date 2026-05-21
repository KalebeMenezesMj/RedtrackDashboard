/**
 * GET /api/facebook/status
 * Verifica se o usuário está autenticado com o Facebook e retorna
 * a lista de contas de anúncios disponíveis.
 *
 * Response:
 *   { connected: false }
 *   { connected: true, name: string, accounts: AdAccount[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const FB_API = 'https://graph.facebook.com/v20.0'

export interface AdAccount {
  id: string          // "act_XXXXXXXXX"
  name: string
  accountStatus: number // 1 = active
}

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('fb_access_token')?.value
  const name  = cookieStore.get('fb_user_name')?.value

  if (!token) {
    return NextResponse.json({ connected: false })
  }

  try {
    // Fetch ad accounts the user has access to
    const res = await fetch(
      `${FB_API}/me/adaccounts` +
      `?fields=id,name,account_status,currency` +
      `&limit=200` +
      `&access_token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    )
    const json = await res.json()

    if (json.error) {
      // Token expired or revoked
      if (json.error.code === 190) {
        return NextResponse.json({ connected: false, expired: true })
      }
      throw new Error(json.error.message)
    }

    const accounts: AdAccount[] = (json.data ?? []).map((a: Record<string, unknown>) => ({
      id:            a.id as string,
      name:          a.name as string,
      accountStatus: a.account_status as number,
      currency:      a.currency as string,
    }))

    return NextResponse.json({ connected: true, name: name ?? 'Usuário', accounts })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ connected: false, error: msg })
  }
}
