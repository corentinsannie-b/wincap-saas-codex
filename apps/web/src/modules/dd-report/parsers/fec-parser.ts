/**
 * FEC Parser Module
 * =================
 * Parses French FEC (Fichier des Écritures Comptables) files
 * Supports TXT (pipe-delimited), CSV, and XML formats
 */

import type {
  FECEntry,
  FECFile,
  FECParseResult,
  FECValidationError,
} from '../types';

// =============================================================================
// FEC Column Definitions
// =============================================================================

const FEC_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
] as const;

const REQUIRED_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'EcritureLib',
  'Debit',
  'Credit',
];

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Parse a FEC file from string content
 */
export function parseFECContent(
  content: string,
  filename: string,
  options: FECParseOptions = {}
): FECParseResult {
  // Detect if XML format
  const trimmedContent = content.trim();
  if (trimmedContent.startsWith('<?xml') || trimmedContent.startsWith('<')) {
    return parseFECXML(content, filename, options);
  }

  const errors: FECValidationError[] = [];
  const warnings: string[] = [];

  // Detect delimiter (pipe or semicolon or comma)
  const delimiter = detectDelimiter(content);
  if (!delimiter) {
    return {
      success: false,
      errors: [{ line: 0, field: '', value: '', message: 'Could not detect file delimiter' }],
      warnings: [],
    };
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      success: false,
      errors: [{ line: 0, field: '', value: '', message: 'File must contain header and at least one data row' }],
      warnings: [],
    };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter);
  const columnMap = mapColumns(headers, errors);

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  // Parse entries
  const entries: FECEntry[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    const entry = parseEntry(values, columnMap, i + 1, errors, warnings, options);

    if (entry) {
      entries.push(entry);
      totalDebit += entry.Debit;
      totalCredit += entry.Credit;
    }
  }

  // Detect fiscal year from entries
  const dates = entries.map(e => e.EcritureDate).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0] || new Date();
  const endDate = dates[dates.length - 1] || new Date();
  const fiscalYear = determineFiscalYear(startDate, endDate);

  // Check balance
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  if (!isBalanced) {
    warnings.push(
      `File is not balanced: Total Debit = ${totalDebit.toFixed(2)}, Total Credit = ${totalCredit.toFixed(2)}, Difference = ${(totalDebit - totalCredit).toFixed(2)}`
    );
  }

  const fecFile: FECFile = {
    filename,
    fiscalYear,
    startDate,
    endDate,
    entries,
    entryCount: entries.length,
    totalDebit,
    totalCredit,
    isBalanced,
  };

  return {
    success: errors.length === 0,
    data: fecFile,
    errors,
    warnings,
  };
}

