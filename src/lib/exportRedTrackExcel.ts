/**
 * exportRedTrackExcel.ts
 * Exporta campanhas e anúncios do RedTrack para planilha .xlsx estilizada.
 */

import * as XLSX from 'xlsx'
import type { CampaignRow, AdRow } from './types'

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  BLUE_DARK:   '1E3A5F',
  BLUE:        '2563EB',
  BLUE_LIGHT:  'DBEAFE',
  WHITE:       'FFFFFF',
  ROW_ALT:     'EFF6FF',
  TEXT_DARK:   '1E293B',
  TEXT_MID:    '475569',
  GREEN:       '065F46',
  GREEN_BG:    'D1FAE5',
  RED:         '991B1B',
  RED_BG:      'FEE2E2',
  BORDER:      'BBBBBB',
  BORDER_HDR:  '1D4ED8',
  GRAY_BG:     'F3F4F6',
}

type Style = Record<string, unknown>

function thin(rgb: string) {
  const s = { style: 'thin', color: { rgb } }
  return { top: s, bottom: s, left: s, right: s }
}
function medium(rgb: string) {
  const s = { style: 'medium', color: { rgb } }
  return { top: s, bottom: s, left: s, right: s }
}

function hdrStyle(align: 'left'|'center'|'right' = 'center'): Style {
  return {
    font:      { bold: true, color: { rgb: C.WHITE }, sz: 9, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.BLUE_DARK } },
    alignment: { horizontal: align, vertical: 'center', wrapText: true },
    border:    medium(C.BORDER_HDR),
  }
}
function totStyle(align: 'left'|'center'|'right' = 'right'): Style {
  return {
    font:      { bold: true, color: { rgb: C.BLUE_DARK }, sz: 9, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.BLUE_LIGHT } },
    alignment: { horizontal: align, vertical: 'center' },
    border:    medium(C.BORDER_HDR),
  }
}
function dataStyle(alt: boolean, align: 'left'|'center'|'right' = 'right'): Style {
  return {
    font:      { color: { rgb: C.TEXT_DARK }, sz: 9, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: alt ? C.ROW_ALT : C.WHITE } },
    alignment: { horizontal: align, vertical: 'center' },
    border:    thin(C.BORDER),
  }
}
function titleStyle(): Style {
  return {
    font:      { bold: true, color: { rgb: C.WHITE }, sz: 12, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.BLUE } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border:    medium(C.BLUE_DARK),
  }
}
function subStyle(): Style {
  return {
    font:      { italic: true, color: { rgb: C.TEXT_MID }, sz: 8, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: C.GRAY_BG } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border:    thin(C.BORDER),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cell(v: unknown, t: 'n'|'s', s?: Style, z?: string): any {
  const c: Record<string, unknown> = { v, t, s }
  if (z) c.z = z
  return c
}

const FMT_CUR = '"R$ "#,##0.00'
const FMT_INT = '#,##0'
const FMT_PCT = '0.00"%"'
const FMT_ROI = '"+"\\"+"0.00\\"%\\";\"-\\"0.00\\"%\\"'

function fmtDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

// ── Helper: escreve título + sub-info + cabeçalho ─────────────────────────────
function writeHeader(
  ws: Record<string, unknown>,
  addr: (r: number, c: number) => string,
  title: string,
  sub:   string,
  headers: { label: string; align?: 'left'|'center'|'right' }[],
  ncols: number,
): void {
  // Row 0: título
  ws[addr(0, 0)] = cell(title, 's', titleStyle())
  for (let c = 1; c < ncols; c++) ws[addr(0, c)] = cell('', 's', titleStyle())

  // Row 1: sub
  ws[addr(1, 0)] = cell(sub, 's', subStyle())
  for (let c = 1; c < ncols; c++) ws[addr(1, c)] = cell('', 's', subStyle())

  // Row 2: cabeçalhos
  headers.forEach((h, ci) => {
    ws[addr(2, ci)] = cell(h.label, 's', hdrStyle(h.align ?? 'center'))
  })
}

// ─── Exportar CAMPANHAS ───────────────────────────────────────────────────────
export function exportRedTrackCampaigns(
  rows:      CampaignRow[],
  dateFrom:  string,
  dateTo:    string,
): void {
  const headers = [
    { label: 'Campanha',         align: 'left'   as const, wch: 52 },
    { label: 'Cliques',          align: 'right'  as const, wch: 11 },
    { label: 'Conversões',       align: 'right'  as const, wch: 13 },
    { label: 'Compras',          align: 'right'  as const, wch: 11 },
    { label: 'Init. Checkout',   align: 'right'  as const, wch: 15 },
    { label: 'CR %',             align: 'right'  as const, wch: 9  },
    { label: 'Gasto',            align: 'right'  as const, wch: 14 },
    { label: 'Receita',          align: 'right'  as const, wch: 14 },
    { label: 'Lucro',            align: 'right'  as const, wch: 14 },
    { label: 'ROI %',            align: 'right'  as const, wch: 11 },
    { label: 'CPA',              align: 'right'  as const, wch: 12 },
  ]
  const ncols = headers.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {}
  const addr = (r: number, c: number) => XLSX.utils.encode_cell({ r, c })

  const title = `Campanhas RedTrack · ${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`
  const sub   = `Total: ${rows.length} campanhas · Gerado em ${new Date().toLocaleString('pt-BR')}`
  writeHeader(ws, addr, title, sub, headers, ncols)

  // Totais
  let totClicks = 0, totConv = 0, totPurch = 0, totCheck = 0, totCost = 0, totRev = 0, totProfit = 0

  rows.forEach((row, ri) => {
    const alt = ri % 2 === 1
    totClicks  += row.clicks;  totConv   += row.conversions;  totPurch  += row.purchases
    totCheck   += row.initiateCheckouts; totCost += row.cost; totRev    += row.revenue
    totProfit  += row.profit

    const isPos = row.profit >= 0
    const baseL = { ...dataStyle(alt, 'left') }
    const baseR = dataStyle(alt, 'right')
    const baseC = dataStyle(alt, 'center')
    const r = 3 + ri

    ws[addr(r, 0)]  = cell(row.name, 's', { ...baseL, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: C.TEXT_DARK } } })
    ws[addr(r, 1)]  = cell(row.clicks,              'n', baseR, FMT_INT)
    ws[addr(r, 2)]  = cell(row.conversions,         'n', baseR, FMT_INT)
    ws[addr(r, 3)]  = cell(row.purchases,           'n', baseR, FMT_INT)
    ws[addr(r, 4)]  = cell(row.initiateCheckouts,   'n', baseR, FMT_INT)
    ws[addr(r, 5)]  = cell(row.cr,                  'n', baseC, FMT_PCT)
    ws[addr(r, 6)]  = cell(row.cost,    'n', { ...baseR, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: '1D4ED8' } } }, FMT_CUR)
    ws[addr(r, 7)]  = cell(row.revenue, 'n', { ...baseR, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: C.GREEN  } } }, FMT_CUR)
    ws[addr(r, 8)]  = cell(row.profit,  'n', {
      ...baseR,
      font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: isPos ? C.GREEN : C.RED } },
    }, FMT_CUR)
    ws[addr(r, 9)]  = cell(row.roi, 'n', {
      ...baseC,
      font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: row.roi >= 0 ? C.GREEN : C.RED } },
    }, '0.00"%"')
    ws[addr(r, 10)] = cell(row.cpa, 'n', baseR, FMT_CUR)
  })

  // Linha separadora
  const sepRow = 3 + rows.length
  for (let c = 0; c < ncols; c++) {
    ws[addr(sepRow, c)] = cell('', 's', { fill: { patternType: 'solid', fgColor: { rgb: C.WHITE } }, border: thin(C.BORDER) })
  }

  // Totais
  const totRow = sepRow + 1
  const totROI = totCost > 0 ? ((totRev - totCost) / totCost) * 100 : 0
  const totCR  = totClicks > 0 ? (totConv / totClicks) * 100 : 0
  const totCPA = totConv > 0 ? totCost / totConv : 0
  ws[addr(totRow, 0)]  = cell(`${rows.length} campanhas`, 's', totStyle('left'))
  ws[addr(totRow, 1)]  = cell(totClicks,  'n', totStyle(), FMT_INT)
  ws[addr(totRow, 2)]  = cell(totConv,    'n', totStyle(), FMT_INT)
  ws[addr(totRow, 3)]  = cell(totPurch,   'n', totStyle(), FMT_INT)
  ws[addr(totRow, 4)]  = cell(totCheck,   'n', totStyle(), FMT_INT)
  ws[addr(totRow, 5)]  = cell(totCR,      'n', totStyle(), FMT_PCT)
  ws[addr(totRow, 6)]  = cell(totCost,    'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 7)]  = cell(totRev,     'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 8)]  = cell(totProfit,  'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 9)]  = cell(totROI,     'n', totStyle(), '0.00"%"')
  ws[addr(totRow, 10)] = cell(totCPA,     'n', totStyle(), FMT_CUR)

  ws['!ref']        = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totRow, c: ncols - 1 } })
  ws['!cols']       = headers.map(h => ({ wch: h.wch }))
  ws['!rows']       = [{ hpx: 26 }, { hpx: 16 }, { hpx: 22 }, ...Array(rows.length).fill({ hpx: 18 }), { hpx: 8 }, { hpx: 22 }]
  ws['!merges']     = [{ s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } }]
  ws['!freeze']     = { xSplit: 1, ySplit: 3, topLeftCell: 'B4', activePane: 'bottomRight' }
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } }) }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Campanhas')
  XLSX.writeFile(wb, `Campanhas_RedTrack_${dateFrom}_${dateTo}.xlsx`, { bookType: 'xlsx', type: 'binary', cellStyles: true, bookSST: false })
}

