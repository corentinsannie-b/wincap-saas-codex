/**
 * PPTX Generator Module
 * =====================
 * Generates PowerPoint presentations for DD reports using pptxgenjs
 */

import PptxGenJS from 'pptxgenjs';
import type {
  ReportMetadata,
  ReportSection,
  PnLStatement,
  BalanceSheet,
  CashFlowStatement,
  QoEBridge,
  OrderAnalysis,
  WorkingCapitalMetrics,
} from '../types';
import { formatCurrency, formatPercent, formatVariation } from './pdf-renderer';

// =============================================================================
// Wincap Brand Configuration
// =============================================================================

const WINCAP_COLORS = {
  gold: 'C4A35A',
  blue: '1E4D6B',
  darkBlue: '0D2D42',
  lightGray: 'F3F4F6',
  gray: '6B7280',
  white: 'FFFFFF',
  green: '22C55E',
  red: 'EF4444',
};

const FONTS = {
  title: 'Arial',
  body: 'Arial',
  mono: 'Consolas',
};

const SLIDE_MASTER = {
  title: 'WINCAP_TITLE',
  content: 'WINCAP_CONTENT',
  section: 'WINCAP_SECTION',
  twoColumn: 'WINCAP_TWO_COL',
};

// =============================================================================
// Presentation Factory
// =============================================================================

export interface PPTXGeneratorOptions {
  metadata: ReportMetadata;
  includeCommentary?: boolean;
  language?: 'fr' | 'en';
}

export function createPresentation(options: PPTXGeneratorOptions): PptxGenJS {
  const pptx = new PptxGenJS();

  // Set document properties
  pptx.author = 'Wincap Opérations';
  pptx.title = `DD Report - ${options.metadata.targetCompany}`;
  pptx.subject = 'Financial Due Diligence Report';
  pptx.company = 'Wincap';

  // Set default slide size (16:9)
  pptx.defineLayout({ name: 'WINCAP', width: 13.33, height: 7.5 });
  pptx.layout = 'WINCAP';

  // Define slide masters
  defineSlideMasters(pptx);

  return pptx;
}

function defineSlideMasters(pptx: PptxGenJS): void {
  // Title Slide Master
  pptx.defineSlideMaster({
    title: SLIDE_MASTER.title,
    background: { color: WINCAP_COLORS.blue },
    objects: [
      // Gold accent bar at bottom
      {
        rect: {
          x: 0,
          y: 6.8,
          w: 13.33,
          h: 0.7,
          fill: { color: WINCAP_COLORS.gold },
        },
      },
      // Company logo placeholder (right side)
      {
        text: {
          text: 'WINCAP',
          options: {
            x: 10.5,
            y: 0.3,
            w: 2.5,
            h: 0.5,
            color: WINCAP_COLORS.gold,
            fontSize: 18,
            fontFace: FONTS.title,
            bold: true,
            align: 'right',
          },
        },
      },
    ],
  });

  // Content Slide Master
  pptx.defineSlideMaster({
    title: SLIDE_MASTER.content,
    background: { color: WINCAP_COLORS.white },
    objects: [
      // Header bar
      {
        rect: {
          x: 0,
          y: 0,
          w: 13.33,
          h: 0.8,
          fill: { color: WINCAP_COLORS.blue },
        },
      },
      // Gold accent line
      {
        rect: {
          x: 0,
          y: 0.8,
          w: 13.33,
          h: 0.05,
          fill: { color: WINCAP_COLORS.gold },
        },
      },
      // Footer
      {
        rect: {
          x: 0,
          y: 7.2,
          w: 13.33,
          h: 0.3,
          fill: { color: WINCAP_COLORS.lightGray },
        },
      },
      // Page number placeholder
      {
        text: {
          text: 'DRAFT - Confidentiel',
          options: {
            x: 0.5,
            y: 7.25,
            w: 3,
            h: 0.2,
            color: WINCAP_COLORS.gray,
            fontSize: 8,
            fontFace: FONTS.body,
          },
        },
      },
    ],
  });

  // Section Divider Master
  pptx.defineSlideMaster({
    title: SLIDE_MASTER.section,
    background: { color: WINCAP_COLORS.darkBlue },
    objects: [
      // Gold accent bar
      {
        rect: {
          x: 0.5,
          y: 3.2,
          w: 2,
          h: 0.1,
          fill: { color: WINCAP_COLORS.gold },
        },
      },
    ],
  });
}

