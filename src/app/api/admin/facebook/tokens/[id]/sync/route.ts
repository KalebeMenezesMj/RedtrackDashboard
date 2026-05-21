/**
 * POST /api/admin/facebook/tokens/[id]/sync
 *
 * Fetches all ad accounts for the token from Facebook API
 * and upserts them into facebook_ad_accounts table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { upsertAdAccounts } from '@/lib/facebook-db'

const FB_GRAPH = 'https://graph.facebook.com/v20.0'
const CONCURRENCY = 8

const STATUS_LABELS: Record<number, string> = {
  1: 'Ativa', 2: 'Desativada', 3: 'Não quitada',
  7: 'Em revisão', 9: 'Período de graça',
  100: 'Pend. encerramento', 101: 'Encerrada',
}

interface FBRaw { id: string; name: string; account_status: number; currency: string }

async function pLimit<T>(tasks: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = []
  let i = 0
  const worker = async () => { while (i < tasks.length) { const j = i++; out[j] = await tasks[j]() } }
  await Promise.all(Array.from({ length: n }, worker))
  return out
}

async function fetchAdCount(accountId: string, token: string): Promise<number> {
  try {
    const url = `${FB_GRAPH}/${accountId}/ads?fields=id&summary=true&limit=1&access_token=${encodeURIComponent(token)}`
    const res  = await fetch(url, { cache: 'no-store' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json()
    return json?.summary?.total_count ?? 0
  } catch { return 0 }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionToken = req.cookies.get('admin_session')?.value
  if (!await validateSession(sessionToken)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  // Get token from DB
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('facebook_tokens')
    .select('id, token')
    .eq('id', id)
    .single()

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })
  }

  const token = tokenRow.token

  try {
    // Fetch all ad accounts from FB
    const accounts: FBRaw[] = []
    let next: string | undefined =
      `${FB_GRAPH}/me/adaccounts?fields=id,name,account_status,currency&limit=200`

    while (next) {
      const sep = next.includes('?') ? '&' : '?'
      const res  = await fetch(`${next}${sep}access_token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json()
      if (json.error) throw new Error(json.error.message)
      accounts.push(...(json.data ?? []))
      next = json.paging?.next
    }

    // Fetch ad counts in parallel
    const counts = await pLimit(
      accounts.map(a => () => fetchAdCount(a.id, token)),
      CONCURRENCY,
    )

    // Upsert into DB
    await upsertAdAccounts(
      id,
      accounts.map((a, i) => ({
        account_id:   a.id,
        account_name: a.name,
        is_active:    a.account_status === 1,
        status_label: STATUS_LABELS[a.account_status] ?? `Status ${a.account_status}`,
        currency:     a.currency,
        ad_count:     counts[i],
      })),
    )

    return NextResponse.json({ ok: true, synced: accounts.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