// ─── Exportar ANÚNCIOS de uma campanha ────────────────────────────────────────
export function exportRedTrackAds(
  ads:          AdRow[],
  campaignName: string,
  dateFrom:     string,
  dateTo:       string,
): void {
  const headers = [
    { label: 'Anúncio',         align: 'left'  as const, wch: 52 },
    { label: 'Cliques',         align: 'right' as const, wch: 11 },
    { label: 'Impressões',      align: 'right' as const, wch: 13 },
    { label: 'CTR %',           align: 'right' as const, wch: 9  },
    { label: 'CR %',            align: 'right' as const, wch: 9  },
    { label: 'Gasto',           align: 'right' as const, wch: 14 },
    { label: 'Receita',         align: 'right' as const, wch: 14 },
    { label: 'Lucro',           align: 'right' as const, wch: 14 },
    { label: 'ROI %',           align: 'right' as const, wch: 11 },
    { label: 'CPC',             align: 'right' as const, wch: 12 },
    { label: 'CPA',             align: 'right' as const, wch: 12 },
    { label: 'Compras',         align: 'right' as const, wch: 11 },
    { label: 'Init. Checkout',  align: 'right' as const, wch: 15 },
    { label: 'Taxa Checkout %', align: 'right' as const, wch: 17 },
    { label: 'Taxa Compra %',   align: 'right' as const, wch: 15 },
  ]
  const ncols = headers.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {}
  const addr = (r: number, c: number) => XLSX.utils.encode_cell({ r, c })

  const safeName = campaignName.slice(0, 35)
  const title    = `Anúncios · ${safeName} · ${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`
  const sub      = `Total: ${ads.length} anúncios · Gerado em ${new Date().toLocaleString('pt-BR')}`
  writeHeader(ws, addr, title, sub, headers, ncols)

  let totClicks = 0, totImpr = 0, totCost = 0, totRev = 0, totProfit = 0,
      totPurch = 0, totCheck = 0, totConv = 0

  ads.forEach((ad, ri) => {
    const alt  = ri % 2 === 1
    const isPos = ad.profit >= 0
    const baseL = { ...dataStyle(alt, 'left') }
    const baseR = dataStyle(alt, 'right')
    const baseC = dataStyle(alt, 'center')
    const r = 3 + ri

    totClicks  += ad.clicks;    totImpr  += ad.impressions; totCost    += ad.cost
    totRev     += ad.revenue;   totProfit += ad.profit;     totPurch   += ad.purchases
    totCheck   += ad.initiateCheckouts; totConv += ad.conversions

    ws[addr(r, 0)]  = cell(ad.name, 's', { ...baseL, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: C.TEXT_DARK } } })
    ws[addr(r, 1)]  = cell(ad.clicks,              'n', baseR, FMT_INT)
    ws[addr(r, 2)]  = cell(ad.impressions,         'n', baseR, FMT_INT)
    ws[addr(r, 3)]  = cell(ad.ctr,                 'n', baseC, FMT_PCT)
    ws[addr(r, 4)]  = cell(ad.cr,                  'n', baseC, FMT_PCT)
    ws[addr(r, 5)]  = cell(ad.cost,    'n', { ...baseR, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: '1D4ED8' } } }, FMT_CUR)
    ws[addr(r, 6)]  = cell(ad.revenue, 'n', { ...baseR, font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: C.GREEN  } } }, FMT_CUR)
    ws[addr(r, 7)]  = cell(ad.profit,  'n', {
      ...baseR,
      font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: isPos ? C.GREEN : C.RED } },
    }, FMT_CUR)
    ws[addr(r, 8)]  = cell(ad.roi, 'n', {
      ...baseC,
      font: { bold: true, sz: 9, name: 'Calibri', color: { rgb: ad.roi >= 0 ? C.GREEN : C.RED } },
    }, '0.00"%"')
    ws[addr(r, 9)]  = cell(ad.cpc,          'n', baseR, FMT_CUR)
    ws[addr(r, 10)] = cell(ad.cpa,          'n', baseR, FMT_CUR)
    ws[addr(r, 11)] = cell(ad.purchases,    'n', baseR, FMT_INT)
    ws[addr(r, 12)] = cell(ad.initiateCheckouts, 'n', baseR, FMT_INT)
    ws[addr(r, 13)] = cell(ad.checkoutRate, 'n', baseC, FMT_PCT)
    ws[addr(r, 14)] = cell(ad.purchaseRate, 'n', baseC, FMT_PCT)
  })

  // Separador
  const sepRow = 3 + ads.length
  for (let c = 0; c < ncols; c++) {
    ws[addr(sepRow, c)] = cell('', 's', { fill: { patternType: 'solid', fgColor: { rgb: C.WHITE } }, border: thin(C.BORDER) })
  }

  // Totais
  const totRow = sepRow + 1
  const totROI = totCost   > 0 ? ((totRev - totCost) / totCost) * 100 : 0
  const totCTR = totImpr   > 0 ? (totClicks / totImpr) * 100 : 0
  const totCR  = totClicks > 0 ? (totConv  / totClicks) * 100 : 0
  const totCPC = totClicks > 0 ? totCost / totClicks : 0
  const totCPA = totConv   > 0 ? totCost / totConv   : 0
  const totCkR = totClicks > 0 ? (totCheck / totClicks) * 100 : 0
  const totPuR = totCheck  > 0 ? (totPurch / totCheck)  * 100 : 0

  ws[addr(totRow, 0)]  = cell(`${ads.length} anúncios`, 's', totStyle('left'))
  ws[addr(totRow, 1)]  = cell(totClicks,  'n', totStyle(), FMT_INT)
  ws[addr(totRow, 2)]  = cell(totImpr,    'n', totStyle(), FMT_INT)
  ws[addr(totRow, 3)]  = cell(totCTR,     'n', totStyle(), FMT_PCT)
  ws[addr(totRow, 4)]  = cell(totCR,      'n', totStyle(), FMT_PCT)
  ws[addr(totRow, 5)]  = cell(totCost,    'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 6)]  = cell(totRev,     'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 7)]  = cell(totProfit,  'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 8)]  = cell(totROI,     'n', totStyle(), '0.00"%"')
  ws[addr(totRow, 9)]  = cell(totCPC,     'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 10)] = cell(totCPA,     'n', totStyle(), FMT_CUR)
  ws[addr(totRow, 11)] = cell(totPurch,   'n', totStyle(), FMT_INT)
  ws[addr(totRow, 12)] = cell(totCheck,   'n', totStyle(), FMT_INT)
  ws[addr(totRow, 13)] = cell(totCkR,     'n', totStyle(), FMT_PCT)
  ws[addr(totRow, 14)] = cell(totPuR,     'n', totStyle(), FMT_PCT)

  ws['!ref']        = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totRow, c: ncols - 1 } })
  ws['!cols']       = headers.map(h => ({ wch: h.wch }))
  ws['!rows']       = [{ hpx: 26 }, { hpx: 16 }, { hpx: 22 }, ...Array(ads.length).fill({ hpx: 18 }), { hpx: 8 }, { hpx: 22 }]
  ws['!merges']     = [{ s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } }]
  ws['!freeze']     = { xSplit: 1, ySplit: 3, topLeftCell: 'B4', activePane: 'bottomRight' }
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } }) }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Anúncios')
  const safeCampName = campaignName.replace(/[^a-zA-Z0-9À-ú _-]/g, '').slice(0, 25).trim()
  XLSX.writeFile(wb, `Anuncios_${safeCampName}_${dateFrom}_${dateTo}.xlsx`, { bookType: 'xlsx', type: 'binary', cellStyles: true, bookSST: false })
}
