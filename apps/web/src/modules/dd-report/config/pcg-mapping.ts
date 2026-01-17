/**
 * PCG (Plan Comptable Général) Mapping Configuration
 * ===================================================
 * Maps French accounting codes to P&L and Balance Sheet sections
 */

import type { PCGCategory, PCGMapping, PnLSection, BalanceSheetSection } from '../types';

// =============================================================================
// Complete PCG Account Mapping
// =============================================================================

export const PCG_MAPPINGS: PCGMapping[] = [
  // Classe 1 - Capitaux
  { accountPrefix: '10', category: 'capital', label: 'Capital', bsSection: 'capital_social' },
  { accountPrefix: '11', category: 'reserves', label: 'Réserves', bsSection: 'reserves' },
  { accountPrefix: '12', category: 'resultat', label: 'Résultat de l\'exercice', bsSection: 'resultat_exercice' },
  { accountPrefix: '13', category: 'subventions', label: 'Subventions d\'investissement', bsSection: 'capitaux_propres' },
  { accountPrefix: '14', category: 'provisions_reglementees', label: 'Provisions réglementées', bsSection: 'capitaux_propres' },
  { accountPrefix: '15', category: 'provisions_risques', label: 'Provisions pour risques et charges', bsSection: 'provisions_risques' },
  { accountPrefix: '16', category: 'emprunts', label: 'Emprunts et dettes assimilées', bsSection: 'emprunts_etablissements' },
  { accountPrefix: '17', category: 'dettes_rattachees', label: 'Dettes rattachées à des participations', bsSection: 'autres_dettes_financieres' },
  { accountPrefix: '18', category: 'comptes_liaison', label: 'Comptes de liaison', bsSection: 'autres_dettes' },

  // Classe 2 - Immobilisations
  { accountPrefix: '20', category: 'immobilisations_incorporelles', label: 'Immobilisations incorporelles', bsSection: 'immobilisations_incorporelles_brut' },
  { accountPrefix: '21', category: 'immobilisations_corporelles', label: 'Immobilisations corporelles', bsSection: 'immobilisations_corporelles_brut' },
  { accountPrefix: '22', category: 'immobilisations_corporelles', label: 'Immobilisations mises en concession', bsSection: 'immobilisations_corporelles_brut' },
  { accountPrefix: '23', category: 'immobilisations_corporelles', label: 'Immobilisations en cours', bsSection: 'immobilisations_corporelles_brut' },
  { accountPrefix: '26', category: 'immobilisations_financieres', label: 'Participations', bsSection: 'immobilisations_financieres' },
  { accountPrefix: '27', category: 'immobilisations_financieres', label: 'Autres immobilisations financières', bsSection: 'immobilisations_financieres' },
  { accountPrefix: '28', category: 'amortissements', label: 'Amortissements des immobilisations', bsSection: 'immobilisations_corporelles_amort' },
  { accountPrefix: '29', category: 'depreciations_immobilisations', label: 'Dépréciations des immobilisations', bsSection: 'immobilisations_corporelles_amort' },

  // Classe 3 - Stocks
  { accountPrefix: '31', category: 'stocks_matieres', label: 'Matières premières', bsSection: 'stocks_matieres' },
  { accountPrefix: '32', category: 'stocks_matieres', label: 'Autres approvisionnements', bsSection: 'stocks_matieres' },
  { accountPrefix: '33', category: 'stocks_encours', label: 'En-cours de production de biens', bsSection: 'stocks_encours' },
  { accountPrefix: '34', category: 'stocks_encours', label: 'En-cours de production de services', bsSection: 'stocks_encours' },
  { accountPrefix: '35', category: 'stocks_produits', label: 'Stocks de produits', bsSection: 'stocks_produits' },
  { accountPrefix: '37', category: 'stocks_marchandises', label: 'Stocks de marchandises', bsSection: 'stocks_marchandises' },
  { accountPrefix: '39', category: 'depreciations_immobilisations', label: 'Dépréciations des stocks', bsSection: 'stocks_total' },

  // Classe 4 - Tiers
  { accountPrefix: '40', category: 'fournisseurs', label: 'Fournisseurs et comptes rattachés', bsSection: 'fournisseurs' },
  { accountPrefix: '41', category: 'clients', label: 'Clients et comptes rattachés', bsSection: 'clients_brut' },
  { accountPrefix: '42', category: 'personnel', label: 'Personnel et comptes rattachés', bsSection: 'dettes_fiscales_sociales' },
  { accountPrefix: '43', category: 'securite_sociale', label: 'Sécurité sociale et organismes sociaux', bsSection: 'dettes_fiscales_sociales' },
  { accountPrefix: '44', category: 'etat_impots', label: 'État et collectivités publiques', bsSection: 'dettes_fiscales_sociales' },
  { accountPrefix: '45', category: 'groupe_associes', label: 'Groupe et associés', bsSection: 'autres_dettes' },
  { accountPrefix: '46', category: 'debiteurs_crediteurs_divers', label: 'Débiteurs et créditeurs divers', bsSection: 'autres_dettes' },
  { accountPrefix: '47', category: 'comptes_transitoires', label: 'Comptes transitoires', bsSection: 'autres_dettes' },
  { accountPrefix: '48', category: 'charges_constatees_avance', label: 'Charges constatées d\'avance', bsSection: 'charges_constatees_avance' },
  { accountPrefix: '49', category: 'depreciations_comptes_tiers', label: 'Dépréciations des comptes de tiers', bsSection: 'clients_provisions' },

  // Classe 5 - Financiers
  { accountPrefix: '50', category: 'valeurs_mobilieres', label: 'Valeurs mobilières de placement', bsSection: 'valeurs_mobilieres' },
  { accountPrefix: '51', category: 'banques', label: 'Banques, établissements financiers', bsSection: 'disponibilites' },
  { accountPrefix: '52', category: 'banques', label: 'Instruments de trésorerie', bsSection: 'disponibilites' },
  { accountPrefix: '53', category: 'caisse', label: 'Caisse', bsSection: 'disponibilites' },
  { accountPrefix: '58', category: 'banques', label: 'Virements internes', bsSection: 'disponibilites' },
  { accountPrefix: '59', category: 'depreciations_comptes_tiers', label: 'Dépréciations des VMP', bsSection: 'valeurs_mobilieres' },

  // Classe 6 - Charges
  { accountPrefix: '60', category: 'achats_stockes', label: 'Achats', pnlSection: 'achats_consommes' },
  { accountPrefix: '61', category: 'services_exterieurs', label: 'Services extérieurs', pnlSection: 'services_exterieurs' },
  { accountPrefix: '62', category: 'autres_services_exterieurs', label: 'Autres services extérieurs', pnlSection: 'services_exterieurs' },
  { accountPrefix: '63', category: 'impots_taxes', label: 'Impôts, taxes et versements assimilés', pnlSection: 'impots_taxes' },
  { accountPrefix: '64', category: 'charges_personnel', label: 'Charges de personnel', pnlSection: 'charges_personnel' },
  { accountPrefix: '65', category: 'autres_charges_gestion', label: 'Autres charges de gestion courante', pnlSection: 'autres_charges_gestion' },
  { accountPrefix: '66', category: 'charges_financieres', label: 'Charges financières', pnlSection: 'charges_financieres' },
  { accountPrefix: '67', category: 'charges_exceptionnelles', label: 'Charges exceptionnelles', pnlSection: 'charges_exceptionnelles' },
  { accountPrefix: '68', category: 'dotations_amortissements', label: 'Dotations aux amortissements et provisions', pnlSection: 'dotations_amortissements' },
  { accountPrefix: '69', category: 'participation_impot', label: 'Participation et impôt sur les bénéfices', pnlSection: 'impot_societes' },

  // Classe 7 - Produits
  { accountPrefix: '70', category: 'ventes_produits', label: 'Ventes de produits et prestations', pnlSection: 'chiffre_affaires' },
  { accountPrefix: '71', category: 'production_stockee', label: 'Production stockée', pnlSection: 'variation_encours' },
  { accountPrefix: '72', category: 'production_immobilisee', label: 'Production immobilisée', pnlSection: 'chiffre_affaires' },
  { accountPrefix: '74', category: 'produits_annexes', label: 'Subventions d\'exploitation', pnlSection: 'chiffre_affaires' },
  { accountPrefix: '75', category: 'produits_annexes', label: 'Autres produits de gestion courante', pnlSection: 'autres_charges_gestion' },
  { accountPrefix: '76', category: 'produits_financiers', label: 'Produits financiers', pnlSection: 'produits_financiers' },
  { accountPrefix: '77', category: 'produits_exceptionnels', label: 'Produits exceptionnels', pnlSection: 'produits_exceptionnels' },
  { accountPrefix: '78', category: 'reprises_provisions', label: 'Reprises sur provisions et amortissements', pnlSection: 'dotations_amortissements' },
  { accountPrefix: '79', category: 'transferts_charges', label: 'Transferts de charges', pnlSection: 'autres_charges_gestion' },
];

