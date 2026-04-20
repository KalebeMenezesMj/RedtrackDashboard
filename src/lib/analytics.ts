/**
 * Analytics — persiste visitas no Supabase.
 * Sem cookies, sem localStorage — apenas cabeçalhos HTTP.
 */

import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisitRecord {
  id: string
  timestamp: string
  ip: string
  ipAnon: string
  userAgent: string
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  path: string
  referrer: string
  language: string
  country: string
  city: string
}

// Linha como vem do Supabase (snake_case)
interface DBRow {
  id: string
  timestamp: string
  ip: string
  ip_anon: string
  user_agent: string
  browser: string
  browser_version: string
  os: string
  os_version: string
  device: string
  path: string
  referrer: string
  language: string
  country: string
  city: string
}

export interface Stats {
  total: number
  today: number
  week: number
  month: number
  uniqueIPs: number
  pages:     [string, number][]
  browsers:  [string, number][]
  os:        [string, number][]
  devices:   [string, number][]
  langs:     [string, number][]
  referrers: [string, number][]
  hourly:    number[]
  ipList: {
    ip: string
    ipAnon: string
    count: number
    last: string
    country: string
    city: string
  }[]
  recent: VisitRecord[]
}

// ---------------------------------------------------------------------------
// Conversão DB → domínio
// ---------------------------------------------------------------------------

function fromDB(row: DBRow): VisitRecord {
  return {
    id:             row.id,
    timestamp:      row.timestamp,
    ip:             row.ip,
    ipAnon:         row.ip_anon,
    userAgent:      row.user_agent,
    browser:        row.browser,
    browserVersion: row.browser_version,
    os:             row.os,
    osVersion:      row.os_version,
    device:         (row.device as VisitRecord['device']) || 'unknown',
    path:           row.path,
    referrer:       row.referrer,
    language:       row.language,
    country:        row.country,
    city:           row.city,
  }
}

// ---------------------------------------------------------------------------
// User-Agent parser
// ---------------------------------------------------------------------------

type UAResult = Pick<VisitRecord, 'browser' | 'browserVersion' | 'os' | 'osVersion' | 'device'>

export function parseUA(ua: string): UAResult {
  // Browser
  const browserRules: [RegExp, string][] = [
    [/Edg\/([0-9]+)/,             'Edge'],
    [/OPR\/([0-9]+)/,             'Opera'],
    [/SamsungBrowser\/([0-9]+)/,  'Samsung Browser'],
    [/YaBrowser\/([0-9]+)/,       'Yandex'],
    [/Chrome\/([0-9]+)/,          'Chrome'],
    [/Firefox\/([0-9]+)/,         'Firefox'],
    [/Version\/([0-9]+).*Safari/, 'Safari'],
    [/MSIE ([0-9]+)/,             'IE'],
    [/Trident.*rv:([0-9]+)/,      'IE'],
  ]
  let browser = 'Unknown', browserVersion = ''
  for (const [re, name] of browserRules) {
    const m = re.exec(ua)
    if (m) { browser = name; browserVersion = m[1]; break }
  }

  // OS
  let os = 'Unknown', osVersion = ''
  const osRules: [RegExp, string, ((s: string) => string)?][] = [
    [/Windows NT 10\.0/, 'Windows', () => '10/11'],
    [/Windows NT 6\.3/,  'Windows', () => '8.1'],
    [/Windows NT 6\.1/,  'Windows', () => '7'],
    [/Windows/,          'Windows'],
    [/Android ([0-9.]+)/,'Android'],
    [/iPhone OS ([0-9_]+)/, 'iOS',    v => v.replace(/_/g, '.')],
    [/iPad.*OS ([0-9_]+)/,  'iPadOS', v => v.replace(/_/g, '.')],
    [/Mac OS X ([0-9_.]+)/, 'macOS',  v => v.replace(/_/g, '.')],
    [/CrOS/,             'Chrome OS'],
    [/Linux/,            'Linux'],
  ]
  for (const [re, name, transform] of osRules) {
    const m = re.exec(ua)
    if (m) {
      os = name
      osVersion = transform ? transform(m[1] ?? '') : (m[1]?.split('.')[0] ?? '')
      break
    }
  }

  // Device
  let device: UAResult['device'] = 'desktop'
  if (/iPad|Tablet|PlayBook/i.test(ua))
    device = 'tablet'
  else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))
    device = 'mobile'

  return { browser, browserVersion, os, osVersion, device }
}

// ---------------------------------------------------------------------------
// IP anonymizer
// ---------------------------------------------------------------------------

export function anonIP(ip: string): string {
  const v4 = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/.exec(ip)
  if (v4) return v4[1] + '.0'
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::'
  return ip
}

// ---------------------------------------------------------------------------
// Gravar visita
// ---------------------------------------------------------------------------

