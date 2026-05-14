'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Activity, ShoppingCart, MousePointerClick,
  RefreshCw, AlertCircle, BarChart3, Package, Zap, Menu,
  Eye, CreditCard, Repeat2, Clock, CalendarDays, Globe,
  Tag, TrendingDown, Users, ExternalLink, X, Loader2, ChevronRight,
  Pause, Play, Search, ArrowUpDown, Layers,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import Sidebar         from '@/components/Sidebar'
import DateRangePicker from '@/components/DateRangePicker'
import StatusBadge     from '@/components/StatusBadge'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { DateRange } from '@/lib/types'
import type { UTMifyKPIData, UTMifyDashboard, UTMifyProfile, UTMifyCampaignRow } from '@/lib/utmify'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function today()            { return localDate() }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d) }
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
type Tab = 'overview' | 'contas' | 'campanhas' | 'anuncios'
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Visão Geral', icon: BarChart3  },
  { id: 'contas',    label: 'Contas',      icon: CreditCard },
  { id: 'campanhas', label: 'Campanhas',   icon: Activity   },
]

/* ─── Cores ──────────────────────────────────────────────────────────────── */
const KPI_COLORS = {
  blue:   { bg:'bg-blue-500/10',    border:'border-blue-500/20',    text:'text-blue-300',    icon:'text-blue-400'    },
  emerald:{ bg:'bg-emerald-500/10', border:'border-emerald-500/20', text:'text-emerald-300', icon:'text-emerald-400' },
  violet: { bg:'bg-violet-500/10',  border:'border-violet-500/20',  text:'text-violet-300',  icon:'text-violet-400'  },
  amber:  { bg:'bg-amber-500/10',   border:'border-amber-500/20',   text:'text-amber-300',   icon:'text-amber-400'   },
  rose:   { bg:'bg-rose-500/10',    border:'border-rose-500/20',    text:'text-rose-300',    icon:'text-rose-400'    },
  cyan:   { bg:'bg-cyan-500/10',    border:'border-cyan-500/20',    text:'text-cyan-300',    icon:'text-cyan-400'    },
  orange: { bg:'bg-orange-500/10',  border:'border-orange-500/20',  text:'text-orange-300',  icon:'text-orange-400'  },
  slate:  { bg:'bg-slate-500/10',   border:'border-slate-500/20',   text:'text-slate-300',   icon:'text-slate-400'   },
}
type ColorKey = keyof typeof KPI_COLORS

