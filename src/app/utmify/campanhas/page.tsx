'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu, RefreshCw, AlertCircle, ChevronRight, ChevronDown,
  DollarSign, TrendingUp, Activity, ShoppingCart,
  MousePointerClick, BarChart3, Zap, Eye, Package,
  CreditCard, Globe, Tag, X, Loader2,
} from 'lucide-react'
import Sidebar         from '@/components/Sidebar'
import DateRangePicker from '@/components/DateRangePicker'
import StatusBadge     from '@/components/StatusBadge'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { DateRange } from '@/lib/types'
import type { UTMifyProfile, UTMifyKPIData } from '@/lib/utmify'

/* ─── Date helpers ───────────────────────────────────────────────────────── */
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function today()            { return localDate() }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d) }

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
type Tab = 'contas' | 'campanhas' | 'anuncios'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'contas',    label: 'Contas',    icon: CreditCard   },
  { id: 'campanhas', label: 'Campanhas', icon: BarChart3     },
  { id: 'anuncios',  label: 'Anúncios',  icon: Tag           },
]

/* ─── Platform icon colors ───────────────────────────────────────────────── */
const PLATFORM_COLORS: Record<string, string> = {
  meta:   '#1877f2',
  google: '#34a853',
  tiktok: '#ff0050',
  kwai:   '#ff6600',
}
function PlatBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? '#64748b'
  const label = platform === 'meta' ? 'Meta Ads' : platform === 'google' ? 'Google Ads'
              : platform === 'tiktok' ? 'TikTok Ads' : platform.toUpperCase()
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.10em] px-2 py-0.5 rounded-md"
      style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}>
      {label}
    </span>
  )
}

/* ─── KPI mini card ──────────────────────────────────────────────────────── */
function MiniKPI({ icon: Icon, label, value, color = 'slate', loading = false }: {
  icon: React.ElementType; label: string; value: string
  color?: string; loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl bg-surface-raised/60 border border-surface-border/50">
      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{ color }} strokeWidth={2.5} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</span>
      </div>
      {loading
        ? <div className="h-5 w-20 rounded bg-surface-raised animate-pulse" />
        : <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
      }
    </div>
  )
}

