'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Users, Globe, Monitor, Smartphone, Tablet,
  Clock, TrendingUp, LogOut, RefreshCw, Loader2,
  MapPin, Link2, Languages, Chrome, BarChart2,
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
// Página principal
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const router  = useRouter()
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

      {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && !stats && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        )}

        {stats && (
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
