/**
 * GET /api/facebook/adaccounts?token=xxx
 *
 * Lists all ad accounts + total ad count per account (in parallel).
 * Ad count comes from /{account}/ads?summary=true — one lightweight call per account.
 */

import { NextRequest, NextResponse } from 'next/server'

const FB_API_VERSION = 'v20.0'
const FB_GRAPH = `https://graph.facebook.com/${FB_API_VERSION}`
const CONCURRENCY = 8

const STATUS_LABELS: Record<number, string> = {
  1: 'Ativa', 2: 'Desativada', 3: 'Não quitada',
  7: 'Em revisão', 9: 'Período de graça',
  100: 'Pend. encerramento', 101: 'Encerrada',
}

export interface AdAccount {
  id: string
  name: string
  active: boolean
  statusLabel: string
  currency: string
  adCount: number   // total ads in the account (not filtered by video)
}

interface FBRaw { id: string; name: string; account_status: number; currency: string }

async function fetchAdCount(accountId: string, token: string): Promise<number> {
  try {
    const url =
      `${FB_GRAPH}/${accountId}/ads` +
      `?fields=id&summary=true&limit=1` +
      `&access_token=${encodeURIComponent(token)}`
    const res  = await fetch(url, { cache: 'no-store' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json()
    return json?.summary?.total_count ?? 0
  } catch {
    return 0
  }
}

async function pLimit<T>(tasks: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = []
  let i = 0
  const worker = async () => { while (i < tasks.length) { const j = i++; out[j] = await tasks[j]() } }
  await Promise.all(Array.from({ length: n }, worker))
  return out
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token é obrigatório' }, { status: 400 })

  try {
    // 1 — list accounts (1 paginated call, very fast)
    const accounts: FBRaw[] = []
    let next: string | undefined =
      `${FB_GRAPH}/me/adaccounts?fields=id,name,account_status,currency&limit=200`

    while (next) {
      const sep = next.includes('?') ? '&' : '?'
      const res = await fetch(`${next}${sep}access_token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json()
      if (json.error) return NextResponse.json({ error: json.error.message }, { status: 400 })
      accounts.push(...(json.data ?? []))
      next = json.paging?.next
    }

    // 2 — fetch ad counts in parallel
    const counts = await pLimit(
      accounts.map(a => () => fetchAdCount(a.id, token)),
      CONCURRENCY,
    )

    const result: AdAccount[] = accounts
      .map((a, i) => ({
        id:          a.id,
        name:        a.name,
        active:      a.account_status === 1,
        statusLabel: STATUS_LABELS[a.account_status] ?? `Status ${a.account_status}`,
        currency:    a.currency,
        adCount:     counts[i],
      }))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return NextResponse.json({ accounts: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
