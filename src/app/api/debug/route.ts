import { NextResponse } from 'next/server'
import axios from 'axios'

const BASE = 'https://api.redtrack.io'
const KEY  = process.env.REDTRACK_API_KEY ?? ''

export async function GET() {
  const to   = fmtDate(new Date())
  const from = fmtDate(subDays(new Date(), 7))  // só 7 dias para economizar RPM

  const out: Record<string, unknown> = {}

  // ── 1. Relatório por campanha ────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'campaign', total: true, per: 3 },
      timeout: 15_000,
    })
    const rows  = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    const first = rows[0]
    out.campaign_report = {
      http_status: r.status,
      all_keys: first ? Object.keys(first) : [],
      non_zero_fields: first
        ? Object.fromEntries(Object.entries(first).filter(([, v]) => v !== 0 && v !== null && v !== ''))
        : null,
      first_campaign_id: first?.campaign_id ?? null,
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.campaign_report = { http_status: err?.response?.status, error: err?.response?.data ?? err?.message }
  }

  // ── 2. Testar group=ad ────────────────────────────────────────────────────
  // Pega o primeiro campaign_id do resultado anterior para filtrar
  const firstCampaignId = (out.campaign_report as Record<string,unknown>)?.first_campaign_id as string | null

  const adGroups = ['ad', 'creative', 'banner', 'sub1', 'sub2']
  const adGroupResults: Record<string, unknown> = {}

  for (const grp of adGroups) {
    try {
      const params: Record<string, unknown> = {
        api_key:   KEY,
        date_from: from,
        date_to:   to,
        group:     grp,
        per:       3,
      }
      if (firstCampaignId) params['campaign_id'] = firstCampaignId

      const r = await axios.get(`${BASE}/report`, { params, timeout: 10_000 })
      const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
      adGroupResults[grp] = {
        ok:         true,
        http_status: r.status,
        row_count:  rows.length,
        all_keys:   rows[0] ? Object.keys(rows[0]) : [],
        first_row:  rows[0] ?? null,
      }
    } catch (e: unknown) {
      const err = e as { response?: { status: number; data: unknown }; message?: string }
      adGroupResults[grp] = {
        ok:         false,
        http_status: err?.response?.status ?? 0,
        error:      err?.response?.data ?? err?.message,
      }
    }
    // Pequena pausa entre testes para não bater rate limit
    await new Promise(r => setTimeout(r, 500))
  }

  out.ad_group_tests = adGroupResults

  // ── 3. Testar endpoint /ads direto ────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/ads`, {
      params: { api_key: KEY, per: 3 },
      timeout: 10_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    out.ads_endpoint = {
      http_status: r.status,
      row_count:   rows.length,
      all_keys:    rows[0] ? Object.keys(rows[0]) : [],
      first_row:   rows[0] ?? null,
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.ads_endpoint = { http_status: err?.response?.status, error: err?.response?.data ?? err?.message }
  }

  // ── 4. Relatório diário ───────────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'date', per: 3 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    out.daily_report = {
      http_status: r.status,
      row_count:   rows.length,
      revenue_fields: rows[0]
        ? Object.fromEntries(Object.entries(rows[0]).filter(([k]) =>
            k.toLowerCase().includes('revenue') || k.toLowerCase().includes('profit')
          ))
        : null,
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.daily_report = { http_status: err?.response?.status, error: err?.response?.data ?? err?.message }
  }

  return NextResponse.json(out, { status: 200 })
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}
