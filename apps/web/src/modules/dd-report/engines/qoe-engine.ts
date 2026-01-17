/**
 * QoE (Quality of Earnings) Engine Module
 * ========================================
 * Semi-automated adjustment detection and EBITDA normalization
 */

import type {
  FECEntry,
  QoEAdjustment,
  QoEAnalysis,
  QoEBridge,
  AdjustmentType,
  PnLStatement,
} from '../types';
import { NON_RECURRING_ACCOUNTS, REMUNERATION_DIRIGEANTS_ACCOUNTS, INTERCOMPANY_ACCOUNTS } from '../config/pcg-mapping';
import { WINCAP_GOLD, WINCAP_BLUE, CHART_COLORS } from '../config/colors';

// =============================================================================
// Adjustment Detection Rules
// =============================================================================

interface DetectionRule {
  type: AdjustmentType;
  name: string;
  detect: (entries: FECEntry[], pnl: PnLStatement) => SuggestedAdjustment[];
  confidence: 'high' | 'medium' | 'low';
}

interface SuggestedAdjustment {
  label: string;
  description: string;
  impactEBITDA: number;
  relatedAccounts: string[];
  entries: FECEntry[];
}

// =============================================================================
// Detection Rules Implementation
// =============================================================================

const DETECTION_RULES: DetectionRule[] = [
  // Rule 1: Non-recurring items (exceptional charges/income)
  {
    type: 'non_recurring',
    name: 'Non-recurring items',
    confidence: 'high',
    detect: (entries: FECEntry[], pnl: PnLStatement): SuggestedAdjustment[] => {
      const adjustments: SuggestedAdjustment[] = [];

      // Group exceptional items by type
      const exceptionalCharges = entries.filter(e =>
        NON_RECURRING_ACCOUNTS.some(acc => e.CompteNum.startsWith(acc)) &&
        e.CompteNum.startsWith('67')
      );
      const exceptionalIncome = entries.filter(e =>
        NON_RECURRING_ACCOUNTS.some(acc => e.CompteNum.startsWith(acc)) &&
        e.CompteNum.startsWith('77')
      );

      // Sum exceptional charges
      const chargesTotal = exceptionalCharges.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);
      if (Math.abs(chargesTotal) > 1000) {
        adjustments.push({
          label: 'Charges exceptionnelles',
          description: 'Charges exceptionnelles à retraiter (pénalités, créances irrécouvrables, etc.)',
          impactEBITDA: chargesTotal, // Add back charges = positive impact
          relatedAccounts: [...new Set(exceptionalCharges.map(e => e.CompteNum))],
          entries: exceptionalCharges,
        });
      }

      // Sum exceptional income
      const incomeTotal = exceptionalIncome.reduce((sum, e) => sum + (e.Credit - e.Debit), 0);
      if (Math.abs(incomeTotal) > 1000) {
        adjustments.push({
          label: 'Produits exceptionnels',
          description: 'Produits exceptionnels non récurrents à retraiter',
          impactEBITDA: -incomeTotal, // Remove income = negative impact
          relatedAccounts: [...new Set(exceptionalIncome.map(e => e.CompteNum))],
          entries: exceptionalIncome,
        });
      }

      return adjustments;
    },
  },

  // Rule 2: Related party transactions
  {
    type: 'related_party',
    name: 'Related party adjustments',
    confidence: 'medium',
    detect: (entries: FECEntry[]): SuggestedAdjustment[] => {
      const adjustments: SuggestedAdjustment[] = [];

      // Find intercompany movements
      const intercoEntries = entries.filter(e =>
        INTERCOMPANY_ACCOUNTS.some(acc => e.CompteNum.startsWith(acc))
      );

      if (intercoEntries.length > 0) {
        // Group by counterparty
        const byCounterparty = new Map<string, FECEntry[]>();
        for (const entry of intercoEntries) {
          const key = entry.CompAuxNum || entry.CompteNum;
          const existing = byCounterparty.get(key) || [];
          existing.push(entry);
          byCounterparty.set(key, existing);
        }

        for (const [counterparty, cpEntries] of byCounterparty) {
          const net = cpEntries.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);
          if (Math.abs(net) > 5000) {
            adjustments.push({
              label: `Flux groupe/associés (${counterparty})`,
              description: 'Flux avec parties liées à analyser pour normalisation',
              impactEBITDA: 0, // Needs manual assessment
              relatedAccounts: [...new Set(cpEntries.map(e => e.CompteNum))],
              entries: cpEntries,
            });
          }
        }
      }

      return adjustments;
    },
  },

  // Rule 3: Owner compensation normalization
  {
    type: 'owner_compensation',
    name: 'Owner compensation',
    confidence: 'medium',
    detect: (entries: FECEntry[], pnl: PnLStatement): SuggestedAdjustment[] => {
      const adjustments: SuggestedAdjustment[] = [];

      // Find CEO/director compensation
      const remunEntries = entries.filter(e =>
        REMUNERATION_DIRIGEANTS_ACCOUNTS.some(acc => e.CompteNum.startsWith(acc))
      );

      const totalRemun = remunEntries.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);

      if (totalRemun > 0) {
        // Suggest market rate comparison (placeholder - would need benchmark data)
        const marketRate = 80000; // Example market rate for SME CEO
        const adjustment = totalRemun - marketRate;

        if (Math.abs(adjustment) > 10000) {
          adjustments.push({
            label: 'Rémunération dirigeant',
            description: `Rémunération actuelle: ${totalRemun.toLocaleString()}€. À comparer au taux marché (~${marketRate.toLocaleString()}€)`,
            impactEBITDA: adjustment > 0 ? adjustment : 0, // Only add back if above market
            relatedAccounts: [...new Set(remunEntries.map(e => e.CompteNum))],
            entries: remunEntries,
          });
        }
      }

      return adjustments;
    },
  },

  // Rule 4: Accounting method changes (requires Y-o-Y comparison)
  {
    type: 'accounting_method_change',
    name: 'Accounting method changes',
    confidence: 'low',
    detect: (entries: FECEntry[], pnl: PnLStatement): SuggestedAdjustment[] => {
      const adjustments: SuggestedAdjustment[] = [];

      // Detect potential FAE/TEC change by looking at en-cours patterns
      const encours34 = entries.filter(e => e.CompteNum.startsWith('34'));
      const fae418 = entries.filter(e => e.CompteNum.startsWith('418'));

      // If significant en-cours but no FAE, might indicate TEC method
      const encoursBalance = encours34.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);
      const faeBalance = fae418.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);

      if (Math.abs(encoursBalance) > 50000 && Math.abs(faeBalance) < 1000) {
        adjustments.push({
          label: 'Méthode comptable en-cours/FAE',
          description: 'Présence d\'en-cours significatifs sans FAE - vérifier la méthode de reconnaissance du CA',
          impactEBITDA: 0, // Requires detailed analysis
          relatedAccounts: ['34', '418'],
          entries: [...encours34, ...fae418],
        });
      }

      return adjustments;
    },
  },

  // Rule 5: Bad debt provisions
  {
    type: 'bad_debt',
    name: 'Bad debt write-offs',
    confidence: 'high',
    detect: (entries: FECEntry[]): SuggestedAdjustment[] => {
      const adjustments: SuggestedAdjustment[] = [];

      // Find bad debt provisions (491) and write-offs (654, 6714)
      const provisionEntries = entries.filter(e =>
        e.CompteNum.startsWith('491') ||
        e.CompteNum.startsWith('654') ||
        e.CompteNum.startsWith('6714')
      );

      const totalProvisions = provisionEntries.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);

      if (Math.abs(totalProvisions) > 5000) {
        adjustments.push({
          label: 'Provisions/pertes sur créances',
          description: 'Dotations aux provisions pour créances douteuses et pertes sur créances',
          impactEBITDA: totalProvisions, // Add back as typically non-recurring
          relatedAccounts: [...new Set(provisionEntries.map(e => e.CompteNum))],
          entries: provisionEntries,
        });
      }

      return adjustments;
    },
  },

  // Rule 6: One-time professional fees
  {
    type: 'non_recurring',
    name: 'One-time professional fees',
    confidence: 'medium',
    detect: (entries: FECEntry[]): SuggestedAdjustment[] => {
      const adjustments: SuggestedAdjustment[] = [];

      // Look for significant legal/advisory fees that might be transaction-related
      const feeEntries = entries.filter(e =>
        e.CompteNum.startsWith('6226') || // Honoraires
        e.CompteNum.startsWith('6227')    // Frais d'actes
      );

      // Group by libellé to identify patterns
      const byLabel = new Map<string, { amount: number; entries: FECEntry[] }>();
      for (const entry of feeEntries) {
        const label = entry.EcritureLib.toLowerCase();
        const existing = byLabel.get(label) || { amount: 0, entries: [] };
        existing.amount += entry.Debit - entry.Credit;
        existing.entries.push(entry);
        byLabel.set(label, existing);
      }

      // Flag large one-time fees
      for (const [label, data] of byLabel) {
        if (data.amount > 10000 &&
            (label.includes('acquisition') ||
             label.includes('cession') ||
             label.includes('due diligence') ||
             label.includes('audit') ||
             label.includes('restructur'))) {
          adjustments.push({
            label: `Honoraires exceptionnels: ${label.substring(0, 50)}`,
            description: 'Frais professionnels potentiellement liés à une opération exceptionnelle',
            impactEBITDA: data.amount,
            relatedAccounts: [...new Set(data.entries.map(e => e.CompteNum))],
            entries: data.entries,
          });
        }
      }

      return adjustments;
    },
  },
];

