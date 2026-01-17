/**
 * PDF Renderer Module
 * ====================
 * Data binding and report generation for DD reports
 * Uses template-based approach for final PDF output
 */

import type {
  ReportConfig,
  ReportMetadata,
  ReportSection,
  GeneratedReport,
  PnLStatement,
  BalanceSheet,
  CashFlowStatement,
  QoEBridge,
  QoDAnalysis,
  OrderAnalysis,
  WorkingCapitalAnalysis,
  WaterfallChartData,
} from '../types';
import { WINCAP_GOLD, WINCAP_BLUE } from '../config/colors';

// =============================================================================
// Report Section Templates
// =============================================================================

export interface SectionTemplate {
  section: ReportSection;
  pageCount: number;
  requiresData: string[];
  generateContent: (data: ReportData) => SectionContent;
}

export interface SectionContent {
  title: string;
  subtitle?: string;
  tables: TableData[];
  charts: ChartData[];
  commentary: string[];
  footnotes?: string[];
}

export interface TableData {
  id: string;
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  footer?: (string | number)[];
  style?: 'default' | 'summary' | 'detail' | 'kpi';
}

export interface ChartData {
  id: string;
  type: 'waterfall' | 'bar_line' | 'stacked_bar' | 'pie' | 'dso_dpo' | 'heatmap';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

export interface ReportData {
  metadata: ReportMetadata;
  pnlStatements: PnLStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlowStatement[];
  qoeAnalysis: QoEBridge;
  qodAnalysis?: QoDAnalysis;
  orderAnalysis?: OrderAnalysis;
  workingCapital: WorkingCapitalAnalysis;
}

// =============================================================================
// Number Formatting Utilities
// =============================================================================

export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    suffix?: string;
    prefix?: string;
    showSign?: boolean;
    locale?: string;
    divideBy?: number;
  } = {}
): string {
  const {
    decimals = 0,
    suffix = '',
    prefix = '',
    showSign = false,
    locale = 'fr-FR',
    divideBy = 1,
  } = options;

  const adjustedValue = value / divideBy;
  const sign = showSign && adjustedValue > 0 ? '+' : '';

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(adjustedValue);

  return `${prefix}${sign}${formatted}${suffix}`;
}

export function formatCurrency(value: number, inThousands = true): string {
  return formatNumber(value, {
    divideBy: inThousands ? 1000 : 1,
    suffix: inThousands ? 'k€' : '€',
  });
}

export function formatPercent(value: number, decimals = 1): string {
  return formatNumber(value, {
    decimals,
    suffix: '%',
  });
}

export function formatVariation(value: number, isPercent = false): string {
  if (isPercent) {
    return formatNumber(value, { decimals: 1, suffix: '%', showSign: true });
  }
  return formatNumber(value, { divideBy: 1000, suffix: 'k€', showSign: true });
}

// =============================================================================
// Section Content Generators
// =============================================================================

export function generateCoverSection(data: ReportData): SectionContent {
  return {
    title: 'RAPPORT DE DUE DILIGENCE FINANCIÈRE',
    subtitle: data.metadata.targetCompany,
    tables: [],
    charts: [],
    commentary: [
      `Préparé par: ${data.metadata.preparedBy}`,
      `Pour: ${data.metadata.buyerCompany}`,
      `Date: ${data.metadata.date.toLocaleDateString('fr-FR')}`,
      `Statut: ${data.metadata.status === 'draft' ? 'PROJET' : 'FINAL'}`,
    ],
  };
}

