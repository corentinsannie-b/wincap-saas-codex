/**
 * P&L Engine Module
 * =================
 * Generates P&L statements from FEC entries
 * Uses production-based presentation (French standard for service/trade companies)
 */

import type {
  FECEntry,
  PnLLine,
  PnLStatement,
  PnLSection,
  PnLComparison,
  PnLVariation,
} from '../types';
import {
  netBalanceByPrefix,
  sumDebitsByPrefix,
  sumCreditsByPrefix,
} from '../parsers/fec-parser';

// =============================================================================
// P&L Structure Definition
// =============================================================================

interface PnLSectionDefinition {
  code: string;
  label: string;
  section: PnLSection;
  accountPrefixes: string[];
  isCredit: boolean; // True if credits increase the value (revenue), false if debits increase (expense)
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  calculatedFrom?: PnLSection[]; // For calculated lines
}

const PNL_STRUCTURE: PnLSectionDefinition[] = [
  // Chiffre d'affaires
  { code: 'CA', label: 'Chiffre d\'affaires', section: 'chiffre_affaires', accountPrefixes: ['70', '72', '74'], isCredit: true },

  // Variation en-cours (production stockée)
  { code: 'VAR_EC', label: 'Variation de stocks et en-cours', section: 'variation_encours', accountPrefixes: ['71'], isCredit: true },

  // Production = CA + Variation en-cours
  { code: 'PROD', label: 'Production', section: 'production', accountPrefixes: [], isCredit: true, isSubtotal: true, calculatedFrom: ['chiffre_affaires', 'variation_encours'] },

  // Achats consommés
  { code: 'ACH', label: 'Achats consommés (marchandises, matières)', section: 'achats_consommes', accountPrefixes: ['60'], isCredit: false },

  // Sous-traitance
  { code: 'ST', label: 'Sous-traitance', section: 'sous_traitance', accountPrefixes: ['611'], isCredit: false, indent: 1 },

  // Marge sur coûts directs
  { code: 'MCD', label: 'Marge sur coûts directs', section: 'marge_couts_directs', accountPrefixes: [], isCredit: true, isSubtotal: true },

  // Autres achats et charges externes
  { code: 'AACE', label: 'Autres achats et charges externes', section: 'autres_achats', accountPrefixes: ['61', '62'], isCredit: false },

  // Impôts et taxes
  { code: 'IT', label: 'Impôts et taxes', section: 'impots_taxes', accountPrefixes: ['63'], isCredit: false },

  // Charges de personnel
  { code: 'PERS', label: 'Charges de personnel', section: 'charges_personnel', accountPrefixes: ['64'], isCredit: false },

  // Autres charges de gestion courante
  { code: 'ACGC', label: 'Autres charges / produits de gestion', section: 'autres_charges_gestion', accountPrefixes: ['65', '75'], isCredit: false },

  // EBITDA
  { code: 'EBITDA', label: 'EBITDA', section: 'ebitda', accountPrefixes: [], isCredit: true, isSubtotal: true },

  // Dotations aux amortissements et provisions
  { code: 'DAP', label: 'Dotations aux amortissements et provisions', section: 'dotations_amortissements', accountPrefixes: ['68', '78'], isCredit: false },

  // Résultat d'exploitation
  { code: 'REX', label: 'Résultat d\'exploitation', section: 'resultat_exploitation', accountPrefixes: [], isCredit: true, isSubtotal: true },

  // Produits financiers
  { code: 'PF', label: 'Produits financiers', section: 'produits_financiers', accountPrefixes: ['76'], isCredit: true, indent: 1 },

  // Charges financières
  { code: 'CF', label: 'Charges financières', section: 'charges_financieres', accountPrefixes: ['66'], isCredit: false, indent: 1 },

  // Résultat financier
  { code: 'RFIN', label: 'Résultat financier', section: 'resultat_financier', accountPrefixes: [], isCredit: true, isSubtotal: true },

  // Résultat courant
  { code: 'RCAI', label: 'Résultat courant avant impôts', section: 'resultat_courant', accountPrefixes: [], isCredit: true, isSubtotal: true },

  // Produits exceptionnels
  { code: 'PEXC', label: 'Produits exceptionnels', section: 'produits_exceptionnels', accountPrefixes: ['77'], isCredit: true, indent: 1 },

  // Charges exceptionnelles
  { code: 'CEXC', label: 'Charges exceptionnelles', section: 'charges_exceptionnelles', accountPrefixes: ['67'], isCredit: false, indent: 1 },

  // Résultat exceptionnel
  { code: 'REXC', label: 'Résultat exceptionnel', section: 'resultat_exceptionnel', accountPrefixes: [], isCredit: true, isSubtotal: true },

  // Participation des salariés
  { code: 'PART', label: 'Participation des salariés', section: 'participation_salaries', accountPrefixes: ['691'], isCredit: false, indent: 1 },

  // Impôt sur les sociétés
  { code: 'IS', label: 'Impôt sur les sociétés', section: 'impot_societes', accountPrefixes: ['695', '696', '697', '698', '699'], isCredit: false, indent: 1 },

  // Résultat net
  { code: 'RN', label: 'Résultat net', section: 'resultat_net', accountPrefixes: [], isCredit: true, isTotal: true },
];

