/**
 * Analytics — armazenamento de visitas e cálculo de estatísticas.
 * Persiste em data/visits.json (arquivo excluído do git).
 * Não usa cookies — coleta apenas dados de cabeçalhos HTTP.
 */

import fs   from 'fs'
import path from 'path'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisitRecord {
  id: string
  timestamp: string       // ISO 8601
  ip: string              // IP completo (armazenado apenas no servidor)
  ipAnon: string          // IP anonimizado (último octeto zerado)
  userAgent: string
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  path: string
  referrer: string
  language: string        // ex: "pt-BR"
  country: string         // ex: "BR" — via header CDN (Vercel/Cloudflare)
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
  hourly:    number[]             // 24 posições — visitas por hora (últimas 24h)
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
// Persistência
// ---------------------------------------------------------------------------

const DATA_DIR  = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'visits.json')

let _visits: VisitRecord[] = []
let _loaded = false

function load() {
  if (_loaded) return
  _loaded = true
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (fs.existsSync(DATA_FILE)) {
      _visits = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as VisitRecord[]
    }
  } catch {
    _visits = []
  }
}

function persist() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(_visits))
  } catch { /* ignora erros de escrita */ }
}

// ---------------------------------------------------------------------------
// User-Agent parser
// ---------------------------------------------------------------------------

type UAResult = Pick<VisitRecord, 'browser' | 'browserVersion' | 'os' | 'osVersion' | 'device'>

export function parseUA(ua: string): UAResult {
  // ── Browser ──────────────────────────────────────────────────────────────
  const browserRules: [RegExp, string][] = [
    [/Edg\/([0-9]+)/,                'Edge'],
    [/OPR\/([0-9]+)/,                'Opera'],
    [/SamsungBrowser\/([0-9]+)/,     'Samsung Browser'],
    [/YaBrowser\/([0-9]+)/,          'Yandex'],
    [/Chrome\/([0-9]+)/,             'Chrome'],
    [/Firefox\/([0-9]+)/,            'Firefox'],
    [/Version\/([0-9]+).*Safari/,    'Safari'],
    [/MSIE ([0-9]+)/,                'IE'],
    [/Trident.*rv:([0-9]+)/,         'IE'],
  ]
  let browser = 'Unknown', browserVersion = ''
  for (const [re, name] of browserRules) {
    const m = re.exec(ua)
    if (m) { browser = name; browserVersion = m[1]; break }
  }

  // ── OS ───────────────────────────────────────────────────────────────────
  let os = 'Unknown', osVersion = ''
  const osRules: [RegExp, string, ((s: string) => string)?][] = [
    [/Windows NT 10\.0/, 'Windows', () => '10/11'],
    [/Windows NT 6\.3/,  'Windows', () => '8.1'],
    [/Windows NT 6\.2/,  'Windows', () => '8'],
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

  // ── Device ───────────────────────────────────────────────────────────────
  let device: UAResult['device'] = 'desktop'
  if (/iPad|Tablet|PlayBook/i.test(ua))                            device = 'tablet'
  else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device = 'mobile'

  return { browser, browserVersion, os, osVersion, device }
}

// ---------------------------------------------------------------------------
// IP anonymizer
// ---------------------------------------------------------------------------

export function anonIP(ip: string): string {
  // IPv4: zera último octeto
  const v4 = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/.exec(ip)
  if (v4) return v4[1] + '.0'
  // IPv6: mantém apenas os primeiros 4 grupos
  if (ip.includes(':')) {
    const parts = ip.split(':')
    return parts.slice(0, 4).join(':') + '::'
  }
  return ip
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export function recordVisit(raw: Omit<VisitRecord, 'id' | 'ipAnon' | 'browser' | 'browserVersion' | 'os' | 'osVersion' | 'device'> & { userAgent: string }) {
  load()
  const ua = parseUA(raw.userAgent)
  const record: VisitRecord = {
    ...raw,
    ...ua,
    id: crypto.randomUUID(),
    ipAnon: anonIP(raw.ip),
  }
  _visits.push(record)
  if (_visits.length > 50_000) _visits = _visits.slice(-50_000)
  persist()
}

export function getStats(): Stats {
  load()

  const now    = Date.now()
  const DAY_MS = 86_400_000
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const total     = _visits.length
  const today     = _visits.filter(v => new Date(v.timestamp) >= todayStart).length
  const week      = _visits.filter(v => now - new Date(v.timestamp).getTime() < 7  * DAY_MS).length
  const month     = _visits.filter(v => now - new Date(v.timestamp).getTime() < 30 * DAY_MS).length
  const uniqueIPs = new Set(_visits.map(v => v.ip)).size

  const cnt = (rec: Record<string, number>, key: string) => { rec[key] = (rec[key] ?? 0) + 1 }

  const pages:     Record<string, number> = {}
  const browsers:  Record<string, number> = {}
  const osMap:     Record<string, number> = {}
  const devices:   Record<string, number> = {}
  const langs:     Record<string, number> = {}
  const referrers: Record<string, number> = {}
  const ipMap: Record<string, { count: number; last: string; country: string; city: string; ipAnon: string }> = {}
  const hourly = Array<number>(24).fill(0)

  const since24h = now - 24 * DAY_MS / 24 * 24   // = now - 24h

  for (const v of _visits) {
    cnt(pages,    v.path    || '/')
    cnt(browsers, v.browser || 'Unknown')
    cnt(osMap,    v.os      || 'Unknown')
    cnt(devices,  v.device  || 'unknown')

    const lang = (v.language || 'unknown').split(',')[0].split(';')[0].trim() || 'unknown'
    cnt(langs, lang)

    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname.replace(/^www\./, '')
        cnt(referrers, host)
      } catch {
        cnt(referrers, v.referrer.slice(0, 50))
      }
    }

    if (!ipMap[v.ip]) ipMap[v.ip] = { count: 0, last: v.timestamp, country: v.country, city: v.city, ipAnon: v.ipAnon }
    ipMap[v.ip].count++
    if (v.timestamp > ipMap[v.ip].last) {
      ipMap[v.ip].last    = v.timestamp
      ipMap[v.ip].country = v.country
      ipMap[v.ip].city    = v.city
    }

    // Hourly (últimas 24h)
    const ts = new Date(v.timestamp).getTime()
    if (ts >= since24h) {
      const h = new Date(v.timestamp).getHours()
      hourly[h]++
    }
  }

  const sortTop = (obj: Record<string, number>, n = 10): [string, number][] =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)

  const ipList = Object.entries(ipMap)
    .map(([ip, d]) => ({ ip, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 200)

  const recent = [..._visits].reverse().slice(0, 50)

  return {
    total, today, week, month, uniqueIPs,
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