export interface FECParseOptions {
  dateFormat?: 'YYYYMMDD' | 'DD/MM/YYYY' | 'auto';
  encoding?: 'utf-8' | 'iso-8859-1' | 'windows-1252';
  strictValidation?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function detectDelimiter(content: string): string | null {
  const firstLine = content.split(/\r?\n/)[0];
  const delimiters = ['|', ';', '\t', ','];

  for (const delim of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delim}`, 'g')) || []).length;
    if (count >= 5) {
      return delim;
    }
  }

  return null;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function mapColumns(
  headers: string[],
  errors: FECValidationError[]
): Map<string, number> {
  const map = new Map<string, number>();

  // Normalize headers (remove accents, lowercase)
  const normalizedHeaders = headers.map(h =>
    h.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  );

  // Map expected columns to their positions
  for (const col of FEC_COLUMNS) {
    const normalizedCol = col.toLowerCase();
    const index = normalizedHeaders.findIndex(h => h === normalizedCol || h.includes(normalizedCol));

    if (index !== -1) {
      map.set(col, index);
    }
  }

  // Validate required columns are present
  for (const required of REQUIRED_COLUMNS) {
    if (!map.has(required)) {
      errors.push({
        line: 1,
        field: required,
        value: '',
        message: `Required column "${required}" not found in header`,
      });
    }
  }

  return map;
}

function parseEntry(
  values: string[],
  columnMap: Map<string, number>,
  lineNumber: number,
  errors: FECValidationError[],
  warnings: string[],
  options: FECParseOptions
): FECEntry | null {
  const getValue = (col: string): string => {
    const index = columnMap.get(col);
    return index !== undefined && index < values.length ? values[index] : '';
  };

  const getNumber = (col: string): number => {
    const val = getValue(col).replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const getDate = (col: string): Date | undefined => {
    const val = getValue(col);
    if (!val) return undefined;
    return parseFECDate(val, options.dateFormat);
  };

  // Parse required fields
  const compteNum = getValue('CompteNum');
  const ecritureDate = getDate('EcritureDate');

  if (!compteNum) {
    errors.push({
      line: lineNumber,
      field: 'CompteNum',
      value: '',
      message: 'Account number is required',
    });
    return null;
  }

  if (!ecritureDate) {
    errors.push({
      line: lineNumber,
      field: 'EcritureDate',
      value: getValue('EcritureDate'),
      message: 'Invalid or missing entry date',
    });
    return null;
  }

  const debit = getNumber('Debit');
  const credit = getNumber('Credit');

  // Validate debit/credit
  if (debit === 0 && credit === 0) {
    warnings.push(`Line ${lineNumber}: Entry has zero debit and credit`);
  }

  if (debit !== 0 && credit !== 0) {
    warnings.push(`Line ${lineNumber}: Entry has both debit and credit - this is unusual`);
  }

  return {
    JournalCode: getValue('JournalCode'),
    JournalLib: getValue('JournalLib'),
    EcritureNum: getValue('EcritureNum'),
    EcritureDate: ecritureDate,
    CompteNum: compteNum,
    CompteLib: getValue('CompteLib'),
    CompAuxNum: getValue('CompAuxNum') || undefined,
    CompAuxLib: getValue('CompAuxLib') || undefined,
    PieceRef: getValue('PieceRef') || undefined,
    PieceDate: getDate('PieceDate'),
    EcritureLib: getValue('EcritureLib'),
    Debit: debit,
    Credit: credit,
    EcritureLet: getValue('EcritureLet') || undefined,
    DateLet: getDate('DateLet'),
    ValidDate: getDate('ValidDate'),
    Montantdevise: getNumber('Montantdevise') || undefined,
    Idevise: getValue('Idevise') || undefined,
  };
}

function parseFECDate(value: string, format?: 'YYYYMMDD' | 'DD/MM/YYYY' | 'auto'): Date | undefined {
  if (!value) return undefined;

  // Clean the value
  const cleaned = value.trim();

  // Try YYYYMMDD format (most common in FEC)
  if (format === 'YYYYMMDD' || format === 'auto' || !format) {
    if (/^\d{8}$/.test(cleaned)) {
      const year = parseInt(cleaned.substring(0, 4));
      const month = parseInt(cleaned.substring(4, 6)) - 1;
      const day = parseInt(cleaned.substring(6, 8));
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Try DD/MM/YYYY format
  if (format === 'DD/MM/YYYY' || format === 'auto' || !format) {
    const parts = cleaned.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Try ISO format
  const isoDate = new Date(cleaned);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return undefined;
}

function determineFiscalYear(startDate: Date, endDate: Date): string {
  // Standard French fiscal year ends December 31
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return startYear.toString();
  }

  // If crosses years, use end year as fiscal year
  return `${startYear}/${endYear}`;
}

// =============================================================================
// Aggregation Functions
// =============================================================================

export interface AccountBalance {
  accountNum: string;
  accountLib: string;
  debit: number;
  credit: number;
  balance: number;
  entryCount: number;
}

export interface AuxiliaryBalance {
  accountNum: string;
  auxNum: string;
  auxLib: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface MonthlyBalance {
  month: Date;
  accountNum: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
}

/**
 * Calculate account balances from FEC entries
 */
export function calculateAccountBalances(entries: FECEntry[]): AccountBalance[] {
  const balanceMap = new Map<string, AccountBalance>();

  for (const entry of entries) {
    const existing = balanceMap.get(entry.CompteNum);

    if (existing) {
      existing.debit += entry.Debit;
      existing.credit += entry.Credit;
      existing.balance = existing.debit - existing.credit;
      existing.entryCount++;
    } else {
      balanceMap.set(entry.CompteNum, {
        accountNum: entry.CompteNum,
        accountLib: entry.CompteLib,
        debit: entry.Debit,
        credit: entry.Credit,
        balance: entry.Debit - entry.Credit,
        entryCount: 1,
      });
    }
  }

  return Array.from(balanceMap.values()).sort((a, b) =>
    a.accountNum.localeCompare(b.accountNum)
  );
}

/**
 * Calculate auxiliary (client/supplier) balances
 */
export function calculateAuxiliaryBalances(
  entries: FECEntry[],
  accountPrefix: string
): AuxiliaryBalance[] {
  const balanceMap = new Map<string, AuxiliaryBalance>();

  for (const entry of entries) {
    if (!entry.CompteNum.startsWith(accountPrefix)) continue;
    if (!entry.CompAuxNum) continue;

    const key = `${entry.CompteNum}|${entry.CompAuxNum}`;
    const existing = balanceMap.get(key);

    if (existing) {
      existing.debit += entry.Debit;
      existing.credit += entry.Credit;
      existing.balance = existing.debit - existing.credit;
    } else {
      balanceMap.set(key, {
        accountNum: entry.CompteNum,
        auxNum: entry.CompAuxNum,
        auxLib: entry.CompAuxLib || '',
        debit: entry.Debit,
        credit: entry.Credit,
        balance: entry.Debit - entry.Credit,
      });
    }
  }

  return Array.from(balanceMap.values()).sort((a, b) =>
    Math.abs(b.balance) - Math.abs(a.balance)
  );
}

/**
 * Calculate monthly balances for an account
 */
export function calculateMonthlyBalances(
  entries: FECEntry[],
  accountPrefix: string
): MonthlyBalance[] {
  // Filter entries for the account
  const accountEntries = entries.filter(e => e.CompteNum.startsWith(accountPrefix));

  // Group by month
  const monthlyMap = new Map<string, { debit: number; credit: number }>();

  for (const entry of accountEntries) {
    const monthKey = `${entry.EcritureDate.getFullYear()}-${String(entry.EcritureDate.getMonth() + 1).padStart(2, '0')}`;

    const existing = monthlyMap.get(monthKey);
    if (existing) {
      existing.debit += entry.Debit;
      existing.credit += entry.Credit;
    } else {
      monthlyMap.set(monthKey, { debit: entry.Debit, credit: entry.Credit });
    }
  }

  // Convert to array with running balance
  const months = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const result: MonthlyBalance[] = [];
  let runningBalance = 0;

  for (const [monthKey, data] of months) {
    const [year, month] = monthKey.split('-').map(Number);
    const openingBalance = runningBalance;
    runningBalance += data.debit - data.credit;

    result.push({
      month: new Date(year, month - 1, 1),
      accountNum: accountPrefix,
      openingBalance,
      debit: data.debit,
      credit: data.credit,
      closingBalance: runningBalance,
    });
  }

  return result;
}

/**
 * Get entries by account prefix
 */
export function getEntriesByAccountPrefix(
  entries: FECEntry[],
  prefix: string
): FECEntry[] {
  return entries.filter(e => e.CompteNum.startsWith(prefix));
}

/**
 * Get entries for a date range
 */
export function getEntriesByDateRange(
  entries: FECEntry[],
  startDate: Date,
  endDate: Date
): FECEntry[] {
  return entries.filter(e =>
    e.EcritureDate >= startDate && e.EcritureDate <= endDate
  );
}

/**
 * Calculate sum of debits for accounts starting with prefix
 */
export function sumDebitsByPrefix(entries: FECEntry[], prefix: string): number {
  return entries
    .filter(e => e.CompteNum.startsWith(prefix))
    .reduce((sum, e) => sum + e.Debit, 0);
}

/**
 * Calculate sum of credits for accounts starting with prefix
 */
export function sumCreditsByPrefix(entries: FECEntry[], prefix: string): number {
  return entries
    .filter(e => e.CompteNum.startsWith(prefix))
    .reduce((sum, e) => sum + e.Credit, 0);
}

/**
 * Calculate net balance for accounts starting with prefix
 */
export function netBalanceByPrefix(entries: FECEntry[], prefix: string): number {
  return entries
    .filter(e => e.CompteNum.startsWith(prefix))
    .reduce((sum, e) => sum + e.Debit - e.Credit, 0);
}

// =============================================================================
// XML Parser
// =============================================================================

/**
 * Parse FEC file in XML format
 * French FEC XML structure follows the official DGFiP specification
 */
export function parseFECXML(
  content: string,
  filename: string,
  options: FECParseOptions = {}
): FECParseResult {
  const errors: FECValidationError[] = [];
  const warnings: string[] = [];
  const entries: FECEntry[] = [];

  try {
    // Parse XML using DOMParser (browser) or create a simple parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        errors: [{
          line: 0,
          field: 'xml',
          value: '',
          message: `XML parsing error: ${parseError.textContent?.substring(0, 200) || 'Unknown error'}`,
        }],
        warnings: [],
      };
    }

    // Find all entry elements (écritures)
    // FEC XML can have different root elements: comptabilite, fichier, fec, etc.
    const ecritureNodes = doc.querySelectorAll('ecriture, Ecriture, ligne, Ligne, operation, Operation');

    if (ecritureNodes.length === 0) {
      // Try alternative structure - flat element approach
      const journalEntries = doc.querySelectorAll('JournalCode, journalcode');
      if (journalEntries.length === 0) {
        return {
          success: false,
          errors: [{
            line: 0,
            field: 'xml',
            value: '',
            message: 'No accounting entries found in XML file. Expected <ecriture>, <ligne>, or <operation> elements.',
          }],
          warnings: [],
        };
      }
    }

    let totalDebit = 0;
    let totalCredit = 0;

    // Process each entry
    ecritureNodes.forEach((node, index) => {
      const entry = parseXMLEntry(node, index + 1, errors, warnings, options);
      if (entry) {
        entries.push(entry);
        totalDebit += entry.Debit;
        totalCredit += entry.Credit;
      }
    });

    // If no entries found with wrapper elements, try direct approach
    if (entries.length === 0) {
      const directResult = parseDirectXMLStructure(doc, errors, warnings, options);
      if (directResult.entries.length > 0) {
        entries.push(...directResult.entries);
        totalDebit = directResult.totalDebit;
        totalCredit = directResult.totalCredit;
      }
    }

    if (entries.length === 0) {
      return {
        success: false,
        errors: [{
          line: 0,
          field: 'xml',
          value: '',
          message: 'No valid accounting entries could be extracted from XML file.',
        }],
        warnings,
      };
    }

    // Detect fiscal year from entries
    const dates = entries.map(e => e.EcritureDate).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0] || new Date();
    const endDate = dates[dates.length - 1] || new Date();
    const fiscalYear = determineFiscalYear(startDate, endDate);

    // Check balance
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    if (!isBalanced) {
      warnings.push(
        `File is not balanced: Total Debit = ${totalDebit.toFixed(2)}, Total Credit = ${totalCredit.toFixed(2)}, Difference = ${(totalDebit - totalCredit).toFixed(2)}`
      );
    }

    const fecFile: FECFile = {
      filename,
      fiscalYear,
      startDate,
      endDate,
      entries,
      entryCount: entries.length,
      totalDebit,
      totalCredit,
      isBalanced,
    };

    return {
      success: errors.length === 0,
      data: fecFile,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        line: 0,
        field: 'xml',
        value: '',
        message: `Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      warnings: [],
    };
  }
}