// =============================================================================
// P&L Engine Functions
// =============================================================================

/**
 * Generate P&L statement from FEC entries
 */
export function generatePnLStatement(
  entries: FECEntry[],
  fiscalYear: string,
  startDate: Date,
  endDate: Date,
  currency: string = 'EUR'
): PnLStatement {
  // Calculate raw amounts for each account prefix
  const amounts = new Map<PnLSection, number>();

  // First pass: calculate direct amounts
  for (const def of PNL_STRUCTURE) {
    if (def.calculatedFrom || def.accountPrefixes.length === 0) continue;

    let amount = 0;

    // Handle special case for "autres achats" to exclude sous-traitance
    if (def.section === 'autres_achats') {
      // Get all 61x and 62x, but exclude 611 (sous-traitance)
      const entries61 = sumCreditsByPrefix(entries, '61') - sumDebitsByPrefix(entries, '61');
      const entries611 = sumCreditsByPrefix(entries, '611') - sumDebitsByPrefix(entries, '611');
      const entries62 = sumCreditsByPrefix(entries, '62') - sumDebitsByPrefix(entries, '62');
      amount = -(entries61 - entries611 + entries62);
    }
    // Handle D&A with reprises (net of 68 and 78)
    else if (def.section === 'dotations_amortissements') {
      const dot68 = sumDebitsByPrefix(entries, '68') - sumCreditsByPrefix(entries, '68');
      const rep78 = sumCreditsByPrefix(entries, '78') - sumDebitsByPrefix(entries, '78');
      amount = dot68 - rep78;
    }
    // Handle autres charges (65 charges - 75 produits)
    else if (def.section === 'autres_charges_gestion') {
      const charges65 = sumDebitsByPrefix(entries, '65') - sumCreditsByPrefix(entries, '65');
      const produits75 = sumCreditsByPrefix(entries, '75') - sumDebitsByPrefix(entries, '75');
      amount = charges65 - produits75;
    }
    else {
      for (const prefix of def.accountPrefixes) {
        if (def.isCredit) {
          // Revenue: credits - debits
          amount += sumCreditsByPrefix(entries, prefix) - sumDebitsByPrefix(entries, prefix);
        } else {
          // Expense: debits - credits (shown as positive expense)
          amount += sumDebitsByPrefix(entries, prefix) - sumCreditsByPrefix(entries, prefix);
        }
      }
    }

    amounts.set(def.section, amount);
  }

  // Second pass: calculate derived amounts
  // Production = CA + Variation en-cours
  const ca = amounts.get('chiffre_affaires') || 0;
  const varEC = amounts.get('variation_encours') || 0;
  const production = ca + varEC;
  amounts.set('production', production);

  // Marge sur coûts directs = Production - Achats consommés - Sous-traitance
  const achats = amounts.get('achats_consommes') || 0;
  const sousTrait = amounts.get('sous_traitance') || 0;
  const mcd = production - achats - sousTrait;
  amounts.set('marge_couts_directs', mcd);

  // EBITDA = MCD - Autres achats - Impôts - Personnel - Autres charges
  const autresAchats = amounts.get('autres_achats') || 0;
  const impots = amounts.get('impots_taxes') || 0;
  const personnel = amounts.get('charges_personnel') || 0;
  const autresCharges = amounts.get('autres_charges_gestion') || 0;
  const ebitda = mcd - autresAchats - impots - personnel - autresCharges;
  amounts.set('ebitda', ebitda);

  // Résultat d'exploitation = EBITDA - D&A
  const dap = amounts.get('dotations_amortissements') || 0;
  const rex = ebitda - dap;
  amounts.set('resultat_exploitation', rex);

  // Résultat financier = Produits financiers - Charges financières
  const pf = amounts.get('produits_financiers') || 0;
  const cf = amounts.get('charges_financieres') || 0;
  const rfin = pf - cf;
  amounts.set('resultat_financier', rfin);

  // Résultat courant = REX + RFIN
  const rcai = rex + rfin;
  amounts.set('resultat_courant', rcai);

  // Résultat exceptionnel = Produits exceptionnels - Charges exceptionnelles
  const pexc = amounts.get('produits_exceptionnels') || 0;
  const cexc = amounts.get('charges_exceptionnelles') || 0;
  const rexc = pexc - cexc;
  amounts.set('resultat_exceptionnel', rexc);

  // Résultat net = RCAI + REXC - Participation - IS
  const part = amounts.get('participation_salaries') || 0;
  const is = amounts.get('impot_societes') || 0;
  const rn = rcai + rexc - part - is;
  amounts.set('resultat_net', rn);

  // Build P&L lines
  const lines: PnLLine[] = PNL_STRUCTURE.map(def => {
    const amount = amounts.get(def.section) || 0;
    const marginPercent = production !== 0 ? (amount / production) * 100 : undefined;

    return {
      code: def.code,
      label: def.label,
      section: def.section,
      amount: def.isCredit ? amount : -amount, // Expenses shown as negative in P&L
      marginPercent: def.isSubtotal || def.isTotal ? marginPercent : undefined,
      isSubtotal: def.isSubtotal,
      isTotal: def.isTotal,
      indent: def.indent,
    };
  });

  // Correct sign convention: show all as positive for display (standard P&L format)
  for (const line of lines) {
    if (!line.isSubtotal && !line.isTotal) {
      line.amount = Math.abs(line.amount);
    }
  }

  // Re-sign subtotals correctly
  const signedLines = applyCorrectSigns(lines, amounts);

  return {
    fiscalYear,
    startDate,
    endDate,
    currency,
    lines: signedLines,
    chiffreAffaires: ca,
    production,
    margeCoutsDirects: mcd,
    ebitda,
    ebitdaMargin: production !== 0 ? (ebitda / production) * 100 : 0,
    resultatExploitation: rex,
    resultatNet: rn,
  };
}

