import { NextResponse } from 'next/server'
import axios from 'axios'

const BASE   = 'https://api.redtrack.io'
const KEY    = process.env.REDTRACK_API_KEY ?? ''

export async function GET() {
  const results: Record<string, unknown> = {}

  const to   = localDate(new Date())
  const from = localDate(subDays(new Date(), 7))

  // 1. /report group=campaign — ver campos disponíveis (primeira linha)
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'campaign', per: 3 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    results.report_campaign_fields = {
      status: r.status,
      first_row_keys: rows[0] ? Object.keys(rows[0]) : [],
      first_row: rows[0] ?? null,
    }
  } catch (e: any) {
    results.report_campaign_fields = { status: e?.response?.status, error: e?.response?.data ?? e?.message }
  }

  // 2. /report group=goal — breakdown por objetivo
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'goal', per: 10 },
      timeout: 15_000,
    })
    results.report_goal = { status: r.status, data: r.data }
  } catch (e: any) {
    results.report_goal = { status: e?.response?.status, error: e?.response?.data ?? e?.message }
  }

  // 3. /report group=campaign&sub_group=goal — campanha + objetivo
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: { api_key: KEY, date_from: from, date_to: to, group: 'campaign', sub_group: 'goal', per: 5 },
      timeout: 15_000,
    })
    results.report_campaign_goal = { status: r.status, data: r.data }
  } catch (e: any) {
    results.report_campaign_goal = { status: e?.response?.status, error: e?.response?.data ?? e?.message }
  }

  // 4. /conversions — lista de conversões individuais
  try {
    const r = await axios.get(`${BASE}/conversions`, {
      params: { api_key: KEY, date_from: from, date_to: to, per: 3 },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    results.conversions = {
      status: r.status,
      count: rows.length,
      first_row_keys: rows[0] ? Object.keys(rows[0]) : [],
      first_row: rows[0] ?? null,
    }
  } catch (e: any) {
    results.conversions = { status: e?.response?.status, error: e?.response?.data ?? e?.message }
  }

  // 5. /report group=campaign com campos extras (goal fields)
  try {
    const r = await axios.get(`${BASE}/report`, {
      params: {
        api_key: KEY,
        date_from: from,
        date_to: to,
        group: 'campaign',
        per: 3,
        fields: 'clicks,conversions,cost,revenue,goal1_conversions,goal2_conversions,goal3_conversions',
      },
      timeout: 15_000,
    })
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
    results.report_goal_fields = {
      status: r.status,
      first_row: rows[0] ?? null,
    }
  } catch (e: any) {
    results.report_goal_fields = { status: e?.response?.status, error: e?.response?.data ?? e?.message }
  }

  return NextResponse.json(results, { status: 200 })
}

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}
