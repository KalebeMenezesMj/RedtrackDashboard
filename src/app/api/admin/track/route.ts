/**
 * POST /api/admin/track
 * Endpoint interno chamado pelo middleware para registrar visitas.
 * Protegido pelo header x-track-secret (INTERNAL_TOKEN).
 */

import { NextRequest, NextResponse } from 'next/server'
import { recordVisit } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  // Valida token interno
  const secret = req.headers.get('x-track-secret') ?? ''
  if (!secret || secret !== (process.env.INTERNAL_TOKEN ?? '')) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  try {
    const body = await req.json() as {
      ip: string
      userAgent: string
      path: string
      referrer: string
      language: string
      timestamp: string
      country: string
      city: string
    }

    recordVisit({
      ip:        body.ip        || '0.0.0.0',
      userAgent: body.userAgent || '',
      path:      body.path      || '/',
      referrer:  body.referrer  || '',
      language:  body.language  || '',
      timestamp: body.timestamp || new Date().toISOString(),
      country:   body.country   || '',
      city:      body.city      || '',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