export function generateExecutiveSummarySection(data: ReportData): SectionContent {
  const latestPnL = data.pnlStatements[data.pnlStatements.length - 1];
  const latestBS = data.balanceSheets[data.balanceSheets.length - 1];
  const latestQoE = data.qoeAnalysis.periods[data.qoeAnalysis.periods.length - 1];

  // KPI summary table
  const kpiTable: TableData = {
    id: 'kpi_summary',
    style: 'kpi',
    headers: ['Indicateur', ...data.pnlStatements.map(p => p.fiscalYear)],
    rows: [
      ['Production', ...data.pnlStatements.map(p => formatCurrency(p.production))],
      ['Δ Production', '', ...data.pnlStatements.slice(1).map((p, i) => {
        const prev = data.pnlStatements[i];
        const variation = ((p.production - prev.production) / prev.production) * 100;
        return formatPercent(variation);
      })],
      ['EBITDA', ...data.pnlStatements.map(p => formatCurrency(p.ebitda))],
      ['Marge EBITDA', ...data.pnlStatements.map(p => formatPercent(p.ebitdaMargin))],
      ['EBITDA Ajusté', ...data.qoeAnalysis.periods.map(p => formatCurrency(p.ebitdaAjuste))],
      ['Marge EBITDA Ajustée', ...data.qoeAnalysis.periods.map(p => formatPercent(p.margeEBITDAAjuste))],
      ['Résultat Net', ...data.pnlStatements.map(p => formatCurrency(p.resultatNet))],
    ],
  };

  return {
    title: 'Synthèse',
    tables: [kpiTable],
    charts: [],
    commentary: [
      `Activité: Production de ${formatCurrency(latestPnL.production)} sur l'exercice ${latestPnL.fiscalYear}`,
      `Rentabilité: EBITDA ajusté de ${formatCurrency(latestQoE.ebitdaAjuste)} soit une marge de ${formatPercent(latestQoE.margeEBITDAAjuste)}`,
      `Structure financière: ${latestBS.endettementNet > 0 ? 'Endettement' : 'Trésorerie'} net de ${formatCurrency(Math.abs(latestBS.endettementNet))}`,
    ],
  };
}

export function generatePnLSection(data: ReportData): SectionContent {
  // Build P&L comparison table
  const pnlTable: TableData = {
    id: 'pnl_detail',
    title: 'Compte de résultat',
    style: 'detail',
    headers: ['€k', ...data.pnlStatements.map(p => p.fiscalYear), 'Var.'],
    rows: [],
  };

  if (data.pnlStatements.length > 0) {
    const lineLabels = data.pnlStatements[0].lines.map(l => l.label);

    for (let i = 0; i < lineLabels.length; i++) {
      const amounts = data.pnlStatements.map(p => p.lines[i]?.amount || 0);
      const lastTwo = amounts.slice(-2);
      const variation = lastTwo.length === 2 && lastTwo[0] !== 0
        ? ((lastTwo[1] - lastTwo[0]) / Math.abs(lastTwo[0])) * 100
        : 0;

      pnlTable.rows.push([
        lineLabels[i],
        ...amounts.map(a => formatCurrency(a)),
        formatPercent(variation),
      ]);
    }
  }

  return {
    title: 'Performance Historique',
    subtitle: 'Compte de résultat analytique',
    tables: [pnlTable],
    charts: [],
    commentary: [],
  };
}

export function generateQoESection(data: ReportData): SectionContent {
  const charts: ChartData[] = [];

  // EBITDA bridge for each year
  for (const period of data.qoeAnalysis.periods) {
    const bridgeData: WaterfallChartData = {
      label: `EBITDA ${period.fiscalYear}`,
      value: period.ebitdaReporte,
      type: 'start',
    };

    charts.push({
      id: `ebitda_bridge_${period.fiscalYear}`,
      type: 'waterfall',
      title: `Bridge EBITDA ${period.fiscalYear}`,
      data: [
        { label: 'EBITDA Reporté', value: period.ebitdaReporte, type: 'start' },
        ...period.adjustments.map(adj => ({
          label: adj.label.replace(/\[.*?\]\s*/, ''),
          value: adj.impactEBITDA,
          type: adj.impactEBITDA >= 0 ? 'positive' : 'negative',
        })),
        { label: 'EBITDA Ajusté', value: period.ebitdaAjuste, type: 'end' },
      ],
    });
  }

  // QoE summary table
  const qoeTable: TableData = {
    id: 'qoe_summary',
    title: 'Qualité de l\'EBITDA',
    headers: ['€k', ...data.qoeAnalysis.periods.map(p => p.fiscalYear)],
    rows: [
      ['EBITDA reporté', ...data.qoeAnalysis.periods.map(p => formatCurrency(p.ebitdaReporte))],
      ...data.qoeAnalysis.summary.map(adj => [
        adj.label,
        ...data.qoeAnalysis.periods.map(p => {
          const periodAdj = p.adjustments.find(a => a.type === adj.type);
          return periodAdj ? formatCurrency(periodAdj.impactEBITDA) : '-';
        }),
      ]),
      ['EBITDA ajusté', ...data.qoeAnalysis.periods.map(p => formatCurrency(p.ebitdaAjuste))],
      ['Marge ajustée', ...data.qoeAnalysis.periods.map(p => formatPercent(p.margeEBITDAAjuste))],
    ],
  };

  return {
    title: 'Qualité de l\'EBITDA (QoE)',
    tables: [qoeTable],
    charts,
    commentary: [
      `${data.qoeAnalysis.summary.length} catégorie(s) d'ajustement identifiée(s)`,
    ],
  };
}

