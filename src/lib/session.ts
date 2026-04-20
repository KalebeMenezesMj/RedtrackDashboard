/**
 * Gerenciamento de sessão para o painel admin.
 * Tokens armazenados em memória — sem banco de dados.
 * Expiração: 8 horas.
 */

import crypto from 'crypto'

const EXPIRY_MS = 8 * 60 * 60 * 1000   // 8 horas

const sessions = new Map<string, number>()   // token → expiresAt

/** Cria uma nova sessão e retorna o token. */
export function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, Date.now() + EXPIRY_MS)
  return token
}

/** Verifica se o token é válido e não expirou. */
export function validateSession(token: string | undefined): boolean {
  if (!token) return false
  const exp = sessions.get(token)
  if (!exp) return false
  if (Date.now() > exp) {
    sessions.delete(token)
    return false
  }
  return true
}

/** Invalida (logout) a sessão. */
export function destroySession(token: string | undefined) {
  if (token) sessions.delete(token)
}

/** Compara strings com tempo constante (evita timing attacks). */
export function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) {
      // mesmo assim executa a comparação para tempo constante
      crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1))
      return false
    }
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}
