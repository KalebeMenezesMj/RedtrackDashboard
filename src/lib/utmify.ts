// ─── UTMify API Client ────────────────────────────────────────────────────────
// Base URL: https://server.utmify.com.br
// Auth:     Basic Auth para login → JWT (1h) + refresh token (7d)
// Origin obrigatório: https://app.utmify.com.br

const BASE_URL = 'https://server.utmify.com.br'
const ORIGIN   = 'https://app.utmify.com.br'

// ─── Token cache (server-side, in-memory) ─────────────────────────────────────

let cachedToken:          string | null = null
let tokenExpiresAt:       number        = 0
let cachedRefreshToken:   string | null = null
let refreshExpiresAt:     number        = 0
// Token is2FA = true (necessário para endpoints de campanhas)
let cached2FAToken:       string | null = null
let token2FAExpiresAt:    number        = 0

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
  const email    = process.env.UTMIFY_EMAIL    ?? ''
  const password = process.env.UTMIFY_PASSWORD ?? ''

  if (!email || !password) {
    throw new Error('UTMify: UTMIFY_EMAIL e UTMIFY_PASSWORD não estão configurados no .env.local')
  }

  const creds = Buffer.from(`${email}:${password}`).toString('base64')

  const res = await fetch(`${BASE_URL}/users/auth`, {
    headers: {
      Authorization: `Basic ${creds}`,
      Origin:        ORIGIN,
      'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`UTMify login falhou (${res.status}): ${body.slice(0, 200)}`)
  }

  const data: {
    auth: {
      token:                 string
      expInSecs:             number
      refreshToken:          string
      refreshTokenExpInSecs: number
    }
  } = await res.json()

  cachedToken        = data.auth.token
  cachedRefreshToken = data.auth.refreshToken
  tokenExpiresAt     = Date.now() + (57 * 60 * 1000)
  refreshExpiresAt   = Date.now() + (6 * 24 * 60 * 60 * 1000)

  console.log('[UTMify] Login realizado com sucesso')
  return cachedToken
}

async function doRefresh(): Promise<string> {
  if (!cachedRefreshToken) return login()

  const res = await fetch(`${BASE_URL}/users/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body:    JSON.stringify({ token: cachedRefreshToken }),
    cache:   'no-store',
  })

  if (!res.ok) {
    console.warn('[UTMify] Refresh falhou — fazendo login completo')
    return login()
  }

  const data: { token: string } = await res.json()
  cachedToken    = data.token
  tokenExpiresAt = Date.now() + (57 * 60 * 1000)
  // O refresh token produz token com is2FA: true — cacheia também como 2FA
  cached2FAToken    = data.token
  token2FAExpiresAt = Date.now() + (57 * 60 * 1000)
  return cachedToken
}

// Token is2FA: true — necessário para /orders/search-objects e derivados
// Estratégia: sempre faz refresh (o /refresh-token devolve is2FA: true)
async function get2FAToken(): Promise<string> {
  const now = Date.now()
  if (cached2FAToken && now < token2FAExpiresAt) return cached2FAToken
  // Garante que temos refresh token primeiro
  if (!cachedRefreshToken || now >= refreshExpiresAt) await login()
  return doRefresh()
}

async function getToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt)           return cachedToken
  if (cachedRefreshToken && now < refreshExpiresAt)  return doRefresh()
  return login()
}

function reqHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Origin:         ORIGIN,
    Referer:        `${ORIGIN}/`,
    'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface UTMifyDashboard {
  id:          string
  name:        string
  userId:      string
  description: string | null
}

export interface UTMifyHourPoint   { hour:      number; count: number }
export interface UTMifyDowPoint    { dayOfWeek: number; count: number }
export interface UTMifySourcePoint { source: string;    count: number }
export interface UTMifyCountryPoint{ country: string;   count: number }
export interface UTMifyProductRow  { name: string; count: number; revenue: number }
export interface UTMifyHourlyProfit{ hour: number; profit: number }

export interface UTMifyPaymentMethod {
  revenue: number  // BRL
  count:   number
  pct:     number  // 0-100
}

export interface UTMifyKPIData {
  // ── Financeiro ──────────────────────────────────────────────────────────────
  revenue:           number   // comissions.net / 100
  revenueGross:      number   // comissions.gross / 100
  revenuePending:    number   // comissions.pendingGrossRevenue / 100
  revenueRefunded:   number   // comissions.refundedGrossRevenue / 100 (negativo)
  revenueChargeback: number   // comissions.chargebackGrossRevenue / 100
  spend:             number   // ads.spent / 100
  profit:            number   // analytics.profit / 100
  profitMargin:      number   // analytics.profitMargin * 100 → %
  roi:               number   // (analytics.roi - 1) * 100 → %
  roas:              number   // analytics.roas (multiplicador)
  fees:              number   // analytics.fees / 100
  taxes:             number   // analytics.taxes / 100
  metaAdsTax:        number   // analytics.metaAdsTax / 100

  // ── Pedidos ─────────────────────────────────────────────────────────────────
  orders:              number  // ordersCount.approved
  ordersTotal:         number  // ordersCount.total
  ordersPending:       number  // ordersCount.pending
  ordersRefunded:      number  // ordersCount.refunded
  ordersChargedback:   number  // ordersCount.chargedback
  ordersCreditCard:    number  // ordersCount.totalCreditCard
  refundRate:          number  // statistics.refundRate * 100 → %
  cpa:                 number  // analytics.cpa / 100
  avgTicket:           number  // analytics.avgTicket / 100
  arpu:                number  // analytics.arpu / 100
  leads:               number  // ads.leads

  // ── Engajamento ─────────────────────────────────────────────────────────────
  clicks:             number  // ads.clicks
  pageViews:          number  // ads.pageViews
  initiateCheckouts:  number  // ads.initiateCheckouts
  conversations:      number  // analytics.conversations

  // ── Plataformas (gasto em BRL) ───────────────────────────────────────────────
  platforms: {
    meta:    number
    google:  number
    tiktok:  number
    kwai:    number
    taboola: number
  }
  platformClicks: {
    meta:    number
    google:  number
    tiktok:  number
    kwai:    number
    taboola: number
  }
  platformPageViews: {
    meta:    number
    google:  number
    tiktok:  number
    kwai:    number
    taboola: number
  }

  // ── Formas de Pagamento ──────────────────────────────────────────────────────
  paymentMethods: {
    card:   UTMifyPaymentMethod
    pix:    UTMifyPaymentMethod
    boleto: UTMifyPaymentMethod
  }

  // ── Distribuições ────────────────────────────────────────────────────────────
  topProducts:      UTMifyProductRow[]
  byHour:           UTMifyHourPoint[]      // pedidos por hora (0-23)
  byDayOfWeek:      UTMifyDowPoint[]       // pedidos por dia (0=dom, 6=sáb)
  topUtmSources:    UTMifySourcePoint[]
  topUtmMediums:    UTMifySourcePoint[]
  topUtmCampaigns:  UTMifySourcePoint[]
  topUtmContents:   UTMifySourcePoint[]
  topUtmTerms:      UTMifySourcePoint[]
  topCountries:     UTMifyCountryPoint[]
  profitByHour:     UTMifyHourlyProfit[]   // lucro horário em BRL
}

// ─── Helpers de data ──────────────────────────────────────────────────────────

/** YYYY-MM-DD (BRT) → ISO UTC (BRT = UTC-3) */
export function localDateToUTC(date: string, end = false): string {
  const [y, m, d] = date.split('-').map(Number)
  if (end) {
    const next = new Date(Date.UTC(y, m - 1, d + 1, 2, 59, 59, 999))
    return next.toISOString()
  }
  return `${date}T03:00:00.000Z`
}

// ─── Funções exportadas ───────────────────────────────────────────────────────

export async function fetchDashboards(): Promise<UTMifyDashboard[]> {
  const token = await getToken()
  const res   = await fetch(`${BASE_URL}/dashboards`, {
    headers: reqHeaders(token),
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`UTMify /dashboards falhou (${res.status})`)
  const data: { dashboards?: UTMifyDashboard[] } = await res.json()
  return data.dashboards ?? []
}

export async function fetchDashboardInfo(
  dashboardId: string,
  from: string,
  to:   string,
): Promise<UTMifyKPIData> {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/orders/dashboard-info`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({
      dashboardId,
      dateRange: {
        from: localDateToUTC(from, false),
        to:   localDateToUTC(to,   true),
      },
      platforms:           null,
      trafficSource:       null,
      productNames:        null,
      metaAdAccountIds:    null,
      googleAdAccountIds:  null,
      kwaiAdAccountIds:    null,
      tikTokAdAccountIds:  null,
      taboolaAdAccountIds: null,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`UTMify /orders/dashboard-info falhou (${res.status}): ${text.slice(0, 200)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = await res.json()

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const c2r = (v: unknown) => typeof v === 'number' ? v / 100 : 0

  // ── Formas de pagamento ──────────────────────────────────────────────────────
  // statistics.revenuePercByPaymentMethod pode ser {CREDIT_CARD: 0.9, PIX: 0.08, BOLETO: 0.02}
  const percMap: Record<string, number> = d.statistics?.revenuePercByPaymentMethod ?? {}
  const cardPct   = (percMap['CREDIT_CARD'] ?? percMap['card']   ?? 0) * 100
  const pixPct    = (percMap['PIX']         ?? percMap['pix']    ?? 0) * 100
  const boletoPct = (percMap['BOLETO']      ?? percMap['boleto'] ?? 0) * 100
  const netRev    = c2r(d.comissions?.net)

  // statistics.card / .pix / .boleto podem ter revenue (centavos) ou count
  const parsePayment = (
    obj: unknown,
    pct: number,
  ): UTMifyPaymentMethod => {
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>
      return {
        revenue: c2r(o.revenue ?? o.totalRevenue ?? o.net),
        count:   typeof o.count === 'number' ? o.count
               : typeof o.total === 'number' ? o.total
               : 0,
        pct,
      }
    }
    return { revenue: netRev * (pct / 100), count: 0, pct }
  }

  // ── Distribuições ────────────────────────────────────────────────────────────
  const byHour: UTMifyHourPoint[] = (d.ordersCount?.byHour ?? []).map(
    (h: { hour: number; count: number }) => ({ hour: h.hour, count: h.count }),
  )
  const byDayOfWeek: UTMifyDowPoint[] = (d.ordersCount?.byDayOfWeek ?? []).map(
    (x: { dayOfWeek: number; count: number }) => ({ dayOfWeek: x.dayOfWeek, count: x.count }),
  )
  const topUtmSources: UTMifySourcePoint[] = (d.ordersCount?.byUtmSource ?? [])
    .filter((x: { utmSource: string | null }) => x.utmSource)
    .slice(0, 20)
    .map((x: { utmSource: string; count: number }) => ({ source: x.utmSource, count: x.count }))

  const topUtmMediums: UTMifySourcePoint[] = (d.ordersCount?.byUtmMedium ?? [])
    .filter((x: { utmMedium: string | null }) => x.utmMedium)
    .slice(0, 20)
    .map((x: { utmMedium: string; count: number }) => ({ source: x.utmMedium, count: x.count }))

  const topUtmCampaigns: UTMifySourcePoint[] = (d.ordersCount?.byUtmCampaign ?? [])
    .filter((x: { utmCampaign: string | null }) => x.utmCampaign)
    .slice(0, 20)
    .map((x: { utmCampaign: string; count: number }) => ({ source: x.utmCampaign, count: x.count }))

  const topUtmContents: UTMifySourcePoint[] = (d.ordersCount?.byUtmContent ?? [])
    .filter((x: { utmContent: string | null }) => x.utmContent)
    .slice(0, 20)
    .map((x: { utmContent: string; count: number }) => ({ source: x.utmContent, count: x.count }))

  const topUtmTerms: UTMifySourcePoint[] = (d.ordersCount?.byUtmTerm ?? [])
    .filter((x: { utmTerm: string | null }) => x.utmTerm)
    .slice(0, 20)
    .map((x: { utmTerm: string; count: number }) => ({ source: x.utmTerm, count: x.count }))

  const topCountries: UTMifyCountryPoint[] = (d.ordersCount?.byCustomerCountry ?? [])
    .slice(0, 8)
    .map((x: { country: string; count: number }) => ({ country: x.country, count: x.count }))

  const topProducts: UTMifyProductRow[] = (d.ordersCount?.byProductName ?? [])
    .slice(0, 8)
    .map((p: { productName: string; count: number; revenue: number }) => ({
      name:    p.productName,
      count:   p.count,
      revenue: c2r(p.revenue),
    }))

  const profitByHour: UTMifyHourlyProfit[] = (d.profitByHourNet ?? []).map(
    (h: { hour: number; value: number }) => ({ hour: h.hour, profit: c2r(h.value) }),
  )

  const roaMult = d.analytics?.roas ?? d.analytics?.roi ?? 0

  return {
    // Financeiro
    revenue:           c2r(d.comissions?.net),
    revenueGross:      c2r(d.comissions?.gross),
    revenuePending:    c2r(d.comissions?.pendingGrossRevenue),
    revenueRefunded:   c2r(d.comissions?.refundedGrossRevenue),
    revenueChargeback: c2r(d.comissions?.chargebackGrossRevenue),
    spend:             c2r(d.ads?.spent),
    profit:            c2r(d.analytics?.profit),
    profitMargin:      (d.analytics?.profitMargin ?? 0) * 100,
    roi:               (roaMult - 1) * 100,
    roas:              roaMult,
    fees:              c2r(d.analytics?.fees),
    taxes:             c2r(d.analytics?.taxes),
    metaAdsTax:        c2r(d.analytics?.metaAdsTax),
    // Pedidos
    orders:              d.ordersCount?.approved  ?? 0,
    ordersTotal:         d.ordersCount?.total      ?? 0,
    ordersPending:       d.ordersCount?.pending    ?? 0,
    ordersRefunded:      d.ordersCount?.refunded   ?? 0,
    ordersChargedback:   d.ordersCount?.chargedback ?? 0,
    ordersCreditCard:    d.ordersCount?.totalCreditCard ?? 0,
    refundRate:          (d.statistics?.refundRate ?? 0) * 100,
    cpa:                 c2r(d.analytics?.cpa),
    avgTicket:           c2r(d.analytics?.avgTicket),
    arpu:                c2r(d.analytics?.arpu),
    leads:               d.ads?.leads ?? 0,
    // Engajamento
    clicks:             d.ads?.clicks             ?? 0,
    pageViews:          d.ads?.pageViews           ?? 0,
    initiateCheckouts:  d.ads?.initiateCheckouts   ?? 0,
    conversations:      d.analytics?.conversations ?? 0,
    // Plataformas
    platforms: {
      meta:    c2r(d.ads?.meta?.spent),
      google:  c2r(d.ads?.google?.spent),
      tiktok:  c2r(d.ads?.tikTok?.spent),
      kwai:    c2r(d.ads?.kwai?.spent),
      taboola: c2r(d.ads?.taboola?.spent),
    },
    platformClicks: {
      meta:    d.ads?.meta?.clicks    ?? 0,
      google:  d.ads?.google?.clicks  ?? 0,
      tiktok:  d.ads?.tikTok?.clicks  ?? 0,
      kwai:    d.ads?.kwai?.clicks    ?? 0,
      taboola: d.ads?.taboola?.clicks ?? 0,
    },
    platformPageViews: {
      meta:    d.ads?.meta?.pageViews    ?? 0,
      google:  d.ads?.google?.pageViews  ?? 0,
      tiktok:  d.ads?.tikTok?.pageViews  ?? 0,
      kwai:    d.ads?.kwai?.pageViews    ?? 0,
      taboola: d.ads?.taboola?.pageViews ?? 0,
    },
    // Pagamentos
    paymentMethods: {
      card:   parsePayment(d.statistics?.card,   cardPct),
      pix:    parsePayment(d.statistics?.pix,    pixPct),
      boleto: parsePayment(d.statistics?.boleto, boletoPct),
    },
    // Distribuições
    topProducts,
    byHour,
    byDayOfWeek,
    topUtmSources,
    topUtmMediums,
    topUtmCampaigns,
    topUtmContents,
    topUtmTerms,
    topCountries,
    profitByHour,
  }
}

export async function fetchFilters(dashboardId: string): Promise<{
  productNames: string[]
  platforms:    string[]
}> {
  const token = await getToken()
  const res   = await fetch(`${BASE_URL}/orders/filters`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({ dashboardId }),
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`UTMify /orders/filters falhou (${res.status})`)
  return res.json()
}

// ─── Tipos de Perfis / Contas ─────────────────────────────────────────────────

export interface UTMifyAdAccount {
  id:             string
  name:           string
  enabled?:       boolean
  status?:        string
  tokenExpired?:  boolean
}

export interface UTMifyProfile {
  id:            string
  email:         string
  name:          string
  tokenExpired?: boolean
  adAccounts:    UTMifyAdAccount[]
  platform:      'meta' | 'google' | 'tiktok' | 'kwai'
}

// Busca perfis Meta Ads com suas ad accounts (POST /dashboards/meta/profiles/list)
export async function fetchMetaProfiles(dashboardId: string): Promise<UTMifyProfile[]> {
  const token = await getToken()
  const res   = await fetch(`${BASE_URL}/dashboards/meta/profiles/list`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({ dashboardId }),
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`UTMify /dashboards/meta/profiles/list falhou (${res.status})`)
  const data: unknown[] = await res.json()
  return (Array.isArray(data) ? data : []).map((p: unknown) => {
    const profile = p as Record<string, unknown>
    return {
      id:           String(profile.id ?? ''),
      email:        String(profile.email ?? ''),
      name:         String(profile.name ?? ''),
      tokenExpired: Boolean(profile.tokenExpired),
      adAccounts:   ((profile.adAccounts ?? []) as Record<string, unknown>[]).map(a => ({
        id:      String(a.id ?? ''),
        name:    String(a.name ?? ''),
        enabled: a.enabled !== false,
        status:  String(a.status ?? ''),
      })),
      platform: 'meta' as const,
    }
  })
}

// Busca perfis Google Ads com suas ad accounts (POST /dashboards/google/profiles/list)
export async function fetchGoogleProfiles(dashboardId: string): Promise<UTMifyProfile[]> {
  const token = await getToken()
  const res   = await fetch(`${BASE_URL}/dashboards/google/profiles/list`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({ dashboardId }),
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`UTMify /dashboards/google/profiles/list falhou (${res.status})`)
  const data: unknown[] = await res.json()
  return (Array.isArray(data) ? data : []).map((p: unknown) => {
    const profile = p as Record<string, unknown>
    return {
      id:           String(profile.id ?? ''),
      email:        String(profile.email ?? ''),
      name:         String(profile.name ?? ''),
      tokenExpired: Boolean(profile.tokenExpired),
      adAccounts:   ((profile.adAccounts ?? []) as Record<string, unknown>[]).map(a => ({
        id:      String(a.id ?? ''),
        name:    String(a.name ?? ''),
        enabled: a.enabled !== false,
        status:  String(a.status ?? ''),
      })),
      platform: 'google' as const,
    }
  })
}

// Filters opcionais para dashboard-info por conta / plataforma
export interface UTMifyFilters {
  platforms?:          string[]          // ex: ["Meta"]
  trafficSource?:      string            // ex: "Meta" | "Google" | "TikTok" | "Kwai" | "Taboola"
  metaAdAccountIds?:   string[]
  googleAdAccountIds?: string[]
  tiktokAdAccountIds?: string[]
  kwaiAdAccountIds?:   string[]
}

// Busca dashboard-info com filtros opcionais de conta / plataforma
export async function fetchDashboardInfoFiltered(
  dashboardId: string,
  from:        string,
  to:          string,
  filters:     UTMifyFilters = {},
): Promise<UTMifyKPIData> {
  const token = await getToken()

  const body = {
    dashboardId,
    dateRange: {
      from: localDateToUTC(from, false),
      to:   localDateToUTC(to,   true),
    },
    platforms:           filters.platforms          ?? null,
    trafficSource:       filters.trafficSource      ?? null,
    productNames:        null,
    metaAdAccountIds:    filters.metaAdAccountIds   ?? null,
    googleAdAccountIds:  filters.googleAdAccountIds ?? null,
    kwaiAdAccountIds:    filters.kwaiAdAccountIds   ?? null,
    tikTokAdAccountIds:  filters.tiktokAdAccountIds ?? null,
    taboolaAdAccountIds: null,
  }

  const res = await fetch(`${BASE_URL}/orders/dashboard-info`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify(body),
    cache:   'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`UTMify /orders/dashboard-info falhou (${res.status}): ${text.slice(0, 200)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = await res.json()
  const c2r    = (v: unknown) => typeof v === 'number' ? v / 100 : 0

  const percMap: Record<string, number> = d.statistics?.revenuePercByPaymentMethod ?? {}
  const cardPct   = (percMap['CREDIT_CARD'] ?? percMap['card']   ?? 0) * 100
  const pixPct    = (percMap['PIX']         ?? percMap['pix']    ?? 0) * 100
  const boletoPct = (percMap['BOLETO']      ?? percMap['boleto'] ?? 0) * 100
  const netRev    = c2r(d.comissions?.net)

  const parsePayment = (obj: unknown, pct: number) => {
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>
      return {
        revenue: c2r(o.revenue ?? o.totalRevenue ?? o.net),
        count:   typeof o.count === 'number' ? o.count : typeof o.total === 'number' ? o.total : 0,
        pct,
      }
    }
    return { revenue: netRev * (pct / 100), count: 0, pct }
  }

  const byHour: UTMifyHourPoint[]    = (d.ordersCount?.byHour ?? []).map((h: { hour: number; count: number }) => ({ hour: h.hour, count: h.count }))
  const byDayOfWeek: UTMifyDowPoint[] = (d.ordersCount?.byDayOfWeek ?? []).map((x: { dayOfWeek: number; count: number }) => ({ dayOfWeek: x.dayOfWeek, count: x.count }))

  const topUtmSources: UTMifySourcePoint[] = (d.ordersCount?.byUtmSource ?? [])
    .filter((x: { utmSource: string | null }) => x.utmSource)
    .slice(0, 20)
    .map((x: { utmSource: string; count: number }) => ({ source: x.utmSource, count: x.count }))

  const topUtmMediums: UTMifySourcePoint[] = (d.ordersCount?.byUtmMedium ?? [])
    .filter((x: { utmMedium: string | null }) => x.utmMedium)
    .slice(0, 20)
    .map((x: { utmMedium: string; count: number }) => ({ source: x.utmMedium, count: x.count }))

  const topUtmCampaigns: UTMifySourcePoint[] = (d.ordersCount?.byUtmCampaign ?? [])
    .filter((x: { utmCampaign: string | null }) => x.utmCampaign)
    .slice(0, 20)
    .map((x: { utmCampaign: string; count: number }) => ({ source: x.utmCampaign, count: x.count }))

  const topUtmContents: UTMifySourcePoint[] = (d.ordersCount?.byUtmContent ?? [])
    .filter((x: { utmContent: string | null }) => x.utmContent)
    .slice(0, 20)
    .map((x: { utmContent: string; count: number }) => ({ source: x.utmContent, count: x.count }))

  const topUtmTerms: UTMifySourcePoint[] = (d.ordersCount?.byUtmTerm ?? [])
    .filter((x: { utmTerm: string | null }) => x.utmTerm)
    .slice(0, 50)
    .map((x: { utmTerm: string; count: number }) => ({ source: x.utmTerm, count: x.count }))

  const topCountries: UTMifyCountryPoint[] = (d.ordersCount?.byCustomerCountry ?? [])
    .slice(0, 8)
    .map((x: { country: string; count: number }) => ({ country: x.country, count: x.count }))

  const topProducts: UTMifyProductRow[] = (d.ordersCount?.byProductName ?? [])
    .slice(0, 8)
    .map((p: { productName: string; count: number; revenue: number }) => ({
      name:    p.productName,
      count:   p.count,
      revenue: c2r(p.revenue),
    }))

  const profitByHour: UTMifyHourlyProfit[] = (d.profitByHourNet ?? []).map(
    (h: { hour: number; value: number }) => ({ hour: h.hour, profit: c2r(h.value) }),
  )

  const roaMult = d.analytics?.roas ?? d.analytics?.roi ?? 0

  return {
    revenue:           c2r(d.comissions?.net),
    revenueGross:      c2r(d.comissions?.gross),
    revenuePending:    c2r(d.comissions?.pendingGrossRevenue),
    revenueRefunded:   c2r(d.comissions?.refundedGrossRevenue),
    revenueChargeback: c2r(d.comissions?.chargebackGrossRevenue),
    spend:             c2r(d.ads?.spent),
    profit:            c2r(d.analytics?.profit),
    profitMargin:      (d.analytics?.profitMargin ?? 0) * 100,
    roi:               (roaMult - 1) * 100,
    roas:              roaMult,
    fees:              c2r(d.analytics?.fees),
    taxes:             c2r(d.analytics?.taxes),
    metaAdsTax:        c2r(d.analytics?.metaAdsTax),
    orders:              d.ordersCount?.approved    ?? 0,
    ordersTotal:         d.ordersCount?.total        ?? 0,
    ordersPending:       d.ordersCount?.pending      ?? 0,
    ordersRefunded:      d.ordersCount?.refunded     ?? 0,
    ordersChargedback:   d.ordersCount?.chargedback  ?? 0,
    ordersCreditCard:    d.ordersCount?.totalCreditCard ?? 0,
    refundRate:          (d.statistics?.refundRate ?? 0) * 100,
    cpa:                 c2r(d.analytics?.cpa),
    avgTicket:           c2r(d.analytics?.avgTicket),
    arpu:                c2r(d.analytics?.arpu),
    leads:               d.ads?.leads ?? 0,
    clicks:             d.ads?.clicks            ?? 0,
    pageViews:          d.ads?.pageViews          ?? 0,
    initiateCheckouts:  d.ads?.initiateCheckouts  ?? 0,
    conversations:      d.analytics?.conversations ?? 0,
    platforms: {
      meta:    c2r(d.ads?.meta?.spent),
      google:  c2r(d.ads?.google?.spent),
      tiktok:  c2r(d.ads?.tikTok?.spent),
      kwai:    c2r(d.ads?.kwai?.spent),
      taboola: c2r(d.ads?.taboola?.spent),
    },
    platformClicks: {
      meta:    d.ads?.meta?.clicks    ?? 0,
      google:  d.ads?.google?.clicks  ?? 0,
      tiktok:  d.ads?.tikTok?.clicks  ?? 0,
      kwai:    d.ads?.kwai?.clicks    ?? 0,
      taboola: d.ads?.taboola?.clicks ?? 0,
    },
    platformPageViews: {
      meta:    d.ads?.meta?.pageViews    ?? 0,
      google:  d.ads?.google?.pageViews  ?? 0,
      tiktok:  d.ads?.tikTok?.pageViews  ?? 0,
      kwai:    d.ads?.kwai?.pageViews    ?? 0,
      taboola: d.ads?.taboola?.pageViews ?? 0,
    },
    paymentMethods: {
      card:   parsePayment(d.statistics?.card,   cardPct),
      pix:    parsePayment(d.statistics?.pix,    pixPct),
      boleto: parsePayment(d.statistics?.boleto, boletoPct),
    },
    topProducts,
    byHour,
    byDayOfWeek,
    topUtmSources,
    topUtmMediums,
    topUtmCampaigns,
    topUtmContents,
    topUtmTerms,
    topCountries,
    profitByHour,
  }
}

// ─── Tipos de Campanhas ───────────────────────────────────────────────────────

export type CampaignLevel  = 'campaign' | 'account' | 'adGroup' | 'ad'
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'DELETED' | string

export interface UTMifyCampaignRow {
  id:                  string
  accountId:           string
  campaignId?:         string
  name:                string
  level:               CampaignLevel
  status:              CampaignStatus
  channel:             string
  platform:            'meta' | 'google'
  spend:               number
  revenue:             number
  profit:              number
  roas:                number
  roi:                 number
  clicks:              number
  impressions:         number
  frequency:           number
  approvedOrdersCount: number
  pendingOrdersCount:  number
  cpa:                 number | null
  cpm:                 number | null
  cpc:                 number | null
  dailyBudget:         number | null
  lifetimeBudget:      number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCampaignRow(r: any, platform: 'meta' | 'google'): UTMifyCampaignRow {
  const c2r = (v: unknown) => typeof v === 'number' ? v / 100 : 0
  const roasMult = r.roas ?? 0
  return {
    id:                  String(r.id ?? ''),
    accountId:           String(r.accountId ?? ''),
    campaignId:          r.campaignId != null ? String(r.campaignId) : undefined,
    name:                String(r.name ?? ''),
    level:               (r.level ?? 'campaign') as CampaignLevel,
    status:              (r.status ?? 'UNKNOWN') as CampaignStatus,
    channel:             String(r.channel ?? ''),
    platform,
    spend:               c2r(r.spend),
    revenue:             c2r(r.revenue),
    profit:              c2r(r.profit),
    roas:                roasMult,
    roi:                 (roasMult - 1) * 100,
    clicks:              r.inlineLinkClicks ?? r.clicks ?? 0,
    impressions:         r.impressions      ?? 0,
    frequency:           r.frequency        ?? 0,
    approvedOrdersCount: r.approvedOrdersCount ?? 0,
    pendingOrdersCount:  r.pendingOrdersCount  ?? 0,
    cpa:                 r.cpa    != null ? c2r(r.cpa)    : null,
    cpm:                 r.cpm    != null ? c2r(r.cpm)    : null,
    cpc:                 r.cpc    != null ? c2r(r.cpc)    : null,
    dailyBudget:         r.dailyBudget    != null ? c2r(r.dailyBudget)    : null,
    lifetimeBudget:      r.lifetimeBudget != null ? c2r(r.lifetimeBudget) : null,
  }
}

export interface SearchObjectsOptions {
  level?:        CampaignLevel
  adAccountIds?: string[] | null
  nameContains?: string | null
  status?:       string | null
  productNames?: string[] | null
}

export async function fetchMetaCampaigns(
  dashboardId: string,
  from:         string,
  to:           string,
  opts:         SearchObjectsOptions = {},
): Promise<UTMifyCampaignRow[]> {
  const token = await get2FAToken()
  const res = await fetch(`${BASE_URL}/orders/search-objects`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({
      level:        opts.level        ?? 'campaign',
      dateRange:    { from: localDateToUTC(from, false), to: localDateToUTC(to, true) },
      dashboardId,
      adAccountIds: opts.adAccountIds ?? null,
      nameContains: opts.nameContains ?? null,
      status:       opts.status       ?? null,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`UTMify /orders/search-objects falhou (${res.status}): ${text.slice(0, 200)}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = await res.json()
  const results: unknown[] = Array.isArray(d) ? d : (d.results ?? [])
  return results.map(r => parseCampaignRow(r, 'meta'))
}

export async function fetchGoogleCampaigns(
  dashboardId: string,
  from:         string,
  to:           string,
  opts:         SearchObjectsOptions = {},
): Promise<UTMifyCampaignRow[]> {
  const token = await get2FAToken()
  const res = await fetch(`${BASE_URL}/orders/search-objects/google`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({
      level:        opts.level        ?? 'campaign',
      dateRange:    { from: localDateToUTC(from, false), to: localDateToUTC(to, true) },
      dashboardId,
      adAccountIds: opts.adAccountIds ?? null,
      nameContains: opts.nameContains ?? null,
      productNames: opts.productNames ?? null,
      status:       opts.status       ?? null,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`UTMify /orders/search-objects/google falhou (${res.status}): ${text.slice(0, 200)}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = await res.json()
  const results: unknown[] = Array.isArray(d) ? d : (d.results ?? [])
  return results.map(r => parseCampaignRow(r, 'google'))
}

export interface UTMifyMetaAdAccount {
  id:         string
  name:       string
  timezone:   string
  status:     string
  enabled:    boolean
  profileIds: string[]
}

export async function fetchMetaAdAccounts(
  dashboardId: string,
): Promise<UTMifyMetaAdAccount[]> {
  const token = await get2FAToken()
  const res = await fetch(`${BASE_URL}/dashboards/meta/ad-accounts/list`, {
    method:  'POST',
    headers: reqHeaders(token),
    body:    JSON.stringify({ dashboardId }),
    cache:   'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`UTMify /dashboards/meta/ad-accounts/list falhou (${res.status}): ${text.slice(0, 200)}`)
  }
  const data: unknown[] = await res.json()
  return (Array.isArray(data) ? data : []).map((a: unknown) => {
    const r = a as Record<string, unknown>
    return {
      id:         String(r.id   ?? ''),
      name:       String(r.name ?? ''),
      timezone:   String(r.timezone ?? ''),
      status:     String(r.status   ?? ''),
      enabled:    r.enabled !== false,
      profileIds: (Array.isArray(r.profileIds) ? r.profileIds : []).map(String),
    }
  })
}
