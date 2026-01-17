/**
 * Cash Flow Generator Module
 * ==========================
 * Generates cash flow statements from P&L and Balance Sheet data
 * Uses indirect method (starting from EBITDA)
 */

import type {
  CashFlowLine,
  CashFlowStatement,
  MonthlyCashFlow,
  PnLStatement,
  BalanceSheet,
  FECEntry,
} from '../types';
import { generatePnLStatement } from './pnl-engine';
import { generateBalanceSheet } from './balance-sheet-engine';

// =============================================================================
// Cash Flow Structure Definition
// =============================================================================

interface CFLineDefinition {
  code: string;
  label: string;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

const CF_STRUCTURE: CFLineDefinition[] = [
  // Flux d'exploitation
  { code: 'EBITDA', label: 'EBITDA' },
  { code: 'VAR_STOCKS', label: 'Variation des stocks', indent: 1 },
  { code: 'VAR_CLIENTS', label: 'Variation clients et comptes rattachés', indent: 1 },
  { code: 'VAR_FAE', label: 'Variation FAE et avances fournisseurs', indent: 1 },
  { code: 'VAR_FRS', label: 'Variation fournisseurs et comptes rattachés', indent: 1 },
  { code: 'VAR_BFR_OP', label: 'Variation du BFR opérationnel', isSubtotal: true },
  { code: 'VAR_AUTRES_CR', label: 'Variation autres créances', indent: 1 },
  { code: 'VAR_DETTES_FS', label: 'Variation dettes fiscales et sociales', indent: 1 },
  { code: 'VAR_AUTRES_DETTES', label: 'Variation autres dettes', indent: 1 },
  { code: 'VAR_BFR_NON_OP', label: 'Variation du BFR non opérationnel', isSubtotal: true },
  { code: 'FLUX_EXPL', label: 'Flux de trésorerie d\'exploitation', isSubtotal: true },

  // Flux d'investissement
  { code: 'CAPEX', label: 'Investissements (CAPEX)', indent: 1 },
  { code: 'CESSIONS', label: 'Cessions d\'actifs', indent: 1 },
  { code: 'VAR_IMMO_FIN', label: 'Variation immobilisations financières', indent: 1 },
  { code: 'FLUX_INVEST', label: 'Flux de trésorerie d\'investissement', isSubtotal: true },

  // FCF
  { code: 'FCF_AVANT_IS', label: 'FCF avant impôt', isSubtotal: true },
  { code: 'IS_PAYE', label: 'Impôt sur les sociétés payé', indent: 1 },
  { code: 'FCF_APRES_IS', label: 'FCF après impôt', isSubtotal: true },

  // Flux de financement
  { code: 'DIVIDENDES', label: 'Dividendes versés', indent: 1 },
  { code: 'VAR_EMPRUNTS', label: 'Variation emprunts', indent: 1 },
  { code: 'VAR_CC', label: 'Variation comptes courants associés', indent: 1 },
  { code: 'FLUX_FIN', label: 'Flux de trésorerie de financement', isSubtotal: true },

  // Variation de trésorerie
  { code: 'VAR_TRESO', label: 'Variation de trésorerie', isSubtotal: true },
  { code: 'TRESO_OUVERTURE', label: 'Trésorerie d\'ouverture' },
  { code: 'TRESO_CLOTURE', label: 'Trésorerie de clôture', isTotal: true },
];

// =============================================================================
// Cash Flow Engine Functions
// =============================================================================

/**
 * Generate cash flow statement from two balance sheets and P&L
 */
export function generateCashFlowStatement(
  pnl: PnLStatement,
  openingBS: BalanceSheet,
  closingBS: BalanceSheet,
  currency: string = 'EUR'
): CashFlowStatement {
  const amounts = new Map<string, number>();

  // EBITDA from P&L
  amounts.set('EBITDA', pnl.ebitda);

  // BFR Opérationnel variations
  const varStocks = -(closingBS.stocks - openingBS.stocks);
  const varClients = -(closingBS.clientsNet - openingBS.clientsNet);
  const varFournisseurs = closingBS.fournisseurs - openingBS.fournisseurs;

  // FAE calculation (actif - passif position)
  const openingFAE = getFAEPosition(openingBS);
  const closingFAE = getFAEPosition(closingBS);
  const varFAE = -(closingFAE - openingFAE);

  amounts.set('VAR_STOCKS', varStocks);
  amounts.set('VAR_CLIENTS', varClients);
  amounts.set('VAR_FAE', varFAE);
  amounts.set('VAR_FRS', varFournisseurs);

  const varBFROp = varStocks + varClients + varFAE + varFournisseurs;
  amounts.set('VAR_BFR_OP', varBFROp);

  // BFR Non-opérationnel variations
  const varAutresCreances = -(closingBS.autresCreances - openingBS.autresCreances);
  const varDettesFiscalesSociales = closingBS.dettesFiscalesSociales - openingBS.dettesFiscalesSociales;
  const varAutresDettes = closingBS.autresDettes - openingBS.autresDettes;

  amounts.set('VAR_AUTRES_CR', varAutresCreances);
  amounts.set('VAR_DETTES_FS', varDettesFiscalesSociales);
  amounts.set('VAR_AUTRES_DETTES', varAutresDettes);

  const varBFRNonOp = varAutresCreances + varDettesFiscalesSociales + varAutresDettes;
  amounts.set('VAR_BFR_NON_OP', varBFRNonOp);

  // Flux d'exploitation
  const fluxExpl = pnl.ebitda + varBFROp + varBFRNonOp;
  amounts.set('FLUX_EXPL', fluxExpl);

  // Flux d'investissement
  // CAPEX = variation des immobilisations brutes (approximation)
  const openingImmoGross = getGrossFixedAssets(openingBS);
  const closingImmoGross = getGrossFixedAssets(closingBS);
  const capex = -(closingImmoGross - openingImmoGross);

  // Cessions: approximated from exceptional income
  const cessions = 0; // Would need detail from compte 775

  // Variation immo financières
  const varImmoFin = -(
    (closingBS.lines.find(l => l.section === 'immobilisations_financieres')?.net || 0) -
    (openingBS.lines.find(l => l.section === 'immobilisations_financieres')?.net || 0)
  );

  amounts.set('CAPEX', capex);
  amounts.set('CESSIONS', cessions);
  amounts.set('VAR_IMMO_FIN', varImmoFin);

  const fluxInvest = capex + cessions + varImmoFin;
  amounts.set('FLUX_INVEST', fluxInvest);

  // FCF avant IS
  const fcfAvantIS = fluxExpl + fluxInvest;
  amounts.set('FCF_AVANT_IS', fcfAvantIS);

  // IS payé (approximation: IS du P&L + variation dette/créance IS)
  const isPnL = pnl.lines.find(l => l.section === 'impot_societes')?.amount || 0;
  amounts.set('IS_PAYE', -Math.abs(isPnL));

  // FCF après IS
  const fcfApresIS = fcfAvantIS - Math.abs(isPnL);
  amounts.set('FCF_APRES_IS', fcfApresIS);

  // Flux de financement
  // Dividendes: approximation from variation des réserves vs résultat N-1
  const dividendes = estimateDividends(openingBS, closingBS);
  amounts.set('DIVIDENDES', dividendes);

  // Variation emprunts
  const varEmprunts =
    (closingBS.lines.find(l => l.section === 'emprunts_etablissements')?.net || 0) -
    (openingBS.lines.find(l => l.section === 'emprunts_etablissements')?.net || 0);
  amounts.set('VAR_EMPRUNTS', varEmprunts);

  // Variation C/C associés
  const varCC =
    (closingBS.lines.find(l => l.section === 'emprunts_associes')?.net || 0) -
    (openingBS.lines.find(l => l.section === 'emprunts_associes')?.net || 0);
  amounts.set('VAR_CC', varCC);

  const fluxFin = dividendes + varEmprunts + varCC;
  amounts.set('FLUX_FIN', fluxFin);

  // Variation de trésorerie
  const varTreso = fcfApresIS + fluxFin;
  amounts.set('VAR_TRESO', varTreso);

  // Trésorerie ouverture/clôture
  const tresoOuverture = openingBS.tresorerieActif - openingBS.tresoreriePassif;
  const tresoCloture = closingBS.tresorerieActif - closingBS.tresoreriePassif;
  amounts.set('TRESO_OUVERTURE', tresoOuverture);
  amounts.set('TRESO_CLOTURE', tresoCloture);

  // Build cash flow lines
  const lines: CashFlowLine[] = CF_STRUCTURE.map(def => ({
    code: def.code,
    label: def.label,
    amount: amounts.get(def.code) || 0,
    isSubtotal: def.isSubtotal,
    isTotal: def.isTotal,
    indent: def.indent,
  }));

  return {
    fiscalYear: pnl.fiscalYear,
    startDate: pnl.startDate,
    endDate: pnl.endDate,
    currency,
    lines,
    ebitda: pnl.ebitda,
    variationBFROperationnel: varBFROp,
    variationBFRNonOperationnel: varBFRNonOp,
    fluxExploitation: fluxExpl,
    capex,
    cessions,
    fluxInvestissement: fluxInvest,
    fcfAvantIS,
    impotSocietes: Math.abs(isPnL),
    fcfApresIS,
    dividendes,
    variationDettesFinancieres: varEmprunts + varCC,
    fluxFinancement: fluxFin,
    variationTresorerie: varTreso,
    tresorerieOuverture: tresoOuverture,
    tresorerieCloture: tresoCloture,
  };
}

/**
 * Generate monthly cash flow reconstruction
 */
export function generateMonthlyCashFlow(
  entries: FECEntry[],
  fiscalYear: string,
  startDate: Date,
  endDate: Date
): MonthlyCashFlow[] {
  const result: MonthlyCashFlow[] = [];

  // Generate monthly data
  let currentDate = new Date(startDate);
  let previousBS: BalanceSheet | null = null;

  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Filter entries for this month for P&L
    const monthEntries = entries.filter(e =>
      e.EcritureDate >= monthStart && e.EcritureDate <= monthEnd
    );

    // Generate month P&L
    const monthPnL = generatePnLStatement(
      monthEntries,
      `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      monthStart,
      monthEnd
    );

    // Generate month-end balance sheet
    const monthBS = generateBalanceSheet(
      entries.filter(e => e.EcritureDate <= monthEnd),
      monthEnd,
      fiscalYear
    );

    // Calculate month cash flow
    const treso = monthBS.tresorerieActif - monthBS.tresoreriePassif;

    let varBFR = 0;
    if (previousBS) {
      varBFR = -(monthBS.bfrTotal - previousBS.bfrTotal);
    }

    const fcf = monthPnL.ebitda + varBFR;

    result.push({
      month: monthStart,
      ebitda: monthPnL.ebitda,
      variationBFR: varBFR,
      fcf,
      tresorerieFinMois: treso,
    });

    previousBS = monthBS;
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  return result;
}

/**
 * Calculate cash conversion metrics
 */
export function calculateCashConversion(
  cashFlows: CashFlowStatement[]
): {
  year: string;
  ebitda: number;
  fcf: number;
  conversionRate: number;
}[] {
  return cashFlows.map(cf => ({
    year: cf.fiscalYear,
    ebitda: cf.ebitda,
    fcf: cf.fcfApresIS,
    conversionRate: cf.ebitda !== 0 ? (cf.fcfApresIS / cf.ebitda) * 100 : 0,
  }));
}

// =============================================================================
// Helper Functions
// =============================================================================

function getFAEPosition(bs: BalanceSheet): number {
  // FAE is typically tracked in fae_avances on the asset side
  const faeLine = bs.lines.find(l => l.section === 'fae_avances');
  return faeLine?.net || 0;
}

function getGrossFixedAssets(bs: BalanceSheet): number {
  let gross = 0;

  // Get gross from lines that have gross/amort structure
  for (const line of bs.lines) {
    if (line.gross !== undefined &&
        (line.section.includes('immobilisations_incorporelles') ||
         line.section.includes('immobilisations_corporelles'))) {
      gross += line.gross;
    }
  }

  // If no gross available, use net + amort
  if (gross === 0) {
    gross = bs.actifImmobilise;
  }

  return gross;
}

function estimateDividends(openingBS: BalanceSheet, closingBS: BalanceSheet): number {
  // Dividends = Résultat N-1 - (variation des réserves + RAN)
  // This is an approximation

  const openingReserves = (openingBS.lines.find(l => l.section === 'reserves')?.net || 0) +
    (openingBS.lines.find(l => l.section === 'report_nouveau')?.net || 0);
  const closingReserves = (closingBS.lines.find(l => l.section === 'reserves')?.net || 0) +
    (closingBS.lines.find(l => l.section === 'report_nouveau')?.net || 0);

  const openingResult = openingBS.lines.find(l => l.section === 'resultat_exercice')?.net || 0;

  // If reserves increased less than previous result, difference might be dividends
  const reserveIncrease = closingReserves - openingReserves;
  const potentialDividends = openingResult - reserveIncrease;

  return potentialDividends > 0 ? -potentialDividends : 0;
}

// =============================================================================
// QoD (Quality of Debt) Analysis
// =============================================================================

export interface QoDAnalysisResult {
  date: Date;
  grossCash: number;
  cashAdjustments: { label: string; amount: number }[];
  adjustedCash: number;
  grossDebt: number;
  debtAdjustments: { label: string; amount: number }[];
  adjustedDebt: number;
  netCashDebt: number;
  adjustedNetCashDebt: number;
}

export function calculateQoD(
  bs: BalanceSheet,
  cashAdjustments: { label: string; amount: number }[] = [],
  debtAdjustments: { label: string; amount: number }[] = []
): QoDAnalysisResult {
  // Gross cash = trésorerie active
  const grossCash = bs.tresorerieActif;

  // Adjusted cash
  const totalCashAdj = cashAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
  const adjustedCash = grossCash + totalCashAdj;

  // Gross debt = emprunts + découverts
  const grossDebt = bs.dettesFinancieres + bs.tresoreriePassif;

  // Adjusted debt
  const totalDebtAdj = debtAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
  const adjustedDebt = grossDebt + totalDebtAdj;

  // Net positions
  const netCashDebt = grossCash - grossDebt;
  const adjustedNetCashDebt = adjustedCash - adjustedDebt;

  return {
    date: bs.date,
    grossCash,
    cashAdjustments,
    adjustedCash,
    grossDebt,
    debtAdjustments,
    adjustedDebt,
    netCashDebt,
    adjustedNetCashDebt,
  };
}

/**
 * Calculate average net cash position over a period
 */
export function calculateAverageNetCash(
  entries: FECEntry[],
  startDate: Date,
  endDate: Date
): { monthlyPositions: { month: Date; netCash: number }[]; average: number } {
  const monthlyPositions: { month: Date; netCash: number }[] = [];

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const bs = generateBalanceSheet(
      entries.filter(e => e.EcritureDate <= monthEnd),
      monthEnd,
      ''
    );

    const netCash = bs.tresorerieActif - bs.tresoreriePassif - bs.dettesFinancieres;

    monthlyPositions.push({
      month: new Date(currentDate),
      netCash,
    });

    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  const average = monthlyPositions.length > 0
    ? monthlyPositions.reduce((sum, p) => sum + p.netCash, 0) / monthlyPositions.length
    : 0;

  return { monthlyPositions, average };
}