// =============================================================================
// Slide Generators
// =============================================================================

/**
 * Add cover slide
 */
export function addCoverSlide(pptx: PptxGenJS, metadata: ReportMetadata): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.title });

  // Main title
  slide.addText('RAPPORT DE DUE DILIGENCE FINANCIÈRE', {
    x: 0.5,
    y: 2,
    w: 12.33,
    h: 0.8,
    color: WINCAP_COLORS.white,
    fontSize: 32,
    fontFace: FONTS.title,
    bold: true,
  });

  // Company name
  slide.addText(metadata.targetCompany.toUpperCase(), {
    x: 0.5,
    y: 3,
    w: 12.33,
    h: 0.6,
    color: WINCAP_COLORS.gold,
    fontSize: 28,
    fontFace: FONTS.title,
    bold: true,
  });

  // Prepared for
  slide.addText(`Préparé pour: ${metadata.buyerCompany}`, {
    x: 0.5,
    y: 4.5,
    w: 6,
    h: 0.4,
    color: WINCAP_COLORS.white,
    fontSize: 14,
    fontFace: FONTS.body,
  });

  // Date and status
  slide.addText(
    `${metadata.date.toLocaleDateString('fr-FR')} - ${metadata.status === 'draft' ? 'PROJET' : 'FINAL'}`,
    {
      x: 0.5,
      y: 5,
      w: 6,
      h: 0.4,
      color: WINCAP_COLORS.white,
      fontSize: 14,
      fontFace: FONTS.body,
    }
  );

  // Prepared by
  slide.addText(`Par: ${metadata.preparedBy}`, {
    x: 0.5,
    y: 5.5,
    w: 6,
    h: 0.4,
    color: WINCAP_COLORS.white,
    fontSize: 12,
    fontFace: FONTS.body,
  });
}

/**
 * Add section divider slide
 */
export function addSectionSlide(
  pptx: PptxGenJS,
  sectionNumber: number,
  title: string,
  subtitle?: string
): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.section });

  // Section number
  slide.addText(sectionNumber.toString(), {
    x: 0.5,
    y: 2.5,
    w: 1.5,
    h: 0.8,
    color: WINCAP_COLORS.gold,
    fontSize: 48,
    fontFace: FONTS.title,
    bold: true,
  });

  // Title
  slide.addText(title, {
    x: 0.5,
    y: 3.5,
    w: 12,
    h: 0.8,
    color: WINCAP_COLORS.white,
    fontSize: 36,
    fontFace: FONTS.title,
    bold: true,
  });

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 4.4,
      w: 12,
      h: 0.5,
      color: WINCAP_COLORS.gold,
      fontSize: 18,
      fontFace: FONTS.body,
    });
  }
}

/**
 * Add KPI summary slide
 */