// =============================================================================
// Account Classification Helpers
// =============================================================================

/**
 * Get PCG mapping for a given account number
 */
export function getPCGMapping(accountNum: string): PCGMapping | undefined {
  // Try exact prefix match first (longer prefixes first)
  const sortedMappings = [...PCG_MAPPINGS].sort((a, b) => b.accountPrefix.length - a.accountPrefix.length);

  for (const mapping of sortedMappings) {
    if (accountNum.startsWith(mapping.accountPrefix)) {
      return mapping;
    }
  }

  return undefined;
}

/**
 * Determine if an account is a debit-normal or credit-normal account
 */
export function isDebitNormalAccount(accountNum: string): boolean {
  const firstChar = accountNum.charAt(0);
  // Classes 2, 3, 5 (assets), 6 (expenses) are debit-normal
  return ['2', '3', '5', '6'].includes(firstChar);
}

/**
 * Get all account prefixes for a P&L section
 */
export function getAccountPrefixesForPnLSection(section: PnLSection): string[] {
  return PCG_MAPPINGS
    .filter(m => m.pnlSection === section)
    .map(m => m.accountPrefix);
}

/**
 * Get all account prefixes for a Balance Sheet section
 */
export function getAccountPrefixesForBSSection(section: BalanceSheetSection): string[] {
  return PCG_MAPPINGS
    .filter(m => m.bsSection === section)
    .map(m => m.accountPrefix);
}

