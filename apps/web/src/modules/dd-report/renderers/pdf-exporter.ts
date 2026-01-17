/**
 * PDF Exporter Module
 * ====================
 * Browser-based PDF export using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  PnLStatement,
  BalanceSheet,
  CashFlowStatement,
  QoEBridge,
  ReportMetadata,
} from '../types';
import { WINCAP_GOLD, WINCAP_BLUE } from '../config/colors';

// =============================================================================
// Export Options
// =============================================================================

export interface PDFExportOptions {
  metadata: ReportMetadata;
  pnlStatements?: PnLStatement[];
  balanceSheets?: BalanceSheet[];
  cashFlows?: CashFlowStatement[];
  qoeAnalysis?: QoEBridge;
}

// Extend jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// =============================================================================
// Color Helpers
// =============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

const WINCAP_BLUE_RGB = hexToRgb(WINCAP_BLUE);
const WINCAP_GOLD_RGB = hexToRgb(WINCAP_GOLD);

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export DD Report data to PDF
 */
export function exportToPDF(options: PDFExportOptions): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Add Cover Page
  addCoverPage(doc, options.metadata, pageWidth, pageHeight, margin);

  // Add Executive Summary
  doc.addPage();
  addExecutiveSummary(doc, options, margin, contentWidth);

  // Add P&L Section
  if (options.pnlStatements && options.pnlStatements.length > 0) {
    doc.addPage();
    addPnLSection(doc, options.pnlStatements, margin, contentWidth);
  }

  // Add Balance Sheet Section
  if (options.balanceSheets && options.balanceSheets.length > 0) {
    doc.addPage();
    addBalanceSheetSection(doc, options.balanceSheets, margin, contentWidth);
  }

  // Add Cash Flow Section
  if (options.cashFlows && options.cashFlows.length > 0) {
    doc.addPage();
    addCashFlowSection(doc, options.cashFlows, margin, contentWidth);
  }

  // Add QoE Section
  if (options.qoeAnalysis) {
    doc.addPage();
    addQoESection(doc, options.qoeAnalysis, margin, contentWidth);
  }

  // Add page numbers
  addPageNumbers(doc);

  return doc.output('blob');
}

/**
 * Download DD Report as PDF file
 */
export function downloadPDF(options: PDFExportOptions, filename?: string): void {
  const blob = exportToPDF(options);
  const finalFilename = filename || `DD_Report_${options.metadata.targetCompany}_${new Date().toISOString().split('T')[0]}.pdf`;

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
// Page Generators
// =============================================================================

function addCoverPage(
  doc: jsPDF,
  metadata: ReportMetadata,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void {
  // Draw header background
  doc.setFillColor(...WINCAP_BLUE_RGB);
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Draw gold accent line
  doc.setFillColor(...WINCAP_GOLD_RGB);
  doc.rect(0, 80, pageWidth, 3, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL DUE DILIGENCE', pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(20);
  doc.text('REPORT', pageWidth / 2, 50, { align: 'center' });

  // Company name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.targetCompany.toUpperCase(), pageWidth / 2, 70, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Details section
  let yPos = 120;
  const leftCol = margin;
  const rightCol = 80;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Target Company:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.targetCompany, rightCol, yPos);

  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Buyer Company:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.buyerCompany, rightCol, yPos);

  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared By:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.preparedBy, rightCol, yPos);

  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.date.toLocaleDateString('fr-FR'), rightCol, yPos);

  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.status.toUpperCase(), rightCol, yPos);

  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Fiscal Years:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(metadata.fiscalYears.join(', '), rightCol, yPos);

  // Confidentiality notice
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('CONFIDENTIAL - FOR INTERNAL USE ONLY', pageWidth / 2, pageHeight - 30, { align: 'center' });
}

function addSectionHeader(doc: jsPDF, title: string, margin: number, yPos: number): number {
  doc.setFillColor(...WINCAP_BLUE_RGB);
  doc.rect(margin, yPos, doc.internal.pageSize.getWidth() - 2 * margin, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 5, yPos + 7);

  doc.setTextColor(0, 0, 0);
  return yPos + 15;
}