export function addKPISummarySlide(
  pptx: PptxGenJS,
  pnlStatements: PnLStatement[],
  qoeAnalysis?: QoEBridge
): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.content });

  // Title
  slide.addText('Indicateurs Clés', {
    x: 0.5,
    y: 0.15,
    w: 10,
    h: 0.5,
    color: WINCAP_COLORS.white,
    fontSize: 20,
    fontFace: FONTS.title,
    bold: true,
  });

  // KPI Boxes
  const kpis = [
    {
      label: 'Production',
      value: formatCurrency(pnlStatements[pnlStatements.length - 1]?.production || 0),
      year: pnlStatements[pnlStatements.length - 1]?.fiscalYear || '',
    },
    {
      label: 'EBITDA',
      value: formatCurrency(pnlStatements[pnlStatements.length - 1]?.ebitda || 0),
      subValue: formatPercent(pnlStatements[pnlStatements.length - 1]?.ebitdaMargin || 0),
    },
    {
      label: 'EBITDA Ajusté',
      value: formatCurrency(qoeAnalysis?.periods[qoeAnalysis.periods.length - 1]?.ebitdaAjuste || 0),
      subValue: formatPercent(qoeAnalysis?.periods[qoeAnalysis.periods.length - 1]?.margeEBITDAAjuste || 0),
    },
    {
      label: 'Résultat Net',
      value: formatCurrency(pnlStatements[pnlStatements.length - 1]?.resultatNet || 0),
    },
  ];

  const boxWidth = 2.8;
  const boxHeight = 1.2;
  const startX = 0.7;
  const startY = 1.2;
  const gap = 0.3;

  kpis.forEach((kpi, index) => {
    const x = startX + (boxWidth + gap) * index;

    // Box background
    slide.addShape('rect', {
      x,
      y: startY,
      w: boxWidth,
      h: boxHeight,
      fill: { color: WINCAP_COLORS.lightGray },
      line: { color: WINCAP_COLORS.gold, width: 2 },
    });

    // Label
    slide.addText(kpi.label, {
      x,
      y: startY + 0.1,
      w: boxWidth,
      h: 0.3,
      color: WINCAP_COLORS.gray,
      fontSize: 10,
      fontFace: FONTS.body,
      align: 'center',
    });

    // Value
    slide.addText(kpi.value, {
      x,
      y: startY + 0.4,
      w: boxWidth,
      h: 0.5,
      color: WINCAP_COLORS.blue,
      fontSize: 24,
      fontFace: FONTS.title,
      bold: true,
      align: 'center',
    });

    // Sub-value (margin)
    if (kpi.subValue) {
      slide.addText(kpi.subValue, {
        x,
        y: startY + 0.9,
        w: boxWidth,
        h: 0.25,
        color: WINCAP_COLORS.gold,
        fontSize: 12,
        fontFace: FONTS.body,
        align: 'center',
      });
    }
  });

  // Historical comparison table
  if (pnlStatements.length > 1) {
    const tableData: PptxGenJS.TableRow[] = [
      // Header row
      [
        { text: '€k', options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white } },
        ...pnlStatements.map(p => ({
          text: p.fiscalYear,
          options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white, align: 'right' as const },
        })),
      ],
      // Data rows
      [
        { text: 'Production' },
        ...pnlStatements.map(p => ({ text: formatCurrency(p.production), options: { align: 'right' as const } })),
      ],
      [
        { text: 'EBITDA' },
        ...pnlStatements.map(p => ({ text: formatCurrency(p.ebitda), options: { align: 'right' as const } })),
      ],
      [
        { text: 'Marge EBITDA' },
        ...pnlStatements.map(p => ({ text: formatPercent(p.ebitdaMargin), options: { align: 'right' as const } })),
      ],
      [
        { text: 'Résultat Net' },
        ...pnlStatements.map(p => ({ text: formatCurrency(p.resultatNet), options: { align: 'right' as const } })),
      ],
    ];

    slide.addTable(tableData, {
      x: 0.5,
      y: 3,
      w: 12.33,
      colW: [3, ...pnlStatements.map(() => (12.33 - 3) / pnlStatements.length)],
      fontFace: FONTS.body,
      fontSize: 10,
      border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.lightGray },
      rowH: 0.4,
    });
  }
}

/**
 * Add P&L table slide
 */
export function addPnLSlide(pptx: PptxGenJS, pnlStatements: PnLStatement[]): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.content });

  slide.addText('Compte de Résultat', {
    x: 0.5,
    y: 0.15,
    w: 10,
    h: 0.5,
    color: WINCAP_COLORS.white,
    fontSize: 20,
    fontFace: FONTS.title,
    bold: true,
  });

  if (pnlStatements.length === 0) return;

  const firstPnL = pnlStatements[0];

  const tableData: PptxGenJS.TableRow[] = [
    // Header
    [
      { text: '€k', options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white } },
      ...pnlStatements.map(p => ({
        text: p.fiscalYear,
        options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white, align: 'right' as const },
      })),
    ],
  ];

  // Add P&L lines
  for (let i = 0; i < firstPnL.lines.length; i++) {
    const line = firstPnL.lines[i];

    const rowStyle = line.isTotal
      ? { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue }
      : line.isSubtotal
      ? { bold: true, fill: { color: WINCAP_COLORS.lightGray } }
      : {};

    tableData.push([
      { text: line.label, options: rowStyle },
      ...pnlStatements.map(p => ({
        text: formatCurrency(p.lines[i]?.amount || 0),
        options: { ...rowStyle, align: 'right' as const },
      })),
    ]);
  }

  slide.addTable(tableData, {
    x: 0.5,
    y: 1,
    w: 12.33,
    colW: [4, ...pnlStatements.map(() => (12.33 - 4) / pnlStatements.length)],
    fontFace: FONTS.body,
    fontSize: 9,
    border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.lightGray },
    rowH: 0.28,
  });
}

