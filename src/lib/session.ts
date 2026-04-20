/**
 * Sessões via JWT assinado (stateless).
 * Funciona em Edge Runtime, Node.js e Vercel serverless — sem banco de dados.
 * Expiração: 8 horas.
 */

import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

// Chave derivada do SESSION_SECRET do ambiente
function getSecret() {
  const raw = process.env.SESSION_SECRET ?? 'dev-secret-troque-em-producao'
  return new TextEncoder().encode(raw)
}

// ---------------------------------------------------------------------------
// Criação de token
// ---------------------------------------------------------------------------

async function makeJWT(role: 'admin' | 'dash'): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

// ---------------------------------------------------------------------------
// Validação de token
// ---------------------------------------------------------------------------

async function verifyJWT(token: string | undefined, role: 'admin' | 'dash'): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === role
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Admin (/admin/dashboard)
// ---------------------------------------------------------------------------

export async function createSession():                              Promise<string>  { return makeJWT('admin') }
export async function validateSession(t: string | undefined):      Promise<boolean> { return verifyJWT(t, 'admin') }
export async function destroySession(_t: string | undefined):      Promise<void>    { /* JWT é stateless — invalida pelo cookie */ }

// ---------------------------------------------------------------------------
// Dashboard principal (/, /campanhas, /analise-criativos)
// ---------------------------------------------------------------------------

export async function createDashSession():                         Promise<string>  { return makeJWT('dash') }
export async function validateDashSession(t: string | undefined):  Promise<boolean> { return verifyJWT(t, 'dash') }
export async function destroyDashSession(_t: string | undefined):  Promise<void>    { /* JWT é stateless — invalida pelo cookie */ }

// ---------------------------------------------------------------------------
// Comparação segura contra timing attacks (continua síncrona)
// ---------------------------------------------------------------------------

export function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) {
      crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1))
      return false
    }
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}