function addExecutiveSummary(
  doc: jsPDF,
  options: PDFExportOptions,
  margin: number,
  contentWidth: number
): void {
  let yPos = addSectionHeader(doc, 'EXECUTIVE SUMMARY', margin, margin);

  if (!options.pnlStatements || options.pnlStatements.length === 0) {
    doc.setFontSize(11);
    doc.text('No financial data available.', margin, yPos + 10);
    return;
  }

  const latestPnL = options.pnlStatements[options.pnlStatements.length - 1];
  const latestBS = options.balanceSheets?.[options.balanceSheets.length - 1];

  // KPI Table
  yPos += 5;
  const kpiData = [
    ['Production', formatK(latestPnL.production)],
    ['Valeur Ajoutée', formatK(latestPnL.valeurAjoutee)],
    ['EBITDA', formatK(latestPnL.ebitda)],
    ['EBITDA Margin', `${latestPnL.ebitdaMargin.toFixed(1)}%`],
    ['Résultat Net', formatK(latestPnL.resultatNet)],
  ];

  if (latestBS) {
    kpiData.push(
      ['Total Assets', formatK(latestBS.totalActif)],
      ['Net Debt', formatK(latestBS.endettementNet)]
    );
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Key Performance Indicator', `${latestPnL.fiscalYear}`]],
    body: kpiData,
    margin: { left: margin },
    tableWidth: contentWidth / 2,
    headStyles: {
      fillColor: WINCAP_BLUE_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Year over year comparison if multiple years
  if (options.pnlStatements.length >= 2) {
    const prevPnL = options.pnlStatements[options.pnlStatements.length - 2];
    const growthProd = ((latestPnL.production - prevPnL.production) / prevPnL.production * 100).toFixed(1);
    const growthEbitda = ((latestPnL.ebitda - prevPnL.ebitda) / Math.abs(prevPnL.ebitda) * 100).toFixed(1);

    const newY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Year-over-Year Growth:', margin, newY);

    doc.setFont('helvetica', 'normal');
    doc.text(`Production: ${growthProd}%`, margin + 5, newY + 7);
    doc.text(`EBITDA: ${growthEbitda}%`, margin + 5, newY + 14);
  }
}

function addPnLSection(
  doc: jsPDF,
  pnlStatements: PnLStatement[],
  margin: number,
  contentWidth: number
): void {
  let yPos = addSectionHeader(doc, 'PROFIT & LOSS STATEMENT', margin, margin);

  // Build table data
  const headers = ['Description (€k)', ...pnlStatements.map(p => p.fiscalYear)];

  const bodyRows: (string | number)[][] = [];

  if (pnlStatements.length > 0 && pnlStatements[0].lines) {
    pnlStatements[0].lines.slice(0, 20).forEach((line, index) => {
      const row: (string | number)[] = [line.label];
      pnlStatements.forEach(pnl => {
        const amount = pnl.lines[index]?.amount || 0;
        row.push(formatK(amount));
      });
      bodyRows.push(row);
    });
  }

  // Summary rows
  bodyRows.push(['', ...pnlStatements.map(() => '')]);
  bodyRows.push(['EBITDA', ...pnlStatements.map(p => formatK(p.ebitda))]);
  bodyRows.push(['EBITDA Margin (%)', ...pnlStatements.map(p => `${p.ebitdaMargin.toFixed(1)}%`)]);
  bodyRows.push(['Résultat Net', ...pnlStatements.map(p => formatK(p.resultatNet))]);

  autoTable(doc, {
    startY: yPos + 5,
    head: [headers],
    body: bodyRows,
    margin: { left: margin },
    tableWidth: contentWidth,
    headStyles: {
      fillColor: WINCAP_BLUE_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
    },
  });
}

function addBalanceSheetSection(
  doc: jsPDF,
  balanceSheets: BalanceSheet[],
  margin: number,
  contentWidth: number
): void {
  let yPos = addSectionHeader(doc, 'BALANCE SHEET', margin, margin);

  const headers = ['Description (€k)', ...balanceSheets.map(bs => bs.fiscalYear)];

  const bodyRows: (string | number)[][] = [
    ['ACTIF', ...balanceSheets.map(() => '')],
    ['Actif Immobilisé', ...balanceSheets.map(bs => formatK(bs.actifImmobilise))],
    ['Stocks', ...balanceSheets.map(bs => formatK(bs.stocks))],
    ['Clients (Net)', ...balanceSheets.map(bs => formatK(bs.clientsNet))],
    ['Trésorerie', ...balanceSheets.map(bs => formatK(bs.tresorerieActif))],
    ['TOTAL ACTIF', ...balanceSheets.map(bs => formatK(bs.totalActif))],
    ['', ...balanceSheets.map(() => '')],
    ['PASSIF', ...balanceSheets.map(() => '')],
    ['Capitaux Propres', ...balanceSheets.map(bs => formatK(bs.capitauxPropres))],
    ['Dettes Financières', ...balanceSheets.map(bs => formatK(bs.dettesFinancieres))],
    ['Fournisseurs', ...balanceSheets.map(bs => formatK(bs.fournisseurs))],
    ['TOTAL PASSIF', ...balanceSheets.map(bs => formatK(bs.totalPassif))],
    ['', ...balanceSheets.map(() => '')],
    ['INDICATEURS', ...balanceSheets.map(() => '')],
    ['BFR Opérationnel', ...balanceSheets.map(bs => formatK(bs.bfrOperationnel))],
    ['Endettement Net', ...balanceSheets.map(bs => formatK(bs.endettementNet))],
  ];

  autoTable(doc, {
    startY: yPos + 5,
    head: [headers],
    body: bodyRows,
    margin: { left: margin },
    tableWidth: contentWidth,
    headStyles: {
      fillColor: WINCAP_BLUE_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
    },
  });
}

function addCashFlowSection(
  doc: jsPDF,
  cashFlows: CashFlowStatement[],
  margin: number,
  contentWidth: number
): void {
  let yPos = addSectionHeader(doc, 'CASH FLOW STATEMENT', margin, margin);

  const headers = ['Description (€k)', ...cashFlows.map(cf => cf.fiscalYear)];

  const bodyRows: (string | number)[][] = [
    ['EXPLOITATION', ...cashFlows.map(() => '')],
    ['Capacité d\'Autofinancement', ...cashFlows.map(cf => formatK(cf.capaciteAutofinancement))],
    ['Variation BFR', ...cashFlows.map(cf => formatK(cf.variationBFR))],
    ['Flux d\'Exploitation', ...cashFlows.map(cf => formatK(cf.fluxTresorerieExploitation))],
    ['', ...cashFlows.map(() => '')],
    ['INVESTISSEMENT', ...cashFlows.map(() => '')],
    ['Flux d\'Investissement', ...cashFlows.map(cf => formatK(cf.fluxInvestissement))],
    ['', ...cashFlows.map(() => '')],
    ['FINANCEMENT', ...cashFlows.map(() => '')],
    ['Flux de Financement', ...cashFlows.map(cf => formatK(cf.fluxFinancement))],
    ['', ...cashFlows.map(() => '')],
    ['VARIATION TRÉSORERIE', ...cashFlows.map(cf => formatK(cf.variationTresorerie))],
  ];

  autoTable(doc, {
    startY: yPos + 5,
    head: [headers],
    body: bodyRows,
    margin: { left: margin },
    tableWidth: contentWidth,
    headStyles: {
      fillColor: WINCAP_BLUE_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
    },
  });
}

function addQoESection(
  doc: jsPDF,
  qoeAnalysis: QoEBridge,
  margin: number,
  contentWidth: number
): void {
  let yPos = addSectionHeader(doc, 'QUALITY OF EARNINGS (QoE)', margin, margin);

  const headers = ['Adjustment', ...qoeAnalysis.periods.map(p => p.fiscalYear)];

  const bodyRows: (string | number)[][] = [
    ['EBITDA Reporté', ...qoeAnalysis.periods.map(p => formatK(p.ebitdaReporte))],
  ];

  // Add adjustments
  for (const summary of qoeAnalysis.summary) {
    const row: (string | number)[] = [summary.label];
    for (const period of qoeAnalysis.periods) {
      const adj = period.adjustments.find(a => a.type === summary.type);
      row.push(adj ? formatK(adj.impactEBITDA) : '-');
    }
    bodyRows.push(row);
  }

  bodyRows.push(['', ...qoeAnalysis.periods.map(() => '')]);
  bodyRows.push(['EBITDA Ajusté', ...qoeAnalysis.periods.map(p => formatK(p.ebitdaAjuste))]);
  bodyRows.push(['Marge Ajustée (%)', ...qoeAnalysis.periods.map(p => `${p.margeEBITDAAjuste.toFixed(1)}%`)]);

  autoTable(doc, {
    startY: yPos + 5,
    head: [headers],
    body: bodyRows,
    margin: { left: margin },
    tableWidth: contentWidth,
    headStyles: {
      fillColor: WINCAP_GOLD_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [253, 243, 199] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
    },
  });
}

function addPageNumbers(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
}

// =============================================================================
// Helpers
// =============================================================================

function formatK(value: number): string {
  if (value === 0) return '-';
  const k = value / 1000;
  return k >= 0 ? Math.round(k).toLocaleString('fr-FR') : `(${Math.abs(Math.round(k)).toLocaleString('fr-FR')})`;
}
