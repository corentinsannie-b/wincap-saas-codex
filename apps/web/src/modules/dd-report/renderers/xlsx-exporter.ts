/**
 * XLSX Exporter Module
 * ====================
 * Export DD Report data to Excel format
 */

import * as XLSX from 'xlsx';
import type {
  PnLStatement,
  BalanceSheet,
  CashFlowStatement,
  QoEBridge,
  ReportMetadata,
} from '../types';
import { formatCurrency, formatPercent } from './pdf-renderer';
import { WINCAP_GOLD, WINCAP_BLUE } from '../config/colors';

// =============================================================================
// Export Options
// =============================================================================

export interface XLSXExportOptions {
  metadata: ReportMetadata;
  pnlStatements?: PnLStatement[];
  balanceSheets?: BalanceSheet[];
  cashFlows?: CashFlowStatement[];
  qoeAnalysis?: QoEBridge;
  includeRawData?: boolean;
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export DD Report data to XLSX file
 */
export function exportToXLSX(options: XLSXExportOptions): Blob {
  const workbook = XLSX.utils.book_new();

  // Add Cover Sheet
  addCoverSheet(workbook, options.metadata);

  // Add P&L Sheet
  if (options.pnlStatements && options.pnlStatements.length > 0) {
    addPnLSheet(workbook, options.pnlStatements);
  }

  // Add Balance Sheet
  if (options.balanceSheets && options.balanceSheets.length > 0) {
    addBalanceSheetSheet(workbook, options.balanceSheets);
  }

  // Add Cash Flow Sheet
  if (options.cashFlows && options.cashFlows.length > 0) {
    addCashFlowSheet(workbook, options.cashFlows);
  }

  // Add QoE Sheet
  if (options.qoeAnalysis) {
    addQoESheet(workbook, options.qoeAnalysis);
  }

  // Add KPI Summary Sheet
  if (options.pnlStatements && options.balanceSheets) {
    addKPISummarySheet(workbook, options.pnlStatements, options.balanceSheets);
  }

  // Generate buffer
  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download DD Report as XLSX file
 */
export function downloadXLSX(options: XLSXExportOptions, filename?: string): void {
  const blob = exportToXLSX(options);
  const finalFilename = filename || `DD_Report_${options.metadata.targetCompany}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Sheet Generators
// =============================================================================

function addCoverSheet(workbook: XLSX.WorkBook, metadata: ReportMetadata): void {
  const data = [
    ['FINANCIAL DUE DILIGENCE REPORT'],
    [''],
    ['Target Company:', metadata.targetCompany],
    ['Buyer Company:', metadata.buyerCompany],
    ['Prepared By:', metadata.preparedBy],
    ['Date:', metadata.date.toLocaleDateString('fr-FR')],
    ['Status:', metadata.status.toUpperCase()],
    ['Version:', metadata.version],
    [''],
    ['Fiscal Years Covered:', metadata.fiscalYears.join(', ')],
    [''],
    ['CONFIDENTIAL - FOR INTERNAL USE ONLY'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [{ wch: 25 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cover');
}

function addPnLSheet(workbook: XLSX.WorkBook, pnlStatements: PnLStatement[]): void {
  // Header row with fiscal years
  const headers = ['Description (€k)', ...pnlStatements.map(p => p.fiscalYear)];

  // Build rows from P&L structure
  const rows: (string | number)[][] = [headers];

  // Get all unique line items from the first P&L
  if (pnlStatements.length > 0) {
    pnlStatements[0].lines.forEach((line, index) => {
      const row: (string | number)[] = [line.label];
      pnlStatements.forEach(pnl => {
        const amount = pnl.lines[index]?.amount || 0;
        row.push(Math.round(amount / 1000)); // Convert to k€
      });
      rows.push(row);
    });
  }

  // Add summary rows
  rows.push(['']);
  rows.push(['KEY METRICS', ...pnlStatements.map(() => '')]);
  rows.push(['Production', ...pnlStatements.map(p => Math.round(p.production / 1000))]);
  rows.push(['Valeur Ajoutée', ...pnlStatements.map(p => Math.round(p.valeurAjoutee / 1000))]);
  rows.push(['EBITDA', ...pnlStatements.map(p => Math.round(p.ebitda / 1000))]);
  rows.push(['EBITDA Margin (%)', ...pnlStatements.map(p => `${p.ebitdaMargin.toFixed(1)}%`)]);
  rows.push(['Résultat d\'Exploitation', ...pnlStatements.map(p => Math.round(p.resultatExploitation / 1000))]);
  rows.push(['Résultat Net', ...pnlStatements.map(p => Math.round(p.resultatNet / 1000))]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 40 },
    ...pnlStatements.map(() => ({ wch: 15 })),
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'P&L');
}

function addBalanceSheetSheet(workbook: XLSX.WorkBook, balanceSheets: BalanceSheet[]): void {
  const headers = ['Description (€k)', ...balanceSheets.map(bs => bs.fiscalYear)];
  const rows: (string | number)[][] = [headers];

  // ACTIF
  rows.push(['ACTIF', ...balanceSheets.map(() => '')]);
  rows.push(['Actif Immobilisé', ...balanceSheets.map(bs => Math.round(bs.actifImmobilise / 1000))]);
  rows.push(['  Immobilisations Incorporelles', ...balanceSheets.map(bs => Math.round(bs.immosIncorporelles / 1000))]);
  rows.push(['  Immobilisations Corporelles', ...balanceSheets.map(bs => Math.round(bs.immosCorporelles / 1000))]);
  rows.push(['  Immobilisations Financières', ...balanceSheets.map(bs => Math.round(bs.immosFinancieres / 1000))]);
  rows.push(['']);
  rows.push(['Actif Circulant', ...balanceSheets.map(bs => Math.round(bs.actifCirculant / 1000))]);
  rows.push(['  Stocks', ...balanceSheets.map(bs => Math.round(bs.stocks / 1000))]);
  rows.push(['  Clients (Brut)', ...balanceSheets.map(bs => Math.round(bs.clientsBrut / 1000))]);
  rows.push(['  Provisions Clients', ...balanceSheets.map(bs => Math.round(-bs.provisionsClients / 1000))]);
  rows.push(['  Clients (Net)', ...balanceSheets.map(bs => Math.round(bs.clientsNet / 1000))]);
  rows.push(['  Autres Créances', ...balanceSheets.map(bs => Math.round(bs.autresCreances / 1000))]);
  rows.push(['']);
  rows.push(['Trésorerie Actif', ...balanceSheets.map(bs => Math.round(bs.tresorerieActif / 1000))]);
  rows.push(['']);
  rows.push(['TOTAL ACTIF', ...balanceSheets.map(bs => Math.round(bs.totalActif / 1000))]);

  rows.push(['']);
  rows.push(['PASSIF', ...balanceSheets.map(() => '')]);
  rows.push(['Capitaux Propres', ...balanceSheets.map(bs => Math.round(bs.capitauxPropres / 1000))]);
  rows.push(['  Capital Social', ...balanceSheets.map(bs => Math.round(bs.capitalSocial / 1000))]);
  rows.push(['  Réserves', ...balanceSheets.map(bs => Math.round(bs.reserves / 1000))]);
  rows.push(['  Résultat de l\'Exercice', ...balanceSheets.map(bs => Math.round(bs.resultatExercice / 1000))]);
  rows.push(['']);
  rows.push(['Provisions', ...balanceSheets.map(bs => Math.round(bs.provisions / 1000))]);
  rows.push(['']);
  rows.push(['Dettes Financières', ...balanceSheets.map(bs => Math.round(bs.dettesFinancieres / 1000))]);
  rows.push(['Fournisseurs', ...balanceSheets.map(bs => Math.round(bs.fournisseurs / 1000))]);
  rows.push(['Dettes Fiscales et Sociales', ...balanceSheets.map(bs => Math.round(bs.dettesFiscalesSociales / 1000))]);
  rows.push(['Autres Dettes', ...balanceSheets.map(bs => Math.round(bs.autresDettes / 1000))]);
  rows.push(['Trésorerie Passif', ...balanceSheets.map(bs => Math.round(bs.tresoreriePassif / 1000))]);
  rows.push(['']);
  rows.push(['TOTAL PASSIF', ...balanceSheets.map(bs => Math.round(bs.totalPassif / 1000))]);

  rows.push(['']);
  rows.push(['INDICATEURS', ...balanceSheets.map(() => '')]);
  rows.push(['BFR Opérationnel', ...balanceSheets.map(bs => Math.round(bs.bfrOperationnel / 1000))]);
  rows.push(['BFR Total', ...balanceSheets.map(bs => Math.round(bs.bfrTotal / 1000))]);
  rows.push(['Endettement Net', ...balanceSheets.map(bs => Math.round(bs.endettementNet / 1000))]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 35 },
    ...balanceSheets.map(() => ({ wch: 15 })),
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet');
}

function addCashFlowSheet(workbook: XLSX.WorkBook, cashFlows: CashFlowStatement[]): void {
  const headers = ['Description (€k)', ...cashFlows.map(cf => cf.fiscalYear)];
  const rows: (string | number)[][] = [headers];

  rows.push(['FLUX DE TRÉSORERIE D\'EXPLOITATION', ...cashFlows.map(() => '')]);
  rows.push(['Résultat Net', ...cashFlows.map(cf => Math.round(cf.resultatNet / 1000))]);
  rows.push(['Dotations aux Amortissements', ...cashFlows.map(cf => Math.round(cf.dotationsAmortissements / 1000))]);
  rows.push(['Dotations aux Provisions', ...cashFlows.map(cf => Math.round(cf.dotationsProvisions / 1000))]);
  rows.push(['Plus/Moins Values de Cession', ...cashFlows.map(cf => Math.round(cf.plusMoinsValuesCession / 1000))]);
  rows.push(['Capacité d\'Autofinancement', ...cashFlows.map(cf => Math.round(cf.capaciteAutofinancement / 1000))]);
  rows.push(['Variation BFR', ...cashFlows.map(cf => Math.round(cf.variationBFR / 1000))]);
  rows.push(['Flux de Trésorerie d\'Exploitation', ...cashFlows.map(cf => Math.round(cf.fluxTresorerieExploitation / 1000))]);

  rows.push(['']);
  rows.push(['FLUX D\'INVESTISSEMENT', ...cashFlows.map(() => '')]);
  rows.push(['Acquisitions Immobilisations', ...cashFlows.map(cf => Math.round(cf.acquisitionsImmobilisations / 1000))]);
  rows.push(['Cessions Immobilisations', ...cashFlows.map(cf => Math.round(cf.cessionsImmobilisations / 1000))]);
  rows.push(['Flux d\'Investissement', ...cashFlows.map(cf => Math.round(cf.fluxInvestissement / 1000))]);

  rows.push(['']);
  rows.push(['FLUX DE FINANCEMENT', ...cashFlows.map(() => '')]);
  rows.push(['Augmentation de Capital', ...cashFlows.map(cf => Math.round(cf.augmentationCapital / 1000))]);
  rows.push(['Dividendes', ...cashFlows.map(cf => Math.round(cf.dividendes / 1000))]);
  rows.push(['Nouveaux Emprunts', ...cashFlows.map(cf => Math.round(cf.nouveauxEmprunts / 1000))]);
  rows.push(['Remboursement Emprunts', ...cashFlows.map(cf => Math.round(cf.remboursementEmprunts / 1000))]);
  rows.push(['Flux de Financement', ...cashFlows.map(cf => Math.round(cf.fluxFinancement / 1000))]);

  rows.push(['']);
  rows.push(['VARIATION DE TRÉSORERIE', ...cashFlows.map(cf => Math.round(cf.variationTresorerie / 1000))]);
  rows.push(['Trésorerie d\'Ouverture', ...cashFlows.map(cf => Math.round(cf.tresorerieOuverture / 1000))]);
  rows.push(['Trésorerie de Clôture', ...cashFlows.map(cf => Math.round(cf.tresorerieCloture / 1000))]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 40 },
    ...cashFlows.map(() => ({ wch: 15 })),
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Flow');
}

function addQoESheet(workbook: XLSX.WorkBook, qoeAnalysis: QoEBridge): void {
  const headers = ['Ajustement', ...qoeAnalysis.periods.map(p => p.fiscalYear)];
  const rows: (string | number)[][] = [headers];

  rows.push(['EBITDA Reporté', ...qoeAnalysis.periods.map(p => Math.round(p.ebitdaReporte / 1000))]);
  rows.push(['']);

  // Add each adjustment type
  for (const summary of qoeAnalysis.summary) {
    const row: (string | number)[] = [summary.label];
    for (const period of qoeAnalysis.periods) {
      const adj = period.adjustments.find(a => a.type === summary.type);
      row.push(adj ? Math.round(adj.impactEBITDA / 1000) : 0);
    }
    rows.push(row);
  }

  rows.push(['']);
  rows.push(['Total Ajustements', ...qoeAnalysis.periods.map(p =>
    Math.round(p.adjustments.reduce((sum, adj) => sum + adj.impactEBITDA, 0) / 1000)
  )]);
  rows.push(['EBITDA Ajusté', ...qoeAnalysis.periods.map(p => Math.round(p.ebitdaAjuste / 1000))]);
  rows.push(['']);
  rows.push(['Marge EBITDA Reportée (%)', ...qoeAnalysis.periods.map(p => `${p.margeEBITDAReporte.toFixed(1)}%`)]);
  rows.push(['Marge EBITDA Ajustée (%)', ...qoeAnalysis.periods.map(p => `${p.margeEBITDAAjuste.toFixed(1)}%`)]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 35 },
    ...qoeAnalysis.periods.map(() => ({ wch: 15 })),
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'QoE Analysis');
}

function addKPISummarySheet(
  workbook: XLSX.WorkBook,
  pnlStatements: PnLStatement[],
  balanceSheets: BalanceSheet[]
): void {
  const headers = ['KPI', ...pnlStatements.map(p => p.fiscalYear)];
  const rows: (string | number)[][] = [headers];

  // Revenue & Profitability
  rows.push(['REVENUE & PROFITABILITY', ...pnlStatements.map(() => '')]);
  rows.push(['Production (€k)', ...pnlStatements.map(p => Math.round(p.production / 1000))]);
  rows.push(['Valeur Ajoutée (€k)', ...pnlStatements.map(p => Math.round(p.valeurAjoutee / 1000))]);
  rows.push(['VA Margin (%)', ...pnlStatements.map(p => p.production > 0 ? `${(p.valeurAjoutee / p.production * 100).toFixed(1)}%` : '-')]);
  rows.push(['EBITDA (€k)', ...pnlStatements.map(p => Math.round(p.ebitda / 1000))]);
  rows.push(['EBITDA Margin (%)', ...pnlStatements.map(p => `${p.ebitdaMargin.toFixed(1)}%`)]);
  rows.push(['Résultat Net (€k)', ...pnlStatements.map(p => Math.round(p.resultatNet / 1000))]);
  rows.push(['Net Margin (%)', ...pnlStatements.map(p => p.production > 0 ? `${(p.resultatNet / p.production * 100).toFixed(1)}%` : '-')]);

  rows.push(['']);
  rows.push(['BALANCE SHEET & LEVERAGE', ...balanceSheets.map(() => '')]);
  rows.push(['Total Assets (€k)', ...balanceSheets.map(bs => Math.round(bs.totalActif / 1000))]);
  rows.push(['Capitaux Propres (€k)', ...balanceSheets.map(bs => Math.round(bs.capitauxPropres / 1000))]);
  rows.push(['Dettes Financières (€k)', ...balanceSheets.map(bs => Math.round(bs.dettesFinancieres / 1000))]);
  rows.push(['Endettement Net (€k)', ...balanceSheets.map(bs => Math.round(bs.endettementNet / 1000))]);

  // Calculate leverage ratios
  rows.push(['']);
  rows.push(['LEVERAGE RATIOS', ...balanceSheets.map(() => '')]);

  for (let i = 0; i < balanceSheets.length; i++) {
    const bs = balanceSheets[i];
    const pnl = pnlStatements.find(p => p.fiscalYear === bs.fiscalYear);
    const ebitda = pnl?.ebitda || 1;

    if (i === 0) {
      rows.push(['Net Debt / EBITDA', ...balanceSheets.map((bs2, j) => {
        const pnl2 = pnlStatements.find(p => p.fiscalYear === bs2.fiscalYear);
        const ebitda2 = pnl2?.ebitda || 1;
        return ebitda2 !== 0 ? `${(bs2.endettementNet / ebitda2).toFixed(2)}x` : '-';
      })]);

      rows.push(['Gearing (Debt/Equity)', ...balanceSheets.map(bs2 => {
        return bs2.capitauxPropres !== 0 ? `${(bs2.dettesFinancieres / bs2.capitauxPropres * 100).toFixed(1)}%` : '-';
      })]);
    }
  }

  rows.push(['']);
  rows.push(['WORKING CAPITAL', ...balanceSheets.map(() => '')]);
  rows.push(['BFR Opérationnel (€k)', ...balanceSheets.map(bs => Math.round(bs.bfrOperationnel / 1000))]);
  rows.push(['BFR / Production (%)', ...balanceSheets.map((bs, i) => {
    const pnl = pnlStatements.find(p => p.fiscalYear === bs.fiscalYear);
    return pnl && pnl.production > 0 ? `${(bs.bfrOperationnel / pnl.production * 100).toFixed(1)}%` : '-';
  })]);
  rows.push(['DSO (days)', ...balanceSheets.map((bs, i) => {
    const pnl = pnlStatements.find(p => p.fiscalYear === bs.fiscalYear);
    const dailyRevenue = pnl ? pnl.production / 365 : 1;
    return dailyRevenue > 0 ? Math.round(bs.clientsNet / dailyRevenue) : '-';
  })]);
  rows.push(['DPO (days)', ...balanceSheets.map((bs, i) => {
    const pnl = pnlStatements.find(p => p.fiscalYear === bs.fiscalYear);
    const dailyCosts = pnl ? (pnl.production - pnl.valeurAjoutee) / 365 : 1;
    return dailyCosts > 0 ? Math.round(bs.fournisseurs / dailyCosts) : '-';
  })]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 30 },
    ...pnlStatements.map(() => ({ wch: 15 })),
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Summary');
}