export function generateBalanceSheetSection(data: ReportData): SectionContent {
  const bsTable: TableData = {
    id: 'balance_sheet',
    title: 'Bilan restructuré',
    headers: ['€k', ...data.balanceSheets.map(b => b.fiscalYear)],
    rows: [
      ['ACTIF', '', '', ''],
      ['Actif immobilisé', ...data.balanceSheets.map(b => formatCurrency(b.actifImmobilise))],
      ['Stocks', ...data.balanceSheets.map(b => formatCurrency(b.stocks))],
      ['Clients', ...data.balanceSheets.map(b => formatCurrency(b.clientsNet))],
      ['Autres créances', ...data.balanceSheets.map(b => formatCurrency(b.autresCreances))],
      ['Trésorerie', ...data.balanceSheets.map(b => formatCurrency(b.tresorerieActif))],
      ['Total Actif', ...data.balanceSheets.map(b => formatCurrency(b.totalActif))],
      ['', '', '', ''],
      ['PASSIF', '', '', ''],
      ['Capitaux propres', ...data.balanceSheets.map(b => formatCurrency(b.capitauxPropres))],
      ['Provisions', ...data.balanceSheets.map(b => formatCurrency(b.provisionsRisques))],
      ['Dettes financières', ...data.balanceSheets.map(b => formatCurrency(b.dettesFinancieres))],
      ['Fournisseurs', ...data.balanceSheets.map(b => formatCurrency(b.fournisseurs))],
      ['Dettes fiscales & sociales', ...data.balanceSheets.map(b => formatCurrency(b.dettesFiscalesSociales))],
      ['Autres dettes', ...data.balanceSheets.map(b => formatCurrency(b.autresDettes))],
      ['Total Passif', ...data.balanceSheets.map(b => formatCurrency(b.totalPassif))],
      ['', '', '', ''],
      ['BFR Opérationnel', ...data.balanceSheets.map(b => formatCurrency(b.bfrOperationnel))],
      ['BFR Total', ...data.balanceSheets.map(b => formatCurrency(b.bfrTotal))],
      ['Endettement net', ...data.balanceSheets.map(b => formatCurrency(b.endettementNet))],
    ],
  };

  return {
    title: 'Bilan',
    tables: [bsTable],
    charts: [],
    commentary: [],
  };
}

export function generateCashFlowSection(data: ReportData): SectionContent {
  const cfTable: TableData = {
    id: 'cash_flow',
    title: 'Tableau de flux de trésorerie',
    headers: ['€k', ...data.cashFlows.map(c => c.fiscalYear)],
    rows: [
      ['EBITDA', ...data.cashFlows.map(c => formatCurrency(c.ebitda))],
      ['Variation BFR opérationnel', ...data.cashFlows.map(c => formatCurrency(c.variationBFROperationnel))],
      ['Variation BFR non-opérationnel', ...data.cashFlows.map(c => formatCurrency(c.variationBFRNonOperationnel))],
      ['Flux d\'exploitation', ...data.cashFlows.map(c => formatCurrency(c.fluxExploitation))],
      ['Investissements (CAPEX)', ...data.cashFlows.map(c => formatCurrency(c.capex))],
      ['Cessions', ...data.cashFlows.map(c => formatCurrency(c.cessions))],
      ['Flux d\'investissement', ...data.cashFlows.map(c => formatCurrency(c.fluxInvestissement))],
      ['FCF avant IS', ...data.cashFlows.map(c => formatCurrency(c.fcfAvantIS))],
      ['Impôt sur les sociétés', ...data.cashFlows.map(c => formatCurrency(-c.impotSocietes))],
      ['FCF après IS', ...data.cashFlows.map(c => formatCurrency(c.fcfApresIS))],
      ['Dividendes', ...data.cashFlows.map(c => formatCurrency(c.dividendes))],
      ['Variation dettes financières', ...data.cashFlows.map(c => formatCurrency(c.variationDettesFinancieres))],
      ['Flux de financement', ...data.cashFlows.map(c => formatCurrency(c.fluxFinancement))],
      ['Variation de trésorerie', ...data.cashFlows.map(c => formatCurrency(c.variationTresorerie))],
      ['Trésorerie ouverture', ...data.cashFlows.map(c => formatCurrency(c.tresorerieOuverture))],
      ['Trésorerie clôture', ...data.cashFlows.map(c => formatCurrency(c.tresorerieCloture))],
    ],
  };

  return {
    title: 'Analyse des Flux de Trésorerie',
    tables: [cfTable],
    charts: [],
    commentary: [],
  };
}

