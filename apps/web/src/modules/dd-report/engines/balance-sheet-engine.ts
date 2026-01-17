/**
 * Balance Sheet Constructor Module
 * =================================
 * Generates balance sheets from FEC entries
 * Uses restructured presentation (Asset/WC/Cash view)
 */

import type {
  FECEntry,
  BalanceSheetLine,
  BalanceSheet,
  BalanceSheetSection,
  WorkingCapitalMetrics,
} from '../types';
import {
  netBalanceByPrefix,
  calculateAccountBalances,
} from '../parsers/fec-parser';

// =============================================================================
// Balance Sheet Structure Definition
// =============================================================================

interface BSSectionDefinition {
  code: string;
  label: string;
  section: BalanceSheetSection;
  accountPrefixes: string[];
  isDebitNormal: boolean; // True if debit balance is normal (asset), false if credit (liability)
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  hasGrossAmort?: boolean; // For fixed assets that have gross/amort/net presentation
  excludePrefixes?: string[]; // Prefixes to exclude
}

const BS_STRUCTURE: BSSectionDefinition[] = [
  // ============== ACTIF ==============
  // Immobilisations incorporelles
  { code: 'IMMO_INC', label: 'Immobilisations incorporelles', section: 'immobilisations_incorporelles_net', accountPrefixes: ['20'], isDebitNormal: true, hasGrossAmort: true },

  // Immobilisations corporelles
  { code: 'IMMO_CORP', label: 'Immobilisations corporelles', section: 'immobilisations_corporelles_net', accountPrefixes: ['21', '22', '23'], isDebitNormal: true, hasGrossAmort: true },

  // Immobilisations financières
  { code: 'IMMO_FIN', label: 'Immobilisations financières', section: 'immobilisations_financieres', accountPrefixes: ['26', '27'], isDebitNormal: true },

  // Total actif immobilisé
  { code: 'ACTIF_IMMO', label: 'Actif immobilisé', section: 'actif_immobilise_total', accountPrefixes: [], isDebitNormal: true, isSubtotal: true },

  // Stocks
  { code: 'STOCK_MAT', label: 'Matières premières', section: 'stocks_matieres', accountPrefixes: ['31', '32'], isDebitNormal: true, indent: 1 },
  { code: 'STOCK_EC', label: 'En-cours de production', section: 'stocks_encours', accountPrefixes: ['33', '34'], isDebitNormal: true, indent: 1 },
  { code: 'STOCK_PROD', label: 'Produits finis', section: 'stocks_produits', accountPrefixes: ['35'], isDebitNormal: true, indent: 1 },
  { code: 'STOCK_MARCH', label: 'Marchandises', section: 'stocks_marchandises', accountPrefixes: ['37'], isDebitNormal: true, indent: 1 },
  { code: 'STOCKS', label: 'Total stocks', section: 'stocks_total', accountPrefixes: [], isDebitNormal: true, isSubtotal: true },

  // Clients
  { code: 'CLIENTS', label: 'Clients et comptes rattachés', section: 'clients_net', accountPrefixes: ['41'], isDebitNormal: true },

  // FAE et avances
  { code: 'FAE', label: 'FAE et avances fournisseurs', section: 'fae_avances', accountPrefixes: ['4091', '4181', '409'], isDebitNormal: true },

  // Autres créances
  { code: 'AUTRES_CR', label: 'Autres créances', section: 'autres_creances', accountPrefixes: ['44', '45', '46'], isDebitNormal: true, excludePrefixes: ['445', '4455'] },

  // Charges constatées d'avance
  { code: 'CCA', label: 'Charges constatées d\'avance', section: 'charges_constatees_avance', accountPrefixes: ['486'], isDebitNormal: true },

  // Actif circulant exploitation
  { code: 'AC_EXPL', label: 'Actif circulant d\'exploitation', section: 'actif_circulant_exploitation', accountPrefixes: [], isDebitNormal: true, isSubtotal: true },

  // VMP
  { code: 'VMP', label: 'Valeurs mobilières de placement', section: 'valeurs_mobilieres', accountPrefixes: ['50'], isDebitNormal: true },

  // Disponibilités
  { code: 'DISPO', label: 'Disponibilités', section: 'disponibilites', accountPrefixes: ['51', '53'], isDebitNormal: true },

  // Trésorerie actif
  { code: 'TRESO_ACTIF', label: 'Trésorerie active', section: 'tresorerie_actif', accountPrefixes: [], isDebitNormal: true, isSubtotal: true },

  // Total actif
  { code: 'TOTAL_ACTIF', label: 'TOTAL ACTIF', section: 'total_actif', accountPrefixes: [], isDebitNormal: true, isTotal: true },

  // ============== PASSIF ==============
  // Capital social
  { code: 'CAPITAL', label: 'Capital social', section: 'capital_social', accountPrefixes: ['101', '104', '108'], isDebitNormal: false },

  // Réserves
  { code: 'RESERVES', label: 'Réserves', section: 'reserves', accountPrefixes: ['106', '11'], isDebitNormal: false },

  // Report à nouveau
  { code: 'RAN', label: 'Report à nouveau', section: 'report_nouveau', accountPrefixes: ['119', '110'], isDebitNormal: false },

  // Résultat de l'exercice
  { code: 'RESULTAT', label: 'Résultat de l\'exercice', section: 'resultat_exercice', accountPrefixes: ['12'], isDebitNormal: false },

  // Capitaux propres
  { code: 'CP', label: 'Capitaux propres', section: 'capitaux_propres', accountPrefixes: [], isDebitNormal: false, isSubtotal: true },

  // Provisions pour risques et charges
  { code: 'PROV', label: 'Provisions pour risques et charges', section: 'provisions_risques', accountPrefixes: ['15'], isDebitNormal: false },

  // Emprunts établissements de crédit
  { code: 'EMPR_EC', label: 'Emprunts auprès des établissements de crédit', section: 'emprunts_etablissements', accountPrefixes: ['164'], isDebitNormal: false, indent: 1 },

  // Emprunts associés
  { code: 'EMPR_ASS', label: 'Emprunts et dettes auprès des associés', section: 'emprunts_associes', accountPrefixes: ['455', '168'], isDebitNormal: false, indent: 1 },

  // Autres dettes financières
  { code: 'AUTRES_DF', label: 'Autres emprunts et dettes financières', section: 'autres_dettes_financieres', accountPrefixes: ['16'], isDebitNormal: false, indent: 1, excludePrefixes: ['164', '168'] },

  // Total dettes financières
  { code: 'DETTES_FIN', label: 'Dettes financières', section: 'dettes_financieres_total', accountPrefixes: [], isDebitNormal: false, isSubtotal: true },

  // Fournisseurs
  { code: 'FRS', label: 'Fournisseurs et comptes rattachés', section: 'fournisseurs', accountPrefixes: ['40'], isDebitNormal: false, excludePrefixes: ['4091', '409'] },

  // Dettes fiscales et sociales
  { code: 'DETTES_FS', label: 'Dettes fiscales et sociales', section: 'dettes_fiscales_sociales', accountPrefixes: ['42', '43', '444', '445'], isDebitNormal: false },

  // Autres dettes
  { code: 'AUTRES_DETTES', label: 'Autres dettes', section: 'autres_dettes', accountPrefixes: ['46', '47'], isDebitNormal: false },

  // Produits constatés d'avance
  { code: 'PCA', label: 'Produits constatés d\'avance', section: 'produits_constates_avance', accountPrefixes: ['487'], isDebitNormal: false },

  // Passif circulant exploitation
  { code: 'PC_EXPL', label: 'Passif circulant d\'exploitation', section: 'passif_circulant_exploitation', accountPrefixes: [], isDebitNormal: false, isSubtotal: true },

  // Trésorerie passif (découverts)
  { code: 'TRESO_PASSIF', label: 'Concours bancaires courants', section: 'tresorerie_passif', accountPrefixes: ['519'], isDebitNormal: false },

  // Total passif
  { code: 'TOTAL_PASSIF', label: 'TOTAL PASSIF', section: 'total_passif', accountPrefixes: [], isDebitNormal: false, isTotal: true },
];

