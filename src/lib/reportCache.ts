// Cache server-side persistido em globalThis para sobreviver ao hot-reload do Next.js dev.
// Em produção o módulo só carrega uma vez, então Map normal funcionaria — mas globalThis
// garante consistência nos dois ambientes.

import type { RedTrackReportRow } from './types'

interface CacheEntry<T> {
  data:      T
  expiresAt: number
}

// Garante que o store persiste entre hot reloads em dev
declare global {
  // eslint-disable-next-line no-var
  var __rtCache: Map<string, CacheEntry<unknown>> | undefined
}

function getStore(): Map<string, CacheEntry<unknown>> {
  if (!globalThis.__rtCache) globalThis.__rtCache = new Map()
  return globalThis.__rtCache
}

function get<T>(key: string, allowStale = false): T | null {
  const entry = getStore().get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (!allowStale && Date.now() > entry.expiresAt) return null
  return entry.data
}

function set<T>(key: string, data: T, ttlMs: number) {
  getStore().set(key, { data, expiresAt: Date.now() + ttlMs })
}

// ─── Tipos adicionais ─────────────────────────────────────────────────────────

import type { RedTrackReportWithTotal } from './types'

// ─── API pública ─────────────────────────────────────────────────────────────

export const cache = {
  // IDs de campanhas ativas (muda raramente)
  getCampaignIds: (): string[] | null =>
    get<string[]>('active_campaign_ids'),
  setCampaignIds: (ids: string[]) =>
    set('active_campaign_ids', ids, 10 * 60_000), // 10 min

  // Relatório por campanha (dados principais)
  getCampaignReport: (key: string, allowStale = false): RedTrackReportWithTotal | null =>
    get<RedTrackReportWithTotal>(key, allowStale),
  setCampaignReport: (key: string, data: RedTrackReportWithTotal) =>
    set(key, data, 3 * 60_000), // 3 min

  // Relatório diário (série temporal para gráficos)
  getDailyReport: (key: string, allowStale = false): RedTrackReportRow[] | null =>
    get<RedTrackReportRow[]>(key, allowStale),
  setDailyReport: (key: string, rows: RedTrackReportRow[]) =>
    set(key, rows, 5 * 60_000), // 5 min

  // IDs de campanhas por tag de plataforma (cache 10 min)
  getPlatformIds: (tag: string): string[] | null =>
    get<string[]>(`platform_ids:${tag}`),
  setPlatformIds: (tag: string, ids: string[]) =>
    set(`platform_ids:${tag}`, ids, 10 * 60_000),
}
