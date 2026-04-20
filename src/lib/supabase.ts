/**
 * Cliente Supabase — usado apenas server-side (API routes, lib).
 * Usa SUPABASE_SERVICE_ROLE_KEY se disponível (bypassa RLS),
 * caso contrário usa a publishable key.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

if (!url || !key) {
  throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configuradas.')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },   // server-side: sem persistência de sessão de usuário
})