// =============================================================================
// Balance Sheet Engine Functions
// =============================================================================

/**
 * Generate balance sheet from FEC entries at a specific date
 */
export function generateBalanceSheet(
  entries: FECEntry[],
  asOfDate: Date,
  fiscalYear: string,
  currency: string = 'EUR'
): BalanceSheet {
  // Filter entries up to the balance sheet date
  const filteredEntries = entries.filter(e => e.EcritureDate <= asOfDate);

  // Calculate raw amounts for each section
  const amounts = new Map<BalanceSheetSection, number>();
  const grossAmounts = new Map<BalanceSheetSection, number>();
  const amortAmounts = new Map<BalanceSheetSection, number>();

  // First pass: calculate direct amounts
  for (const def of BS_STRUCTURE) {
    if (def.accountPrefixes.length === 0) continue;

    let netAmount = 0;
    let grossAmount = 0;
    let amortAmount = 0;

    for (const prefix of def.accountPrefixes) {
      // Skip excluded prefixes
      if (def.excludePrefixes?.some(ex => prefix.startsWith(ex))) continue;

      let prefixAmount = 0;
      for (const entry of filteredEntries) {
        if (!entry.CompteNum.startsWith(prefix)) continue;
        // Check if excluded
        if (def.excludePrefixes?.some(ex => entry.CompteNum.startsWith(ex))) continue;

        prefixAmount += entry.Debit - entry.Credit;
      }

      if (def.isDebitNormal) {
        netAmount += prefixAmount;
      } else {
        netAmount -= prefixAmount; // Credit normal accounts
      }
    }

    // Handle gross/amort for fixed assets
    if (def.hasGrossAmort) {
      // Gross is the direct account
      grossAmount = netAmount;

      // Find corresponding amortization
      const amortPrefix = def.accountPrefixes[0].replace(/^2/, '28');
      let amort = 0;
      for (const entry of filteredEntries) {
        if (entry.CompteNum.startsWith(amortPrefix)) {
          amort += entry.Credit - entry.Debit; // Amort is credit normal
        }
      }
      amortAmount = amort;
      netAmount = grossAmount - amortAmount;

      grossAmounts.set(def.section, grossAmount);
      amortAmounts.set(def.section, amortAmount);
    }

    amounts.set(def.section, netAmount);
  }

  // Calculate stocks total
  const stocksTotal =
    (amounts.get('stocks_matieres') || 0) +
    (amounts.get('stocks_encours') || 0) +
    (amounts.get('stocks_produits') || 0) +
    (amounts.get('stocks_marchandises') || 0);
  amounts.set('stocks_total', stocksTotal);

  // Calculate actif immobilisé
  const actifImmo =
    (amounts.get('immobilisations_incorporelles_net') || 0) +
    (amounts.get('immobilisations_corporelles_net') || 0) +
    (amounts.get('immobilisations_financieres') || 0);
  amounts.set('actif_immobilise_total', actifImmo);

  // Calculate actif circulant exploitation
  const acExpl =
    stocksTotal +
    (amounts.get('clients_net') || 0) +
    (amounts.get('fae_avances') || 0) +
    (amounts.get('autres_creances') || 0) +
    (amounts.get('charges_constatees_avance') || 0);
  amounts.set('actif_circulant_exploitation', acExpl);

  // Calculate trésorerie active
  const tresoActif =
    (amounts.get('valeurs_mobilieres') || 0) +
    (amounts.get('disponibilites') || 0);
  amounts.set('tresorerie_actif', tresoActif);

  // Calculate total actif
  const totalActif = actifImmo + acExpl + tresoActif;
  amounts.set('total_actif', totalActif);

  // Calculate capitaux propres
  const capitauxPropres =
    (amounts.get('capital_social') || 0) +
    (amounts.get('reserves') || 0) +
    (amounts.get('report_nouveau') || 0) +
    (amounts.get('resultat_exercice') || 0);
  amounts.set('capitaux_propres', capitauxPropres);

  // Calculate dettes financières
  const dettesFin =
    (amounts.get('emprunts_etablissements') || 0) +
    (amounts.get('emprunts_associes') || 0) +
    (amounts.get('autres_dettes_financieres') || 0);
  amounts.set('dettes_financieres_total', dettesFin);

  // Calculate passif circulant exploitation
  const pcExpl =
    (amounts.get('fournisseurs') || 0) +
    (amounts.get('dettes_fiscales_sociales') || 0) +
    (amounts.get('autres_dettes') || 0) +
    (amounts.get('produits_constates_avance') || 0);
  amounts.set('passif_circulant_exploitation', pcExpl);

  // Calculate total passif
  const totalPassif =
    capitauxPropres +
    (amounts.get('provisions_risques') || 0) +
    dettesFin +
    pcExpl +
    (amounts.get('tresorerie_passif') || 0);
  amounts.set('total_passif', totalPassif);

  // Build balance sheet lines
  const lines: BalanceSheetLine[] = BS_STRUCTURE.map(def => ({
    code: def.code,
    label: def.label,
    section: def.section,
    gross: grossAmounts.get(def.section),
    amortDepreciation: amortAmounts.get(def.section),
    net: amounts.get(def.section) || 0,
    isSubtotal: def.isSubtotal,
    isTotal: def.isTotal,
    indent: def.indent,
  }));

  // Calculate BFR
  const clientsNet = amounts.get('clients_net') || 0;
  const faeAvances = amounts.get('fae_avances') || 0;
  const fournisseurs = amounts.get('fournisseurs') || 0;
  const bfrOperationnel = stocksTotal + clientsNet + faeAvances - fournisseurs;

  const autresCreances = amounts.get('autres_creances') || 0;
  const dettesFiscalesSociales = amounts.get('dettes_fiscales_sociales') || 0;
  const autresDettes = amounts.get('autres_dettes') || 0;
  const cca = amounts.get('charges_constatees_avance') || 0;
  const pca = amounts.get('produits_constates_avance') || 0;
  const bfrNonOp = autresCreances + cca - dettesFiscalesSociales - autresDettes - pca;

  const bfrTotal = bfrOperationnel + bfrNonOp;

  // Calculate endettement net
  const tresoPassif = amounts.get('tresorerie_passif') || 0;
  const endettementNet = dettesFin + tresoPassif - tresoActif;

  return {
    date: asOfDate,
    fiscalYear,
    currency,
    lines,
    // Actif aggregates
    actifImmobilise: actifImmo,
    stocks: stocksTotal,
    clientsNet,
    autresCreances,
    tresorerieActif: tresoActif,
    totalActif,
    // Passif aggregates
    capitauxPropres,
    provisionsRisques: amounts.get('provisions_risques') || 0,
    dettesFinancieres: dettesFin,
    fournisseurs,
    dettesFiscalesSociales,
    autresDettes,
    tresoreriePassif: tresoPassif,
    totalPassif,
    // Working capital
    bfrOperationnel,
    bfrNonOperationnel: bfrNonOp,
    bfrTotal,
    endettementNet,
  };
}

