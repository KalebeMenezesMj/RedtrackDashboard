/**
 * exportCampaignsExcel.ts
 * Gera e faz download de uma planilha Excel (.xlsx) com os dados de campanhas.
 * Usa SheetJS (xlsx) — community edition já instalada no projeto.
 */

import * as XLSX from 'xlsx'
import type { UTMifyCampaignRow } from './utmify'

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  VIOLET_DARK:  '4C1D95',  // cabeçalho
  VIOLET:       '7C3AED',  // destaques
  VIOLET_LIGHT: 'EDE9FE',  // linha totais
  WHITE:        'FFFFFF',
  ROW_ALT:      'F5F3FF',  // linha alternada
  ROW_NORM:     'FFFFFF',
  TEXT_DARK:    '1E1B4B',
  TEXT_MID:     '4B5563',
  GREEN:        '065F46',
  GREEN_BG:     'D1FAE5',
  RED:          '991B1B',
  RED_BG:       'FEE2E2',
  BORDER_DATA:  'BBBBBB',  // cinza médio — borda de dados (visível)
  BORDER_HDR:   '6D28D9',  // roxo — borda cabeçalho/totais
  BORDER_TITLE: '5B21B6',  // roxo mais escuro — borda título
  GRAY_BG:      'F3F4F6',
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────
type Style = Record<string, unknown>

function hdrStyle(align: 'left' | 'center' | 'right' = 'center'): Style {
  return {
    font:      { bold: true, color: { rgb: C.WHITE }, sz: 9, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.VIOLET_DARK } },
    alignment: { horizontal: align, vertical: 'center', wrapText: true },
    border:    thick(C.BORDER_HDR),
  }
}

function totStyle(align: 'left' | 'center' | 'right' = 'right'): Style {
  return {
    font:      { bold: true, color: { rgb: C.VIOLET_DARK }, sz: 9, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.VIOLET_LIGHT } },
    alignment: { horizontal: align, vertical: 'center' },
    border:    thick(C.BORDER_HDR),
  }
}

function dataStyle(
  alt: boolean,
  align: 'left' | 'center' | 'right' = 'right',
  color?: string,
): Style {
  return {
    font:      { color: { rgb: color ?? C.TEXT_DARK }, sz: 9, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: alt ? C.ROW_ALT : C.ROW_NORM } },
    alignment: { horizontal: align, vertical: 'center' },
    border:    thin(C.BORDER_DATA),  // cinza médio, claramente visível
  }
}

function titleStyle(): Style {
  return {
    font:      { bold: true, color: { rgb: C.WHITE }, sz: 12, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.VIOLET } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border:    thick(C.BORDER_TITLE),
  }
}

function subStyle(): Style {
  return {
    font:      { italic: true, color: { rgb: C.TEXT_MID }, sz: 8, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.GRAY_BG } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border:    thin(C.BORDER_DATA),
  }
}

function thin(rgb: string) {
  const s = { style: 'thin', color: { rgb } }
  return { top: s, bottom: s, left: s, right: s }
}

function thick(rgb: string) {
  const s = { style: 'medium', color: { rgb } }
  return { top: s, bottom: s, left: s, right: s }
}

// ─── Célula tipada ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkCell(v: unknown, t: 'n' | 's' | 'b', s?: Style, z?: string): any {
  const c: Record<string, unknown> = { v, t, s }
  if (z) c.z = z
  return c
}

// ─── Formatos numéricos Excel ─────────────────────────────────────────────────
function currFmt(currency: string) {
  return currency === 'USD'
    ? '"US$ "#,##0.00'
    : '"R$ "#,##0.00'
}
const FMT_INT  = '#,##0'
const FMT_PCT  = '0.00"%"'
const FMT_MUL  = '0.00"×"'

// ─── Tipo de nível ────────────────────────────────────────────────────────────
export type ExportLevel = 'campaigns' | 'adsets' | 'ads'

export interface ExportOptions {
  rows:          UTMifyCampaignRow[]
  level:         ExportLevel
  dashboardName: string
  dateFrom:      string
  dateTo:        string
  currency:      string  // 'BRL' | 'USD'
}