// =============================================================================
// QoE Engine Functions
// =============================================================================

/**
 * Auto-detect potential QoE adjustments from FEC data
 */
export function detectPotentialAdjustments(
  entries: FECEntry[],
  pnl: PnLStatement
): SuggestedAdjustment[] {
  const allSuggestions: SuggestedAdjustment[] = [];

  for (const rule of DETECTION_RULES) {
    const suggestions = rule.detect(entries, pnl);
    for (const suggestion of suggestions) {
      allSuggestions.push({
        ...suggestion,
        label: `[${rule.confidence.toUpperCase()}] ${suggestion.label}`,
      });
    }
  }

  return allSuggestions.sort((a, b) => Math.abs(b.impactEBITDA) - Math.abs(a.impactEBITDA));
}

/**
 * Create QoE adjustment from suggestion
 */
export function createAdjustmentFromSuggestion(
  suggestion: SuggestedAdjustment,
  fiscalYear: string,
  type: AdjustmentType,
  validated: boolean = false
): QoEAdjustment {
  return {
    id: `adj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type,
    label: suggestion.label,
    description: suggestion.description,
    fiscalYear,
    impactEBITDA: suggestion.impactEBITDA,
    confidence: suggestion.label.includes('[HIGH]') ? 'high' :
                suggestion.label.includes('[MEDIUM]') ? 'medium' : 'low',
    source: 'auto_detected',
    relatedAccounts: suggestion.relatedAccounts,
    validated,
  };
}

/**
 * Create manual QoE adjustment
 */
export function createManualAdjustment(
  type: AdjustmentType,
  label: string,
  description: string,
  fiscalYear: string,
  impactEBITDA: number,
  impactResultatNet?: number
): QoEAdjustment {
  return {
    id: `adj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type,
    label,
    description,
    fiscalYear,
    impactEBITDA,
    impactResultatNet,
    confidence: 'high', // Manual = high confidence
    source: 'manual',
    validated: true,
    validatedAt: new Date(),
  };
}

