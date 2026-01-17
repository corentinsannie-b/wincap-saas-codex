/**
 * DD Report Automation Platform - Core Type Definitions
 * =====================================================
 * Types for Financial Due Diligence report generation
 */

// =============================================================================
// FEC (Fichier des Écritures Comptables) Types
// =============================================================================

export interface FECEntry {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: Date;
  CompteNum: string;
  CompteLib: string;
  CompAuxNum?: string;
  CompAuxLib?: string;
  PieceRef?: string;
  PieceDate?: Date;
  EcritureLib: string;
  Debit: number;
  Credit: number;
  EcritureLet?: string;
  DateLet?: Date;
  ValidDate?: Date;
  Montantdevise?: number;
  Idevise?: string;
}

export interface FECFile {
  filename: string;
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  entries: FECEntry[];
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface FECParseResult {
  success: boolean;
  data?: FECFile;
  errors: FECValidationError[];
  warnings: string[];
}

export interface FECValidationError {
  line: number;
  field: string;
  value: string;
  message: string;
}

// =============================================================================
// PCG (Plan Comptable Général) Mapping Types
// =============================================================================

export type PCGCategory =
  | 'immobilisations_incorporelles'    // 20
  | 'immobilisations_corporelles'      // 21
  | 'immobilisations_financieres'      // 26, 27
  | 'amortissements'                   // 28
  | 'depreciations_immobilisations'    // 29
  | 'stocks_matieres'                  // 31
  | 'stocks_encours'                   // 34
  | 'stocks_produits'                  // 35
  | 'stocks_marchandises'              // 37
  | 'fournisseurs'                     // 40
  | 'clients'                          // 41
  | 'personnel'                        // 42
  | 'securite_sociale'                 // 43
  | 'etat_impots'                      // 44
  | 'groupe_associes'                  // 45
  | 'debiteurs_crediteurs_divers'      // 46
  | 'comptes_transitoires'             // 47
  | 'charges_constatees_avance'        // 48
  | 'depreciations_comptes_tiers'      // 49
  | 'valeurs_mobilieres'               // 50
  | 'banques'                          // 51
  | 'caisse'                           // 53
  | 'capital'                          // 10
  | 'reserves'                         // 11
  | 'resultat'                         // 12
  | 'subventions'                      // 13
  | 'provisions_reglementees'          // 14
  | 'provisions_risques'               // 15
  | 'emprunts'                         // 16
  | 'dettes_rattachees'                // 17
  | 'comptes_liaison'                  // 18
  | 'achats_stockes'                   // 60
  | 'services_exterieurs'              // 61
  | 'autres_services_exterieurs'       // 62
  | 'impots_taxes'                     // 63
  | 'charges_personnel'                // 64
  | 'autres_charges_gestion'           // 65
  | 'charges_financieres'              // 66
  | 'charges_exceptionnelles'          // 67
  | 'dotations_amortissements'         // 68
  | 'participation_impot'              // 69
  | 'ventes_produits'                  // 70
  | 'production_stockee'               // 71
  | 'production_immobilisee'           // 72
  | 'produits_annexes'                 // 75
  | 'produits_financiers'              // 76
  | 'produits_exceptionnels'           // 77
  | 'reprises_provisions'              // 78
  | 'transferts_charges';              // 79

export interface PCGMapping {
  accountPrefix: string;
  category: PCGCategory;
  label: string;
  pnlSection?: PnLSection;
  bsSection?: BalanceSheetSection;
}

// =============================================================================
// P&L (Profit & Loss) Types
// =============================================================================

export type PnLSection =
  | 'chiffre_affaires'
  | 'variation_encours'
  | 'production'
  | 'achats_consommes'
  | 'sous_traitance'
  | 'marge_couts_directs'
  | 'autres_achats'
  | 'services_exterieurs'
  | 'charges_personnel'
  | 'impots_taxes'
  | 'autres_charges_gestion'
  | 'ebitda'
  | 'dotations_amortissements'
  | 'resultat_exploitation'
  | 'produits_financiers'
  | 'charges_financieres'
  | 'resultat_financier'
  | 'resultat_courant'
  | 'produits_exceptionnels'
  | 'charges_exceptionnelles'
  | 'resultat_exceptionnel'
  | 'participation_salaries'
  | 'impot_societes'
  | 'resultat_net';

export interface PnLLine {
  code: string;
  label: string;
  section: PnLSection;
  amount: number;
  previousAmount?: number;
  variation?: number;
  variationPercent?: number;
  marginPercent?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface PnLStatement {
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  currency: string;
  lines: PnLLine[];
  // Key aggregates
  chiffreAffaires: number;
  production: number;
  margeCoutsDirects: number;
  ebitda: number;
  ebitdaMargin: number;
  resultatExploitation: number;
  resultatNet: number;
}

export interface PnLComparison {
  periods: PnLStatement[];
  variations: PnLVariation[];
}

export interface PnLVariation {
  section: PnLSection;
  label: string;
  amounts: number[];
  absoluteVariation: number;
  percentVariation: number;
}

// =============================================================================
// Balance Sheet Types
// =============================================================================

export type BalanceSheetSection =
  | 'immobilisations_incorporelles_brut'
  | 'immobilisations_incorporelles_amort'
  | 'immobilisations_incorporelles_net'
  | 'immobilisations_corporelles_brut'
  | 'immobilisations_corporelles_amort'
  | 'immobilisations_corporelles_net'
  | 'immobilisations_financieres'
  | 'actif_immobilise_total'
  | 'stocks_matieres'
  | 'stocks_encours'
  | 'stocks_produits'
  | 'stocks_marchandises'
  | 'stocks_total'
  | 'clients_brut'
  | 'clients_provisions'
  | 'clients_net'
  | 'fae_avances'
  | 'autres_creances'
  | 'charges_constatees_avance'
  | 'actif_circulant_exploitation'
  | 'valeurs_mobilieres'
  | 'disponibilites'
  | 'tresorerie_actif'
  | 'total_actif'
  | 'capital_social'
  | 'reserves'
  | 'report_nouveau'
  | 'resultat_exercice'
  | 'capitaux_propres'
  | 'provisions_risques'
  | 'emprunts_etablissements'
  | 'emprunts_associes'
  | 'autres_dettes_financieres'
  | 'dettes_financieres_total'
  | 'fournisseurs'
  | 'dettes_fiscales_sociales'
  | 'autres_dettes'
  | 'produits_constates_avance'
  | 'passif_circulant_exploitation'
  | 'tresorerie_passif'
  | 'total_passif';

export interface BalanceSheetLine {
  code: string;
  label: string;
  section: BalanceSheetSection;
  gross?: number;
  amortDepreciation?: number;
  net: number;
  previousNet?: number;
  variation?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface BalanceSheet {
  date: Date;
  fiscalYear: string;
  currency: string;
  lines: BalanceSheetLine[];
  // Key aggregates - Actif
  actifImmobilise: number;
  stocks: number;
  clientsNet: number;
  autresCreances: number;
  tresorerieActif: number;
  totalActif: number;
  // Key aggregates - Passif
  capitauxPropres: number;
  provisionsRisques: number;
  dettesFinancieres: number;
  fournisseurs: number;
  dettesFiscalesSociales: number;
  autresDettes: number;
  tresoreriePassif: number;
  totalPassif: number;
  // Working capital metrics
  bfrOperationnel: number;
  bfrNonOperationnel: number;
  bfrTotal: number;
  endettementNet: number;
}

// =============================================================================
// Cash Flow Types
// =============================================================================

export interface CashFlowLine {
  code: string;
  label: string;
  amount: number;
  previousAmount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface CashFlowStatement {
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  currency: string;
  lines: CashFlowLine[];
  // Key aggregates
  ebitda: number;
  variationBFROperationnel: number;
  variationBFRNonOperationnel: number;
  fluxExploitation: number;
  capex: number;
  cessions: number;
  fluxInvestissement: number;
  fcfAvantIS: number;
  impotSocietes: number;
  fcfApresIS: number;
  dividendes: number;
  variationDettesFinancieres: number;
  fluxFinancement: number;
  variationTresorerie: number;
  tresorerieOuverture: number;
  tresorerieCloture: number;
}

export interface MonthlyCashFlow {
  month: Date;
  ebitda: number;
  variationBFR: number;
  fcf: number;
  tresorerieFinMois: number;
}

// =============================================================================
// Working Capital Types
// =============================================================================

export interface WorkingCapitalMetrics {
  date: Date;
  // DSO (Days Sales Outstanding)
  clientsBalance: number;
  chiffreAffairesTTC: number;
  dso: number;
  // DPO (Days Payables Outstanding)
  fournisseursBalance: number;
  achatsConsommesTTC: number;
  dpo: number;
  // DIO (Days Inventory Outstanding)
  stocksBalance: number;
  coutDesVentes: number;
  dio: number;
  // Cash Conversion Cycle
  ccc: number;
}

export interface WorkingCapitalAnalysis {
  periods: WorkingCapitalMetrics[];
  dsoTrend: 'improving' | 'stable' | 'deteriorating';
  dpoTrend: 'improving' | 'stable' | 'deteriorating';
  dioTrend: 'improving' | 'stable' | 'deteriorating';
}

// =============================================================================
// QoE (Quality of Earnings) Types
// =============================================================================

export type AdjustmentType =
  | 'accounting_method_change'
  | 'non_recurring'
  | 'related_party'
  | 'owner_compensation'
  | 'bad_debt'
  | 'provision_release'
  | 'timing_difference'
  | 'other';

export interface QoEAdjustment {
  id: string;
  type: AdjustmentType;
  label: string;
  description: string;
  fiscalYear: string;
  impactEBITDA: number;
  impactResultatNet?: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'auto_detected' | 'manual';
  relatedAccounts?: string[];
  validated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
}

export interface QoEAnalysis {
  fiscalYear: string;
  ebitdaReporte: number;
  adjustments: QoEAdjustment[];
  ebitdaAjuste: number;
  margeEBITDAAjuste: number;
  production: number;
}

export interface QoEBridge {
  periods: QoEAnalysis[];
  summary: QoEAdjustment[];
}

// =============================================================================
// QoD (Quality of Debt) Types
// =============================================================================

export interface QoDItem {
  label: string;
  amount: number;
  category: 'cash' | 'debt' | 'cash_like' | 'debt_like';
  adjustmentReason?: string;
}

export interface QoDAnalysis {
  date: Date;
  // Cash items
  cashItems: QoDItem[];
  totalCash: number;
  // Debt items
  debtItems: QoDItem[];
  totalDebt: number;
  // Net position
  netCashDebt: number;
  // Adjustments
  adjustments: QoDItem[];
  adjustedNetCashDebt: number;
}

// =============================================================================
// Order Register Types
// =============================================================================

export interface Order {
  id: string;
  date: Date;
  clientName: string;
  clientCode?: string;
  productType: 'neuf' | 'occasion' | 'service' | 'mixte';
  department?: string;
  region?: string;
  salesPerson?: string;
  amountHT: number;
  marginHT?: number;
  marginPercent?: number;
  invoicedAmount?: number;
  invoiceDate?: Date;
  status: 'pending' | 'partial' | 'invoiced' | 'cancelled';
}

export interface OrderRegister {
  orders: Order[];
  periodStart: Date;
  periodEnd: Date;
  totalOrders: number;
  totalAmountHT: number;
  totalMarginHT: number;
  averageMarginPercent: number;
}

export interface OrderAnalysis {
  // By period
  monthlyOrders: { month: Date; count: number; amount: number; margin: number }[];
  ltm: { amount: number; margin: number; orderCount: number };
  // By dimension
  byProductType: { type: string; amount: number; percent: number }[];
  byRegion: { region: string; department: string; amount: number; percent: number }[];
  byClient: { client: string; amount: number; percent: number; cumulative: number }[];
  bySalesPerson: { name: string; amount: number; margin: number; orderCount: number }[];
  bySizeBucket: { bucket: string; count: number; amount: number; percent: number }[];
  // Concentration
  top10ClientsPercent: number;
  top1ClientPercent: number;
}

// =============================================================================
// Chart Data Types
// =============================================================================

export interface WaterfallChartData {
  label: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'subtotal' | 'end';
  color?: string;
}

export interface BarLineChartData {
  label: string;
  barValue: number;
  lineValue?: number;
  barLabel?: string;
  lineLabel?: string;
}

export interface StackedBarData {
  label: string;
  segments: { label: string; value: number; color?: string }[];
}

export interface PieChartData {
  label: string;
  value: number;
  percent: number;
  color?: string;
}

export interface HeatMapData {
  id: string;
  label: string;
  value: number;
  intensity: number; // 0-1 scale
}

export interface MinMaxAvgData {
  period: string;
  min: number;
  max: number;
  avg: number;
}

// =============================================================================
// PDF Report Types
// =============================================================================

export type ReportSection =
  | 'cover'
  | 'letter'
  | 'glossary'
  | 'methodology'
  | 'company_presentation'
  | 'executive_summary'
  | 'key_points'
  | 'pnl_summary'
  | 'ebitda_bridge'
  | 'qoe_analysis'
  | 'current_trading'
  | 'balance_sheet_summary'
  | 'cash_flow_summary'
  | 'pnl_detail'
  | 'monthly_invoicing'
  | 'product_mix'
  | 'geographic_analysis'
  | 'client_analysis'
  | 'supplier_analysis'
  | 'cost_analysis'
  | 'current_trading_detail'
  | 'order_register_analysis'
  | 'balance_sheet_detail'
  | 'fixed_assets'
  | 'stocks'
  | 'receivables'
  | 'payables'
  | 'cash_flow_detail'
  | 'monthly_cash_reconstruction'
  | 'dso_dpo_analysis'
  | 'annexes';

export interface ReportMetadata {
  targetCompany: string;
  targetCompanySIREN?: string;
  buyerCompany: string;
  preparedBy: string;
  date: Date;
  status: 'draft' | 'final';
  version: string;
  fiscalYears: string[];
  currentTradingPeriod?: string;
}

export interface ReportConfig {
  metadata: ReportMetadata;
  sections: ReportSection[];
  includeAnnexes: boolean;
  language: 'fr' | 'en';
  currency: 'EUR' | 'USD';
  numberFormat: 'fr' | 'en';
}

export interface GeneratedReport {
  config: ReportConfig;
  pnlStatements: PnLStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlowStatement[];
  qoeAnalysis: QoEBridge;
  qodAnalysis: QoDAnalysis;
  orderAnalysis?: OrderAnalysis;
  workingCapital: WorkingCapitalAnalysis;
  charts: Map<string, unknown>;
  commentary: Map<ReportSection, string>;
  generatedAt: Date;
}
