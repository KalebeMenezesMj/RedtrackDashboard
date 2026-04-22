import { NextResponse } from 'next/server'
import axios from 'axios'

const BASE = 'https://api.redtrack.io'
const KEY  = process.env.REDTRACK_API_KEY ?? ''

export async function GET() {
  const to   = fmtDate(new Date())
  const from = fmtDate(subDays(new Date(), 30))

  const out: Record<string, unknown> = {}

  // ── 1. Relatório por campanha — ver TODOS os campos retornados ────────────
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'campaign', total: true, per: 5 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    const total = r.data?.total ?? null
    out.campaign_report = {
      total_row: total,
      all_keys_in_first_row: rows[0] ? Object.keys(rows[0]) : [],
      // Mostra todos os campos com valor != 0 da primeira linha
      non_zero_fields: rows[0]
        ? Object.fromEntries(Object.entries(rows[0]).filter(([, v]) => v !== 0 && v !== null && v !== '' && v !== undefined))
        : null,
      // Campos de receita especificamente
      revenue_fields: rows[0]
        ? Object.fromEntries(Object.entries(rows[0]).filter(([k]) =>
            k.toLowerCase().includes('revenue') ||
            k.toLowerCase().includes('payout') ||
            k.toLowerCase().includes('income') ||
            k.toLowerCase().includes('profit') ||
            k.toLowerCase().includes('goal') ||
            k.toLowerCase().includes('conv')
          ))
        : null,
      first_3_rows: rows.slice(0, 3),
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.campaign_report = { error: err?.response?.data ?? err?.message }
  }

  // ── 2. Conversões individuais — ver se têm payout/revenue ────────────────
  try {
    const r = await axios.get(`${BASE}/conversions`, {
      params: { api_key: KEY, date_from: from, date_to: to, per: 3 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    out.conversions = {
      count: rows.length,
      all_keys: rows[0] ? Object.keys(rows[0]) : [],
      revenue_fields: rows[0]
        ? Object.fromEntries(Object.entries(rows[0]).filter(([k]) =>
            k.toLowerCase().includes('revenue') ||
            k.toLowerCase().includes('payout') ||
            k.toLowerCase().includes('income')
          ))
        : null,
      first_row: rows[0] ?? null,
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.conversions = { error: err?.response?.data ?? err?.message }
  }

  // ── 3. Relatório diário — ver se revenue aparece por data ────────────────
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'date', per: 5 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    out.daily_report = {
      // Soma de revenue em todos os dias
      total_revenue_sum: rows.reduce((s: number, r: Record<string, number>) => s + (r.revenue ?? 0), 0),
      total_cost_sum:    rows.reduce((s: number, r: Record<string, number>) => s + (r.cost ?? 0), 0),
      first_3_rows: rows.slice(0, 3),
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.daily_report = { error: err?.response?.data ?? err?.message }
  }

  // ── 4. Goals/Offers — checar configuração de payout ──────────────────────
  try {
    const r = await axios.get(`${BASE}/offers`, {
      params: { api_key: KEY, per: 5 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    out.offers = {
      count: rows.length,
      payout_fields: rows.slice(0, 3).map((o: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(o).filter(([k]) =>
          k.toLowerCase().includes('payout') ||
          k.toLowerCase().includes('revenue') ||
          k.toLowerCase().includes('goal') ||
          k === 'name' || k === 'id'
        ))
      ),
    }
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: unknown }; message?: string }
    out.offers = { error: err?.response?.data ?? err?.message }
  }

  return NextResponse.json(out, { status: 200 })
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}