/**
 * Generate QoE analysis for a fiscal year
 */
export function generateQoEAnalysis(
  pnl: PnLStatement,
  adjustments: QoEAdjustment[]
): QoEAnalysis {
  // Filter adjustments for this fiscal year and validated only
  const yearAdjustments = adjustments.filter(
    a => a.fiscalYear === pnl.fiscalYear && a.validated
  );

  // Calculate adjusted EBITDA
  const totalImpact = yearAdjustments.reduce((sum, a) => sum + a.impactEBITDA, 0);
  const ebitdaAjuste = pnl.ebitda + totalImpact;
  const margeAjustee = pnl.production !== 0 ? (ebitdaAjuste / pnl.production) * 100 : 0;

  return {
    fiscalYear: pnl.fiscalYear,
    ebitdaReporte: pnl.ebitda,
    adjustments: yearAdjustments,
    ebitdaAjuste,
    margeEBITDAAjuste: margeAjustee,
    production: pnl.production,
  };
}

/**
 * Generate multi-year QoE bridge
 */
export function generateQoEBridge(
  pnlStatements: PnLStatement[],
  adjustments: QoEAdjustment[]
): QoEBridge {
  const periods: QoEAnalysis[] = [];

  for (const pnl of pnlStatements) {
    const analysis = generateQoEAnalysis(pnl, adjustments);
    periods.push(analysis);
  }

  // Aggregate adjustments across all periods
  const summary = aggregateAdjustments(adjustments);

  return { periods, summary };
}

/**
 * Aggregate adjustments by type across years
 */
