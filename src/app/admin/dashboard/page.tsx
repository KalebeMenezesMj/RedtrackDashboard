'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Users, Globe, Monitor, Smartphone, Tablet,
  Clock, TrendingUp, LogOut, RefreshCw, Loader2,
  MapPin, Link2, Languages, Chrome, BarChart2,
  Key, Trash2, Plus, CheckCircle2, AlertCircle, Eye, EyeOff,
} from 'lucide-react'
import clsx from 'clsx'
import type { Stats, VisitRecord } from '@/lib/analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day:    '2-digit', month: '2-digit', year: '2-digit',
    hour:   '2-digit', minute: '2-digit',
  })
}

function deviceIcon(d: string) {
  if (d === 'mobile')  return <Smartphone size={13} className="text-cyan-400"   />
  if (d === 'tablet')  return <Tablet      size={13} className="text-amber-400"  />
  return                      <Monitor     size={13} className="text-slate-400"  />
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-slate-100 text-2xl font-bold leading-tight">{value.toLocaleString('pt-BR')}</p>
        {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function BarList({ title, icon, data, colorClass = 'bg-violet-500' }: {
  title: string; icon: React.ReactNode; data: [string, number][]; colorClass?: string
}) {
  if (!data.length) return null
  const max = data[0][1]
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-semibold text-slate-300">{title}</p>
      </div>
      <div className="space-y-2">
        {data.map(([label, count]) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-slate-400 truncate max-w-[70%]">{label}</span>
              <span className="text-[11px] font-mono text-slate-400">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', colorClass)}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HourlyChart({ hourly }: { hourly: number[] }) {
  const max = Math.max(...hourly, 1)
  const now = new Date().getHours()
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={14} className="text-violet-400" />
        <p className="text-xs font-semibold text-slate-300">Visitas por hora (últimas 24h)</p>
      </div>
      <div className="flex items-end gap-0.5 h-20">
        {hourly.map((v, h) => (
          <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={clsx(
                'w-full rounded-t-sm transition-all',
                h === now ? 'bg-violet-400' : 'bg-slate-700',
              )}
              style={{ height: `${(v / max) * 72}px`, minHeight: v > 0 ? '3px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-slate-600">0h</span>
        <span className="text-[9px] text-slate-600">12h</span>
        <span className="text-[9px] text-slate-600">23h</span>
      </div>
    </div>
  )
}

function IPTable({ ipList }: { ipList: Stats['ipList'] }) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? ipList.filter(r => r.ip.includes(search) || r.country.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase()))
    : ipList

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Globe size={14} className="text-cyan-400" />
        <p className="text-xs font-semibold text-slate-300 flex-1">IPs ({ipList.length})</p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filtrar IP / país..."
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 w-40"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-2 text-slate-500 font-medium">IP (anonimizado)</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">País</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Cidade</th>
              <th className="text-right px-4 py-2 text-slate-500 font-medium">Visitas</th>
              <th className="text-right px-4 py-2 text-slate-500 font-medium">Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map(row => (
              <tr key={row.ip} className="border-b border-surface-border/40 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-2 font-mono text-slate-300">{row.ipAnon}</td>
                <td className="px-4 py-2 text-slate-400">{row.country || '—'}</td>
                <td className="px-4 py-2 text-slate-400">{row.city || '—'}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-300">{row.count}</td>
                <td className="px-4 py-2 text-right text-slate-500">{fmtDate(row.last)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nenhum resultado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RecentVisits({ visits }: { visits: VisitRecord[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? visits : visits.slice(0, 15)

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Clock size={14} className="text-amber-400" />
        <p className="text-xs font-semibold text-slate-300 flex-1">Visitas recentes</p>
        <span className="text-[10px] text-slate-500">{visits.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Horário</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">IP</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Página</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Dispositivo</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Navegador</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">SO</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">País</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Idioma</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(v => (
              <tr key={v.id} className="border-b border-surface-border/40 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmtDate(v.timestamp)}</td>
                <td className="px-4 py-2 font-mono text-slate-400 whitespace-nowrap">{v.ipAnon}</td>
                <td className="px-4 py-2 text-slate-300 max-w-[120px] truncate">{v.path}</td>
                <td className="px-4 py-2">{deviceIcon(v.device)}</td>
                <td className="px-4 py-2 text-slate-400">{v.browser} {v.browserVersion}</td>
                <td className="px-4 py-2 text-slate-400">{v.os} {v.osVersion}</td>
                <td className="px-4 py-2 text-slate-400">{v.country || '—'}</td>
                <td className="px-4 py-2 text-slate-400">{v.language?.split(',')[0] || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visits.length > 15 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-2.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors border-t border-surface-border"
        >
          {expanded ? 'Mostrar menos' : `Ver todas (${visits.length})`}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Facebook token management (admin tab)
// ---------------------------------------------------------------------------

interface FBTokenItem {
  id:           string
  label:        string
  token:        string   // masked
  fb_user_name: string | null
  created_at:   string
}

function MetaIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function FacebookTab() {
  const [tokens,    setTokens]    = useState<FBTokenItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [label,     setLabel]     = useState('')
  const [token,     setToken]     = useState('')
  const [showToken, setShowToken] = useState(false)
  const [adding,    setAdding]    = useState(false)
  const [addError,  setAddError]  = useState('')
  const [addOk,     setAddOk]     = useState('')
  const [syncing,   setSyncing]   = useState<string | null>(null)
  const [syncMsg,   setSyncMsg]   = useState<Record<string, string>>({})
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/facebook/tokens')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTokens(json.tokens ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTokens() }, [loadTokens])

  async function handleAdd() {
    if (!label.trim() || !token.trim()) return
    setAdding(true); setAddError(''); setAddOk('')
    try {
      const res  = await fetch('/api/admin/facebook/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), token: token.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAddOk(`Token adicionado! Conta FB: ${json.fb_user_name ?? ''}`)
      setLabel(''); setToken('')
      loadTokens()
    } catch (e) {
      setAddError(String(e))
    } finally {
      setAdding(false)
    }
  }

  async function handleSync(id: string) {
    setSyncing(id)
    setSyncMsg(prev => ({ ...prev, [id]: '' }))
    try {
      const res  = await fetch(`/api/admin/facebook/tokens/${id}/sync`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSyncMsg(prev => ({ ...prev, [id]: `${json.synced} conta(s) sincronizada(s)` }))
    } catch (e) {
      setSyncMsg(prev => ({ ...prev, [id]: `Erro: ${String(e)}` }))
    } finally {
      setSyncing(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este token? As contas de anúncio associadas também serão removidas.')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/facebook/tokens/${id}`, { method: 'DELETE' })
      setTokens(prev => prev.filter(t => t.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MetaIcon size={15} className="text-blue-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-200">Adicionar token de acesso</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1">Nome / identificação</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Conta da Filomena"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mb-1">
              <Key size={10} /> Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="EAAxxxxx…"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 pr-12 text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
              />
              <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        </div>

        {addError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 text-xs">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            {addError}
          </div>
        )}
        {addOk && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-xs">
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
            {addOk}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!label.trim() || !token.trim() || adding}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            label.trim() && token.trim() && !adding
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed',
          )}
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {adding ? 'Validando…' : 'Adicionar token'}
        </button>
      </div>

      {/* Token list */}
      {loading && (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-500" /></div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}
      {!loading && tokens.length === 0 && (
        <div className="card p-8 text-center text-slate-500 text-sm">Nenhum token salvo ainda.</div>
      )}

      <div className="space-y-3">
        {tokens.map(t => (
          <div key={t.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <MetaIcon size={14} className="text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{t.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.fb_user_name && <span className="text-[10px] text-slate-500">{t.fb_user_name}</span>}
                  <span className="text-[10px] font-mono text-slate-700">{t.token}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {syncMsg[t.id] && (
                  <span className={clsx(
                    'text-[10px]',
                    syncMsg[t.id].startsWith('Erro') ? 'text-red-400' : 'text-emerald-400',
                  )}>
                    {syncMsg[t.id]}
                  </span>
                )}

                <button
                  onClick={() => handleSync(t.id)}
                  disabled={syncing === t.id}
                  title="Sincronizar contas de anúncio"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-blue-500/40 text-xs transition-all"
                >
                  {syncing === t.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RefreshCw size={12} />
                  }
                  Sincronizar
                </button>

                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-600 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  {deleting === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const router  = useRouter()
  const [tab, setTab] = useState<'analytics' | 'facebook'>('analytics')
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/stats')
      if (res.status === 401) { router.replace('/admin'); return }
      const data = await res.json() as { ok: boolean; stats: Stats }
      if (data.ok) { setStats(data.stats); setLastUpdate(new Date()) }
      else setError('Erro ao carregar dados.')
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin')
  }

  return (
    <div className="min-h-screen bg-surface-bg text-slate-200">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-surface-card/90 backdrop-blur border-b border-surface-border px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Shield size={13} className="text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-slate-100">Painel Admin</h1>
            <p className="text-[11px] text-slate-500">Analytics de visitas — sem cookies</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastUpdate && (
              <span className="text-[10px] text-slate-600 hidden sm:block">
                Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs transition-all"
            >
              {loading
                ? <Loader2 size={12} className="animate-spin" />
                : <RefreshCw size={12} />}
              Atualizar
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 text-xs transition-all"
            >
              <LogOut size={12} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex gap-1 p-1 rounded-xl border border-slate-700 bg-slate-900/50 w-fit">
          <button
            onClick={() => setTab('analytics')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === 'analytics' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <BarChart2 size={13} />
            Analytics
          </button>
          <button
            onClick={() => setTab('facebook')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === 'facebook' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <MetaIcon size={13} />
            Facebook
          </button>
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Facebook tab */}
        {tab === 'facebook' && <FacebookTab />}

        {/* Analytics tab */}
        {tab === 'analytics' && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {tab === 'analytics' && loading && !stats && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        )}

        {tab === 'analytics' && stats && (
          <>
            {/* ── Cards de totais ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Total"        value={stats.total}     icon={<TrendingUp size={16} className="text-violet-400" />} />
              <StatCard label="Hoje"         value={stats.today}     icon={<Clock      size={16} className="text-amber-400"  />} />
              <StatCard label="7 dias"       value={stats.week}      icon={<TrendingUp size={16} className="text-cyan-400"   />} />
              <StatCard label="30 dias"      value={stats.month}     icon={<TrendingUp size={16} className="text-emerald-400"/>} />
              <StatCard label="IPs únicos"   value={stats.uniqueIPs} icon={<Users      size={16} className="text-violet-400" />} sub="visitantes únicos" />
            </div>

            {/* ── Gráfico de horas ────────────────────────────────────── */}
            <HourlyChart hourly={stats.hourly} />

            {/* ── Distribuições ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <BarList
                title="Páginas mais visitadas"
                icon={<Link2      size={14} className="text-violet-400" />}
                data={stats.pages}
                colorClass="bg-violet-500"
              />
              <BarList
                title="Navegadores"
                icon={<Chrome     size={14} className="text-amber-400"  />}
                data={stats.browsers}
                colorClass="bg-amber-500"
              />
              <BarList
                title="Sistemas operacionais"
                icon={<Monitor    size={14} className="text-cyan-400"   />}
                data={stats.os}
                colorClass="bg-cyan-500"
              />
              <BarList
                title="Dispositivos"
                icon={<Smartphone size={14} className="text-emerald-400"/>}
                data={stats.devices}
                colorClass="bg-emerald-500"
              />
              <BarList
                title="Idiomas"
                icon={<Languages  size={14} className="text-pink-400"   />}
                data={stats.langs}
                colorClass="bg-pink-500"
              />
              <BarList
                title="Referrers (origem)"
                icon={<MapPin     size={14} className="text-orange-400" />}
                data={stats.referrers}
                colorClass="bg-orange-500"
              />
            </div>

            {/* ── Tabela de IPs ───────────────────────────────────────── */}
            <IPTable ipList={stats.ipList} />

            {/* ── Visitas recentes ────────────────────────────────────── */}
            <RecentVisits visits={stats.recent} />

            {/* ── Nota de privacidade ─────────────────────────────────── */}
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 px-4 py-3">
              <p className="text-[11px] text-slate-500">
                <span className="text-slate-400 font-medium">Coleta de dados:</span>{' '}
                Este painel registra apenas dados disponíveis nos cabeçalhos HTTP (IP, User-Agent, página, referrer, idioma) —
                sem cookies, sem scripts de rastreamento terceiros. IPs são exibidos anonimizados (último octeto zerado).
                Coleta lícita conforme LGPD art. 7º, inciso IX (legítimo interesse de segurança operacional).
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