export async function recordVisit(
  raw: Omit<VisitRecord, 'id' | 'ipAnon' | 'browser' | 'browserVersion' | 'os' | 'osVersion' | 'device'> & { userAgent: string }
) {
  const ua = parseUA(raw.userAgent)

  const { error } = await supabase.from('visits').insert({
    ip:              raw.ip,
    ip_anon:         anonIP(raw.ip),
    user_agent:      raw.userAgent,
    browser:         ua.browser,
    browser_version: ua.browserVersion,
    os:              ua.os,
    os_version:      ua.osVersion,
    device:          ua.device,
    path:            raw.path,
    referrer:        raw.referrer,
    language:        raw.language,
    timestamp:       raw.timestamp,
    country:         raw.country,
    city:            raw.city,
  })

  if (error) console.error('[analytics] insert error:', error.message)
}

// ---------------------------------------------------------------------------
// Estatísticas
// ---------------------------------------------------------------------------

export async function getStats(): Promise<Stats> {
  const now       = new Date()
  const todayStr  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStr   = new Date(now.getTime() - 7  * 86_400_000).toISOString()
  const monthStr  = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const dayAgoStr = new Date(now.getTime() - 86_400_000).toISOString()

  // Busca contagens e dados em paralelo
  const [
    { count: total },
    { count: today },
    { count: week },
    { count: month },
    { data: allRows },
    { data: recentRows },
    { data: hourlyRows },
  ] = await Promise.all([
    supabase.from('visits').select('*', { count: 'exact', head: true }),
    supabase.from('visits').select('*', { count: 'exact', head: true }).gte('timestamp', todayStr),
    supabase.from('visits').select('*', { count: 'exact', head: true }).gte('timestamp', weekStr),
    supabase.from('visits').select('*', { count: 'exact', head: true }).gte('timestamp', monthStr),
    // Para agregações: busca colunas necessárias (sem user_agent pesado)
    supabase.from('visits')
      .select('ip, ip_anon, browser, os, device, path, referrer, language, country, city, timestamp')
      .order('timestamp', { ascending: false })
      .limit(20_000),
    // Visitas recentes completas
    supabase.from('visits')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50),
    // Hourly: últimas 24h
    supabase.from('visits')
      .select('timestamp')
      .gte('timestamp', dayAgoStr),
  ])

  const rows = (allRows ?? []) as DBRow[]

  // Contagem auxiliar
  const cnt = (rec: Record<string, number>, key: string) => { rec[key] = (rec[key] ?? 0) + 1 }

  const pages:     Record<string, number> = {}
  const browsers:  Record<string, number> = {}
  const osMap:     Record<string, number> = {}
  const devices:   Record<string, number> = {}
  const langs:     Record<string, number> = {}
  const referrers: Record<string, number> = {}
  const ipMap: Record<string, { count: number; last: string; country: string; city: string; ipAnon: string }> = {}

  for (const r of rows) {
    cnt(pages,    r.path    || '/')
    cnt(browsers, r.browser || 'Unknown')
    cnt(osMap,    r.os      || 'Unknown')
    cnt(devices,  r.device  || 'unknown')

    const lang = (r.language || 'unknown').split(',')[0].split(';')[0].trim() || 'unknown'
    cnt(langs, lang)

    if (r.referrer) {
      try   { cnt(referrers, new URL(r.referrer).hostname.replace(/^www\./, '')) }
      catch { cnt(referrers, r.referrer.slice(0, 60)) }
    }

    if (!ipMap[r.ip]) ipMap[r.ip] = { count: 0, last: r.timestamp, country: r.country, city: r.city, ipAnon: r.ip_anon }
    ipMap[r.ip].count++
    if (r.timestamp > ipMap[r.ip].last) {
      ipMap[r.ip].last    = r.timestamp
      ipMap[r.ip].country = r.country
      ipMap[r.ip].city    = r.city
    }
  }

  // Hourly (últimas 24h)
  const hourly = Array<number>(24).fill(0)
  for (const r of (hourlyRows ?? []) as { timestamp: string }[]) {
    hourly[new Date(r.timestamp).getHours()]++
  }

  const sortTop = (obj: Record<string, number>, n = 10): [string, number][] =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)

  const ipList = Object.entries(ipMap)
    .map(([ip, d]) => ({ ip, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 200)

  const recent = ((recentRows ?? []) as DBRow[]).map(fromDB)
  const uniqueIPs = new Set(rows.map(r => r.ip)).size

  return {
    total:    total    ?? 0,
    today:    today    ?? 0,
    week:     week     ?? 0,
    month:    month    ?? 0,
    uniqueIPs,
    pages:    sortTop(pages),
    browsers: sortTop(browsers),
    os:       sortTop(osMap),
    devices:  sortTop(devices),
    langs:    sortTop(langs),
    referrers: sortTop(referrers),
    hourly,
    ipList,
    recent,
  }
}