/**
 * Add Balance Sheet slide
 */
export function addBalanceSheetSlide(pptx: PptxGenJS, balanceSheets: BalanceSheet[]): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.content });

  slide.addText('Bilan', {
    x: 0.5,
    y: 0.15,
    w: 10,
    h: 0.5,
    color: WINCAP_COLORS.white,
    fontSize: 20,
    fontFace: FONTS.title,
    bold: true,
  });

  // Asset table (left side)
  const assetData: PptxGenJS.TableRow[] = [
    [
      { text: 'ACTIF (€k)', options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white } },
      ...balanceSheets.map(b => ({
        text: b.fiscalYear,
        options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white, align: 'right' as const },
      })),
    ],
    [{ text: 'Actif immobilisé' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.actifImmobilise), options: { align: 'right' as const } }))],
    [{ text: 'Stocks' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.stocks), options: { align: 'right' as const } }))],
    [{ text: 'Clients' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.clientsNet), options: { align: 'right' as const } }))],
    [{ text: 'Autres créances' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.autresCreances), options: { align: 'right' as const } }))],
    [{ text: 'Trésorerie' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.tresorerieActif), options: { align: 'right' as const } }))],
    [
      { text: 'Total Actif', options: { bold: true, fill: { color: WINCAP_COLORS.lightGray } } },
      ...balanceSheets.map(b => ({
        text: formatCurrency(b.totalActif),
        options: { bold: true, fill: { color: WINCAP_COLORS.lightGray }, align: 'right' as const },
      })),
    ],
  ];

  slide.addTable(assetData, {
    x: 0.5,
    y: 1,
    w: 6,
    fontFace: FONTS.body,
    fontSize: 9,
    border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.lightGray },
    rowH: 0.35,
  });

  // Liability table (right side)
  const liabilityData: PptxGenJS.TableRow[] = [
    [
      { text: 'PASSIF (€k)', options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white } },
      ...balanceSheets.map(b => ({
        text: b.fiscalYear,
        options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white, align: 'right' as const },
      })),
    ],
    [{ text: 'Capitaux propres' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.capitauxPropres), options: { align: 'right' as const } }))],
    [{ text: 'Provisions' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.provisionsRisques), options: { align: 'right' as const } }))],
    [{ text: 'Dettes financières' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.dettesFinancieres), options: { align: 'right' as const } }))],
    [{ text: 'Fournisseurs' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.fournisseurs), options: { align: 'right' as const } }))],
    [{ text: 'Dettes fisc. & soc.' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.dettesFiscalesSociales), options: { align: 'right' as const } }))],
    [
      { text: 'Total Passif', options: { bold: true, fill: { color: WINCAP_COLORS.lightGray } } },
      ...balanceSheets.map(b => ({
        text: formatCurrency(b.totalPassif),
        options: { bold: true, fill: { color: WINCAP_COLORS.lightGray }, align: 'right' as const },
      })),
    ],
  ];

  slide.addTable(liabilityData, {
    x: 6.83,
    y: 1,
    w: 6,
    fontFace: FONTS.body,
    fontSize: 9,
    border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.lightGray },
    rowH: 0.35,
  });

  // Working capital summary
  const wcData: PptxGenJS.TableRow[] = [
    [
      { text: 'BFR & Endettement (€k)', options: { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue } },
      ...balanceSheets.map(b => ({
        text: b.fiscalYear,
        options: { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue, align: 'right' as const },
      })),
    ],
    [{ text: 'BFR Opérationnel' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.bfrOperationnel), options: { align: 'right' as const } }))],
    [{ text: 'BFR Total' }, ...balanceSheets.map(b => ({ text: formatCurrency(b.bfrTotal), options: { align: 'right' as const } }))],
    [
      { text: 'Endettement Net', options: { bold: true } },
      ...balanceSheets.map(b => ({ text: formatCurrency(b.endettementNet), options: { bold: true, align: 'right' as const } })),
    ],
  ];

  slide.addTable(wcData, {
    x: 0.5,
    y: 4.5,
    w: 12.33,
    fontFace: FONTS.body,
    fontSize: 10,
    border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.gold },
    rowH: 0.4,
  });
}