/**
 * Parse a single XML entry node
 */
function parseXMLEntry(
  node: Element,
  lineNumber: number,
  errors: FECValidationError[],
  warnings: string[],
  options: FECParseOptions
): FECEntry | null {
  const getElementText = (tagNames: string[]): string => {
    for (const tagName of tagNames) {
      const el = node.querySelector(tagName) || node.getElementsByTagName(tagName)[0];
      if (el && el.textContent) {
        return el.textContent.trim();
      }
    }
    return '';
  };

  const getNumber = (tagNames: string[]): number => {
    const val = getElementText(tagNames).replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const getDate = (tagNames: string[]): Date | undefined => {
    const val = getElementText(tagNames);
    if (!val) return undefined;
    return parseFECDate(val, options.dateFormat);
  };

  // Parse required fields
  const compteNum = getElementText(['CompteNum', 'comptenum', 'compte', 'Compte', 'NumCompte', 'numcompte']);
  const ecritureDate = getDate(['EcritureDate', 'ecrituredate', 'date', 'Date', 'DateEcriture', 'dateecriture']);

  if (!compteNum) {
    errors.push({
      line: lineNumber,
      field: 'CompteNum',
      value: '',
      message: 'Account number is required in XML entry',
    });
    return null;
  }

  if (!ecritureDate) {
    errors.push({
      line: lineNumber,
      field: 'EcritureDate',
      value: getElementText(['EcritureDate', 'ecrituredate', 'date', 'Date']),
      message: 'Invalid or missing entry date in XML entry',
    });
    return null;
  }

  const debit = getNumber(['Debit', 'debit', 'MontantDebit', 'montantdebit']);
  const credit = getNumber(['Credit', 'credit', 'MontantCredit', 'montantcredit']);

  // Validate debit/credit
  if (debit === 0 && credit === 0) {
    warnings.push(`XML Entry ${lineNumber}: Entry has zero debit and credit`);
  }

  return {
    JournalCode: getElementText(['JournalCode', 'journalcode', 'journal', 'Journal', 'CodeJournal']),
    JournalLib: getElementText(['JournalLib', 'journallib', 'LibJournal', 'libjournal']),
    EcritureNum: getElementText(['EcritureNum', 'ecriturenum', 'NumEcriture', 'numecriture', 'piece', 'Piece']),
    EcritureDate: ecritureDate,
    CompteNum: compteNum,
    CompteLib: getElementText(['CompteLib', 'comptelib', 'LibCompte', 'libcompte', 'libelle', 'Libelle']),
    CompAuxNum: getElementText(['CompAuxNum', 'compauxnum', 'CompteAuxiliaire', 'compteauxiliaire']) || undefined,
    CompAuxLib: getElementText(['CompAuxLib', 'compauxlib', 'LibCompteAux', 'libcompteaux']) || undefined,
    PieceRef: getElementText(['PieceRef', 'pieceref', 'RefPiece', 'refpiece']) || undefined,
    PieceDate: getDate(['PieceDate', 'piecedate', 'DatePiece', 'datepiece']),
    EcritureLib: getElementText(['EcritureLib', 'ecriturelib', 'LibEcriture', 'libecriture', 'libelle', 'Libelle']),
    Debit: debit,
    Credit: credit,
    EcritureLet: getElementText(['EcritureLet', 'ecriturelet', 'Lettrage', 'lettrage']) || undefined,
    DateLet: getDate(['DateLet', 'datelet', 'DateLettrage', 'datelettrage']),
    ValidDate: getDate(['ValidDate', 'validdate', 'DateValidation', 'datevalidation']),
    Montantdevise: getNumber(['Montantdevise', 'montantdevise', 'MontantDevise']) || undefined,
    Idevise: getElementText(['Idevise', 'idevise', 'Devise', 'devise', 'CodeDevise']) || undefined,
  };
}

/**
 * Parse XML with direct element structure (all entries as sibling elements)
 * Some FEC XML files don't wrap each entry in a container element
 */
function parseDirectXMLStructure(
  doc: Document,
  errors: FECValidationError[],
  warnings: string[],
  options: FECParseOptions
): { entries: FECEntry[]; totalDebit: number; totalCredit: number } {
  const entries: FECEntry[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  // Find all CompteNum elements to identify entry boundaries
  const compteNumElements = doc.querySelectorAll('CompteNum, comptenum');

  if (compteNumElements.length === 0) {
    return { entries: [], totalDebit: 0, totalCredit: 0 };
  }

  // Each CompteNum likely represents one entry
  // Look at parent or sibling elements to extract data
  compteNumElements.forEach((compteNumEl, index) => {
    const parent = compteNumEl.parentElement;
    if (!parent) return;

    const getElementText = (tagNames: string[]): string => {
      for (const tagName of tagNames) {
        const el = parent.querySelector(tagName) || parent.getElementsByTagName(tagName)[0];
        if (el && el.textContent) {
          return el.textContent.trim();
        }
      }
      return '';
    };

    const getNumber = (tagNames: string[]): number => {
      const val = getElementText(tagNames).replace(/\s/g, '').replace(',', '.');
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    const getDate = (tagNames: string[]): Date | undefined => {
      const val = getElementText(tagNames);
      if (!val) return undefined;
      return parseFECDate(val, options.dateFormat);
    };

    const compteNum = compteNumEl.textContent?.trim() || '';
    const ecritureDate = getDate(['EcritureDate', 'ecrituredate', 'date', 'Date']);

    if (!compteNum || !ecritureDate) {
      return;
    }

    const debit = getNumber(['Debit', 'debit']);
    const credit = getNumber(['Credit', 'credit']);

    entries.push({
      JournalCode: getElementText(['JournalCode', 'journalcode']),
      JournalLib: getElementText(['JournalLib', 'journallib']),
      EcritureNum: getElementText(['EcritureNum', 'ecriturenum']),
      EcritureDate: ecritureDate,
      CompteNum: compteNum,
      CompteLib: getElementText(['CompteLib', 'comptelib']),
      CompAuxNum: getElementText(['CompAuxNum', 'compauxnum']) || undefined,
      CompAuxLib: getElementText(['CompAuxLib', 'compauxlib']) || undefined,
      PieceRef: getElementText(['PieceRef', 'pieceref']) || undefined,
      PieceDate: getDate(['PieceDate', 'piecedate']),
      EcritureLib: getElementText(['EcritureLib', 'ecriturelib']),
      Debit: debit,
      Credit: credit,
      EcritureLet: getElementText(['EcritureLet', 'ecriturelet']) || undefined,
      DateLet: getDate(['DateLet', 'datelet']),
      ValidDate: getDate(['ValidDate', 'validdate']),
      Montantdevise: getNumber(['Montantdevise', 'montantdevise']) || undefined,
      Idevise: getElementText(['Idevise', 'idevise']) || undefined,
    });

    totalDebit += debit;
    totalCredit += credit;
  });

  return { entries, totalDebit, totalCredit };
}
