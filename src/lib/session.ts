/**
 * Gerenciamento de sessão — admin e dashboard principal.
 * Tokens armazenados em memória. Expiração: 8 horas.
 */

import crypto from 'crypto'

const EXPIRY_MS = 8 * 60 * 60 * 1000   // 8 horas

// Stores separados para não misturar as duas sessões
const adminStore = new Map<string, number>()   // token → expiresAt
const dashStore  = new Map<string, number>()

// ---------------------------------------------------------------------------
// Funções internas
// ---------------------------------------------------------------------------

function makeToken(store: Map<string, number>): string {
  const token = crypto.randomBytes(32).toString('hex')
  store.set(token, Date.now() + EXPIRY_MS)
  return token
}

function checkToken(store: Map<string, number>, token: string | undefined): boolean {
  if (!token) return false
  const exp = store.get(token)
  if (!exp) return false
  if (Date.now() > exp) { store.delete(token); return false }
  return true
}

function revokeToken(store: Map<string, number>, token: string | undefined) {
  if (token) store.delete(token)
}

// ---------------------------------------------------------------------------
// Admin (/admin/dashboard)
// ---------------------------------------------------------------------------

export function createSession():                        string  { return makeToken(adminStore) }
export function validateSession(t: string | undefined): boolean { return checkToken(adminStore, t) }
export function destroySession(t: string | undefined)          { revokeToken(adminStore, t) }

// ---------------------------------------------------------------------------
// Dashboard principal (/, /campanhas, /analise-criativos)
// ---------------------------------------------------------------------------

export function createDashSession():                        string  { return makeToken(dashStore) }
export function validateDashSession(t: string | undefined): boolean { return checkToken(dashStore, t) }
export function destroyDashSession(t: string | undefined)          { revokeToken(dashStore, t) }

// ---------------------------------------------------------------------------
// Comparação segura contra timing attacks
// ---------------------------------------------------------------------------

export function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) {
      // executa mesmo assim para manter tempo constante
      crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1))
      return false
    }
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}
