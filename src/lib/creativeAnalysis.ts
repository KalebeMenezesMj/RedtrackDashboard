/**
 * Análise de performance de criativos — lógica pura, sem IA.
 * Baseado nas regras de classificação TOP / FORTES / MÉDIOS por métrica.
 */

export interface AdRow {
  name: string
  playRate: number      // decimal 0-1 (ex: 0.9717 = 97,17%)
  hookRetention: number
  bodyConversion: number
  bodyRetention: number
}

export interface ClassifiedItem {
  name: string
  value: number // já em % (ex: 97.17)
}

export interface MetricAnalysis {
  top: ClassifiedItem[]
  fortes: ClassifiedItem[]
  medios: ClassifiedItem[]
}

export interface FullAnalysis {
  playRate: MetricAnalysis
  hookRetention: MetricAnalysis
  bodyRetention: MetricAnalysis
  bodyConversion: MetricAnalysis
}

export interface Combination {
  hook: string
  body: string
}

export interface CombinationResult {
  topHookTopBody: Combination[]
  topHookForteBody: Combination[]
  forteHookTopBody: Combination[]
  forteHookForteBody: Combination[]
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Encontra os índices (no array de diferenças) onde ocorre uma "quebra".
 * Uma quebra é uma diferença >= (multiplier × média das min(5,n) menores diferenças).
 */
function findQuebraIndices(diffs: number[], multiplier: number): number[] {
  if (diffs.length === 0) return []

  const n = Math.min(5, diffs.length)
  const sorted = [...diffs].sort((a, b) => a - b)
  const smallest = sorted.slice(0, n)
  const mean = smallest.reduce((s, v) => s + v, 0) / n

  if (mean === 0) return []

  const threshold = multiplier * mean
  return diffs.reduce<number[]>((acc, d, i) => {
    if (d >= threshold) acc.push(i)
    return acc
  }, [])
}

/**
 * Classificação genérica por método de quebra.
 *
 * sorted = valores já ordenados decrescente (com .value já em %)
 * quebras = índices no array de diffs onde quebra ocorre
 *
 * diffs[i] = sorted[i].value - sorted[i+1].value
 * Se quebra em diffs[i]: FORTES termina em sorted[i], MÉDIOS começa em sorted[i+1]
 */
function applyQuebraClassification(
  sorted: ClassifiedItem[],
  quebras: number[]
): MetricAnalysis {
  const top = [sorted[0]]

  if (sorted.length === 1) return { top, fortes: [], medios: [] }

  // Se não há quebra, firstQIdx aponta para além do array → tudo vai a FORTES
  const firstQIdx = quebras.length > 0 ? quebras[0] : sorted.length - 1
  const secondQIdx = quebras.length > 1 ? quebras[1] : null

  // FORTES: sorted[1..firstQIdx] (inclusive)
  const fortes = sorted.slice(1, firstQIdx + 1)

  // MÉDIOS: sorted[firstQIdx+1..secondQIdx+1) ou até o fim se não houver segunda quebra
  const mediosStart = firstQIdx + 1
  const mediosEnd = secondQIdx !== null ? secondQIdx + 1 : sorted.length
  const medios = sorted.slice(mediosStart, mediosEnd)

  return { top, fortes, medios }
}

/**
 * Orquestra: ordena itens, calcula diffs, encontra quebras e classifica.
 */
function classifyWithQuebraMethod(
  items: ClassifiedItem[],
  multiplier: number
): MetricAnalysis {
  if (items.length === 0) return { top: [], fortes: [], medios: [] }

  const sorted = [...items].sort((a, b) => b.value - a.value)
  const diffs = sorted.slice(1).map((item, i) => sorted[i].value - item.value)
  const quebras = findQuebraIndices(diffs, multiplier)

  return applyQuebraClassification(sorted, quebras)
}

// ---------------------------------------------------------------------------
// ETAPAS
// ---------------------------------------------------------------------------

/**
 * ETAPA 1 — Play Rate do Hook
 * Quebra = diferença ≥ 4× média das 5 menores diferenças
 */
export function analyzePlayRate(data: AdRow[]): MetricAnalysis {
  const items = data.map(d => ({ name: d.name, value: d.playRate * 100 }))
  return classifyWithQuebraMethod(items, 4)
}

/**
 * ETAPA 2 — Retenção do Hook
 * Quebra = diferença ≥ 6× média
 * Filtro: remover valores abaixo de 92% do TOP (= mais de 8% abaixo do topo, relativo)
 */
export function analyzeHookRetention(data: AdRow[]): MetricAnalysis {
  const sorted = [...data].sort((a, b) => b.hookRetention - a.hookRetention)
  if (sorted.length === 0) return { top: [], fortes: [], medios: [] }

  const topVal = sorted[0].hookRetention
  const filtered = sorted.filter(d => d.hookRetention >= topVal * 0.92)
  const items = filtered.map(d => ({ name: d.name, value: d.hookRetention * 100 }))

  return classifyWithQuebraMethod(items, 6)
}

/**
 * ETAPA 3 — Retenção do Body
 * TOP = maior valor
 * FORTES = próximos 30% do total
 * MÉDIOS = próximos 40% do total
 * Ignorar restante
 */
export function analyzeBodyRetention(data: AdRow[]): MetricAnalysis {
  if (data.length === 0) return { top: [], fortes: [], medios: [] }

  const sorted = [...data].sort((a, b) => b.bodyRetention - a.bodyRetention)
  const total = sorted.length

  const fortesCount = Math.round(total * 0.3)
  const mediosCount = Math.round(total * 0.4)

  return {
    top: [{ name: sorted[0].name, value: sorted[0].bodyRetention * 100 }],
    fortes: sorted
      .slice(1, 1 + fortesCount)
      .map(d => ({ name: d.name, value: d.bodyRetention * 100 })),
    medios: sorted
      .slice(1 + fortesCount, 1 + fortesCount + mediosCount)
      .map(d => ({ name: d.name, value: d.bodyRetention * 100 })),
  }
}

/**
 * ETAPA 4 — Conversão do Body
 * Quebra = diferença ≥ 3× média
 * Filtro: remover valores abaixo de 60% do TOP
 */
export function analyzeBodyConversion(data: AdRow[]): MetricAnalysis {
  const sorted = [...data].sort((a, b) => b.bodyConversion - a.bodyConversion)
  if (sorted.length === 0) return { top: [], fortes: [], medios: [] }

  const topVal = sorted[0].bodyConversion
  const filtered = sorted.filter(d => d.bodyConversion >= topVal * 0.6)
  const items = filtered.map(d => ({ name: d.name, value: d.bodyConversion * 100 }))

  return classifyWithQuebraMethod(items, 3)
}

// ---------------------------------------------------------------------------
// COMBINAÇÕES
// ---------------------------------------------------------------------------

/**
 * Gera todas as combinações entre HOOKs (Retenção do Hook) e BODYs (Conversão do Body).
 * Hooks = TOP + FORTES de Retenção do Hook
 * Bodies = TOP + FORTES de Conversão do Body
 */
export function generateCombinations(
  hookRetention: MetricAnalysis,
  bodyConversion: MetricAnalysis
): CombinationResult {
  const topHooks = hookRetention.top.map(i => i.name)
  const forteHooks = hookRetention.fortes.map(i => i.name)
  const topBodies = bodyConversion.top.map(i => i.name)
  const forteBodies = bodyConversion.fortes.map(i => i.name)

  const cross = (hooks: string[], bodies: string[]): Combination[] =>
    hooks.flatMap(hook => bodies.map(body => ({ hook, body })))

  return {
    topHookTopBody: cross(topHooks, topBodies),
    topHookForteBody: cross(topHooks, forteBodies),
    forteHookTopBody: cross(forteHooks, topBodies),
    forteHookForteBody: cross(forteHooks, forteBodies),
  }
}

// ---------------------------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------------------------

export function runFullAnalysis(data: AdRow[]): FullAnalysis {
  return {
    playRate: analyzePlayRate(data),
    hookRetention: analyzeHookRetention(data),
    bodyRetention: analyzeBodyRetention(data),
    bodyConversion: analyzeBodyConversion(data),
  }
}

// ---------------------------------------------------------------------------
// FUNÇÕES MATEMÁTICAS EXTRAS (sem IA)
// ---------------------------------------------------------------------------

export type TierName = 'TOP' | 'FORTE' | 'MÉDIO' | null

/** Retorna o tier de um anúncio em uma métrica, ou null se não classificado. */
function getTier(name: string, metric: MetricAnalysis): TierName {
  if (metric.top.some(i => i.name === name)) return 'TOP'
  if (metric.fortes.some(i => i.name === name)) return 'FORTE'
  if (metric.medios.some(i => i.name === name)) return 'MÉDIO'
  return null
}

/** Pontuação numérica do tier (para ranking). */
function tierScore(tier: TierName): number {
  if (tier === 'TOP')   return 3
  if (tier === 'FORTE') return 2
  if (tier === 'MÉDIO') return 1
  return 0
}

// ── 1. Visão Geral Multi-métrica ────────────────────────────────────────────

export interface AdScore {
  name: string
  playRateTier: TierName
  hookRetentionTier: TierName
  bodyRetentionTier: TierName
  bodyConversionTier: TierName
  /** Soma dos pontos de todas as 4 métricas (0–12). */
  score: number
}

/**
 * Cruza as 4 análises e devolve uma linha por anúncio com seus tiers e score total.
 * Ordenado do maior para o menor score.
 */
export function buildAdScoreTable(data: AdRow[], analysis: FullAnalysis): AdScore[] {
  return data
    .map(ad => {
      const playRateTier        = getTier(ad.name, analysis.playRate)
      const hookRetentionTier   = getTier(ad.name, analysis.hookRetention)
      const bodyRetentionTier   = getTier(ad.name, analysis.bodyRetention)
      const bodyConversionTier  = getTier(ad.name, analysis.bodyConversion)
      const score =
        tierScore(playRateTier) +
        tierScore(hookRetentionTier) +
        tierScore(bodyRetentionTier) +
        tierScore(bodyConversionTier)
      return { name: ad.name, playRateTier, hookRetentionTier, bodyRetentionTier, bodyConversionTier, score }
    })
    .sort((a, b) => b.score - a.score)
}

// ── 2. CTA Recomendada ──────────────────────────────────────────────────────

export interface CTARecommendation {
  name: string
  bodyConversionPct: number // já em %
}

/**
 * Retorna o anúncio com a maior Conversão do Body.
 * É o anúncio cuja CTA deve ser usada em todas as combinações (Stage 1 e 2).
 */
export function getCtaRecommendation(data: AdRow[]): CTARecommendation | null {
  if (data.length === 0) return null
  const best = [...data].sort((a, b) => b.bodyConversion - a.bodyConversion)[0]
  return { name: best.name, bodyConversionPct: best.bodyConversion * 100 }
}

// ── 3. Stage 2 — Prioridade Cruzada ────────────────────────────────────────

export interface PrioritizedCombination {
  hook: string
  body: string
  /** Tier do hook na métrica Play Rate (dimensão visual). */
  hookPlayRateTier: TierName
  /** Tier do hook na métrica Retenção do Hook. */
  hookRetentionTier: TierName
  /** Tier do body na métrica Conversão do Body. */
  bodyConversionTier: TierName
  /** Tier do body na métrica Retenção do Body (dimensão visual). */
  bodyRetentionTier: TierName
  /** Soma dos 4 pontos individuais (0–12). */
  score: number
  priority: 'ALTA' | 'MÉDIA' | 'BAIXA'
}

/**
 * Ranqueia as combinações do Stage 1 cruzando também o Play Rate do hook
 * e a Retenção do Body — as dimensões "visuais" que o editor usará para montar o vídeo.
 *
 * Score 10–12 → ALTA prioridade (todos os elementos fortes)
 * Score  7–9  → MÉDIA prioridade (maioria forte)
 * Score  0–6  → BAIXA prioridade
 */
export function prioritizeCombinations(
  combos: CombinationResult,
  analysis: FullAnalysis,
): PrioritizedCombination[] {
  const all: Combination[] = [
    ...combos.topHookTopBody,
    ...combos.topHookForteBody,
    ...combos.forteHookTopBody,
    ...combos.forteHookForteBody,
  ]

  return all
    .map(combo => {
      const hookPlayRateTier      = getTier(combo.hook, analysis.playRate)
      const hookRetentionTier     = getTier(combo.hook, analysis.hookRetention)
      const bodyConversionTier    = getTier(combo.body, analysis.bodyConversion)
      const bodyRetentionTier     = getTier(combo.body, analysis.bodyRetention)
      const score =
        tierScore(hookPlayRateTier) +
        tierScore(hookRetentionTier) +
        tierScore(bodyConversionTier) +
        tierScore(bodyRetentionTier)
      const priority: PrioritizedCombination['priority'] =
        score >= 10 ? 'ALTA' : score >= 7 ? 'MÉDIA' : 'BAIXA'
      return { hook: combo.hook, body: combo.body, hookPlayRateTier, hookRetentionTier, bodyConversionTier, bodyRetentionTier, score, priority }
    })
    .sort((a, b) => b.score - a.score)
}

// ---------------------------------------------------------------------------
// FORMATAÇÃO PARA CLIPBOARD
// ---------------------------------------------------------------------------

function fmt(value: number): string {
  return value.toFixed(2).replace('.', ',') + '%'
}

function renderBlock(analysis: MetricAnalysis, title: string): string {
  const lines: string[] = [title, '']

  const render = (label: string, items: ClassifiedItem[]) => {
    lines.push(`${label}:`)
    if (items.length === 0) {
      lines.push('—')
    } else {
      items.forEach(i => lines.push(`${i.name} — ${fmt(i.value)}`))
    }
    lines.push('')
  }

  render('TOP', analysis.top)
  render('FORTES', analysis.fortes)
  render('MÉDIOS', analysis.medios)

  return lines.join('\n').trimEnd()
}

export function formatAnalysisForClipboard(analysis: FullAnalysis): string {
  return [
    renderBlock(analysis.playRate, 'PLAY RATE DO HOOK'),
    '',
    renderBlock(analysis.hookRetention, 'RETENÇÃO DO HOOK'),
    '',
    renderBlock(analysis.bodyRetention, 'RETENÇÃO DO BODY'),
    '',
    renderBlock(analysis.bodyConversion, 'CONVERSÃO DO BODY'),
  ].join('\n')
}

export function formatCombinationsForClipboard(result: CombinationResult): string {
  const total =
    result.topHookTopBody.length +
    result.topHookForteBody.length +
    result.forteHookTopBody.length +
    result.forteHookForteBody.length

  const renderCombos = (label: string, combos: Combination[]) => {
    if (combos.length === 0) return `${label}\n(sem combinações)\n`
    return `${label}\n${combos.map(c => `Hook: ${c.hook} → Body: ${c.body}`).join('\n')}\n`
  }

  return [
    renderCombos('TOP HOOK + TOP BODY', result.topHookTopBody),
    renderCombos('TOP HOOK + FORTE BODY', result.topHookForteBody),
    renderCombos('FORTE HOOK + TOP BODY', result.forteHookTopBody),
    renderCombos('FORTE HOOK + FORTE BODY', result.forteHookForteBody),
    `${total} combinações`,
  ].join('\n')
}