function applyCorrectSigns(lines: PnLLine[], amounts: Map<PnLSection, number>): PnLLine[] {
  return lines.map(line => {
    const rawAmount = amounts.get(line.section) || 0;

    // For display: revenues positive, expenses negative, subtotals keep their sign
    if (line.isSubtotal || line.isTotal) {
      return { ...line, amount: rawAmount };
    }

    // Expenses (debit-normal) shown as positive but with negative semantic
    const isExpense = ['achats_consommes', 'sous_traitance', 'autres_achats', 'impots_taxes',
      'charges_personnel', 'autres_charges_gestion', 'dotations_amortissements',
      'charges_financieres', 'charges_exceptionnelles', 'participation_salaries',
      'impot_societes'].includes(line.section);

    return {
      ...line,
      amount: isExpense ? rawAmount : rawAmount, // Keep raw values, formatting handles display
    };
  });
}

/**
 * Generate monthly P&L aggregation
 */
export function generateMonthlyPnL(
  entries: FECEntry[],
  fiscalYear: string
): { month: Date; production: number; ebitda: number; margin: number }[] {
  // Group entries by month
  const monthlyEntries = new Map<string, FECEntry[]>();

  for (const entry of entries) {
    const monthKey = `${entry.EcritureDate.getFullYear()}-${String(entry.EcritureDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyEntries.get(monthKey) || [];
    existing.push(entry);
    monthlyEntries.set(monthKey, existing);
  }

  // Calculate P&L for each month
  const result: { month: Date; production: number; ebitda: number; margin: number }[] = [];

  for (const [monthKey, monthEntries] of Array.from(monthlyEntries.entries()).sort()) {
    const [year, month] = monthKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const pnl = generatePnLStatement(monthEntries, fiscalYear, startDate, endDate);

    result.push({
      month: startDate,
      production: pnl.production,
      ebitda: pnl.ebitda,
      margin: pnl.ebitdaMargin,
    });
  }

  return result;
}

/**
 * Compare P&L statements across periods
 */
export function comparePnLStatements(statements: PnLStatement[]): PnLComparison {
  if (statements.length < 2) {
    return { periods: statements, variations: [] };
  }

  const variations: PnLVariation[] = [];

  // For each P&L section, calculate variation
  for (const def of PNL_STRUCTURE) {
    const amounts = statements.map(s => {
      const line = s.lines.find(l => l.section === def.section);
      return line?.amount || 0;
    });

    // Calculate variation between last and second-to-last period
    const current = amounts[amounts.length - 1];
    const previous = amounts[amounts.length - 2];
    const absoluteVariation = current - previous;
    const percentVariation = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;

    variations.push({
      section: def.section,
      label: def.label,
      amounts,
      absoluteVariation,
      percentVariation,
    });
  }

  return { periods: statements, variations };
}

/**
 * Calculate LTM (Last Twelve Months) P&L
 */
export function calculateLTMPnL(
  entries: FECEntry[],
  asOfDate: Date
): PnLStatement {
  // Filter entries for the last 12 months
  const startDate = new Date(asOfDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(startDate.getDate() + 1);

  const ltmEntries = entries.filter(e =>
    e.EcritureDate >= startDate && e.EcritureDate <= asOfDate
  );

  return generatePnLStatement(
    ltmEntries,
    `LTM ${asOfDate.toISOString().substring(0, 7)}`,
    startDate,
    asOfDate
  );
}

/**
 * Get detailed breakdown for a P&L section
 */
export function getPnLSectionDetail(
  entries: FECEntry[],
  section: PnLSection
): { account: string; label: string; amount: number }[] {
  const def = PNL_STRUCTURE.find(d => d.section === section);
  if (!def || def.accountPrefixes.length === 0) return [];

  // Group by account
  const accountTotals = new Map<string, { label: string; amount: number }>();

  for (const entry of entries) {
    const matchesPrefix = def.accountPrefixes.some(p => entry.CompteNum.startsWith(p));
    if (!matchesPrefix) continue;

    const existing = accountTotals.get(entry.CompteNum);
    const amount = def.isCredit
      ? entry.Credit - entry.Debit
      : entry.Debit - entry.Credit;

    if (existing) {
      existing.amount += amount;
    } else {
      accountTotals.set(entry.CompteNum, {
        label: entry.CompteLib,
        amount,
      });
    }
  }

  return Array.from(accountTotals.entries())
    .map(([account, data]) => ({
      account,
      label: data.label,
      amount: data.amount,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

// =============================================================================
// Export P&L Data for Charts
// =============================================================================

export interface EBITDABridgeItem {
  label: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'subtotal' | 'end';
}

/**
 * Generate EBITDA bridge data for waterfall chart
 */
export function generateEBITDABridge(
  current: PnLStatement,
  previous: PnLStatement
): EBITDABridgeItem[] {
  const bridge: EBITDABridgeItem[] = [];

  // Start with previous EBITDA
  bridge.push({
    label: `EBITDA ${previous.fiscalYear}`,
    value: previous.ebitda,
    type: 'start',
  });

  // Production variation
  const prodVar = current.production - previous.production;
  if (Math.abs(prodVar) > 0.01) {
    bridge.push({
      label: 'Δ Production',
      value: prodVar,
      type: prodVar >= 0 ? 'positive' : 'negative',
    });
  }

  // Achats variation (inverted - increase in costs is negative)
  const prevAchats = previous.lines.find(l => l.section === 'achats_consommes')?.amount || 0;
  const currAchats = current.lines.find(l => l.section === 'achats_consommes')?.amount || 0;
  const achatsVar = -(currAchats - prevAchats);
  if (Math.abs(achatsVar) > 0.01) {
    bridge.push({
      label: 'Δ Achats',
      value: achatsVar,
      type: achatsVar >= 0 ? 'positive' : 'negative',
    });
  }

  // Personnel variation
  const prevPers = previous.lines.find(l => l.section === 'charges_personnel')?.amount || 0;
  const currPers = current.lines.find(l => l.section === 'charges_personnel')?.amount || 0;
  const persVar = -(currPers - prevPers);
  if (Math.abs(persVar) > 0.01) {
    bridge.push({
      label: 'Δ Personnel',
      value: persVar,
      type: persVar >= 0 ? 'positive' : 'negative',
    });
  }

  // Other charges variation
  const prevOther = (previous.lines.find(l => l.section === 'autres_achats')?.amount || 0) +
    (previous.lines.find(l => l.section === 'impots_taxes')?.amount || 0) +
    (previous.lines.find(l => l.section === 'autres_charges_gestion')?.amount || 0);
  const currOther = (current.lines.find(l => l.section === 'autres_achats')?.amount || 0) +
    (current.lines.find(l => l.section === 'impots_taxes')?.amount || 0) +
    (current.lines.find(l => l.section === 'autres_charges_gestion')?.amount || 0);
  const otherVar = -(currOther - prevOther);
  if (Math.abs(otherVar) > 0.01) {
    bridge.push({
      label: 'Δ Autres charges',
      value: otherVar,
      type: otherVar >= 0 ? 'positive' : 'negative',
    });
  }

  // End with current EBITDA
  bridge.push({
    label: `EBITDA ${current.fiscalYear}`,
    value: current.ebitda,
    type: 'end',
  });

  return bridge;
}
