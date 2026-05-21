/**
 * Facebook token & ad-account persistence helpers.
 *
 * Tables (create in Supabase SQL editor):
 *
 *   CREATE TABLE facebook_tokens (
 *     id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     label        TEXT NOT NULL,
 *     token        TEXT NOT NULL,
 *     fb_user_name TEXT,
 *     created_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 *   CREATE TABLE facebook_ad_accounts (
 *     id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     token_id     UUID REFERENCES facebook_tokens(id) ON DELETE CASCADE,
 *     account_id   TEXT NOT NULL,
 *     account_name TEXT NOT NULL,
 *     is_active    BOOLEAN DEFAULT true,
 *     enabled      BOOLEAN DEFAULT true,
 *     status_label TEXT,
 *     currency     TEXT,
 *     ad_count     INT DEFAULT 0,
 *     synced_at    TIMESTAMPTZ DEFAULT NOW(),
 *     UNIQUE(token_id, account_id)
 *   );
 */

import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FBTokenRow {
  id:           string
  label:        string
  token:        string
  fb_user_name: string | null
  created_at:   string
}

export interface FBAdAccountRow {
  id:           string
  token_id:     string
  account_id:   string
  account_name: string
  is_active:    boolean
  enabled:      boolean
  status_label: string | null
  currency:     string | null
  ad_count:     number
  synced_at:    string
}

export interface FBTokenWithAccounts extends FBTokenRow {
  ad_accounts: FBAdAccountRow[]
}

// ---------------------------------------------------------------------------
// Token CRUD
// ---------------------------------------------------------------------------

export async function listTokens(): Promise<FBTokenRow[]> {
  const { data, error } = await supabase
    .from('facebook_tokens')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createToken(label: string, token: string, fbUserName?: string): Promise<FBTokenRow> {
  const { data, error } = await supabase
    .from('facebook_tokens')
    .insert({ label, token, fb_user_name: fbUserName ?? null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteToken(id: string): Promise<void> {
  const { error } = await supabase.from('facebook_tokens').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Ad accounts CRUD
// ---------------------------------------------------------------------------

export async function listAdAccountsForToken(tokenId: string): Promise<FBAdAccountRow[]> {
  const { data, error } = await supabase
    .from('facebook_ad_accounts')
    .select('*')
    .eq('token_id', tokenId)
    .order('is_active', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertAdAccounts(
  tokenId: string,
  accounts: { account_id: string; account_name: string; is_active: boolean; status_label: string; currency: string; ad_count: number }[],
): Promise<void> {
  if (!accounts.length) return

  const rows = accounts.map(a => ({
    token_id:     tokenId,
    account_id:   a.account_id,
    account_name: a.account_name,
    is_active:    a.is_active,
    status_label: a.status_label,
    currency:     a.currency,
    ad_count:     a.ad_count,
    synced_at:    new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('facebook_ad_accounts')
    .upsert(rows, { onConflict: 'token_id,account_id', ignoreDuplicates: false })
  if (error) throw new Error(error.message)
}

export async function setAdAccountEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('facebook_ad_accounts')
    .update({ enabled })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Get all enabled ad accounts (with their token)
// ---------------------------------------------------------------------------

export async function listEnabledAdAccounts(): Promise<(FBAdAccountRow & { token: string; token_label: string })[]> {
  const { data, error } = await supabase
    .from('facebook_ad_accounts')
    .select('*, facebook_tokens(token, label)')
    .eq('enabled', true)
    .order('account_name')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: FBAdAccountRow & { facebook_tokens: { token: string; label: string } }) => ({
    ...row,
    token:       row.facebook_tokens.token,
    token_label: row.facebook_tokens.label,
  }))
}

// ---------------------------------------------------------------------------
// Tokens with their accounts (for settings page)
// ---------------------------------------------------------------------------

export async function listTokensWithAccounts(): Promise<FBTokenWithAccounts[]> {
  const { data, error } = await supabase
    .from('facebook_tokens')
    .select('*, ad_accounts:facebook_ad_accounts(*)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as FBTokenWithAccounts[]
}
