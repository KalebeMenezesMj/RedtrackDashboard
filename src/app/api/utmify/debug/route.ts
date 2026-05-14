// GET /api/utmify/debug?dashboardId=XXX
// Retorna o raw JSON dos endpoints GET /dashboards e POST /orders/dashboard-info
// para inspecionar todos os campos e encontrar o campo de moeda

import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://server.utmify.com.br'
const ORIGIN   = 'https://app.utmify.com.br'

async function getToken(): Promise<string> {
  const email    = process.env.UTMIFY_EMAIL    ?? ''
  const password = process.env.UTMIFY_PASSWORD ?? ''
  const creds    = Buffer.from(`${email}:${password}`).toString('base64')

  const res = await fetch(`${BASE_URL}/users/auth`, {
    headers: {
      Authorization: `Basic ${creds}`,
      Origin:        ORIGIN,
      'User-Agent':  'Mozilla/5.0',
    },
    cache: 'no-store',
  })
  const data = await res.json()
  return data.auth.token
}

function headers(token: string) {
  return {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
    Origin:         ORIGIN,
    Referer:        `${ORIGIN}/`,
    'User-Agent':   'Mozilla/5.0',
  }
}

export async function GET(req: NextRequest) {
  const dashboardId = req.nextUrl.searchParams.get('dashboardId') ?? ''

  try {
    const token = await getToken()

    // 1) GET /dashboards — ver todos os campos de cada dashboard
    const dashRes  = await fetch(`${BASE_URL}/dashboards`, {
      headers: headers(token), cache: 'no-store',
    })
    const dashRaw  = await dashRes.json()

    // 2) POST /orders/dashboard-info — ver campos de moeda no response
    let infoRaw = null
    if (dashboardId) {
      const now  = new Date()
      const from = new Date(now); from.setDate(from.getDate() - 30)
      const pad  = (n: number) => String(n).padStart(2, '0')
      const fmt  = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

      const infoRes = await fetch(`${BASE_URL}/orders/dashboard-info`, {
        method:  'POST',
        headers: headers(token),
        body:    JSON.stringify({
          dashboardId,
          dateRange: {
            from: `${fmt(from)}T03:00:00.000Z`,
            to:   `${fmt(now)}T02:59:59.999Z`,
          },
          platforms: null, trafficSource: null, productNames: null,
          metaAdAccountIds: null, googleAdAccountIds: null,
          kwaiAdAccountIds: null, tikTokAdAccountIds: null, taboolaAdAccountIds: null,
        }),
        cache: 'no-store',
      })
      infoRaw = await infoRes.json()
    }

    // Extrai APENAS os campos não-array dos dashboards para ficar legível
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dashSummary = (dashRaw.dashboards ?? []).map((d: any) => {
      const scalarFields: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(d)) {
        if (!Array.isArray(v) && typeof v !== 'object') {
          scalarFields[k] = v
        } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          scalarFields[k] = v  // inclui objetos aninhados (ex: gateway, currency)
        } else if (Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] !== 'object') {
          scalarFields[k] = v  // arrays de primitivos
        } else {
          scalarFields[k] = `[Array(${(v as unknown[])?.length ?? 0})]`
        }
      }
      return scalarFields
    })

    // Info: remove arrays grandes, mantém campos escalares e objetos pequenos
    let infoSummary = null
    if (infoRaw) {
      infoSummary = {
        topLevelKeys:   Object.keys(infoRaw),
        // Campos escalares diretos
        scalarFields:   Object.fromEntries(
          Object.entries(infoRaw).filter(([, v]) => typeof v !== 'object' || v === null)
        ),
        // ordersCount sem os arrays grandes
        ordersCountKeys: Object.keys(infoRaw.ordersCount ?? {}),
        ordersCountScalars: Object.fromEntries(
          Object.entries(infoRaw.ordersCount ?? {}).filter(([, v]) => typeof v !== 'object')
        ),
        byCustomerCountry: infoRaw.ordersCount?.byCustomerCountry ?? [],
        analytics:  infoRaw.analytics,
        // Campos que podem ter moeda
        currencyHints: {
          'root.currency':             infoRaw.currency,
          'root.currencyCode':         infoRaw.currencyCode,
          'analytics.currency':        infoRaw.analytics?.currency,
          'comissions.currency':       infoRaw.comissions?.currency,
          'comissions.currencyCode':   infoRaw.comissions?.currencyCode,
        },
      }
    }

    return NextResponse.json({
      ok: true,
      dashboards: dashSummary,
      dashboardInfo: infoSummary,
    }, { status: 200 })

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