/**
 * Calculate working capital metrics (DSO, DPO, DIO)
 */
export function calculateWorkingCapitalMetrics(
  balanceSheet: BalanceSheet,
  chiffreAffairesTTC: number,
  achatsConsommesTTC: number,
  coutDesVentes: number
): WorkingCapitalMetrics {
  // DSO = (Clients / CA TTC) * 365
  const dso = chiffreAffairesTTC !== 0
    ? (balanceSheet.clientsNet / chiffreAffairesTTC) * 365
    : 0;

  // DPO = (Fournisseurs / Achats TTC) * 365
  const dpo = achatsConsommesTTC !== 0
    ? (balanceSheet.fournisseurs / achatsConsommesTTC) * 365
    : 0;

  // DIO = (Stocks / Coût des ventes) * 365
  const dio = coutDesVentes !== 0
    ? (balanceSheet.stocks / coutDesVentes) * 365
    : 0;

  // Cash Conversion Cycle = DSO + DIO - DPO
  const ccc = dso + dio - dpo;

  return {
    date: balanceSheet.date,
    clientsBalance: balanceSheet.clientsNet,
    chiffreAffairesTTC,
    dso,
    fournisseursBalance: balanceSheet.fournisseurs,
    achatsConsommesTTC,
    dpo,
    stocksBalance: balanceSheet.stocks,
    coutDesVentes,
    dio,
    ccc,
  };
}