/* ─── Drawer de detalhes (abre ao selecionar conta/campanha) ─────────────── */
interface DrawerProps {
  title:      string
  subtitle:   string
  platform?:  string
  kpis:       UTMifyKPIData | null
  loading:    boolean
  error:      string | null
  onClose:    () => void
}
function DetailDrawer({ title, subtitle, platform, kpis, loading, error, onClose }: DrawerProps) {
  const isProfit = (kpis?.profit ?? 0) >= 0

  function fmtPct(v: number) {
    const s = v >= 0 ? '+' : '−'
    return `${s}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Drawer header */}
      <div className="px-5 pt-5 pb-4 border-b border-surface-border/60 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {platform && <PlatBadge platform={platform} />}
            </div>
            <h2 className="text-sm font-bold text-slate-100 leading-snug truncate">{title}</h2>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium truncate">{subtitle}</p>
          </div>
          <button onClick={onClose} className="btn-icon !w-8 !h-8 shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Drawer body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/25 bg-rose-500/8 text-xs text-rose-300">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPIs financeiros */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Financeiro</p>
          <div className="grid grid-cols-2 gap-2">
            <MiniKPI icon={DollarSign} label="Receita"   value={loading ? '…' : formatCurrency(kpis?.revenue ?? 0)}  color="#34d399" loading={loading} />
            <MiniKPI icon={Activity}   label="Gasto"     value={loading ? '…' : formatCurrency(kpis?.spend ?? 0)}    color="#60a5fa" loading={loading} />
            <MiniKPI icon={TrendingUp} label="Lucro"     value={loading ? '…' : formatCurrency(kpis?.profit ?? 0)}   color={isProfit ? '#34d399' : '#f87171'} loading={loading} />
            <MiniKPI icon={BarChart3}  label="ROI"       value={loading ? '…' : fmtPct(kpis?.roi ?? 0)}              color={(kpis?.roi ?? 0) >= 0 ? '#a78bfa' : '#fbbf24'} loading={loading} />
            <MiniKPI icon={Package}    label="CPA"       value={loading ? '…' : formatCurrency(kpis?.cpa ?? 0)}      color="#67e8f9" loading={loading} />
            <MiniKPI icon={Package}    label="Ticket Médio" value={loading ? '…' : formatCurrency(kpis?.avgTicket ?? 0)} color="#fb923c" loading={loading} />
          </div>
        </div>

        {/* Pedidos */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Pedidos</p>
          <div className="grid grid-cols-2 gap-2">
            <MiniKPI icon={ShoppingCart}    label="Aprovados"  value={loading ? '…' : formatNumber(kpis?.orders ?? 0)}   color="#34d399" loading={loading} />
            <MiniKPI icon={MousePointerClick} label="Cliques"  value={loading ? '…' : formatNumber(kpis?.clicks ?? 0)}   color="#fbbf24" loading={loading} />
            <MiniKPI icon={Eye}             label="Page Views" value={loading ? '…' : formatNumber(kpis?.pageViews ?? 0)} color="#60a5fa" loading={loading} />
            <MiniKPI icon={CreditCard}      label="Checkouts"  value={loading ? '…' : formatNumber(kpis?.initiateCheckouts ?? 0)} color="#a78bfa" loading={loading} />
          </div>
        </div>

        {/* Anúncios (UTM Terms) */}
        {(kpis?.topUtmTerms.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">
              Anúncios (UTM Terms) · {kpis!.topUtmTerms.length} encontrados
            </p>
            <div className="space-y-1">
              {kpis!.topUtmTerms.map((ad, i) => (
                <div key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-raised/50 border border-surface-border/40">
                  <span className="text-[10px] font-bold text-slate-700 w-5 text-center tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-300 truncate" title={ad.source}>{ad.source}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 tabular-nums shrink-0">
                    {formatNumber(ad.count)} ped.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Produtos */}
        {(kpis?.topProducts.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Top Produtos</p>
            <div className="space-y-1">
              {kpis!.topProducts.map((p, i) => (
                <div key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-raised/50 border border-surface-border/40">
                  <span className="text-[10px] font-bold text-slate-700 w-5 text-center tabular-nums shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-300 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-600">{formatNumber(p.count)} pedidos</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 tabular-nums shrink-0">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Países */}
        {(kpis?.topCountries.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Países</p>
            <div className="space-y-0">
              {kpis!.topCountries.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-surface-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <Globe size={11} className="text-slate-600 shrink-0" />
                    <span className="text-[11px] text-slate-400 font-medium">{c.country}</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-semibold tabular-nums">{formatNumber(c.count)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading placeholder */}
        {loading && !kpis && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="text-slate-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Drawer footer */}
      <div className="px-5 py-3 border-t border-surface-border/60 shrink-0">
        <p className="text-[10px] text-slate-700 text-center font-medium">
          Toque fora para fechar
        </p>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function UTMifyCampanhasPage() {
  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [dateRange,     setDateRange]     = useState<DateRange>({ from: daysAgo(30), to: today() })
  const [activeTab,     setActiveTab]     = useState<Tab>('contas')
  const [profiles,      setProfiles]      = useState<UTMifyProfile[]>([])
  const [dashboardId,   setDashboardId]   = useState(process.env.NEXT_PUBLIC_UTMIFY_DASHBOARD_ID ?? '')
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError,   setProfilesError]   = useState<string | null>(null)
  const [apiStatus,     setApiStatus]     = useState<'connected'|'error'|'loading'>('loading')

  // Drawer state
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [drawerTitle,   setDrawerTitle]   = useState('')
  const [drawerSub,     setDrawerSub]     = useState('')
  const [drawerPlatform,setDrawerPlatform]= useState<string | undefined>()
  const [drawerKpis,    setDrawerKpis]    = useState<UTMifyKPIData | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError,   setDrawerError]   = useState<string | null>(null)

  // UTM global para aba Campanhas / Anúncios
  const [globalKpis, setGlobalKpis]       = useState<UTMifyKPIData | null>(null)
  const [globalLoading, setGlobalLoading] = useState(true)

  /* ── Auto-descobre dashboardId ao montar ───────────────────────────────── */
  useEffect(() => {
    async function boot() {
      try {
        const r = await fetch('/api/utmify/dashboards')
        const j = await r.json()
        if (j.ok && j.dashboards?.length > 0) setDashboardId(j.dashboards[0].id)
      } catch { /* ignora */ }
    }
    if (!dashboardId) boot()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Carrega perfis (Contas) ───────────────────────────────────────────── */
  const loadProfiles = useCallback(async (dId: string) => {
    if (!dId) return
    setProfilesLoading(true); setProfilesError(null)
    try {
      const r = await fetch(`/api/utmify/accounts?dashboardId=${dId}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setProfiles(j.profiles ?? [])
      setApiStatus('connected')
    } catch (e: unknown) {
      setProfilesError(e instanceof Error ? e.message : 'Erro desconhecido')
      setApiStatus('error')
    } finally { setProfilesLoading(false) }
  }, [])

  /* ── Carrega KPIs globais (aba Campanhas + Anúncios) ───────────────────── */
  const loadGlobal = useCallback(async (range: DateRange, dId: string) => {
    if (!dId) return
    setGlobalLoading(true)
    try {
      const p = new URLSearchParams({ from: range.from, to: range.to, dashboardId: dId })
      const r = await fetch(`/api/utmify?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setGlobalKpis(j.kpis)
    } catch { /* silencia — mostrado no erro de cima */ }
    finally { setGlobalLoading(false) }
  }, [])

  useEffect(() => {
    if (dashboardId) {
      loadProfiles(dashboardId)
      loadGlobal(dateRange, dashboardId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId])

  useEffect(() => {
    if (dashboardId) loadGlobal(dateRange, dashboardId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  /* ── Abre drawer de uma conta específica ──────────────────────────────── */
  async function openAccountDrawer(profile: UTMifyProfile, account: { id: string; name: string }) {
    setDrawerTitle(account.name || profile.name)
    setDrawerSub(`${profile.email} · ${profile.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}`)
    setDrawerPlatform(profile.platform)
    setDrawerKpis(null)
    setDrawerError(null)
    setDrawerLoading(true)
    setDrawerOpen(true)

    try {
      const filter = profile.platform === 'meta' ? `metaAccountId=${account.id}` : `googleAccountId=${account.id}`
      const p = new URLSearchParams({ from: dateRange.from, to: dateRange.to, dashboardId })
      const r = await fetch(`/api/utmify/filter?${p}&${filter}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setDrawerKpis(j.kpis)
    } catch (e: unknown) {
      setDrawerError(e instanceof Error ? e.message : 'Erro ao carregar dados desta conta')
    } finally { setDrawerLoading(false) }
  }

  /* ── Abre drawer de uma plataforma ────────────────────────────────────── */
  async function openPlatformDrawer(platform: string, trafficSource?: string) {
    setDrawerTitle(`${platform} Ads`)
    setDrawerSub(`Dados filtrados por plataforma: ${platform}`)
    setDrawerPlatform(platform.toLowerCase())
    setDrawerKpis(null)
    setDrawerError(null)
    setDrawerLoading(true)
    setDrawerOpen(true)

    try {
      const p = new URLSearchParams({ from: dateRange.from, to: dateRange.to, dashboardId, platform })
      if (trafficSource) p.set('trafficSource', trafficSource)
      const r = await fetch(`/api/utmify/filter?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setDrawerKpis(j.kpis)
    } catch (e: unknown) {
      setDrawerError(e instanceof Error ? e.message : 'Erro ao carregar dados desta plataforma')
    } finally { setDrawerLoading(false) }
  }

  function refresh() {
    if (!dashboardId) return
    loadProfiles(dashboardId)
    loadGlobal(dateRange, dashboardId)
  }

  /* ── Helpers de UI ────────────────────────────────────────────────────── */
  const metaProfiles   = profiles.filter(p => p.platform === 'meta')
  const googleProfiles = profiles.filter(p => p.platform === 'google')

  const platforms = [
    { label: 'Meta',    key: 'Meta',    traffic: 'MetaAds', spend: globalKpis?.platforms.meta    ?? 0, color: '#1877f2' },
    { label: 'Google',  key: 'Google',  traffic: 'google',  spend: globalKpis?.platforms.google  ?? 0, color: '#34a853' },
    { label: 'TikTok',  key: 'TikTok',  traffic: 'tiktok',  spend: globalKpis?.platforms.tiktok  ?? 0, color: '#ff0050' },
    { label: 'Kwai',    key: 'Kwai',    traffic: 'kwai',    spend: globalKpis?.platforms.kwai    ?? 0, color: '#ff6600' },
    { label: 'Taboola', key: 'Taboola', traffic: undefined, spend: globalKpis?.platforms.taboola ?? 0, color: '#64748b' },
  ].filter(p => p.spend > 0)

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0)

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Overlay do drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      <main className="flex-1 overflow-y-auto relative">

        {/* Header */}
        <header className="sticky top-0 z-40 bg-surface-card/95 border-b border-surface-border backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden btn-icon !w-9 !h-9 shrink-0">
                <Menu size={16} />
              </button>
              <div className="hidden md:flex w-8 h-8 rounded-xl bg-violet-600 items-center justify-center shrink-0">
                <Zap size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[15px] font-bold text-slate-100 tracking-tight leading-none">UTMify · Campanhas</h1>
                  <StatusBadge status={apiStatus} />
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-none">
                  Contas, plataformas e anúncios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <button onClick={refresh} className="btn-icon !w-9 !h-9">
                <RefreshCw size={13} className={profilesLoading || globalLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 px-5 sm:px-6 max-w-screen-2xl mx-auto border-t border-surface-border/40">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[12px] font-semibold border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'text-brand-400 border-brand-500'
                    : 'text-slate-600 border-transparent hover:text-slate-300'}`}
              >
                <tab.icon size={13} strokeWidth={2.5} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex h-[calc(100vh-114px)]">

          {/* ── Conteúdo principal ─────────────────────────────────────────── */}
          <div className={`flex-1 overflow-y-auto p-5 sm:p-6 transition-all ${drawerOpen ? 'lg:mr-[420px]' : ''}`}>

            {/* ── TAB: Contas ─────────────────────────────────────────────── */}
            {activeTab === 'contas' && (
              <div className="space-y-6 animate-fade-in-up">
                {profilesError && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/25 bg-rose-500/8 text-sm">
                    <AlertCircle size={15} className="text-rose-400 shrink-0" />
                    <p className="text-rose-300">{profilesError}</p>
                  </div>
                )}

                {/* Meta Ads */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#1877f2' }} />
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em]">Meta Ads</h2>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {metaProfiles.length} perfil{metaProfiles.length !== 1 ? 'is' : ''} ·{' '}
                      {metaProfiles.reduce((s, p) => s + p.adAccounts.length, 0)} contas
                    </span>
                  </div>

                  {profilesLoading ? (
                    <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                  ) : metaProfiles.length === 0 ? (
                    <p className="text-sm text-slate-600 py-4">Nenhuma conta Meta conectada a este dashboard.</p>
                  ) : metaProfiles.map(profile => (
                    <div key={profile.id} className="mb-3">
                      {/* Profile header */}
                      <div className="flex items-center gap-2.5 px-3 py-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-400">{profile.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-300 truncate">{profile.name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{profile.email}</p>
                        </div>
                        {profile.tokenExpired && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                            Token Expirado
                          </span>
                        )}
                      </div>

                      {/* Ad Accounts */}
                      <div className="space-y-1.5 pl-2">
                        {profile.adAccounts.map(account => (
                          <button
                            key={account.id}
                            onClick={() => openAccountDrawer(profile, account)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-card border border-surface-border hover:border-blue-500/40 hover:bg-surface-hover transition-all group text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <CreditCard size={12} className="text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">{account.name}</p>
                              <p className="text-[10px] text-slate-600 font-medium">ID: {account.id}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {account.status && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  account.status === 'ENABLED' || account.enabled !== false
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                    : 'bg-slate-500/15 text-slate-500 border border-slate-500/25'
                                }`}>
                                  {account.status || (account.enabled ? 'Ativa' : 'Inativa')}
                                </span>
                              )}
                              <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                            </div>
                          </button>
                        ))}
                        {profile.adAccounts.length === 0 && (
                          <p className="text-xs text-slate-700 px-4 py-2">Nenhuma conta de anúncio neste perfil.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Google Ads */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#34a853' }} />
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em]">Google Ads</h2>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {googleProfiles.length} perfil{googleProfiles.length !== 1 ? 'is' : ''} ·{' '}
                      {googleProfiles.reduce((s, p) => s + p.adAccounts.length, 0)} contas
                    </span>
                  </div>

                  {profilesLoading ? (
                    <div className="space-y-2">{[1,2].map(i=><div key={i} className="h-16 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                  ) : googleProfiles.length === 0 ? (
                    <p className="text-sm text-slate-600 py-4">Nenhuma conta Google conectada a este dashboard.</p>
                  ) : googleProfiles.map(profile => (
                    <div key={profile.id} className="mb-3">
                      <div className="flex items-center gap-2.5 px-3 py-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-400">{profile.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-300 truncate">{profile.name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{profile.email}</p>
                        </div>
                        {profile.tokenExpired && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                            Token Expirado
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {profile.adAccounts.map(account => (
                          <button
                            key={account.id}
                            onClick={() => openAccountDrawer(profile, account)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-card border border-surface-border hover:border-emerald-500/40 hover:bg-surface-hover transition-all group text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <CreditCard size={12} className="text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">{account.name}</p>
                              <p className="text-[10px] text-slate-600 font-medium">ID: {account.id}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {account.status && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  account.status.includes('ATIV') || account.status === 'ENABLED'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                    : 'bg-slate-500/15 text-slate-500 border border-slate-500/25'
                                }`}>
                                  {account.status}
                                </span>
                              )}
                              <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                            </div>
                          </button>
                        ))}
                        {profile.adAccounts.length === 0 && (
                          <p className="text-xs text-slate-700 px-4 py-2">Nenhuma conta de anúncio neste perfil.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Campanhas (por plataforma) ─────────────────────────── */}
            {activeTab === 'campanhas' && (
              <div className="space-y-3 animate-fade-in-up">
                <p className="text-[11px] text-slate-600 font-medium mb-4">
                  Clique em uma plataforma para ver o detalhamento de receita, anúncios e países.
                </p>

                {globalLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-20 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                ) : platforms.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-sm text-slate-600">Nenhuma plataforma com gasto no período selecionado.</p>
                  </div>
                ) : platforms.map(p => {
                  const pct = totalSpend > 0 ? (p.spend / totalSpend) * 100 : 0
                  return (
                    <button
                      key={p.key}
                      onClick={() => openPlatformDrawer(p.key, p.traffic)}
                      className="w-full card px-5 py-4 hover:border-slate-600/60 transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        {/* Platform dot */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                          <span className="text-[10px] font-black" style={{ color: p.color }}>
                            {p.label.slice(0, 2).toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-slate-200 group-hover:text-white">{p.label} Ads</p>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-slate-600 font-medium tabular-nums">{pct.toFixed(1)}% do total</span>
                              <span className="text-sm font-bold tabular-nums" style={{ color: p.color }}>
                                {formatCurrency(p.spend)}
                              </span>
                              <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                            </div>
                          </div>
                          {/* Barra proporcional */}
                          <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: p.color }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── TAB: Anúncios (UTM Terms) ───────────────────────────────── */}
            {activeTab === 'anuncios' && (
              <div className="animate-fade-in-up">
                <p className="text-[11px] text-slate-600 font-medium mb-4">
                  Anúncios identificados via <span className="text-slate-400 font-semibold">UTM Term</span>.
                  Clique em um anúncio para filtrar os dados pelo seu identificador.
                </p>

                {globalLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-12 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                ) : (globalKpis?.topUtmTerms.length ?? 0) === 0 ? (
                  <div className="card p-8 text-center">
                    <Tag size={24} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Nenhum UTM Term encontrado no período.</p>
                    <p className="text-xs text-slate-700 mt-1">
                      Configure <code className="font-mono bg-surface-raised px-1 py-0.5 rounded">utm_term</code> nos seus anúncios para ver o detalhamento aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-600">
                      <span className="w-7 text-center">#</span>
                      <span className="flex-1">Anúncio (UTM Term)</span>
                      <span className="w-20 text-right">Pedidos</span>
                    </div>

                    {globalKpis!.topUtmTerms.map((ad, i) => {
                      const maxCount = globalKpis!.topUtmTerms[0]?.count ?? 1
                      const pct      = (ad.count / maxCount) * 100
                      return (
                        <div
                          key={i}
                          className="card px-4 py-3 hover:border-violet-500/40 transition-all group relative overflow-hidden cursor-default"
                        >
                          {/* Background fill */}
                          <div className="absolute inset-0 bg-violet-500/5 transition-all duration-500"
                            style={{ width: `${pct}%` }} />
                          <div className="relative flex items-center gap-3">
                            <span className="w-7 text-center text-[11px] font-bold text-slate-600 tabular-nums shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-300 truncate" title={ad.source}>
                                {ad.source}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-bold text-violet-300 tabular-nums">
                                {formatNumber(ad.count)}
                              </span>
                              <ChevronRight size={12} className="text-slate-700" />
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* UTM Sources */}
                    {(globalKpis?.topUtmSources.length ?? 0) > 0 && (
                      <div className="mt-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">
                          UTM Source · Origens de tráfego
                        </p>
                        {globalKpis!.topUtmSources.map((s, i) => (
                          <div key={i} className="flex items-center justify-between py-2.5 border-b border-surface-border/40 last:border-0">
                            <div className="flex items-center gap-2">
                              <Globe size={11} className="text-slate-600 shrink-0" />
                              <span className="text-xs text-slate-400 font-medium">{s.source}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-300 tabular-nums">{formatNumber(s.count)} pedidos</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Drawer lateral (desktop) ──────────────────────────────────── */}
          {drawerOpen && (
            <div className="hidden lg:flex flex-col w-[420px] shrink-0 fixed right-0 top-0 h-full bg-surface-card border-l border-surface-border z-30 shadow-2xl">
              <DetailDrawer
                title={drawerTitle}
                subtitle={drawerSub}
                platform={drawerPlatform}
                kpis={drawerKpis}
                loading={drawerLoading}
                error={drawerError}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          )}

          {/* Drawer mobile (slide-up) */}
          {drawerOpen && (
            <div className="lg:hidden fixed inset-x-0 bottom-0 h-[85vh] bg-surface-card border-t border-surface-border z-50 rounded-t-2xl shadow-2xl flex flex-col">
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-surface-border" />
              </div>
              <DetailDrawer
                title={drawerTitle}
                subtitle={drawerSub}
                platform={drawerPlatform}
                kpis={drawerKpis}
                loading={drawerLoading}
                error={drawerError}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