const PLAT_COLORS: Record<string, string> = {
  meta:'#1877f2', google:'#34a853', tiktok:'#ff0050', kwai:'#ff6600', taboola:'#64748b',
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KCard({ icon:Icon, title, value, sub, color='blue', loading=false }: {
  icon:React.ElementType; title:string; value:string; sub?:string; color?:ColorKey; loading?:boolean
}) {
  const c = KPI_COLORS[color]
  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-500 truncate">{title}</span>
        <div className={`w-7 h-7 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
          <Icon size={13} className={c.icon} strokeWidth={2.5} />
        </div>
      </div>
      {loading ? <div className="h-8 w-28 rounded-lg bg-surface-raised animate-pulse" />
        : <span className={`text-[1.35rem] sm:text-[1.55rem] font-bold leading-none tabular-nums ${c.text}`}>{value}</span>}
      {sub && !loading && <span className="text-[11px] text-slate-600 font-medium">{sub}</span>}
    </div>
  )
}

/* ─── Section heading ────────────────────────────────────────────────────── */
function SH({ icon:Icon, title, badge }: { icon:React.ElementType; title:string; badge?:React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-6 h-6 rounded-lg bg-surface-raised border border-surface-muted flex items-center justify-center shrink-0">
        <Icon size={12} className="text-slate-400" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="flex-1 h-px bg-surface-border" />
      {badge}
    </div>
  )
}

/* ─── Recharts tooltip ───────────────────────────────────────────────────── */
function CTip({ active, payload, label, fmt }: {
  active?:boolean; payload?:{value:number;name:string}[]; label?:string; fmt?:(v:number)=>string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p,i)=>(
        <p key={i} className="text-slate-200 font-semibold">{fmt ? fmt(p.value) : formatNumber(p.value)}</p>
      ))}
    </div>
  )
}

/* ─── Mini KPI (drawer) ──────────────────────────────────────────────────── */
function MiniKPI({ icon:Icon, label, value, color='#64748b', loading=false }: {
  icon:React.ElementType; label:string; value:string; color?:string; loading?:boolean
}) {
  return (
    <div className="flex flex-col gap-1.5 px-3.5 py-3 rounded-xl bg-surface-raised/60 border border-surface-border/50">
      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{color}} strokeWidth={2.5} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</span>
      </div>
      {loading ? <div className="h-5 w-20 rounded bg-surface-raised animate-pulse" />
        : <span className="text-sm font-bold tabular-nums" style={{color}}>{value}</span>}
    </div>
  )
}

/* ─── Platform bar ───────────────────────────────────────────────────────── */
function PlatBar({ label, spend, clicks, pageViews, total, color }: {
  label:string; spend:number; clicks:number; pageViews:number; total:number; color:string
}) {
  const pct = total > 0 ? (spend/total)*100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs gap-4">
        <span className="text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-4 text-[11px] tabular-nums shrink-0">
          <span className="text-slate-600">{formatNumber(clicks)} cliques</span>
          <span className="text-slate-600">{formatNumber(pageViews)} views</span>
          <span className="text-slate-200 font-semibold">{formatCurrency(spend)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:color}} />
      </div>
    </div>
  )
}

/* ─── Stat row ───────────────────────────────────────────────────────────── */
function StatRow({ label, value, sub }: { label:string; value:string; sub?:string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border/50 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <div className="text-right">
        <span className="text-xs text-slate-200 font-semibold tabular-nums">{value}</span>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Drawer lateral ─────────────────────────────────────────────────────── */
interface DrawerProps {
  title:string; subtitle:string; platform?:string
  kpis:UTMifyKPIData|null; loading:boolean; error:string|null; onClose:()=>void
}
function Drawer({ title, subtitle, platform, kpis, loading, error, onClose }: DrawerProps) {
  const ip = (kpis?.profit ?? 0) >= 0
  function fmtPct(v:number){ const s=v>=0?'+':'−'; return `${s}${Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%` }
  const platColor = platform ? (PLAT_COLORS[platform] ?? '#64748b') : '#a78bfa'

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-surface-border/60 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {platform && (
              <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.10em] px-2 py-0.5 rounded-md mb-1.5"
                style={{color:platColor,background:`${platColor}20`,border:`1px solid ${platColor}40`}}>
                {platform === 'meta' ? 'Meta Ads' : platform === 'google' ? 'Google Ads' : platform}
              </span>
            )}
            <h2 className="text-sm font-bold text-slate-100 leading-snug">{title}</h2>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{subtitle}</p>
          </div>
          <button onClick={onClose} className="btn-icon !w-8 !h-8 shrink-0"><X size={14} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/25 bg-rose-500/8 text-xs text-rose-300">
            <AlertCircle size={13} className="shrink-0" /><span>{error}</span>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Financeiro</p>
          <div className="grid grid-cols-2 gap-2">
            <MiniKPI icon={DollarSign} label="Receita"  value={loading?'…':formatCurrency(kpis?.revenue??0)}  color="#34d399" loading={loading} />
            <MiniKPI icon={Activity}   label="Gasto"    value={loading?'…':formatCurrency(kpis?.spend??0)}    color="#60a5fa" loading={loading} />
            <MiniKPI icon={TrendingUp} label="Lucro"    value={loading?'…':formatCurrency(kpis?.profit??0)}   color={ip?'#34d399':'#f87171'} loading={loading} />
            <MiniKPI icon={BarChart3}  label="ROI"      value={loading?'…':fmtPct(kpis?.roi??0)}              color={(kpis?.roi??0)>=0?'#a78bfa':'#fbbf24'} loading={loading} />
            <MiniKPI icon={Package}    label="CPA"      value={loading?'…':formatCurrency(kpis?.cpa??0)}      color="#67e8f9" loading={loading} />
            <MiniKPI icon={Package}    label="Ticket"   value={loading?'…':formatCurrency(kpis?.avgTicket??0)} color="#fb923c" loading={loading} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Pedidos &amp; Mídia</p>
          <div className="grid grid-cols-2 gap-2">
            <MiniKPI icon={ShoppingCart}     label="Aprovados"  value={loading?'…':formatNumber(kpis?.orders??0)}             color="#34d399" loading={loading} />
            <MiniKPI icon={MousePointerClick} label="Cliques"   value={loading?'…':formatNumber(kpis?.clicks??0)}             color="#fbbf24" loading={loading} />
            <MiniKPI icon={Eye}              label="Page Views" value={loading?'…':formatNumber(kpis?.pageViews??0)}          color="#60a5fa" loading={loading} />
            <MiniKPI icon={CreditCard}       label="Checkouts"  value={loading?'…':formatNumber(kpis?.initiateCheckouts??0)}  color="#a78bfa" loading={loading} />
          </div>
        </div>
        {(kpis?.topUtmTerms.length??0)>0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">
              Anúncios (UTM Terms) · {kpis!.topUtmTerms.length}
            </p>
            <div className="space-y-1">
              {kpis!.topUtmTerms.map((ad,i)=>(
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-raised/50 border border-surface-border/40">
                  <span className="text-[10px] font-bold text-slate-700 w-5 text-center tabular-nums shrink-0">{i+1}</span>
                  <p className="flex-1 text-[11px] font-medium text-slate-300 truncate" title={ad.source}>{ad.source}</p>
                  <span className="text-[11px] font-semibold text-emerald-300 tabular-nums shrink-0">{formatNumber(ad.count)} ped.</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(kpis?.topProducts.length??0)>0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Top Produtos</p>
            <div className="space-y-1">
              {kpis!.topProducts.map((p,i)=>(
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-raised/50 border border-surface-border/40">
                  <span className="text-[10px] font-bold text-slate-700 w-5 text-center tabular-nums shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0"><p className="text-[11px] font-medium text-slate-300 truncate">{p.name}</p><p className="text-[10px] text-slate-600">{formatNumber(p.count)} pedidos</p></div>
                  <span className="text-[11px] font-semibold text-emerald-300 tabular-nums shrink-0">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(kpis?.topCountries.length??0)>0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Países</p>
            {kpis!.topCountries.map((c,i)=>(
              <div key={i} className="flex items-center justify-between py-2 border-b border-surface-border/30 last:border-0">
                <div className="flex items-center gap-2"><Globe size={11} className="text-slate-600 shrink-0" /><span className="text-[11px] text-slate-400 font-medium">{c.country}</span></div>
                <span className="text-[11px] text-slate-300 font-semibold tabular-nums">{formatNumber(c.count)}</span>
              </div>
            ))}
          </div>
        )}
        {loading && !kpis && (
          <div className="flex items-center justify-center py-10"><Loader2 size={20} className="text-slate-600 animate-spin" /></div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-surface-border/60 shrink-0">
        <p className="text-[10px] text-slate-700 text-center font-medium">Clique fora para fechar</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function UTMifyPage() {
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [activeTab,    setActiveTab]    = useState<Tab>('overview')
  const [dateRange,    setDateRange]    = useState<DateRange>({ from: daysAgo(30), to: today() })
  const [dashboards,   setDashboards]   = useState<UTMifyDashboard[]>([])
  const [dashboardId,  setDashboardId]  = useState('')
  const [kpis,         setKpis]         = useState<UTMifyKPIData | null>(null)
  const [currency,     setCurrency]     = useState<string>('BRL')
  const [profiles,     setProfiles]     = useState<UTMifyProfile[]>([])
  const [loading,      setLoading]      = useState(false)
  const [profLoading,  setProfLoading]  = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [apiStatus,    setApiStatus]    = useState<'connected'|'error'|'loading'>('loading')
  const [lastUpdate,   setLastUpdate]   = useState('')
  const [configured,   setConfigured]   = useState(true)

  // Campanhas — nível hierarchy
  type CampLevel = 'campaigns' | 'adsets' | 'ads'
  const [campLevel,      setCampLevel]      = useState<CampLevel>('campaigns')
  const [campaigns,      setCampaigns]      = useState<UTMifyCampaignRow[]>([])
  const [adSets,         setAdSets]         = useState<UTMifyCampaignRow[]>([])
  const [ads,            setAds]            = useState<UTMifyCampaignRow[]>([])
  const [selCampaign,    setSelCampaign]    = useState<UTMifyCampaignRow | null>(null)
  const [selAdSet,       setSelAdSet]       = useState<UTMifyCampaignRow | null>(null)
  const [campLoading,    setCampLoading]    = useState(false)
  const [campError,      setCampError]      = useState<string | null>(null)
  const [campSearch,     setCampSearch]     = useState('')
  const [campSort,       setCampSort]       = useState<'spend'|'revenue'|'profit'|'roas'|'clicks'|'impressions'|'approvedOrdersCount'|'roi'|'cpa'|'cpm'|'cpc'|'ctr'|'margin'|'ic'|'cpi'>('spend')
  const [campSortDir,    setCampSortDir]    = useState<'desc'|'asc'>('desc')
  const [campPlatFilter, setCampPlatFilter] = useState<'both'|'meta'|'google'>('both')

  // Drawer
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [drawerTitle,   setDrawerTitle]   = useState('')
  const [drawerSub,     setDrawerSub]     = useState('')
  const [drawerPlatform,setDrawerPlatform]= useState<string|undefined>()
  const [drawerKpis,    setDrawerKpis]    = useState<UTMifyKPIData|null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError,   setDrawerError]   = useState<string|null>(null)

  /* ── Boot: carrega dashboards ─────────────────────────────────────────── */
  useEffect(() => {
    async function boot() {
      try {
        const r = await fetch('/api/utmify/dashboards')
        const j = await r.json()
        if (!j.ok) { if (j.error?.includes('não configurados')) setConfigured(false); return }
        setDashboards(j.dashboards ?? [])
        if (j.dashboards?.length > 0) setDashboardId(j.dashboards[0].id)
      } catch { /* silencia */ }
    }
    boot()
  }, [])

  /* ── Carrega KPIs quando dashboardId ou dateRange mudam ──────────────── */
  const fetchKpis = useCallback(async (range: DateRange, dId: string) => {
    if (!dId) return
    setLoading(true); setError(null); setApiStatus('loading')
    try {
      const p = new URLSearchParams({ from:range.from, to:range.to, dashboardId:dId })
      const r = await fetch(`/api/utmify?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error ?? 'Falha')
      setKpis(j.kpis); setCurrency(j.kpis?.currency ?? 'BRL'); setApiStatus('connected')
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    } catch(e:unknown) {
      setError(e instanceof Error ? e.message : 'Erro'); setApiStatus('error')
    } finally { setLoading(false) }
  }, [])

  /* ── Carrega perfis quando muda aba ou dashboardId ───────────────────── */
  const fetchProfiles = useCallback(async (dId: string) => {
    if (!dId) return
    setProfLoading(true)
    try {
      const r = await fetch(`/api/utmify/accounts?dashboardId=${dId}`)
      const j = await r.json()
      if (j.ok) setProfiles(j.profiles ?? [])
    } catch { /* silencia */ }
    finally { setProfLoading(false) }
  }, [])

  /* ── Carrega campanhas ────────────────────────────────────────────────────── */
  const fetchCampaigns = useCallback(async (range: DateRange, dId: string) => {
    if (!dId) return
    setCampLoading(true); setCampError(null)
    setCampLevel('campaigns'); setSelCampaign(null); setSelAdSet(null)
    setAdSets([]); setAds([])
    try {
      const p = new URLSearchParams({ from: range.from, to: range.to, dashboardId: dId, platform: 'both', level: 'campaign' })
      const r = await fetch(`/api/utmify/campaigns?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setCampaigns(j.campaigns ?? [])
    } catch(e:unknown) { setCampError(e instanceof Error ? e.message : 'Erro ao carregar campanhas') }
    finally { setCampLoading(false) }
  }, [])

  /* ── Drill-down: campanha → conjuntos ──────────────────────────────────── */
  async function drillToAdSets(campaign: UTMifyCampaignRow) {
    setSelCampaign(campaign); setCampLevel('adsets'); setAdSets([]); setAds([])
    setCampSearch(''); setCampLoading(true); setCampError(null)
    try {
      const level = campaign.platform === 'google' ? 'adGroup' : 'adset'
      const p = new URLSearchParams({
        from: dateRange.from, to: dateRange.to, dashboardId,
        platform: campaign.platform, level,
      })
      const r = await fetch(`/api/utmify/campaigns?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      // Filtra client-side pelo campaignId pai
      const all: UTMifyCampaignRow[] = j.campaigns ?? []
      const filtered = all.filter(a => !a.campaignId || a.campaignId === campaign.id)
      setAdSets(filtered.length > 0 ? filtered : all)
    } catch(e:unknown) { setCampError(e instanceof Error ? e.message : 'Erro ao carregar conjuntos') }
    finally { setCampLoading(false) }
  }

  /* ── Drill-down: conjunto → anúncios ───────────────────────────────────── */
  async function drillToAds(adset: UTMifyCampaignRow) {
    setSelAdSet(adset); setCampLevel('ads'); setAds([])
    setCampSearch(''); setCampLoading(true); setCampError(null)
    try {
      const level = adset.platform === 'google' ? 'ad' : 'ad'
      const p = new URLSearchParams({
        from: dateRange.from, to: dateRange.to, dashboardId,
        platform: adset.platform, level,
      })
      const r = await fetch(`/api/utmify/campaigns?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      const all: UTMifyCampaignRow[] = j.campaigns ?? []
      // Filtra pelo adsetId pai
      const filtered = all.filter(a => !a.adsetId || a.adsetId === adset.id || a.campaignId === selCampaign?.id)
      setAds(filtered.length > 0 ? filtered : all)
    } catch(e:unknown) { setCampError(e instanceof Error ? e.message : 'Erro ao carregar anúncios') }
    finally { setCampLoading(false) }
  }

  useEffect(() => { if (dashboardId) { fetchKpis(dateRange, dashboardId); fetchProfiles(dashboardId) } }, [dashboardId])
  useEffect(() => { if (dashboardId) fetchKpis(dateRange, dashboardId)  }, [dateRange])
  useEffect(() => { if (dashboardId && (activeTab === 'contas')) fetchProfiles(dashboardId) }, [activeTab])
  useEffect(() => { if (dashboardId && activeTab === 'campanhas') fetchCampaigns(dateRange, dashboardId) }, [activeTab, dashboardId])
  useEffect(() => { if (dashboardId && activeTab === 'campanhas') fetchCampaigns(dateRange, dashboardId) }, [dateRange])

  /* ── Drawer: abre para conta específica ───────────────────────────────── */
  async function openAccountDrawer(profile: UTMifyProfile, acc: {id:string;name:string}) {
    setDrawerTitle(acc.name || profile.name); setDrawerSub(`${profile.email}`)
    setDrawerPlatform(profile.platform); setDrawerKpis(null); setDrawerError(null)
    setDrawerLoading(true); setDrawerOpen(true)
    try {
      const filter = profile.platform === 'meta' ? `metaAccountId=${acc.id}` : `googleAccountId=${acc.id}`
      const p = new URLSearchParams({ from:dateRange.from, to:dateRange.to, dashboardId })
      const r = await fetch(`/api/utmify/filter?${p}&${filter}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setDrawerKpis(j.kpis)
    } catch(e:unknown) { setDrawerError(e instanceof Error ? e.message : 'Erro') }
    finally { setDrawerLoading(false) }
  }

  /* ── Drawer: abre para plataforma ─────────────────────────────────────── */
  async function openPlatformDrawer(platform: string, traffic: string) {
    setDrawerTitle(`${platform} Ads`); setDrawerSub(`Dados filtrados por plataforma`)
    setDrawerPlatform(platform.toLowerCase()); setDrawerKpis(null); setDrawerError(null)
    setDrawerLoading(true); setDrawerOpen(true)
    try {
      const p = new URLSearchParams({ from:dateRange.from, to:dateRange.to, dashboardId, trafficSource: traffic })
      const r = await fetch(`/api/utmify/filter?${p}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setDrawerKpis(j.kpis)
    } catch(e:unknown) { setDrawerError(e instanceof Error ? e.message : 'Erro') }
    finally { setDrawerLoading(false) }
  }

  /* ── Computed ─────────────────────────────────────────────────────────── */
  const isProfit   = (kpis?.profit ?? 0) >= 0
  const totalSpend = kpis ? kpis.platforms.meta + kpis.platforms.google + kpis.platforms.tiktok + kpis.platforms.kwai + kpis.platforms.taboola : 0

  const hourData = Array.from({length:24},(_,h)=>({hour:h, count:kpis?.byHour.find(x=>x.hour===h)?.count??0}))
  const maxHour  = Math.max(...hourData.map(x=>x.count),1)
  const dowData  = Array.from({length:7},(_,i)=>({dow:i, label:DOW[i], count:kpis?.byDayOfWeek.find(x=>x.dayOfWeek===i)?.count??0}))
  const profitHourData = Array.from({length:24},(_,h)=>({hour:h, profit:kpis?.profitByHour.find(x=>x.hour===h)?.profit??0}))

  const metaProfiles   = profiles.filter(p=>p.platform==='meta')
  const googleProfiles = profiles.filter(p=>p.platform==='google')

  const platforms = [
    {label:'Meta',    key:'Meta',    traffic:'Meta',    spend:kpis?.platforms.meta??0,    clicks:kpis?.platformClicks.meta??0,    pv:kpis?.platformPageViews.meta??0,    color:'#1877f2'},
    {label:'Google',  key:'Google',  traffic:'Google',  spend:kpis?.platforms.google??0,  clicks:kpis?.platformClicks.google??0,  pv:kpis?.platformPageViews.google??0,  color:'#34a853'},
    {label:'TikTok',  key:'TikTok',  traffic:'TikTok',  spend:kpis?.platforms.tiktok??0,  clicks:kpis?.platformClicks.tiktok??0,  pv:kpis?.platformPageViews.tiktok??0,  color:'#ff0050'},
    {label:'Kwai',    key:'Kwai',    traffic:'Kwai',    spend:kpis?.platforms.kwai??0,    clicks:kpis?.platformClicks.kwai??0,    pv:kpis?.platformPageViews.kwai??0,    color:'#ff6600'},
    {label:'Taboola', key:'Taboola', traffic:'Taboola', spend:kpis?.platforms.taboola??0, clicks:kpis?.platformClicks.taboola??0, pv:kpis?.platformPageViews.taboola??0, color:'#64748b'},
  ]

  function fmtPct(v:number,signed=true){const s=signed?(v>=0?'+':'−'):'';return `${s}${Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%`}

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={()=>setSidebarOpen(false)} />

      {drawerOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={()=>setDrawerOpen(false)} />}

      <main className="flex-1 overflow-hidden flex flex-col">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-surface-card/95 border-b border-surface-border backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={()=>setSidebarOpen(true)} className="md:hidden btn-icon !w-9 !h-9 shrink-0"><Menu size={16}/></button>
              <div className="hidden md:flex w-8 h-8 rounded-xl bg-violet-600 items-center justify-center shrink-0">
                <Zap size={15} className="text-white" strokeWidth={2.5}/>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[15px] font-bold text-slate-100 tracking-tight leading-none">UTMify</h1>
                  <StatusBadge status={apiStatus}/>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-none">
                  {lastUpdate ? `Atualizado às ${lastUpdate}` : 'Receita, pedidos e análise de mídia'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Seletor de dashboard — sempre visível */}
              {dashboards.length > 0 && (
                <select value={dashboardId} onChange={e=>setDashboardId(e.target.value)}
                  className="h-9 px-3 text-xs font-medium rounded-xl bg-surface-raised border border-surface-border text-slate-300
                             focus:outline-none focus:ring-1 focus:ring-brand-500/50 cursor-pointer hidden sm:block max-w-[180px]">
                  {dashboards.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <DateRangePicker value={dateRange} onChange={setDateRange}/>
              <button onClick={()=>{if(dashboardId){fetchKpis(dateRange,dashboardId);fetchProfiles(dashboardId)}}}
                disabled={loading||!dashboardId} className="btn-icon !w-9 !h-9">
                <RefreshCw size={13} className={loading?'animate-spin':''}/>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center px-5 sm:px-6 max-w-screen-2xl mx-auto border-t border-surface-border/40">
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[12px] font-semibold border-b-2 transition-all
                  ${activeTab===tab.id?'text-violet-400 border-violet-500':'text-slate-600 border-transparent hover:text-slate-300'}`}>
                <tab.icon size={13} strokeWidth={2.5}/>{tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Body com drawer ────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* Scroll area */}
          <div className={`flex-1 overflow-y-auto p-5 sm:p-6 transition-all ${drawerOpen?'lg:mr-[420px]':''}`}>

            {/* Not configured */}
            {!configured && (
              <div className="flex items-start gap-4 p-5 rounded-xl border border-amber-500/25 bg-amber-500/8 mb-6">
                <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5"/>
                <div>
                  <p className="font-semibold text-amber-300 text-sm">UTMify não configurado</p>
                  <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
                    Adicione <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded">UTMIFY_EMAIL</code> e{' '}
                    <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded">UTMIFY_PASSWORD</code> no <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded">.env.local</code>
                  </p>
                  <a href="https://app.utmify.com.br" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-amber-300 hover:text-amber-200 font-medium">
                    <ExternalLink size={11}/> Abrir UTMify
                  </a>
                </div>
              </div>
            )}

            {error && configured && (
              <div className="flex items-start gap-3 p-4 rounded-xl border text-sm mb-6"
                style={{background:'rgba(244,63,94,0.08)',borderColor:'rgba(244,63,94,0.22)'}}>
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400"/>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-rose-300">Falha ao carregar dados</p>
                  <p className="text-xs text-rose-400/70 mt-0.5 break-words">{error}</p>
                </div>
                <button onClick={()=>dashboardId&&fetchKpis(dateRange,dashboardId)} className="btn-secondary !py-1.5 !px-3 text-[11px] shrink-0">Tentar novamente</button>
              </div>
            )}

            {/* ════════════════ TAB: VISÃO GERAL ════════════════ */}
            {activeTab==='overview' && (
              <div className="space-y-8 animate-fade-in-up max-w-screen-2xl mx-auto">

                <section>
                  <SH icon={DollarSign} title="Financeiro"/>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
                    <KCard icon={DollarSign} title="Receita Líquida" value={loading?'—':formatCurrency(kpis?.revenue??0)} color="emerald" loading={loading} sub={kpis?`Bruta: ${formatCurrency(kpis.revenueGross)}`:undefined}/>
                    <KCard icon={Activity}   title="Gasto em Ads"    value={loading?'—':formatCurrency(kpis?.spend??0)}   color="blue"    loading={loading}/>
                    <KCard icon={TrendingUp} title="Lucro"           value={loading?'—':formatCurrency(kpis?.profit??0)}  color={isProfit?'emerald':'rose'} loading={loading} sub={kpis?`Margem: ${fmtPct(kpis.profitMargin)}`:undefined}/>
                    <KCard icon={BarChart3}  title="ROI"             value={loading?'—':fmtPct(kpis?.roi??0)}             color={(kpis?.roi??0)>=0?'violet':'amber'} loading={loading} sub={kpis?`ROAS: ${kpis.roas.toFixed(3)}×`:undefined}/>
                  </div>
                </section>

                <section>
                  <SH icon={ShoppingCart} title="Pedidos"/>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
                    <KCard icon={ShoppingCart}     title="Aprovados"     value={loading?'—':formatNumber(kpis?.orders??0)}            color="emerald" loading={loading} sub={kpis?`${kpis.ordersTotal} total · ${kpis.ordersPending} pendente`:undefined}/>
                    <KCard icon={DollarSign}       title="CPA"           value={loading?'—':formatCurrency(kpis?.cpa??0)}             color="cyan"    loading={loading} sub="Custo por aquisição"/>
                    <KCard icon={Package}          title="Ticket Médio"  value={loading?'—':formatCurrency(kpis?.avgTicket??0)}       color="orange"  loading={loading} sub={kpis?`ARPU: ${formatCurrency(kpis.arpu)}`:undefined}/>
                    <KCard icon={TrendingDown}     title="Taxa Reembolso" value={loading?'—':fmtPct(kpis?.refundRate??0,false)}       color={(kpis?.refundRate??0)>5?'rose':'slate'} loading={loading} sub={kpis?`${kpis.ordersRefunded} reemb. · ${kpis.ordersChargedback} chargeback`:undefined}/>
                  </div>
                </section>

                <section>
                  <SH icon={MousePointerClick} title="Mídia"/>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
                    <KCard icon={MousePointerClick} title="Cliques"       value={loading?'—':formatNumber(kpis?.clicks??0)}            color="amber"  loading={loading}/>
                    <KCard icon={Eye}               title="Page Views"    value={loading?'—':formatNumber(kpis?.pageViews??0)}         color="blue"   loading={loading}/>
                    <KCard icon={CreditCard}        title="Init. Checkout" value={loading?'—':formatNumber(kpis?.initiateCheckouts??0)} color="violet" loading={loading} sub={kpis&&kpis.pageViews>0?`${fmtPct((kpis.initiateCheckouts/kpis.pageViews)*100,false)} dos views`:undefined}/>
                    <KCard icon={Users}             title="Leads"         value={loading?'—':formatNumber(kpis?.leads??0)}             color="cyan"   loading={loading}/>
                  </div>
                </section>

                <section>
                  <SH icon={CreditCard} title="Receita Detalhada"/>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><DollarSign size={12} className="text-emerald-400" strokeWidth={2.5}/></div>
                        <h2 className="text-sm font-semibold text-slate-100">Comissões &amp; Deduções</h2>
                      </div>
                      {loading?<div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="h-7 rounded bg-surface-raised animate-pulse"/>)}</div>:(
                        <div>
                          <StatRow label="Receita Bruta"      value={formatCurrency(kpis?.revenueGross??0)}/>
                          <StatRow label="Receita Líquida"    value={formatCurrency(kpis?.revenue??0)} sub="Após deduções"/>
                          <StatRow label="Pendente"           value={formatCurrency(kpis?.revenuePending??0)}/>
                          <StatRow label="Estornado (refund)" value={formatCurrency(Math.abs(kpis?.revenueRefunded??0))}/>
                          <StatRow label="Chargeback"         value={formatCurrency(Math.abs(kpis?.revenueChargeback??0))}/>
                          {(kpis?.fees??0)>0&&<StatRow label="Fees" value={formatCurrency(kpis?.fees??0)}/>}
                          {(kpis?.taxes??0)>0&&<StatRow label="Impostos" value={formatCurrency(kpis?.taxes??0)}/>}
                        </div>
                      )}
                    </div>
                    <div className="card p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0"><CreditCard size={12} className="text-violet-400" strokeWidth={2.5}/></div>
                        <h2 className="text-sm font-semibold text-slate-100">Formas de Pagamento</h2>
                      </div>
                      {loading?<div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-12 rounded bg-surface-raised animate-pulse"/>)}</div>:(
                        <div className="space-y-4">
                          {([
                            {label:'Cartão de Crédito',key:'card'  as const,color:'#3b82f6'},
                            {label:'PIX',              key:'pix'   as const,color:'#10b981'},
                            {label:'Boleto',           key:'boleto'as const,color:'#f59e0b'},
                          ]).map(pm=>{
                            const data=kpis?.paymentMethods[pm.key]; const pct=data?.pct??0
                            return (
                              <div key={pm.key} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400 font-medium">{pm.label}</span>
                                  <span className="text-slate-300 font-semibold tabular-nums">{fmtPct(pct,false)}</span>
                                </div>
                                <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:pm.color}}/>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <SH icon={BarChart3} title="Plataformas &amp; Produtos"/>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-5">
                      <div className="flex items-center gap-2 mb-5"><div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0"><BarChart3 size={12} className="text-blue-400" strokeWidth={2.5}/></div><h2 className="text-sm font-semibold text-slate-100">Gasto por Plataforma</h2></div>
                      {loading?<div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-9 rounded bg-surface-raised animate-pulse"/>)}</div>:totalSpend>0?(
                        <div className="space-y-4">
                          {platforms.filter(p=>p.spend>0).map(p=>(
                            <PlatBar key={p.key} label={`${p.label} Ads`} spend={p.spend} clicks={p.clicks} pageViews={p.pv} total={totalSpend} color={p.color}/>
                          ))}
                        </div>
                      ):<p className="text-sm text-slate-600 py-4 text-center">Sem dados de plataforma</p>}
                    </div>
                    <div className="card p-5">
                      <div className="flex items-center gap-2 mb-5"><div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0"><Package size={12} className="text-violet-400" strokeWidth={2.5}/></div><h2 className="text-sm font-semibold text-slate-100">Top Produtos</h2></div>
                      {loading?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-10 rounded bg-surface-raised animate-pulse"/>)}</div>:(kpis?.topProducts.length??0)>0?(
                        <div className="space-y-1.5">
                          {kpis!.topProducts.map((p,i)=>(
                            <div key={p.name} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-surface-raised/50 border border-surface-border/50">
                              <span className="text-[10px] font-bold text-slate-600 w-4 text-center tabular-nums">{i+1}</span>
                              <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-300 truncate">{p.name}</p><p className="text-[10px] text-slate-600 mt-0.5">{formatNumber(p.count)} pedidos</p></div>
                              <span className="text-xs font-semibold text-emerald-300 tabular-nums shrink-0">{formatCurrency(p.revenue)}</span>
                            </div>
                          ))}
                        </div>
                      ):<p className="text-sm text-slate-600 py-4 text-center">Sem dados de produto</p>}
                    </div>
                  </div>
                </section>

                <section>
                  <SH icon={Clock} title="Análise Horária"/>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-5"><div className="flex items-center gap-2 mb-5"><div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0"><Clock size={12} className="text-cyan-400" strokeWidth={2.5}/></div><h2 className="text-sm font-semibold text-slate-100">Pedidos por Hora</h2></div>
                      {loading?<div className="h-40 rounded bg-surface-raised animate-pulse"/>:(
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={hourData} margin={{top:0,right:0,left:-20,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false}/>
                            <XAxis dataKey="hour" tick={{fontSize:10,fill:'#475569'}} tickFormatter={h=>h%4===0?`${h}h`:''}/>
                            <YAxis tick={{fontSize:10,fill:'#475569'}}/>
                            <Tooltip content={<CTip fmt={v=>`${v} pedidos`}/>}/>
                            <Bar dataKey="count" radius={[3,3,0,0]}>{hourData.map((e,i)=><Cell key={i} fill={e.count===maxHour?'#06b6d4':'rgba(6,182,212,0.35)'}/>)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="card p-5"><div className="flex items-center gap-2 mb-5"><div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><TrendingUp size={12} className="text-emerald-400" strokeWidth={2.5}/></div><h2 className="text-sm font-semibold text-slate-100">Lucro por Hora</h2></div>
                      {loading?<div className="h-40 rounded bg-surface-raised animate-pulse"/>:(
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={profitHourData} margin={{top:0,right:0,left:-20,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false}/>
                            <XAxis dataKey="hour" tick={{fontSize:10,fill:'#475569'}} tickFormatter={h=>h%4===0?`${h}h`:''}/>
                            <YAxis tick={{fontSize:10,fill:'#475569'}} tickFormatter={v=>`$${Math.round(v)}`}/>
                            <Tooltip content={<CTip fmt={v=>formatCurrency(v)}/>}/>
                            <Bar dataKey="profit" radius={[3,3,0,0]}>{profitHourData.map((e,i)=><Cell key={i} fill={e.profit>=0?'#34d399':'#f87171'}/>)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <SH icon={CalendarDays} title="Dias da Semana"/>
                  <div className="card p-5">
                    {loading?<div className="h-40 rounded bg-surface-raised animate-pulse"/>:(
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={dowData} margin={{top:0,right:0,left:-20,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={{fontSize:11,fill:'#475569'}}/>
                          <YAxis tick={{fontSize:10,fill:'#475569'}}/>
                          <Tooltip content={<CTip fmt={v=>`${v} pedidos`}/>}/>
                          <Bar dataKey="count" fill="#f59e0b" fillOpacity={0.8} radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                <section>
                  <SH icon={Globe} title="Origens &amp; Países"/>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {[
                      {title:'UTM Source', data:kpis?.topUtmSources??[], icon:Globe,   color:'bg-blue-500/10 border-blue-500/20',   ico:'text-blue-400'},
                      {title:'UTM Term',   data:kpis?.topUtmTerms??[].slice(0,8),  icon:Tag,    color:'bg-violet-500/10 border-violet-500/20', ico:'text-violet-400'},
                      {title:'Países',     data:(kpis?.topCountries??[]).map(c=>({source:c.country,count:c.count})), icon:Globe, color:'bg-emerald-500/10 border-emerald-500/20', ico:'text-emerald-400'},
                    ].map(({title:t,data,icon:Ic,color,ico})=>(
                      <div key={t} className="card p-5">
                        <div className="flex items-center gap-2 mb-4"><div className={`w-6 h-6 rounded-lg ${color} flex items-center justify-center shrink-0 border`}><Ic size={12} className={ico} strokeWidth={2.5}/></div><h2 className="text-sm font-semibold text-slate-100">{t}</h2></div>
                        {loading?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-7 rounded bg-surface-raised animate-pulse"/>)}</div>:data.length>0?(
                          <div>{data.slice(0,8).map((s,i)=>(
                            <div key={i} className="flex items-center justify-between py-2 border-b border-surface-border/40 last:border-0">
                              <span className="text-xs text-slate-400 font-medium truncate">{s.source}</span>
                              <span className="text-xs text-slate-200 font-semibold tabular-nums ml-3 shrink-0">{formatNumber(s.count)}</span>
                            </div>
                          ))}</div>
                        ):<p className="text-xs text-slate-600 py-3">Sem dados</p>}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <SH icon={Repeat2} title="Funil de Conversão"/>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {label:'Cliques → Page Views',   a:kpis?.clicks??0,             b:kpis?.pageViews??0,         desc:'Visitantes que chegaram'},
                      {label:'Page Views → Checkouts', a:kpis?.pageViews??0,           b:kpis?.initiateCheckouts??0, desc:'Iniciaram compra'},
                      {label:'Checkouts → Aprovados',  a:kpis?.initiateCheckouts??0,  b:kpis?.orders??0,            desc:'Converteram em pedido'},
                    ].map(item=>{
                      const rate=item.a>0?(item.b/item.a)*100:0
                      const col=rate>=3?'text-emerald-300':rate>=1?'text-amber-300':'text-slate-400'
                      return (
                        <div key={item.label} className="card p-4 sm:p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-500 mb-3">{item.label}</p>
                          {loading?<div className="h-8 w-24 rounded bg-surface-raised animate-pulse"/>:(
                            <><p className={`text-2xl font-bold tabular-nums ${col}`}>{rate>0?`${rate.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%`:'—'}</p>
                            <p className="text-[11px] text-slate-600 mt-1.5 font-medium">{formatNumber(item.b)} de {formatNumber(item.a)} · {item.desc}</p></>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>

                <footer className="text-center py-8 border-t border-surface-border/30">
                  <p className="text-[11px] text-slate-700 font-medium tracking-wide">UTMify Analytics · Dados em tempo real</p>
                </footer>
              </div>
            )}

            {/* ════════════════ TAB: CONTAS ════════════════ */}
            {activeTab==='contas' && (
              <div className="space-y-6 animate-fade-in-up max-w-screen-2xl mx-auto">
                <p className="text-[11px] text-slate-600 font-medium">
                  Clique em uma conta para ver o detalhamento de receita e anúncios filtrados por ela.
                  As contas precisam estar conectadas no{' '}
                  <a href="https://app.utmify.com.br" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-1">
                    painel UTMify <ExternalLink size={10}/>
                  </a>
                </p>

                {/* Meta Ads */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{background:'#1877f2'}}/>
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em]">Meta Ads</h2>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {metaProfiles.length} perfil{metaProfiles.length!==1?'is':''} · {metaProfiles.reduce((s,p)=>s+p.adAccounts.length,0)} contas
                    </span>
                  </div>
                  {profLoading?<div className="space-y-2">{[1,2].map(i=><div key={i} className="h-16 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                  :metaProfiles.length===0
                  ?<div className="card p-5 flex items-start gap-3">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Nenhuma conta Meta conectada</p>
                      <p className="text-xs text-slate-600 mt-0.5">Conecte suas contas de anúncio em <a href="https://app.utmify.com.br/configuracoes" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">app.utmify.com.br → Configurações</a></p>
                    </div>
                  </div>
                  :metaProfiles.map(prof=>(
                    <div key={prof.id} className="mb-4">
                      <div className="flex items-center gap-2.5 px-3 py-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-400">{prof.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0"><p className="text-xs font-semibold text-slate-300 truncate">{prof.name}</p><p className="text-[10px] text-slate-600 truncate">{prof.email}</p></div>
                        {prof.tokenExpired&&<span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">Token Expirado</span>}
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {prof.adAccounts.map(acc=>(
                          <button key={acc.id} onClick={()=>openAccountDrawer(prof,acc)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-card border border-surface-border hover:border-blue-500/40 hover:bg-surface-hover transition-all group text-left">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0"><CreditCard size={12} className="text-blue-400"/></div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">{acc.name}</p><p className="text-[10px] text-slate-600 font-medium">ID: {acc.id}</p></div>
                            <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"/>
                          </button>
                        ))}
                        {prof.adAccounts.length===0&&<p className="text-xs text-slate-700 px-4 py-2">Nenhuma conta de anúncio neste perfil.</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Google Ads */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{background:'#34a853'}}/>
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em]">Google Ads</h2>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {googleProfiles.length} perfil{googleProfiles.length!==1?'is':''} · {googleProfiles.reduce((s,p)=>s+p.adAccounts.length,0)} contas
                    </span>
                  </div>
                  {profLoading?<div className="space-y-2">{[1,2].map(i=><div key={i} className="h-16 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                  :googleProfiles.length===0
                  ?<div className="card p-5 flex items-start gap-3">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Nenhuma conta Google conectada</p>
                      <p className="text-xs text-slate-600 mt-0.5">Conecte suas contas de anúncio em <a href="https://app.utmify.com.br/configuracoes" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">app.utmify.com.br → Configurações</a></p>
                    </div>
                  </div>
                  :googleProfiles.map(prof=>(
                    <div key={prof.id} className="mb-4">
                      <div className="flex items-center gap-2.5 px-3 py-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-400">{prof.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0"><p className="text-xs font-semibold text-slate-300 truncate">{prof.name}</p><p className="text-[10px] text-slate-600 truncate">{prof.email}</p></div>
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {prof.adAccounts.map(acc=>(
                          <button key={acc.id} onClick={()=>openAccountDrawer(prof,acc)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-card border border-surface-border hover:border-emerald-500/40 hover:bg-surface-hover transition-all group text-left">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><CreditCard size={12} className="text-emerald-400"/></div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">{acc.name}</p><p className="text-[10px] text-slate-600 font-medium">ID: {acc.id}</p></div>
                            <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"/>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════════════════ TAB: CAMPANHAS ════════════════ */}
            {activeTab==='campanhas' && (
              <div className="space-y-4 animate-fade-in-up max-w-screen-2xl mx-auto">

                {/* ── Breadcrumb / navegação hierárquica ─────────────────── */}
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Campanhas */}
                  <button onClick={()=>fetchCampaigns(dateRange,dashboardId)}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all
                      ${campLevel==='campaigns'?'bg-violet-600/25 text-violet-300 border border-violet-500/30':'text-slate-500 hover:text-slate-300 hover:bg-surface-hover'}`}>
                    <Activity size={11}/> Campanhas
                    {campLevel==='campaigns'&&campaigns.length>0&&(
                      <span className="ml-1 text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-md font-bold">{campaigns.length}</span>
                    )}
                  </button>

                  {selCampaign && (
                    <>
                      <ChevronRight size={12} className="text-slate-700 shrink-0"/>
                      <button onClick={()=>{ setCampLevel('adsets'); setCampSearch('') }}
                        className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all max-w-[200px]
                          ${campLevel==='adsets'?'bg-blue-600/25 text-blue-300 border border-blue-500/30':'text-slate-500 hover:text-slate-300 hover:bg-surface-hover'}`}>
                        <Layers size={11} className="shrink-0"/>
                        <span className="truncate">{selCampaign.name}</span>
                        {campLevel==='adsets'&&adSets.length>0&&(
                          <span className="ml-1 text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">{adSets.length}</span>
                        )}
                      </button>
                    </>
                  )}

                  {selAdSet && (
                    <>
                      <ChevronRight size={12} className="text-slate-700 shrink-0"/>
                      <button onClick={()=>{ setCampLevel('ads'); setCampSearch('') }}
                        className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all max-w-[200px]
                          ${campLevel==='ads'?'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30':'text-slate-500 hover:text-slate-300 hover:bg-surface-hover'}`}>
                        <Tag size={11} className="shrink-0"/>
                        <span className="truncate">{selAdSet.name}</span>
                        {campLevel==='ads'&&ads.length>0&&(
                          <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">{ads.length}</span>
                        )}
                      </button>
                    </>
                  )}

                  <div className="flex-1"/>

                  {/* Toolbar direita */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"/>
                      <input value={campSearch} onChange={e=>setCampSearch(e.target.value)}
                        placeholder="Buscar…"
                        className="h-8 pl-7 pr-3 text-xs rounded-xl bg-surface-raised border border-surface-border text-slate-300 w-36
                                   placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500/50"/>
                    </div>
                    {campLevel==='campaigns' && (
                      <div className="flex rounded-xl border border-surface-border overflow-hidden">
                        {(['both','meta','google'] as const).map(p=>(
                          <button key={p} onClick={()=>setCampPlatFilter(p)}
                            className={`px-2.5 h-8 text-[11px] font-semibold transition-all
                              ${campPlatFilter===p?'bg-violet-600/30 text-violet-300':'text-slate-600 hover:text-slate-300 bg-surface-raised'}`}>
                            {p==='both'?'Todas':p==='meta'?'Meta':'Google'}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={()=>fetchCampaigns(dateRange,dashboardId)} disabled={campLoading||!dashboardId}
                      className="btn-icon !w-8 !h-8">
                      <RefreshCw size={12} className={campLoading?'animate-spin':''}/>
                    </button>
                  </div>
                </div>

                {/* Error */}
                {campError && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/25 bg-rose-500/8">
                    <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-rose-300 text-xs">
                        {campLevel==='campaigns'?'Erro ao carregar campanhas':campLevel==='adsets'?'Erro ao carregar conjuntos':'Erro ao carregar anúncios'}
                        {campLevel!=='campaigns'&&<span className="text-rose-400/60 font-normal"> — Meta: adsets/ads podem não estar disponíveis neste plano</span>}
                      </p>
                      <p className="text-[11px] text-rose-400/70 mt-0.5 break-words">{campError}</p>
                    </div>
                  </div>
                )}

                {/* Loading */}
                {campLoading && (
                  <div className="space-y-2">{[1,2,3,4].map(i=>(
                    <div key={i} className="h-14 rounded-xl bg-surface-raised animate-pulse"/>
                  ))}</div>
                )}

                {/* ── Tabela genérica ─────────────────────────────────────── */}
                {!campLoading && (() => {
                  const source = campLevel==='campaigns' ? campaigns : campLevel==='adsets' ? adSets : ads
                  const onRowClick = campLevel==='campaigns'
                    ? (c: UTMifyCampaignRow) => drillToAdSets(c)
                    : campLevel==='adsets'
                    ? (c: UTMifyCampaignRow) => drillToAds(c)
                    : null

                  const levelLabel = campLevel==='campaigns'?'campanha':campLevel==='adsets'?'conjunto':'anúncio'
                  const levelColor = campLevel==='campaigns'?'#a78bfa':campLevel==='adsets'?'#60a5fa':'#34d399'

                  const isClickable = onRowClick !== null

                  const filtered = source
                    .filter(c => campLevel!=='campaigns' || campPlatFilter==='both' || c.platform===campPlatFilter)
                    .filter(c => !campSearch || c.name.toLowerCase().includes(campSearch.toLowerCase()))
                    .sort((a,b) => {
                      const inf = campSortDir==='desc' ? -Infinity : Infinity
                      const va  = (a[campSort] as number|null) ?? inf
                      const vb  = (b[campSort] as number|null) ?? inf
                      return campSortDir==='desc' ? vb-va : va-vb
                    })

                  if (filtered.length === 0 && !campError) return (
                    <div className="card p-10 text-center space-y-2">
                      <Activity size={22} className="text-slate-700 mx-auto"/>
                      <p className="text-sm text-slate-500 font-medium">
                        {source.length===0
                          ? `Clique em Campanhas para carregar os dados.`
                          : `Nenhum ${levelLabel} corresponde ao filtro.`}
                      </p>
                    </div>
                  )

                  // ── column helpers ──────────────────────────────────
                  type SK = typeof campSort
                  const cur = (v: number | null) => v == null ? '—' : formatCurrency(v)
                  const num = (v: number | null) => v == null ? '—' : formatNumber(v)
                  const pct = (v: number | null, d=1) =>
                    v == null ? '—' : `${v>=0?'+':''}${v.toFixed(d)}%`
                  const budget = (c: UTMifyCampaignRow) => {
                    const b = c.dailyBudget ?? c.lifetimeBudget
                    return b != null ? formatCurrency(b) : '—'
                  }
                  const sortBtn = (key: SK, label: string) => {
                    const on = campSort === key
                    return (
                      <button key={key}
                        onClick={() => { if (on) setCampSortDir(d=>d==='desc'?'asc':'desc')
                                         else { setCampSort(key); setCampSortDir('desc') } }}
                        className={`flex items-center justify-end gap-0.5 w-full transition-colors
                          ${on?'text-violet-400':'text-slate-600 hover:text-slate-400'}`}>
                        <span className="truncate">{label}</span>
                        <span className="text-[8px] leading-none shrink-0">
                          {on?(campSortDir==='desc'?'↓':'↑'):'↕'}
                        </span>
                      </button>
                    )
                  }
                  const hi = (key: SK, base: string) =>
                    campSort===key ? 'text-violet-300' : base

                  // ── per-level grid template ─────────────────────────
                  // Widths calibrated to fit a 1440px screen (sidebar ~200px, padding ~32px → ~1208px available)
                  // Fixed cols total ≈ 920px + gaps → name gets remaining ~250px
                  const hasUpdate  = campLevel==='adsets'
                  const hasChevron = isClickable
                  const GT = [
                    '22px',                    // status icon
                    'minmax(60px,1fr)',         // name (flexible)
                    '64px',                    // orçamento
                    ...(hasUpdate?['76px']:[]),// ult.atualização (adsets only)
                    '34px',                    // vendas
                    '64px',                    // cpa
                    '64px',                    // gasto
                    '64px',                    // faturamento
                    '66px',                    // lucro (negativo mais largo)
                    '42px',                    // roas
                    '52px',                    // margem
                    '52px',                    // roi
                    '28px',                    // ic
                    '62px',                    // cpi
                    '62px',                    // cpc
                    '44px',                    // ctr
                    '62px',                    // cpm
                    '46px',                    // impressões
                    '40px',                    // cliques
                    ...(hasChevron?['12px']:[]),// chevron
                  ].join(' ')

                  return (
                    <div className="space-y-1">
                      {/* ── Header + Rows num único container ──────────── */}
                      <div>
                        {/* Header */}
                        <div style={{gridTemplateColumns:GT}}
                             className="hidden lg:grid gap-x-1 px-2 pb-1.5
                                        text-[8.5px] font-semibold uppercase tracking-[0.07em]">
                          <span/>{/* status */}
                          <span className="text-slate-600 capitalize">{levelLabel}</span>
                          <span className="text-right text-slate-600">Orç.</span>
                          {hasUpdate&&<span className="text-right text-slate-600">Atual.</span>}
                          {sortBtn('approvedOrdersCount','Vnd.')}
                          {sortBtn('cpa','CPA')}
                          {sortBtn('spend','Gasto')}
                          {sortBtn('revenue','Fat.')}
                          {sortBtn('profit','Lucro')}
                          {sortBtn('roas','ROAS')}
                          {sortBtn('margin','Mgm.')}
                          {sortBtn('roi','ROI')}
                          {sortBtn('ic','IC')}
                          {sortBtn('cpi','CPI')}
                          {sortBtn('cpc','CPC')}
                          {sortBtn('ctr','CTR')}
                          {sortBtn('cpm','CPM')}
                          {sortBtn('impressions','Impr.')}
                          {sortBtn('clicks','Clic.')}
                          {hasChevron&&<span/>}
                        </div>

                        {/* Rows */}
                        <div className="space-y-1">
                          {filtered.map(c => {
                            const pc       = c.platform==='meta'?'#1877f2':'#34a853'
                            const isActive = c.status==='ACTIVE'||c.status==='ENABLED'
                            const updStr   = c.updatedAt
                              ? new Date(c.updatedAt).toLocaleString('pt-BR',
                                  {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
                              : '—'
                            return (
                              <div key={c.id}
                                onClick={()=>onRowClick?.(c)}
                                style={{gridTemplateColumns:GT}}
                                className={`card px-2 py-2 grid gap-x-1 items-center transition-all
                                  ${isClickable?'cursor-pointer hover:border-slate-600/60 group':''}`}>

                                {/* status icon */}
                                <div className="flex flex-col items-center gap-px">
                                  <div className="w-4 h-4 rounded flex items-center justify-center text-[6px] font-black"
                                    style={{background:`${pc}20`,border:`1px solid ${pc}40`,color:pc}}>
                                    {c.platform==='meta'?'FB':'GL'}
                                  </div>
                                  {isActive
                                    ?<Play  size={5} className="text-emerald-400"/>
                                    :<Pause size={5} className="text-slate-700"/>}
                                </div>

                                {/* name */}
                                <div className="min-w-0">
                                  <p className={`text-[11px] font-semibold truncate leading-tight
                                    ${isClickable?'group-hover:text-white':''} text-slate-200`}
                                    title={c.name}>{c.name}</p>
                                  <div className="flex items-center gap-0.5 mt-px">
                                    <span className={`text-[7px] font-bold uppercase px-0.5 py-px rounded
                                      ${isActive
                                        ?'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                        :'text-slate-600 bg-surface-raised border border-surface-border'}`}>
                                      {c.status}
                                    </span>
                                  </div>
                                </div>

                                {/* orçamento */}
                                <span className="text-[10px] tabular-nums text-right text-slate-500">{budget(c)}</span>

                                {/* ult. atualização (adsets only) */}
                                {hasUpdate&&(
                                  <span className="text-[9px] tabular-nums text-right text-slate-600 leading-tight">{updStr}</span>
                                )}

                                {/* vendas */}
                                <span className={`text-[10px] font-semibold tabular-nums text-right
                                  ${hi('approvedOrdersCount', c.approvedOrdersCount>0?'text-emerald-300':'text-slate-600')}`}>
                                  {c.approvedOrdersCount}
                                </span>

                                {/* cpa */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('cpa','text-slate-400')}`}>{cur(c.cpa)}</span>

                                {/* gasto */}
                                <span className={`text-[10px] font-semibold tabular-nums text-right ${hi('spend','text-blue-300')}`}>{cur(c.spend)}</span>

                                {/* faturamento */}
                                <span className={`text-[10px] font-semibold tabular-nums text-right ${hi('revenue','text-emerald-300')}`}>{cur(c.revenue)}</span>

                                {/* lucro */}
                                <span className={`text-[10px] font-semibold tabular-nums text-right
                                  ${hi('profit', c.profit>=0?'text-emerald-300':'text-rose-300')}`}>
                                  {cur(c.profit)}
                                </span>

                                {/* roas */}
                                <span className={`text-[10px] font-bold tabular-nums text-right
                                  ${hi('roas', c.roas>=1?'text-amber-300':'text-slate-500')}`}>
                                  {c.roas.toFixed(2)}×
                                </span>

                                {/* margem */}
                                <span className={`text-[10px] tabular-nums text-right
                                  ${hi('margin', c.margin==null?'text-slate-700':c.margin>=0?'text-emerald-300':'text-rose-300')}`}>
                                  {c.margin==null?'—':`${c.margin.toFixed(1)}%`}
                                </span>

                                {/* roi */}
                                <span className={`text-[10px] font-bold tabular-nums text-right
                                  ${hi('roi', c.roi>=0?'text-emerald-300':'text-rose-300')}`}>
                                  {pct(c.roi,1)}
                                </span>

                                {/* ic */}
                                <span className={`text-[10px] tabular-nums text-right
                                  ${hi('ic', c.ic!=null&&c.ic>0?'text-slate-300':'text-slate-700')}`}>
                                  {num(c.ic)}
                                </span>

                                {/* cpi */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('cpi','text-slate-400')}`}>{cur(c.cpi)}</span>

                                {/* cpc */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('cpc','text-slate-400')}`}>{cur(c.cpc)}</span>

                                {/* ctr */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('ctr','text-slate-400')}`}>
                                  {c.ctr==null?'—':`${c.ctr.toFixed(2)}%`}
                                </span>

                                {/* cpm */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('cpm','text-slate-400')}`}>{cur(c.cpm)}</span>

                                {/* impressões */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('impressions','text-slate-500')}`}>{num(c.impressions)}</span>

                                {/* cliques */}
                                <span className={`text-[10px] tabular-nums text-right ${hi('clicks','text-slate-400')}`}>{num(c.clicks)}</span>

                                {/* chevron */}
                                {hasChevron&&(
                                  <ChevronRight size={11}
                                    className="text-slate-700 group-hover:text-slate-400 transition-colors justify-self-center"/>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <p className="text-center text-[10px] pt-1.5 font-medium" style={{color:levelColor}}>
                        {filtered.length} {levelLabel}{filtered.length!==1?'s':''}
                        {isClickable&&` · clique para ver ${campLevel==='campaigns'?'conjuntos':'anúncios'}`}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ════════════════ TAB: ANÚNCIOS ════════════════ */}
            {activeTab==='anuncios' && (
              <div className="space-y-6 animate-fade-in-up max-w-screen-2xl mx-auto">
                {loading
                  ? <div className="space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-12 rounded-xl bg-surface-raised animate-pulse"/>)}</div>
                  : (() => {
                    const utmSections = [
                      { key:'campaign', label:'Campanhas (UTM Campaign)', color:'#3b82f6', bgColor:'bg-blue-500/5',   data: kpis?.topUtmCampaigns ?? [] },
                      { key:'source',   label:'Fonte (UTM Source)',        color:'#10b981', bgColor:'bg-emerald-500/5', data: kpis?.topUtmSources   ?? [] },
                      { key:'medium',   label:'Mídia (UTM Medium)',        color:'#f59e0b', bgColor:'bg-amber-500/5',  data: kpis?.topUtmMediums   ?? [] },
                      { key:'content',  label:'Conteúdo (UTM Content)',    color:'#a78bfa', bgColor:'bg-violet-500/5', data: kpis?.topUtmContents  ?? [] },
                      { key:'term',     label:'Anúncio (UTM Term)',        color:'#ec4899', bgColor:'bg-pink-500/5',   data: kpis?.topUtmTerms     ?? [] },
                    ].filter(s => s.data.length > 0)

                    if (utmSections.length === 0) {
                      return (
                        <div className="card p-8 text-center space-y-2">
                          <Tag size={24} className="text-slate-700 mx-auto"/>
                          <p className="text-sm text-slate-500 font-medium">Nenhum dado UTM no período.</p>
                          <p className="text-xs text-slate-700">
                            Adicione parâmetros UTM nos seus anúncios para ver o detalhamento aqui.
                          </p>
                        </div>
                      )
                    }

                    return utmSections.map(section => (
                      <div key={section.key}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{background:section.color}}/>
                          <h3 className="text-xs font-bold uppercase tracking-[0.12em]" style={{color:section.color}}>{section.label}</h3>
                          <span className="text-[10px] text-slate-600 font-medium">{section.data.length} {section.data.length===1?'item':'itens'}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-600">
                            <span className="w-7 text-center">#</span>
                            <span className="flex-1">Valor</span>
                            <span className="w-20 text-right">Pedidos</span>
                          </div>
                          {section.data.map((row, i) => {
                            const maxC = section.data[0]?.count ?? 1
                            const pct  = (row.count / maxC) * 100
                            return (
                              <div key={i} className="card px-4 py-3 relative overflow-hidden">
                                <div className={`absolute inset-0 ${section.bgColor}`} style={{width:`${pct}%`}}/>
                                <div className="relative flex items-center gap-3">
                                  <span className="w-7 text-center text-[11px] font-bold text-slate-600 tabular-nums shrink-0">{i+1}</span>
                                  <p className="flex-1 text-xs font-semibold text-slate-300 truncate" title={row.source}>{row.source}</p>
                                  <span className="text-xs font-bold tabular-nums shrink-0 w-20 text-right" style={{color:section.color}}>{formatNumber(row.count)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()
                }
              </div>
            )}

          </div>{/* fim scroll area */}

          {/* ── Drawer desktop ─────────────────────────────────────────── */}
          {drawerOpen && (
            <div className="hidden lg:flex flex-col w-[420px] shrink-0 border-l border-surface-border bg-surface-card absolute right-0 top-0 bottom-0 z-20 shadow-2xl">
              <Drawer title={drawerTitle} subtitle={drawerSub} platform={drawerPlatform} kpis={drawerKpis} loading={drawerLoading} error={drawerError} onClose={()=>setDrawerOpen(false)}/>
            </div>
          )}

          {/* ── Drawer mobile ──────────────────────────────────────────── */}
          {drawerOpen && (
            <div className="lg:hidden fixed inset-x-0 bottom-0 h-[85vh] bg-surface-card border-t border-surface-border z-50 rounded-t-2xl shadow-2xl flex flex-col">
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-surface-border"/></div>
              <Drawer title={drawerTitle} subtitle={drawerSub} platform={drawerPlatform} kpis={drawerKpis} loading={drawerLoading} error={drawerError} onClose={()=>setDrawerOpen(false)}/>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
