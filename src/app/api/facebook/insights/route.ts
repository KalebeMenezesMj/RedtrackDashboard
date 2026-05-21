/**
 * Facebook Marketing API — Ad Insights proxy
 *
 * POST /api/facebook/insights
 * Body: {
 *   accessToken:   string
 *   adAccountIds:  string[]   // fetch only these accounts
 *   datePreset?:   "last_7d" | "last_14d" | "last_30d" | "last_60d" | "last_90d"
 * }
 *
 * Returns: {
 *   accounts: { id, name, rows: AdRow[] }[]
 *   totalScanned:  number
 *   totalWithData: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

const FB_API_VERSION = 'v20.0'
const FB_GRAPH = `https://graph.facebook.com/${FB_API_VERSION}`
const CONCURRENCY = 6   // requisições paralelas por vez

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdRow {
  name: string
  playRate:       number
  hookRetention:  number
  bodyConversion: number
  bodyRetention:  number
}

interface FBActionValue {
  action_type: string
  value: string
}

interface FBInsightRow {
  ad_id: string
  ad_name: string
  impressions?: string
  video_play_actions?:      FBActionValue[]
  video_p25_watched_actions?: FBActionValue[]
  video_p75_watched_actions?: FBActionValue[]
  actions?: FBActionValue[]
}

interface FBInsightsResponse {
  data: FBInsightRow[]
  paging?: { next?: string }
  error?: { message: string; code: number }
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actionVal(arr: FBActionValue[] | undefined, type: string): number {
  const found = arr?.find(a => a.action_type === type)
  return found ? parseFloat(found.value) || 0 : 0
}

function safeNum(s: string | undefined): number {
  return s ? parseFloat(s) || 0 : 0
}

/** Map FB insight rows → AdRow[], silently skips non-video ads */
function mapRows(fbRows: FBInsightRow[]): AdRow[] {
  const out: AdRow[] = []
  for (const row of fbRows) {
    const name = row.ad_name?.trim()
    if (!name) continue
    const impressions = safeNum(row.impressions)
    const plays =
      actionVal(row.video_play_actions, 'video_play') ||
      actionVal(row.actions, 'video_view')
    if (plays === 0 || impressions === 0) continue
    const p25 = actionVal(row.video_p25_watched_actions, 'video_view')
    const p75 = actionVal(row.video_p75_watched_actions, 'video_view')
    const purchases =
      actionVal(row.actions, 'purchase') ||
      actionVal(row.actions, 'omni_purchase') ||
      actionVal(row.actions, 'offsite_conversion.fb_pixel_purchase')
    out.push({
      name,
      playRate:       plays / impressions,
      hookRetention:  p25 / plays,
      bodyConversion: purchases / plays,
      bodyRetention:  p75 / plays,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Fetch all pages of a paginated FB endpoint
// ---------------------------------------------------------------------------

async function fetchPages<T>(
  firstUrl: string,
  token: string,
  maxPages = 20,
): Promise<T[]> {
  const items: T[] = []
  let next: string | undefined = firstUrl
  let page = 0
  while (next && page < maxPages) {
    const sep = next.includes('?') ? '&' : '?'
    const fetchRes = await fetch(`${next}${sep}access_token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await fetchRes.json()
    if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`)
    items.push(...(json.data ?? []))
    next = json.paging?.next
    page++
  }
  return items
}

// ---------------------------------------------------------------------------
// Fetch insights for ONE account, return AdRow[]
// Returns [] on any error (so one bad account doesn't break the whole batch)
// ---------------------------------------------------------------------------

async function fetchAccountRows(
  accountId: string,
  token: string,
  datePreset: string,
): Promise<AdRow[]> {
  const fields = [
    'ad_id', 'ad_name', 'impressions',
    'video_play_actions', 'video_p25_watched_actions',
    'video_p75_watched_actions', 'actions',
  ].join(',')

  const url =
    `${FB_GRAPH}/${accountId}/insights` +
    `?fields=${fields}` +
    `&level=ad` +
    `&date_preset=${encodeURIComponent(datePreset)}` +
    `&limit=500`

  try {
    const fbRows = await fetchPages<FBInsightRow>(url, token)
    return mapRows(fbRows)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Run N promises with limited concurrency
// ---------------------------------------------------------------------------

async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { accessToken, adAccountIds, datePreset = 'last_30d' } = await req.json() as {
      accessToken:  string
      adAccountIds: { id: string; name: string }[]
      datePreset?:  string
    }

    if (!accessToken?.trim() || !adAccountIds?.length) {
      return NextResponse.json(
        { error: 'accessToken e adAccountIds são obrigatórios' },
        { status: 400 },
      )
    }

    const token = accessToken.trim()

    // Fetch insights for selected accounts in parallel
    const tasks = adAccountIds.map(
      acc => () => fetchAccountRows(acc.id, token, datePreset).then(rows => ({ ...acc, rows })),
    )

    const results = await pLimit(tasks, CONCURRENCY)
    const accounts = results.filter(a => a.rows.length > 0)

    return NextResponse.json({
      accounts,
      totalScanned:  adAccountIds.length,
      totalWithData: accounts.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[facebook/insights]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const token     = searchParams.get('token')

  if (!token || !accountId) {
    return NextResponse.json({ error: 'token e accountId são obrigatórios' }, { status: 400 })
  }

  const url =
    `${FB_GRAPH}/${accountId}/campaigns` +
    `?fields=id,name,status,objective` +
    `&limit=200` +
    `&access_token=${encodeURIComponent(token)}`

  try {
    const res  = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (json.error) return NextResponse.json({ error: json.error.message }, { status: 400 })
    return NextResponse.json({ campaigns: json.data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