// =============================================================================
// Detailed Account Mapping for Specific Analysis
// =============================================================================

/**
 * Detailed mapping for sous-traitance (subcontracting) accounts
 */
export const SOUS_TRAITANCE_ACCOUNTS = ['611', '6111', '6112'];

/**
 * Detailed mapping for CEO/director compensation
 */
export const REMUNERATION_DIRIGEANTS_ACCOUNTS = ['641', '6411', '6413'];

/**
 * Detailed mapping for operating lease expenses (to add back for EBITDA)
 */
export const LOCATION_ACCOUNTS = ['6122', '6132', '613'];

/**
 * Detailed mapping for intercompany accounts
 */
export const INTERCOMPANY_ACCOUNTS = ['451', '455', '458'];

/**
 * Accounts typically containing non-recurring items
 */
export const NON_RECURRING_ACCOUNTS = [
  '67',   // All exceptional charges
  '77',   // All exceptional income
  '6712', // Pénalités et amendes
  '6713', // Dons et mécénat
  '6714', // Créances devenues irrécouvrables
  '6717', // Rappels d'impôts
  '6718', // Autres charges exceptionnelles sur opérations de gestion
  '675',  // VNC des éléments d'actif cédés
  '678',  // Autres charges exceptionnelles
  '7713', // Libéralités reçues
  '7714', // Rentrées sur créances amorties
  '7718', // Autres produits exceptionnels sur opérations de gestion
  '775',  // Produits des cessions d'éléments d'actif
  '778',  // Autres produits exceptionnels
];

// =============================================================================
// French Regional Department Mapping
// =============================================================================

