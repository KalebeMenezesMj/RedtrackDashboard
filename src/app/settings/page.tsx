'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
} from 'lucide-react'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FBAdAccount {
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

interface FBToken {
  id:           string
  label:        string
  token:        string   // masked
  fb_user_name: string | null
  created_at:   string
  ad_accounts:  FBAdAccount[]
}

// ---------------------------------------------------------------------------
// MetaIcon
// ---------------------------------------------------------------------------

function MetaIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200',
        checked ? 'bg-blue-500 border-blue-500' : 'bg-slate-700 border-slate-600',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      )}
      aria-checked={checked}
      role="switch"
    >
      <span className={clsx(
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 mt-[1px]',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// AccountRow — individual ad account with toggle
// ---------------------------------------------------------------------------

function AccountRow({ acc, onToggle }: { acc: FBAdAccount; onToggle: (id: string, enabled: boolean) => void }) {
  const [saving, setSaving] = useState(false)

  async function handleToggle(val: boolean) {
    setSaving(true)
    try {
      const res = await fetch(`/api/facebook/accounts/${acc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: val }),
      })
      if (res.ok) onToggle(acc.id, val)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 last:border-0 transition-colors',
      acc.enabled ? '' : 'opacity-50',
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-200 truncate">{acc.account_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={clsx(
            'text-[9px] font-bold px-1.5 py-0.5 rounded border',
            acc.is_active
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
              : 'bg-slate-700/50 text-slate-500 border-slate-700',
          )}>
            {acc.status_label ?? 'Desconhecida'}
          </span>
          {acc.currency && <span className="text-[10px] text-slate-600">{acc.currency}</span>}
          <span className="text-[10px] text-slate-600">{acc.ad_count.toLocaleString('pt-BR')} anúncios</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {saving && <Loader2 size={12} className="animate-spin text-slate-500" />}
        <span className="text-[10px] text-slate-600 hidden sm:block">
          {acc.enabled ? 'Leitura ativa' : 'Desativada'}
        </span>
        <Toggle checked={acc.enabled} onChange={handleToggle} disabled={saving} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TokenCard — expandable card for one Facebook connection
// ---------------------------------------------------------------------------

function TokenCard({ token: t, onUpdate }: {
  token: FBToken
  onUpdate: (tokenId: string, accountId: string, enabled: boolean) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const enabledCount = t.ad_accounts.filter(a => a.enabled).length
  const totalCount   = t.ad_accounts.length

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-hover transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
          <MetaIcon size={14} className="text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 leading-tight">{t.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {t.fb_user_name && (
              <span className="text-[11px] text-slate-500">{t.fb_user_name}</span>
            )}
            <span className="text-[10px] font-mono text-slate-700">{t.token}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalCount > 0 && (
            <span className={clsx(
              'text-[10px] font-semibold px-2 py-0.5 rounded border',
              enabledCount > 0
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                : 'bg-slate-800 text-slate-500 border-slate-700',
            )}>
              {enabledCount}/{totalCount} ativa{enabledCount !== 1 ? 's' : ''}
            </span>
          )}

          {totalCount === 0 && (
            <span className="text-[10px] text-slate-600 italic">Não sincronizado</span>
          )}

          {expanded
            ? <ChevronDown size={14} className="text-slate-500" />
            : <ChevronRight size={14} className="text-slate-500" />
          }
        </div>
      </button>

      {/* Ad accounts */}
      {expanded && (
        <div className="border-t border-surface-border">
          {totalCount === 0 ? (
            <div className="px-5 py-4 text-xs text-slate-500 flex items-center gap-2">
              <AlertCircle size={13} />
              Nenhuma conta de anúncio. Sincronize no painel admin.
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-slate-900/30 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Escolha suas contas de anúncio:
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                  <ToggleLeft size={11} />
                  Desativar leitura
                </div>
              </div>

              {t.ad_accounts.map(acc => (
                <AccountRow
                  key={acc.id}
                  acc={acc}
                  onToggle={(accId, enabled) => onUpdate(t.id, accId, enabled)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [tokens,  setTokens]  = useState<FBToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/facebook/accounts')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
      setTokens(json.tokens ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleUpdate(tokenId: string, accountId: string, enabled: boolean) {
    setTokens(prev => prev.map(t =>
      t.id !== tokenId ? t : {
        ...t,
        ad_accounts: t.ad_accounts.map(a =>
          a.id !== accountId ? a : { ...a, enabled },
        ),
      },
    ))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalTokens  = tokens.length
  const totalEnabled = tokens.reduce((s, t) => s + t.ad_accounts.filter(a => a.enabled).length, 0)
  const totalAccs    = tokens.reduce((s, t) => s + t.ad_accounts.length, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-card/90 backdrop-blur border-b border-surface-border px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 hover:border-slate-600 px-2.5 py-1.5 rounded-lg shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Painel</span>
          </Link>

          <div className="w-px h-5 bg-slate-700 shrink-0" />

          <div className="w-7 h-7 rounded-lg bg-slate-500/15 border border-slate-500/30 flex items-center justify-center shrink-0">
            <Settings size={13} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-slate-100">Configurações</h1>
            <p className="text-[11px] text-slate-500">Gerencie as contas de anúncio conectadas</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 size={12} />
                Salvo
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs transition-all"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-500" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && totalTokens === 0 && (
          <div className="card p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
              <MetaIcon size={20} className="text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Nenhuma conta conectada</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Peça ao administrador para adicionar um token de acesso do Facebook no painel admin.
            </p>
          </div>
        )}

        {/* Tokens */}
        {!loading && totalTokens > 0 && (
          <>
            {/* Summary strip */}
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-surface-border bg-surface-card">
              <MetaIcon size={16} className="text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200">Contas de Anúncio (Meta)</p>
                <p className="text-[11px] text-slate-500">
                  {totalTokens} conexã{totalTokens !== 1 ? 'ões' : 'o'} · {totalEnabled}/{totalAccs} contas com leitura ativa
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {tokens.map(t => (
                <TokenCard key={t.id} token={t} onUpdate={handleUpdate} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
