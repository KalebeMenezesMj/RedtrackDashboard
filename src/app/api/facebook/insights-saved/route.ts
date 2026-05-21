/**
 * POST /api/facebook/insights-saved
 * Body: { datePreset?: string }
 *
 * Fetches insights for all enabled ad accounts using saved tokens.
 * Groups results by token label + account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashSession } from '@/lib/session'
import { listEnabledAdAccounts } from '@/lib/facebook-db'

const FB_API_VERSION = 'v20.0'
const FB_GRAPH = `https://graph.facebook.com/${FB_API_VERSION}`
const CONCURRENCY = 6

interface FBActionValue { action_type: string; value: string }
interface FBInsightRow {
  ad_id: string; ad_name: string; impressions?: string
  video_play_actions?: FBActionValue[]; video_p25_watched_actions?: FBActionValue[]
  video_p75_watched_actions?: FBActionValue[]; actions?: FBActionValue[]
}

interface AdRow { name: string; playRate: number; hookRetention: number; bodyConversion: number; bodyRetention: number }

function actionVal(arr: FBActionValue[] | undefined, type: string): number {
  const found = arr?.find(a => a.action_type === type)
  return found ? parseFloat(found.value) || 0 : 0
}
function safeNum(s: string | undefined): number { return s ? parseFloat(s) || 0 : 0 }

function mapRows(fbRows: FBInsightRow[]): AdRow[] {
  const out: AdRow[] = []
  for (const row of fbRows) {
    const name = row.ad_name?.trim()
    if (!name) continue
    const impressions = safeNum(row.impressions)
    const plays = actionVal(row.video_play_actions, 'video_play') || actionVal(row.actions, 'video_view')
    if (plays === 0 || impressions === 0) continue
    const p25 = actionVal(row.video_p25_watched_actions, 'video_view')
    const p75 = actionVal(row.video_p75_watched_actions, 'video_view')
    // Sum all purchase-type events (|| would incorrectly skip real zeros)
    const purchases =
      actionVal(row.actions, 'offsite_conversion.fb_pixel_purchase') +
      actionVal(row.actions, 'purchase') +
      actionVal(row.actions, 'omni_purchase') +
      actionVal(row.actions, 'onsite_web_purchase') +
      actionVal(row.actions, 'app_custom_event.fb_mobile_purchase')
    // Fall back to outbound link clicks when no pixel purchase events exist
    const bodyConvActions = purchases > 0
      ? purchases
      : (actionVal(row.actions, 'link_click') || actionVal(row.actions, 'outbound_click'))
    out.push({ name, playRate: plays / impressions, hookRetention: p25 / plays, bodyConversion: bodyConvActions / plays, bodyRetention: p75 / plays })
  }
  return out
}

async function fetchPages<T>(firstUrl: string, token: string, maxPages = 20): Promise<T[]> {
  const items: T[] = []
  let next: string | undefined = firstUrl
  let page = 0
  while (next && page < maxPages) {
    const sep = next.includes('?') ? '&' : '?'
    const res = await fetch(`${next}${sep}access_token=${encodeURIComponent(token)}`, { cache: 'no-store' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json()
    if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`)
    items.push(...(json.data ?? []))
    next = json.paging?.next
    page++
  }
  return items
}

async function fetchAccountRows(accountId: string, token: string, datePreset: string): Promise<AdRow[]> {
  const fields = 'ad_id,ad_name,impressions,video_play_actions,video_p25_watched_actions,video_p75_watched_actions,actions'
  const url = `${FB_GRAPH}/${accountId}/insights?fields=${fields}&level=ad&date_preset=${encodeURIComponent(datePreset)}&limit=500`
  try {
    const fbRows = await fetchPages<FBInsightRow>(url, token)
    return mapRows(fbRows)
  } catch { return [] }
}

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = []
  let idx = 0
  async function worker() { while (idx < tasks.length) { const i = idx++; results[i] = await tasks[i]() } }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get('dash_session')?.value
  if (!await validateDashSession(sessionToken)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { datePreset = 'last_30d', accountIds } = await req.json() as { datePreset?: string; accountIds?: string[] }

  try {
    const all = await listEnabledAdAccounts()
    const enabledAccounts = accountIds?.length
      ? all.filter(a => accountIds.includes(a.account_id))
      : all

    if (enabledAccounts.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta selecionada ou habilitada. Configure em Configurações.' }, { status: 400 })
    }

    const tasks = enabledAccounts.map(
      acc => () => fetchAccountRows(acc.account_id, acc.token, datePreset).then(rows => ({
        id:    acc.account_id,
        name:  acc.account_name,
        label: acc.token_label,
        rows,
      })),
    )

    const results = await pLimit(tasks, CONCURRENCY)
    const accounts = results.filter(a => a.rows.length > 0)

    return NextResponse.json({
      accounts,
      totalScanned:  enabledAccounts.length,
      totalWithData: accounts.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