export const FRENCH_DEPARTMENTS: Record<string, { name: string; region: string }> = {
  '01': { name: 'Ain', region: 'Auvergne-Rhône-Alpes' },
  '02': { name: 'Aisne', region: 'Hauts-de-France' },
  '03': { name: 'Allier', region: 'Auvergne-Rhône-Alpes' },
  '04': { name: 'Alpes-de-Haute-Provence', region: 'Provence-Alpes-Côte d\'Azur' },
  '05': { name: 'Hautes-Alpes', region: 'Provence-Alpes-Côte d\'Azur' },
  '06': { name: 'Alpes-Maritimes', region: 'Provence-Alpes-Côte d\'Azur' },
  '07': { name: 'Ardèche', region: 'Auvergne-Rhône-Alpes' },
  '08': { name: 'Ardennes', region: 'Grand Est' },
  '09': { name: 'Ariège', region: 'Occitanie' },
  '10': { name: 'Aube', region: 'Grand Est' },
  '11': { name: 'Aude', region: 'Occitanie' },
  '12': { name: 'Aveyron', region: 'Occitanie' },
  '13': { name: 'Bouches-du-Rhône', region: 'Provence-Alpes-Côte d\'Azur' },
  '14': { name: 'Calvados', region: 'Normandie' },
  '15': { name: 'Cantal', region: 'Auvergne-Rhône-Alpes' },
  '16': { name: 'Charente', region: 'Nouvelle-Aquitaine' },
  '17': { name: 'Charente-Maritime', region: 'Nouvelle-Aquitaine' },
  '18': { name: 'Cher', region: 'Centre-Val de Loire' },
  '19': { name: 'Corrèze', region: 'Nouvelle-Aquitaine' },
  '2A': { name: 'Corse-du-Sud', region: 'Corse' },
  '2B': { name: 'Haute-Corse', region: 'Corse' },
  '21': { name: 'Côte-d\'Or', region: 'Bourgogne-Franche-Comté' },
  '22': { name: 'Côtes-d\'Armor', region: 'Bretagne' },
  '23': { name: 'Creuse', region: 'Nouvelle-Aquitaine' },
  '24': { name: 'Dordogne', region: 'Nouvelle-Aquitaine' },
  '25': { name: 'Doubs', region: 'Bourgogne-Franche-Comté' },
  '26': { name: 'Drôme', region: 'Auvergne-Rhône-Alpes' },
  '27': { name: 'Eure', region: 'Normandie' },
  '28': { name: 'Eure-et-Loir', region: 'Centre-Val de Loire' },
  '29': { name: 'Finistère', region: 'Bretagne' },
  '30': { name: 'Gard', region: 'Occitanie' },
  '31': { name: 'Haute-Garonne', region: 'Occitanie' },
  '32': { name: 'Gers', region: 'Occitanie' },
  '33': { name: 'Gironde', region: 'Nouvelle-Aquitaine' },
  '34': { name: 'Hérault', region: 'Occitanie' },
  '35': { name: 'Ille-et-Vilaine', region: 'Bretagne' },
  '36': { name: 'Indre', region: 'Centre-Val de Loire' },
  '37': { name: 'Indre-et-Loire', region: 'Centre-Val de Loire' },
  '38': { name: 'Isère', region: 'Auvergne-Rhône-Alpes' },
  '39': { name: 'Jura', region: 'Bourgogne-Franche-Comté' },
  '40': { name: 'Landes', region: 'Nouvelle-Aquitaine' },
  '41': { name: 'Loir-et-Cher', region: 'Centre-Val de Loire' },
  '42': { name: 'Loire', region: 'Auvergne-Rhône-Alpes' },
  '43': { name: 'Haute-Loire', region: 'Auvergne-Rhône-Alpes' },
  '44': { name: 'Loire-Atlantique', region: 'Pays de la Loire' },
  '45': { name: 'Loiret', region: 'Centre-Val de Loire' },
  '46': { name: 'Lot', region: 'Occitanie' },
  '47': { name: 'Lot-et-Garonne', region: 'Nouvelle-Aquitaine' },
  '48': { name: 'Lozère', region: 'Occitanie' },
  '49': { name: 'Maine-et-Loire', region: 'Pays de la Loire' },
  '50': { name: 'Manche', region: 'Normandie' },
  '51': { name: 'Marne', region: 'Grand Est' },
  '52': { name: 'Haute-Marne', region: 'Grand Est' },
  '53': { name: 'Mayenne', region: 'Pays de la Loire' },
  '54': { name: 'Meurthe-et-Moselle', region: 'Grand Est' },
  '55': { name: 'Meuse', region: 'Grand Est' },
  '56': { name: 'Morbihan', region: 'Bretagne' },
  '57': { name: 'Moselle', region: 'Grand Est' },
  '58': { name: 'Nièvre', region: 'Bourgogne-Franche-Comté' },
  '59': { name: 'Nord', region: 'Hauts-de-France' },
  '60': { name: 'Oise', region: 'Hauts-de-France' },
  '61': { name: 'Orne', region: 'Normandie' },
  '62': { name: 'Pas-de-Calais', region: 'Hauts-de-France' },
  '63': { name: 'Puy-de-Dôme', region: 'Auvergne-Rhône-Alpes' },
  '64': { name: 'Pyrénées-Atlantiques', region: 'Nouvelle-Aquitaine' },
  '65': { name: 'Hautes-Pyrénées', region: 'Occitanie' },
  '66': { name: 'Pyrénées-Orientales', region: 'Occitanie' },
  '67': { name: 'Bas-Rhin', region: 'Grand Est' },
  '68': { name: 'Haut-Rhin', region: 'Grand Est' },
  '69': { name: 'Rhône', region: 'Auvergne-Rhône-Alpes' },
  '70': { name: 'Haute-Saône', region: 'Bourgogne-Franche-Comté' },
  '71': { name: 'Saône-et-Loire', region: 'Bourgogne-Franche-Comté' },
  '72': { name: 'Sarthe', region: 'Pays de la Loire' },
  '73': { name: 'Savoie', region: 'Auvergne-Rhône-Alpes' },
  '74': { name: 'Haute-Savoie', region: 'Auvergne-Rhône-Alpes' },
  '75': { name: 'Paris', region: 'Île-de-France' },
  '76': { name: 'Seine-Maritime', region: 'Normandie' },
  '77': { name: 'Seine-et-Marne', region: 'Île-de-France' },
  '78': { name: 'Yvelines', region: 'Île-de-France' },
  '79': { name: 'Deux-Sèvres', region: 'Nouvelle-Aquitaine' },
  '80': { name: 'Somme', region: 'Hauts-de-France' },
  '81': { name: 'Tarn', region: 'Occitanie' },
  '82': { name: 'Tarn-et-Garonne', region: 'Occitanie' },
  '83': { name: 'Var', region: 'Provence-Alpes-Côte d\'Azur' },
  '84': { name: 'Vaucluse', region: 'Provence-Alpes-Côte d\'Azur' },
  '85': { name: 'Vendée', region: 'Pays de la Loire' },
  '86': { name: 'Vienne', region: 'Nouvelle-Aquitaine' },
  '87': { name: 'Haute-Vienne', region: 'Nouvelle-Aquitaine' },
  '88': { name: 'Vosges', region: 'Grand Est' },
  '89': { name: 'Yonne', region: 'Bourgogne-Franche-Comté' },
  '90': { name: 'Territoire de Belfort', region: 'Bourgogne-Franche-Comté' },
  '91': { name: 'Essonne', region: 'Île-de-France' },
  '92': { name: 'Hauts-de-Seine', region: 'Île-de-France' },
  '93': { name: 'Seine-Saint-Denis', region: 'Île-de-France' },
  '94': { name: 'Val-de-Marne', region: 'Île-de-France' },
  '95': { name: 'Val-d\'Oise', region: 'Île-de-France' },
};

/**
 * Get department info from postal code
 */
export function getDepartmentFromPostalCode(postalCode: string): { department: string; region: string } | undefined {
  const deptCode = postalCode.substring(0, 2);
  const dept = FRENCH_DEPARTMENTS[deptCode];

  if (dept) {
    return { department: dept.name, region: dept.region };
  }

  // Handle Corsica (20xxx)
  if (deptCode === '20') {
    const fullCode = postalCode.substring(0, 3);
    if (parseInt(fullCode) < 201) {
      return { department: 'Corse-du-Sud', region: 'Corse' };
    }
    return { department: 'Haute-Corse', region: 'Corse' };
  }

  return undefined;
}