/**
 * Add QoE slide
 */
export function addQoESlide(pptx: PptxGenJS, qoeAnalysis: QoEBridge): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.content });

  slide.addText('Qualité de l\'EBITDA (QoE)', {
    x: 0.5,
    y: 0.15,
    w: 10,
    h: 0.5,
    color: WINCAP_COLORS.white,
    fontSize: 20,
    fontFace: FONTS.title,
    bold: true,
  });

  const tableData: PptxGenJS.TableRow[] = [
    // Header
    [
      { text: '€k', options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white } },
      ...qoeAnalysis.periods.map(p => ({
        text: p.fiscalYear,
        options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white, align: 'right' as const },
      })),
    ],
    // EBITDA Reporté
    [
      { text: 'EBITDA Reporté', options: { bold: true } },
      ...qoeAnalysis.periods.map(p => ({ text: formatCurrency(p.ebitdaReporte), options: { bold: true, align: 'right' as const } })),
    ],
  ];

  // Adjustments
  for (const adj of qoeAnalysis.summary) {
    tableData.push([
      { text: `  ${adj.label}` },
      ...qoeAnalysis.periods.map(p => {
        const periodAdj = p.adjustments.find(a => a.type === adj.type);
        return {
          text: periodAdj ? formatCurrency(periodAdj.impactEBITDA) : '-',
          options: { align: 'right' as const, color: periodAdj && periodAdj.impactEBITDA >= 0 ? WINCAP_COLORS.green : WINCAP_COLORS.red },
        };
      }),
    ]);
  }

  // EBITDA Ajusté
  tableData.push([
    { text: 'EBITDA Ajusté', options: { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue } },
    ...qoeAnalysis.periods.map(p => ({
      text: formatCurrency(p.ebitdaAjuste),
      options: { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue, align: 'right' as const },
    })),
  ]);

  // Marge ajustée
  tableData.push([
    { text: 'Marge EBITDA Ajustée' },
    ...qoeAnalysis.periods.map(p => ({
      text: formatPercent(p.margeEBITDAAjuste),
      options: { align: 'right' as const },
    })),
  ]);

  slide.addTable(tableData, {
    x: 0.5,
    y: 1.2,
    w: 12.33,
    fontFace: FONTS.body,
    fontSize: 10,
    border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.lightGray },
    rowH: 0.4,
  });
}

/**
 * Add Cash Flow slide
 */
