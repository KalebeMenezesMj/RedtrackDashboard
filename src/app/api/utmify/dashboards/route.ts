import { NextResponse } from 'next/server'
import { fetchDashboards } from '@/lib/utmify'

export async function GET() {
  if (!process.env.UTMIFY_EMAIL || !process.env.UTMIFY_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: 'UTMIFY_EMAIL e UTMIFY_PASSWORD não configurados no .env.local' },
      { status: 503 },
    )
  }

  try {
    const dashboards = await fetchDashboards()
    return NextResponse.json({ ok: true, dashboards })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[API /utmify/dashboards]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