// ─── Função principal ─────────────────────────────────────────────────────────
export function exportCampaignsExcel(opts: ExportOptions): void {
  const { rows, level, dashboardName, dateFrom, dateTo, currency } = opts

  const CFMT = currFmt(currency)

  const levelLabel =
    level === 'campaigns' ? 'Campanhas'
    : level === 'adsets'  ? 'Conjuntos de Anúncios'
    : 'Anúncios'

  // Formata datas para exibição
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }

  // ── Definição de colunas ─────────────────────────────────────────────────
  interface ColDef {
    label:   string
    key:     keyof UTMifyCampaignRow | 'budget' | 'statusLabel'
    type:    'text' | 'number' | 'currency' | 'percent' | 'multiplier'
    wch:     number   // largura em caracteres
    align?:  'left' | 'center' | 'right'
  }

  // Ordem exata solicitada: status, nome, orçamento, vendas, cpa, gasto,
  // faturamento, lucro, roas, margem, roi, ic, cpi, cpc, ctr, cpm, impressões, cliques
  const cols: ColDef[] = [
    { label: 'Status',      key: 'statusLabel',        type: 'text',       wch: 9,  align: 'center' },
    { label: levelLabel,    key: 'name',               type: 'text',       wch: 48, align: 'left'   },
    { label: 'Orçamento',   key: 'budget',             type: 'currency',   wch: 15, align: 'right'  },
    { label: 'Vendas',      key: 'approvedOrdersCount',type: 'number',     wch: 9,  align: 'right'  },
    { label: 'CPA',         key: 'cpa',                type: 'currency',   wch: 14, align: 'right'  },
    { label: 'Gasto',       key: 'spend',              type: 'currency',   wch: 14, align: 'right'  },
    { label: 'Faturamento', key: 'revenue',            type: 'currency',   wch: 15, align: 'right'  },
    { label: 'Lucro',       key: 'profit',             type: 'currency',   wch: 15, align: 'right'  },
    { label: 'ROAS',        key: 'roas',               type: 'multiplier', wch: 9,  align: 'right'  },
    { label: 'Margem %',    key: 'margin',             type: 'percent',    wch: 11, align: 'right'  },
    { label: 'ROI %',       key: 'roi',                type: 'percent',    wch: 11, align: 'right'  },
    { label: 'IC',          key: 'ic',                 type: 'number',     wch: 8,  align: 'right'  },
    { label: 'CPI',         key: 'cpi',                type: 'currency',   wch: 14, align: 'right'  },
    { label: 'CPC',         key: 'cpc',                type: 'currency',   wch: 14, align: 'right'  },
    { label: 'CTR %',       key: 'ctr',                type: 'percent',    wch: 9,  align: 'right'  },
    { label: 'CPM',         key: 'cpm',                type: 'currency',   wch: 14, align: 'right'  },
    { label: 'Impressões',  key: 'impressions',        type: 'number',     wch: 14, align: 'right'  },
    { label: 'Cliques',     key: 'clicks',             type: 'number',     wch: 11, align: 'right'  },
  ]

  const visibleCols = cols
  const ncols = visibleCols.length

  // ── Worksheet ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {}

  // Helpers de coordenada
  const addr = (r: number, c: number) => XLSX.utils.encode_cell({ r, c })

  let curRow = 0

  // ─── Linha 0: Título ─────────────────────────────────────────────────────
  const titleText = `${levelLabel} — ${dashboardName} · ${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`
  ws[addr(0, 0)] = mkCell(titleText, 's', titleStyle())
  for (let c = 1; c < ncols; c++) ws[addr(0, c)] = mkCell('', 's', titleStyle())

  curRow = 1

  // ─── Linha 1: Sub-info (total de linhas, data geração) ───────────────────
  const subText = `Total: ${rows.length} ${levelLabel.toLowerCase()} · Gerado em ${new Date().toLocaleString('pt-BR')}`
  ws[addr(1, 0)] = mkCell(subText, 's', subStyle())
  for (let c = 1; c < ncols; c++) ws[addr(1, c)] = mkCell('', 's', subStyle())

  curRow = 2

  // ─── Linha 2: Cabeçalhos ─────────────────────────────────────────────────
  visibleCols.forEach((col, ci) => {
    ws[addr(2, ci)] = mkCell(col.label, 's', hdrStyle(col.align ?? 'center'))
  })

  curRow = 3

  // ─── Linhas de dados ─────────────────────────────────────────────────────
  // Totais acumulados (colunas numéricas)
  let totSpend = 0, totRevenue = 0, totProfit = 0, totClicks = 0,
      totImpressions = 0, totVendas = 0

  rows.forEach((row, ri) => {
    const alt = ri % 2 === 1
    const isActive = row.status === 'ACTIVE' || row.status === 'ENABLED'
    const budget = (row.dailyBudget ?? row.lifetimeBudget) ?? null

    // Acumula totais
    totSpend       += row.spend
    totRevenue     += row.revenue
    totProfit      += row.profit
    totClicks      += row.clicks
    totImpressions += row.impressions
    totVendas      += row.approvedOrdersCount

    visibleCols.forEach((col, ci) => {
      const base = dataStyle(alt, col.align ?? 'right')
      let cell

      switch (col.key) {
        case 'statusLabel':
          cell = mkCell(
            isActive ? 'ATIVO' : (row.status ?? '—'),
            's',
            {
              ...dataStyle(alt, 'center'),
              font: {
                bold: true, sz: 8, name: 'Calibri',
                color: { rgb: isActive ? C.GREEN : C.TEXT_MID },
              },
              fill: { patternType: 'solid', fgColor: { rgb: isActive ? C.GREEN_BG : (alt ? C.ROW_ALT : C.ROW_NORM) } },
            },
          )
          break

        case 'name':
          cell = mkCell(row.name, 's', { ...dataStyle(alt, 'left'), font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: C.TEXT_DARK } } })
          break

        case 'budget':
          cell = budget != null
            ? mkCell(budget, 'n', base, CFMT)
            : mkCell('—', 's', base)
          break

        case 'approvedOrdersCount':
          cell = mkCell(row.approvedOrdersCount, 'n', {
            ...base,
            font: { bold: row.approvedOrdersCount > 0, sz: 9, name: 'Calibri',
                    color: { rgb: row.approvedOrdersCount > 0 ? C.GREEN : C.TEXT_MID } },
          }, FMT_INT)
          break

        case 'cpa': cell = row.cpa != null ? mkCell(row.cpa,  'n', base, CFMT) : mkCell('—', 's', base); break
        case 'spend':   cell = mkCell(row.spend,   'n', { ...base, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: '1D4ED8' } } }, CFMT); break
        case 'revenue': cell = mkCell(row.revenue, 'n', { ...base, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: C.GREEN  } } }, CFMT); break
        case 'profit': {
          const isPos = row.profit >= 0
          cell = mkCell(row.profit, 'n', {
            ...base,
            font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: isPos ? C.GREEN : C.RED } },
          }, CFMT)
          break
        }
        case 'roas':   cell = mkCell(row.roas,   'n', base, FMT_MUL); break
        case 'margin': cell = row.margin != null ? mkCell(row.margin / 100, 'n', base, '0.00%') : mkCell('—', 's', base); break
        case 'roi':    cell = mkCell(row.roi / 100, 'n', base, '0.00%'); break
        case 'ic':     cell = row.ic != null ? mkCell(row.ic, 'n', base, FMT_INT) : mkCell('—', 's', base); break
        case 'cpi':    cell = row.cpi != null ? mkCell(row.cpi, 'n', base, CFMT) : mkCell('—', 's', base); break
        case 'cpc':    cell = row.cpc != null ? mkCell(row.cpc, 'n', base, CFMT) : mkCell('—', 's', base); break
        case 'ctr':    cell = row.ctr != null ? mkCell(row.ctr / 100, 'n', base, '0.00%') : mkCell('—', 's', base); break
        case 'cpm':    cell = row.cpm != null ? mkCell(row.cpm, 'n', base, CFMT) : mkCell('—', 's', base); break
        case 'impressions': cell = mkCell(row.impressions, 'n', base, FMT_INT); break
        case 'clicks':      cell = mkCell(row.clicks,      'n', base, FMT_INT); break
        default:            cell = mkCell('', 's', base)
      }

      ws[addr(curRow + ri, ci)] = cell
    })
  })

  curRow += rows.length

  // ─── Linha: separador vazio (com borda para manter a grade) ────────────────
  for (let c = 0; c < ncols; c++) {
    ws[addr(curRow, c)] = mkCell('', 's', {
      fill:   { patternType: 'solid', fgColor: { rgb: C.WHITE } },
      border: thin(C.BORDER_DATA),
    })
  }
  curRow++

  // ─── Linha: TOTAIS ───────────────────────────────────────────────────────
  const totROAS  = totSpend > 0 ? totRevenue / totSpend : 0
  const totProfit_margin = totRevenue > 0 ? (totProfit / totRevenue) : 0

  visibleCols.forEach((col, ci) => {
    let cell
    switch (col.key) {
      case 'statusLabel':    cell = mkCell('TOTAIS', 's', totStyle('center')); break
      case 'name':           cell = mkCell(`${rows.length} ${levelLabel.toLowerCase()}`, 's', totStyle('left')); break
      case 'budget':         cell = mkCell('', 's', totStyle('right')); break
      case 'approvedOrdersCount': cell = mkCell(totVendas,      'n', totStyle(), FMT_INT); break
      case 'cpa':            cell = totVendas > 0 ? mkCell(totSpend / totVendas, 'n', totStyle(), CFMT) : mkCell('—', 's', totStyle()); break
      case 'spend':          cell = mkCell(totSpend,            'n', totStyle(), CFMT); break
      case 'revenue':        cell = mkCell(totRevenue,          'n', totStyle(), CFMT); break
      case 'profit':         cell = mkCell(totProfit,           'n', totStyle(), CFMT); break
      case 'roas':           cell = mkCell(totROAS,             'n', totStyle(), FMT_MUL); break
      case 'margin':         cell = mkCell(totProfit_margin,    'n', totStyle(), '0.00%'); break
      case 'roi':            cell = totSpend > 0 ? mkCell((totRevenue - totSpend) / totSpend, 'n', totStyle(), '0.00%') : mkCell('—', 's', totStyle()); break
      case 'ic':             cell = mkCell('', 's', totStyle()); break
      case 'cpi':            cell = mkCell('', 's', totStyle()); break
      case 'cpc':            cell = totClicks > 0 ? mkCell(totSpend / totClicks, 'n', totStyle(), CFMT) : mkCell('—', 's', totStyle()); break
      case 'ctr':            cell = totImpressions > 0 ? mkCell(totClicks / totImpressions, 'n', totStyle(), '0.00%') : mkCell('—', 's', totStyle()); break
      case 'cpm':            cell = totImpressions > 0 ? mkCell((totSpend / totImpressions) * 1000, 'n', totStyle(), CFMT) : mkCell('—', 's', totStyle()); break
      case 'impressions':    cell = mkCell(totImpressions,      'n', totStyle(), FMT_INT); break
      case 'clicks':         cell = mkCell(totClicks,           'n', totStyle(), FMT_INT); break
      default:               cell = mkCell('', 's', totStyle())
    }
    ws[addr(curRow, ci)] = cell
  })

  // ── Referência do range da sheet ──────────────────────────────────────────
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: curRow, c: ncols - 1 },
  })

  // ── Larguras das colunas ─────────────────────────────────────────────────
  ws['!cols'] = visibleCols.map(col => ({ wch: col.wch }))

  // ── Alturas das linhas ───────────────────────────────────────────────────
  ws['!rows'] = [
    { hpx: 26 },  // título
    { hpx: 16 },  // sub-info
    { hpx: 22 },  // cabeçalho
    ...Array(rows.length).fill({ hpx: 18 }),
    { hpx: 8  },  // separador
    { hpx: 22 },  // totais
  ]

  // ── Merge do título e sub-info ────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } },  // título
    { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } },  // sub-info
  ]

  // ── Freeze: congela as 3 primeiras linhas e as 2 primeiras colunas ────────
  ws['!freeze'] = { xSplit: 2, ySplit: 3, topLeftCell: 'C4', activePane: 'bottomRight' }

  // ── Auto-filtro nas colunas de dados ─────────────────────────────────────
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } }),
  }

  // ── Workbook ──────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  wb.Props = {
    Title:   `${levelLabel} — ${dashboardName}`,
    Subject: 'Relatório UTMify',
    Author:  'Dashboard UTMify',
    CreatedDate: new Date(),
  }

  XLSX.utils.book_append_sheet(wb, ws, levelLabel.slice(0, 31))

  // ── Download ──────────────────────────────────────────────────────────────
  const safeName = dashboardName.replace(/[^a-zA-Z0-9À-ú _-]/g, '').trim().slice(0, 30)
  const fileName = `${levelLabel}_${safeName}_${dateFrom}_${dateTo}.xlsx`

  XLSX.writeFile(wb, fileName, {
    bookType:   'xlsx',
    type:       'binary',
    cellStyles: true,
    bookSST:    false,
  })
}
