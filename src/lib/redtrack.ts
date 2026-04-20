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

// ─── Settings ────────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<RedTrackSettings> {
  const { data } = await client.get<RedTrackSettings>('/me/settings', {
    params: { api_key: API_KEY },
  })
  return data
}

// ─── Campanhas ativas (/campaigns?status=1) ───────────────────────────────────

export async function fetchActiveCampaignIds(): Promise<string[]> {
  const { data } = await client.get<{ id: string }[]>('/campaigns', {
    params: { api_key: API_KEY, status: 1, per: 1000 },
  })
  const rows = Array.isArray(data) ? data : (data as any).items ?? []
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

  const { data } = await client.get<RedTrackReportWithTotal>('/report', { params })
  // Garante o formato esperado
  if (data && typeof data === 'object' && 'items' in data) {
    return { items: data.items ?? [], total: data.total ?? {} as RedTrackReportRow }
  }
  // Fallback: se por algum motivo retornar array puro
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

  const { data } = await client.get<RedTrackReportRow[]>('/report', { params })
  return Array.isArray(data) ? data : []
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