export function addCashFlowSlide(pptx: PptxGenJS, cashFlows: CashFlowStatement[]): void {
  const slide = pptx.addSlide({ masterName: SLIDE_MASTER.content });

  slide.addText('Flux de Trésorerie', {
    x: 0.5,
    y: 0.15,
    w: 10,
    h: 0.5,
    color: WINCAP_COLORS.white,
    fontSize: 20,
    fontFace: FONTS.title,
    bold: true,
  });

  const tableData: PptxGenJS.TableRow[] = [
    // Header
    [
      { text: '€k', options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white } },
      ...cashFlows.map(cf => ({
        text: cf.fiscalYear,
        options: { bold: true, fill: { color: WINCAP_COLORS.blue }, color: WINCAP_COLORS.white, align: 'right' as const },
      })),
    ],
    [{ text: 'EBITDA' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.ebitda), options: { align: 'right' as const } }))],
    [{ text: 'Var. BFR Opérationnel' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.variationBFROperationnel), options: { align: 'right' as const } }))],
    [{ text: 'Var. BFR Non-opérationnel' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.variationBFRNonOperationnel), options: { align: 'right' as const } }))],
    [
      { text: 'Flux d\'exploitation', options: { bold: true, fill: { color: WINCAP_COLORS.lightGray } } },
      ...cashFlows.map(cf => ({ text: formatCurrency(cf.fluxExploitation), options: { bold: true, fill: { color: WINCAP_COLORS.lightGray }, align: 'right' as const } })),
    ],
    [{ text: 'CAPEX' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.capex), options: { align: 'right' as const } }))],
    [{ text: 'Cessions' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.cessions), options: { align: 'right' as const } }))],
    [
      { text: 'FCF avant IS', options: { bold: true, fill: { color: WINCAP_COLORS.lightGray } } },
      ...cashFlows.map(cf => ({ text: formatCurrency(cf.fcfAvantIS), options: { bold: true, fill: { color: WINCAP_COLORS.lightGray }, align: 'right' as const } })),
    ],
    [{ text: 'Impôt sur les sociétés' }, ...cashFlows.map(cf => ({ text: formatCurrency(-cf.impotSocietes), options: { align: 'right' as const } }))],
    [
      { text: 'FCF après IS', options: { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue } },
      ...cashFlows.map(cf => ({ text: formatCurrency(cf.fcfApresIS), options: { bold: true, fill: { color: WINCAP_COLORS.gold }, color: WINCAP_COLORS.blue, align: 'right' as const } })),
    ],
    [{ text: 'Dividendes' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.dividendes), options: { align: 'right' as const } }))],
    [{ text: 'Var. dettes financières' }, ...cashFlows.map(cf => ({ text: formatCurrency(cf.variationDettesFinancieres), options: { align: 'right' as const } }))],
    [
      { text: 'Variation de trésorerie', options: { bold: true } },
      ...cashFlows.map(cf => ({ text: formatCurrency(cf.variationTresorerie), options: { bold: true, align: 'right' as const } })),
    ],
  ];

  slide.addTable(tableData, {
    x: 0.5,
    y: 1,
    w: 12.33,
    fontFace: FONTS.body,
    fontSize: 9,
    border: { type: 'solid', pt: 0.5, color: WINCAP_COLORS.lightGray },
    rowH: 0.35,
  });
}

// =============================================================================
// Full Report Generation
// =============================================================================

export interface ReportGenerationInput {
  metadata: ReportMetadata;
  pnlStatements: PnLStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlowStatement[];
  qoeAnalysis?: QoEBridge;
  orderAnalysis?: OrderAnalysis;
  sections?: ReportSection[];
}

/**
 * Generate complete DD report presentation
 */
export async function generateDDReport(input: ReportGenerationInput): Promise<Blob> {
  const pptx = createPresentation({ metadata: input.metadata });

  // Cover slide
  addCoverSlide(pptx, input.metadata);

  // Table of contents could go here

  // Section 1: Executive Summary
  addSectionSlide(pptx, 1, 'Synthèse', 'Executive Summary');
  addKPISummarySlide(pptx, input.pnlStatements, input.qoeAnalysis);

  // Section 2: Historical Performance
  addSectionSlide(pptx, 2, 'Performance Historique', 'Historical Performance');
  addPnLSlide(pptx, input.pnlStatements);

  // Section 3: QoE Analysis
  if (input.qoeAnalysis) {
    addSectionSlide(pptx, 3, 'Qualité de l\'EBITDA', 'Quality of Earnings');
    addQoESlide(pptx, input.qoeAnalysis);
  }

  // Section 4: Balance Sheet
  addSectionSlide(pptx, 4, 'Bilan', 'Balance Sheet');
  addBalanceSheetSlide(pptx, input.balanceSheets);

  // Section 5: Cash Flow
  if (input.cashFlows.length > 0) {
    addSectionSlide(pptx, 5, 'Flux de Trésorerie', 'Cash Flow Analysis');
    addCashFlowSlide(pptx, input.cashFlows);
  }

  // Generate the file
  const blob = await pptx.write({ outputType: 'blob' });
  return blob as Blob;
}

/**
 * Download the generated report
 */
export async function downloadDDReport(input: ReportGenerationInput, filename?: string): Promise<void> {
  const blob = await generateDDReport(input);
  const defaultFilename = `DD_Report_${input.metadata.targetCompany.replace(/\s+/g, '_')}_${input.metadata.date.toISOString().split('T')[0]}.pptx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