function aggregateAdjustments(adjustments: QoEAdjustment[]): QoEAdjustment[] {
  const byType = new Map<AdjustmentType, QoEAdjustment[]>();

  for (const adj of adjustments) {
    if (!adj.validated) continue;
    const existing = byType.get(adj.type) || [];
    existing.push(adj);
    byType.set(adj.type, existing);
  }

  const summary: QoEAdjustment[] = [];

  for (const [type, adjs] of byType) {
    const totalImpact = adjs.reduce((sum, a) => sum + a.impactEBITDA, 0);
    const avgImpact = totalImpact / adjs.length;

    summary.push({
      id: `summary_${type}`,
      type,
      label: getAdjustmentTypeLabel(type),
      description: `${adjs.length} ajustement(s) de ce type`,
      fiscalYear: 'ALL',
      impactEBITDA: avgImpact,
      confidence: 'high',
      source: 'manual',
      validated: true,
    });
  }

  return summary.sort((a, b) => Math.abs(b.impactEBITDA) - Math.abs(a.impactEBITDA));
}

function getAdjustmentTypeLabel(type: AdjustmentType): string {
  const labels: Record<AdjustmentType, string> = {
    accounting_method_change: 'Changements de méthodes comptables',
    non_recurring: 'Éléments non récurrents',
    related_party: 'Transactions avec parties liées',
    owner_compensation: 'Rémunération du dirigeant',
    bad_debt: 'Provisions pour créances douteuses',
    provision_release: 'Reprises de provisions',
    timing_difference: 'Décalages temporels',
    other: 'Autres ajustements',
  };
  return labels[type];
}

// =============================================================================
// EBITDA Bridge Chart Data
// =============================================================================

export interface EBITDABridgeData {
  items: {
    label: string;
    value: number;
    type: 'start' | 'adjustment' | 'end';
    color: string;
  }[];
}

/**
 * Generate EBITDA bridge data for QoE visualization
 */
export function generateQoEBridgeChart(analysis: QoEAnalysis): EBITDABridgeData {
  const items: EBITDABridgeData['items'] = [];

  // Start with reported EBITDA
  items.push({
    label: 'EBITDA reporté',
    value: analysis.ebitdaReporte,
    type: 'start',
    color: WINCAP_BLUE,
  });

  // Add each adjustment
  for (const adj of analysis.adjustments) {
    items.push({
      label: adj.label.replace(/\[.*?\]\s*/, ''), // Remove confidence tag
      value: adj.impactEBITDA,
      type: 'adjustment',
      color: adj.impactEBITDA >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative,
    });
  }

  // End with adjusted EBITDA
  items.push({
    label: 'EBITDA ajusté',
    value: analysis.ebitdaAjuste,
    type: 'end',
    color: WINCAP_GOLD,
  });

  return { items };
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate adjustment before adding
 */
export function validateAdjustment(adjustment: Partial<QoEAdjustment>): string[] {
  const errors: string[] = [];

  if (!adjustment.label || adjustment.label.trim().length === 0) {
    errors.push('Label is required');
  }

  if (!adjustment.type) {
    errors.push('Adjustment type is required');
  }

  if (adjustment.impactEBITDA === undefined || isNaN(adjustment.impactEBITDA)) {
    errors.push('EBITDA impact must be a valid number');
  }

  if (!adjustment.fiscalYear) {
    errors.push('Fiscal year is required');
  }

  return errors;
}

/**
 * Check if adjustment might be double-counted
 */
export function checkDuplicateAdjustment(
  newAdjustment: QoEAdjustment,
  existingAdjustments: QoEAdjustment[]
): QoEAdjustment | null {
  for (const existing of existingAdjustments) {
    // Same fiscal year, same type, similar amount
    if (existing.fiscalYear === newAdjustment.fiscalYear &&
        existing.type === newAdjustment.type &&
        Math.abs(existing.impactEBITDA - newAdjustment.impactEBITDA) < Math.abs(newAdjustment.impactEBITDA) * 0.1) {
      return existing;
    }

    // Same related accounts
    if (existing.relatedAccounts && newAdjustment.relatedAccounts) {
      const overlap = existing.relatedAccounts.filter(a =>
        newAdjustment.relatedAccounts?.includes(a)
      );
      if (overlap.length > 0 && overlap.length === existing.relatedAccounts.length) {
        return existing;
      }
    }
  }

  return null;
}