// =============================================================================
// Report Assembly
// =============================================================================

export function assembleReport(
  config: ReportConfig,
  data: ReportData
): { sections: Map<ReportSection, SectionContent>; metadata: ReportMetadata } {
  const sections = new Map<ReportSection, SectionContent>();

  // Generate content for each configured section
  for (const section of config.sections) {
    switch (section) {
      case 'cover':
        sections.set(section, generateCoverSection(data));
        break;
      case 'executive_summary':
        sections.set(section, generateExecutiveSummarySection(data));
        break;
      case 'pnl_detail':
        sections.set(section, generatePnLSection(data));
        break;
      case 'qoe_analysis':
        sections.set(section, generateQoESection(data));
        break;
      case 'balance_sheet_detail':
        sections.set(section, generateBalanceSheetSection(data));
        break;
      case 'cash_flow_detail':
        sections.set(section, generateCashFlowSection(data));
        break;
      // Add more section generators as needed
      default:
        // Placeholder for sections not yet implemented
        sections.set(section, {
          title: section.replace(/_/g, ' ').toUpperCase(),
          tables: [],
          charts: [],
          commentary: ['Section à compléter'],
        });
    }
  }

  return { sections, metadata: config.metadata };
}

// =============================================================================
// Export Formats
// =============================================================================

export interface ExportOptions {
  format: 'json' | 'html' | 'pptx_data';
  includeChartImages?: boolean;
  language?: 'fr' | 'en';
}

/**
 * Export report data for external rendering
 */
export function exportReportData(
  sections: Map<ReportSection, SectionContent>,
  metadata: ReportMetadata,
  options: ExportOptions
): string | object {
  const exportData = {
    metadata: {
      ...metadata,
      date: metadata.date.toISOString(),
      generatedAt: new Date().toISOString(),
    },
    sections: Object.fromEntries(
      Array.from(sections.entries()).map(([key, value]) => [key, value])
    ),
  };

  switch (options.format) {
    case 'json':
      return JSON.stringify(exportData, null, 2);
    case 'html':
      return generateHTMLReport(exportData);
    case 'pptx_data':
      return exportData;
    default:
      return exportData;
  }
}

function generateHTMLReport(data: { metadata: Record<string, unknown>; sections: Record<string, SectionContent> }): string {
  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport DD - ${data.metadata.targetCompany}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
    h1 { color: ${WINCAP_BLUE}; border-bottom: 3px solid ${WINCAP_GOLD}; padding-bottom: 10px; }
    h2 { color: ${WINCAP_BLUE}; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: right; }
    th { background: ${WINCAP_BLUE}; color: white; }
    td:first-child { text-align: left; font-weight: 500; }
    tr:nth-child(even) { background: #F9FAFB; }
    .commentary { background: #FEF3C7; padding: 15px; border-left: 4px solid ${WINCAP_GOLD}; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>`;

  for (const [sectionKey, section] of Object.entries(data.sections)) {
    html += `<section id="${sectionKey}">`;
    html += `<h2>${section.title}</h2>`;

    if (section.subtitle) {
      html += `<h3>${section.subtitle}</h3>`;
    }

    // Render tables
    for (const table of section.tables) {
      if (table.title) {
        html += `<h4>${table.title}</h4>`;
      }
      html += '<table>';
      html += '<thead><tr>';
      for (const header of table.headers) {
        html += `<th>${header}</th>`;
      }
      html += '</tr></thead>';
      html += '<tbody>';
      for (const row of table.rows) {
        html += '<tr>';
        for (const cell of row) {
          html += `<td>${cell}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
    }

    // Render commentary
    if (section.commentary.length > 0) {
      html += '<div class="commentary">';
      for (const comment of section.commentary) {
        html += `<p>${comment}</p>`;
      }
      html += '</div>';
    }

    html += '</section>';
  }

  html += `<div class="footer">
    <p>Généré le ${new Date().toLocaleDateString('fr-FR')} - Wincap Opérations</p>
  </div>
</body>
</html>`;

  return html;
}
