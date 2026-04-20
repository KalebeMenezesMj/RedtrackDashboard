import { NextResponse } from 'next/server'
import { fetchSettings } from '@/lib/redtrack'

export async function GET() {
  try {
    const settings = await fetchSettings()
    return NextResponse.json({ ok: true, data: settings })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /settings]', message)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 },
    )
  }
}