/**
 * Calculate monthly DSO/DPO
 */
export function calculateMonthlyWorkingCapital(
  entries: FECEntry[],
  monthlyCA: { month: Date; amount: number }[],
  monthlyAchats: { month: Date; amount: number }[]
): { month: Date; dso: number; dpo: number }[] {
  const result: { month: Date; dso: number; dpo: number }[] = [];

  for (const caData of monthlyCA) {
    const endOfMonth = new Date(caData.month.getFullYear(), caData.month.getMonth() + 1, 0);
    const bs = generateBalanceSheet(entries, endOfMonth, '');

    const achatsData = monthlyAchats.find(a =>
      a.month.getFullYear() === caData.month.getFullYear() &&
      a.month.getMonth() === caData.month.getMonth()
    );

    // Annualize for DSO/DPO calculation
    const annualizedCA = caData.amount * 12 * 1.2; // Approximate TTC
    const annualizedAchats = (achatsData?.amount || 0) * 12 * 1.2;

    const dso = annualizedCA !== 0 ? (bs.clientsNet / annualizedCA) * 365 : 0;
    const dpo = annualizedAchats !== 0 ? (bs.fournisseurs / annualizedAchats) * 365 : 0;

    result.push({
      month: caData.month,
      dso,
      dpo,
    });
  }

  return result;
}

