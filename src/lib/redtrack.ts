import axios from 'axios'
import type {
  RedTrackReportRow,
  RedTrackReportWithTotal,
  RedTrackSettings,
  DateRange,
} from './types'

const BASE_URL = 'https://api.redtrack.io'
const API_KEY  = process.env.REDTRACK_API_KEY ?? ''

const client = axios.create({ baseURL: BASE_URL, timeout: 30_000 })

// Log corpo completo de erros para diagnóstico
client.interceptors.response.use(
  res => res,
  err => {
    if (axios.isAxiosError(err) && err.response) {
      console.error(
        `[RedTrack ${err.response.status}]`,
        JSON.stringify(err.response.data).slice(0, 300),
      )
    }
    return Promise.reject(err)
  },
)

// ─── Retry com backoff para rate limit (429) ─────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Executa `fn` com até `maxAttempts` tentativas.
 * Em caso de 429 aguarda `baseDelayMs * 2^tentativa` antes de tentar novamente.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastErr = err
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      // Só faz retry em 429 (rate limit) ou 503 (serviço indisponível)
      if (status !== 429 && status !== 503) throw err
      const delay = baseDelayMs * Math.pow(2, attempt)
      console.warn(`[RedTrack] ${status} — aguardando ${delay}ms antes da tentativa ${attempt + 2}/${maxAttempts}`)
      await sleep(delay)
    }
  }
  throw lastErr
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<RedTrackSettings> {
  const { data } = await client.get<RedTrackSettings>('/me/settings', {
    params: { api_key: API_KEY },
  })
  return data
}

// ─── Campanhas ativas (/campaigns?status=1) ───────────────────────────────────

export async function fetchActiveCampaignIds(): Promise<string[]> {
  const { data } = await withRetry(() =>
    client.get<{ id: string }[]>('/campaigns', {
      params: { api_key: API_KEY, status: 1, per: 1000 },
    })
  )
  const rows = Array.isArray(data) ? data : (data as { items?: { id: string }[] }).items ?? []
  return rows.map((r: { id: string }) => r.id).filter(Boolean)
}

// ─── Report por campanha (total=true → {items, total}) ───────────────────────

export async function fetchCampaignReport(
  dateRange: DateRange,
  campaignIds?: string[],
): Promise<RedTrackReportWithTotal> {
  const params: Record<string, unknown> = {
    api_key:   API_KEY,
    date_from: dateRange.from,
    date_to:   dateRange.to,
    group:     'campaign',
    total:     true,
    per:       1000,
  }
  if (campaignIds?.length) {
    params['campaign_id'] = campaignIds.join(',')
  }

  const { data } = await withRetry(() =>
    client.get<RedTrackReportWithTotal>('/report', { params })
  )
  if (data && typeof data === 'object' && 'items' in data) {
    return { items: data.items ?? [], total: data.total ?? {} as RedTrackReportRow }
  }
  const rows = Array.isArray(data) ? data as unknown as RedTrackReportRow[] : []
  return { items: rows, total: {} as RedTrackReportRow }
}

// ─── Report diário (array simples, group=date) ───────────────────────────────

export async function fetchDailyReport(
  dateRange: DateRange,
  campaignId?: string,
): Promise<RedTrackReportRow[]> {
  const params: Record<string, unknown> = {
    api_key:   API_KEY,
    date_from: dateRange.from,
    date_to:   dateRange.to,
    group:     'date',
    per:       1000,
  }
  if (campaignId) params['campaign_id'] = campaignId

  // Retry automático em caso de 429 com backoff 2 s → 4 s → 8 s
  const { data } = await withRetry(() =>
    client.get<RedTrackReportRow[]>('/report', { params }),
    3,      // max 3 tentativas
    2000,   // delay base 2 s
  )
  return Array.isArray(data) ? data : []
}

// ─── Report por anúncio ───────────────────────────────────────────────────────
// Usa group=rt_ad → campo `rt_ad` contém o nome real do anúncio no RedTrack
// (ex: "CP04 - [FB] [HA] [BM7/CA5]"), campo `rt_ad_id` contém o ID interno.
// Fallback: group=sub2 → campo `sub2` contém o Ad ID da plataforma (ex: "120242...").

export async function fetchAdReport(
  dateRange: DateRange,
  campaignId: string,
): Promise<RedTrackReportRow[]> {
  const baseParams: Record<string, unknown> = {
    api_key:     API_KEY,
    date_from:   dateRange.from,
    date_to:     dateRange.to,
    campaign_id: campaignId,
    per:         1000,
  }

  // 1ª tentativa: group=rt_ad → nome real do anúncio no RedTrack
  try {
    const { data } = await withRetry(
      () => client.get<RedTrackReportRow[]>('/report', { params: { ...baseParams, group: 'rt_ad' } }),
      3,
      3000,
    )
    const rows = Array.isArray(data) ? data : ((data as { items?: RedTrackReportRow[] }).items ?? [])
    if (rows.length > 0) return rows
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    if (status !== 429 && status !== 503) throw err
    console.warn('[RedTrack] group=rt_ad esgotou retries (429) — usando fallback group=sub2')
  }

  // Fallback: group=sub2 → Ad ID da plataforma
  const { data } = await withRetry(
    () => client.get<RedTrackReportRow[]>('/report', { params: { ...baseParams, group: 'sub2' } }),
    3,
    2000,
  )
  return Array.isArray(data) ? data : ((data as { items?: RedTrackReportRow[] }).items ?? [])
}

// ─── Campanhas por tag de plataforma ─────────────────────────────────────────

/**
 * Padrões de título reconhecidos por plataforma.
 * Inclui variantes com emoji (ex: "🟢 YT") além do padrão com colchetes "[YT]".
 * Adicione novos padrões aqui sempre que uma nova variante aparecer no RedTrack.
 */
const TAG_PATTERNS: Record<string, string[]> = {
  YT:  ['[YT]',  '🟢 YT'],
  FB:  ['[FB]',  '🟢 FB'],
  GG:  ['[GG]',  '🟢 GG'],
  TTK: ['[TTK]', '🟢 TTK'],
  OT:  ['[OT]',  '🟢 OT'],
  TB:  ['[TB]',  '🟢 TB'],
}

export async function fetchCampaignsByTag(tag: string): Promise<string[]> {
  const patterns = TAG_PATTERNS[tag] ?? [`[${tag}]`]

  const allIds = new Set<string>()

  for (const pattern of patterns) {
    try {
      const { data } = await client.get<{ id: string }[]>('/campaigns', {
        params: { api_key: API_KEY, title: pattern, status: 1, per: 1000 },
      })
      const rows = Array.isArray(data) ? data : (data as any).items ?? []
      rows.forEach((r: { id: string }) => { if (r.id) allIds.add(r.id) })
    } catch {
      // ignora erros de padrão individual para não bloquear os outros
    }
  }

  return [...allIds]
}