/**
 * Get aged receivables/payables analysis
 */
export function getAgedBalances(
  entries: FECEntry[],
  asOfDate: Date,
  accountPrefix: '41' | '40',
  buckets: number[] = [0, 30, 60, 90, 120]
): { auxNum: string; auxLib: string; bucketAmounts: number[]; total: number }[] {
  // Get auxiliary balances
  const auxBalances = new Map<string, {
    auxLib: string;
    entries: { date: Date; amount: number }[];
  }>();

  for (const entry of entries) {
    if (!entry.CompteNum.startsWith(accountPrefix)) continue;
    if (!entry.CompAuxNum) continue;
    if (entry.EcritureDate > asOfDate) continue;

    const key = entry.CompAuxNum;
    const existing = auxBalances.get(key);
    const amount = accountPrefix === '41'
      ? entry.Debit - entry.Credit  // Clients are debit normal
      : entry.Credit - entry.Debit; // Fournisseurs are credit normal

    if (existing) {
      existing.entries.push({ date: entry.EcritureDate, amount });
    } else {
      auxBalances.set(key, {
        auxLib: entry.CompAuxLib || '',
        entries: [{ date: entry.EcritureDate, amount }],
      });
    }
  }

  // Calculate aged buckets
  const result: { auxNum: string; auxLib: string; bucketAmounts: number[]; total: number }[] = [];

  for (const [auxNum, data] of auxBalances) {
    const bucketAmounts = new Array(buckets.length).fill(0);
    let total = 0;

    for (const entry of data.entries) {
      const daysDiff = Math.floor((asOfDate.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24));

      // Find the right bucket
      let bucketIndex = buckets.length - 1;
      for (let i = 0; i < buckets.length - 1; i++) {
        if (daysDiff >= buckets[i] && daysDiff < buckets[i + 1]) {
          bucketIndex = i;
          break;
        }
      }

      bucketAmounts[bucketIndex] += entry.amount;
      total += entry.amount;
    }

    if (Math.abs(total) > 0.01) {
      result.push({ auxNum, auxLib: data.auxLib, bucketAmounts, total });
    }
  }

  return result.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/**
 * Get fixed assets detail
 */
export function getFixedAssetsDetail(
  entries: FECEntry[],
  asOfDate: Date
): { account: string; label: string; gross: number; amort: number; net: number }[] {
  const filteredEntries = entries.filter(e => e.EcritureDate <= asOfDate);
  const balances = calculateAccountBalances(filteredEntries);

  // Group by asset account (20x, 21x)
  const assets = new Map<string, { label: string; gross: number; amort: number }>();

  for (const bal of balances) {
    if (bal.accountNum.startsWith('20') || bal.accountNum.startsWith('21') ||
        bal.accountNum.startsWith('22') || bal.accountNum.startsWith('23')) {
      assets.set(bal.accountNum, {
        label: bal.accountLib,
        gross: bal.balance,
        amort: 0,
      });
    }
  }

  // Add amortization
  for (const bal of balances) {
    if (bal.accountNum.startsWith('28')) {
      const assetAccount = bal.accountNum.replace('28', '2');
      const asset = assets.get(assetAccount);
      if (asset) {
        asset.amort = -bal.balance; // Amort is credit, so negate
      }
    }
  }

  return Array.from(assets.entries())
    .map(([account, data]) => ({
      account,
      label: data.label,
      gross: data.gross,
      amort: data.amort,
      net: data.gross - data.amort,
    }))
    .filter(a => Math.abs(a.net) > 0.01)
    .sort((a, b) => b.net - a.net);
}
