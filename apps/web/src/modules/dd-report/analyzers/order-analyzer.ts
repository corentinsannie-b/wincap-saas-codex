/**
 * Order Register Analyzer Module
 * ===============================
 * Analyzes commercial order data for current trading insights
 */

import type {
  Order,
  OrderRegister,
  OrderAnalysis,
} from '../types';
import { getDepartmentFromPostalCode, FRENCH_DEPARTMENTS } from '../config/pcg-mapping';

// =============================================================================
// Order Parser (from Excel/CSV data)
// =============================================================================

export interface RawOrderData {
  date: string | Date;
  client: string;
  clientCode?: string;
  postalCode?: string;
  department?: string;
  productType?: string;
  salesPerson?: string;
  amountHT: number | string;
  marginHT?: number | string;
  marginPercent?: number | string;
  invoicedAmount?: number | string;
  invoiceDate?: string | Date;
  status?: string;
}

/**
 * Parse raw order data into Order objects
 */
export function parseOrders(rawData: RawOrderData[]): Order[] {
  return rawData.map((raw, index) => {
    const order: Order = {
      id: `order_${index + 1}`,
      date: parseDate(raw.date),
      clientName: raw.client?.toString().trim() || 'Unknown',
      clientCode: raw.clientCode?.toString().trim(),
      productType: parseProductType(raw.productType),
      department: raw.department || getDepartmentFromPostalCode(raw.postalCode || '')?.department,
      region: raw.postalCode ? getDepartmentFromPostalCode(raw.postalCode)?.region : undefined,
      salesPerson: raw.salesPerson?.toString().trim(),
      amountHT: parseNumber(raw.amountHT),
      marginHT: raw.marginHT ? parseNumber(raw.marginHT) : undefined,
      marginPercent: raw.marginPercent ? parseNumber(raw.marginPercent) : undefined,
      invoicedAmount: raw.invoicedAmount ? parseNumber(raw.invoicedAmount) : undefined,
      invoiceDate: raw.invoiceDate ? parseDate(raw.invoiceDate) : undefined,
      status: parseStatus(raw.status, raw.invoicedAmount),
    };

    // Calculate margin percent if we have margin and amount
    if (order.marginHT !== undefined && order.amountHT > 0 && order.marginPercent === undefined) {
      order.marginPercent = (order.marginHT / order.amountHT) * 100;
    }

    return order;
  }).filter(o => o.amountHT > 0); // Filter out zero/negative orders
}

function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date();

  // Try various date formats
  const cleaned = value.toString().trim();

  // DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
  }

  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // Try native parsing
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  // Clean the string: remove spaces, handle French format (comma as decimal)
  const cleaned = value.toString()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseProductType(value?: string): Order['productType'] {
  if (!value) return 'mixte';

  const lower = value.toLowerCase().trim();

  if (lower.includes('neuf') || lower.includes('new')) return 'neuf';
  if (lower.includes('occasion') || lower.includes('used') || lower.includes('occ')) return 'occasion';
  if (lower.includes('service') || lower.includes('prestation') || lower.includes('install')) return 'service';

  return 'mixte';
}

function parseStatus(status?: string, invoicedAmount?: number | string): Order['status'] {
  if (status) {
    const lower = status.toLowerCase();
    if (lower.includes('cancel') || lower.includes('annul')) return 'cancelled';
    if (lower.includes('partial') || lower.includes('partiel')) return 'partial';
    if (lower.includes('invoice') || lower.includes('factur')) return 'invoiced';
  }

  // Infer from invoiced amount
  const invoiced = parseNumber(invoicedAmount || 0);
  if (invoiced > 0) return 'invoiced';

  return 'pending';
}

// =============================================================================
// Order Register Creation
// =============================================================================

/**
 * Create order register from parsed orders
 */
export function createOrderRegister(
  orders: Order[],
  periodStart: Date,
  periodEnd: Date
): OrderRegister {
  const filteredOrders = orders.filter(o =>
    o.date >= periodStart && o.date <= periodEnd
  );

  const totalAmountHT = filteredOrders.reduce((sum, o) => sum + o.amountHT, 0);
  const totalMarginHT = filteredOrders.reduce((sum, o) => sum + (o.marginHT || 0), 0);
  const averageMarginPercent = totalAmountHT > 0 ? (totalMarginHT / totalAmountHT) * 100 : 0;

  return {
    orders: filteredOrders,
    periodStart,
    periodEnd,
    totalOrders: filteredOrders.length,
    totalAmountHT,
    totalMarginHT,
    averageMarginPercent,
  };
}

// =============================================================================
// Order Analysis Functions
// =============================================================================

/**
 * Generate comprehensive order analysis
 */
export function analyzeOrders(register: OrderRegister): OrderAnalysis {
  const { orders } = register;

  return {
    monthlyOrders: analyzeByMonth(orders),
    ltm: calculateLTM(orders),
    byProductType: analyzeByProductType(orders),
    byRegion: analyzeByRegion(orders),
    byClient: analyzeByClient(orders),
    bySalesPerson: analyzeBySalesPerson(orders),
    bySizeBucket: analyzeBySizeBucket(orders),
    top10ClientsPercent: calculateTop10Percent(orders),
    top1ClientPercent: calculateTop1Percent(orders),
  };
}

/**
 * Analyze orders by month
 */
function analyzeByMonth(orders: Order[]): { month: Date; count: number; amount: number; margin: number }[] {
  const byMonth = new Map<string, { count: number; amount: number; margin: number }>();

  for (const order of orders) {
    const monthKey = `${order.date.getFullYear()}-${String(order.date.getMonth() + 1).padStart(2, '0')}`;
    const existing = byMonth.get(monthKey) || { count: 0, amount: 0, margin: 0 };

    existing.count++;
    existing.amount += order.amountHT;
    existing.margin += order.marginHT || 0;

    byMonth.set(monthKey, existing);
  }

  return Array.from(byMonth.entries())
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        month: new Date(year, month - 1, 1),
        ...data,
      };
    })
    .sort((a, b) => a.month.getTime() - b.month.getTime());
}

/**
 * Calculate LTM (Last Twelve Months) metrics
 */
function calculateLTM(orders: Order[]): { amount: number; margin: number; orderCount: number } {
  const now = new Date();
  const ltmStart = new Date(now);
  ltmStart.setFullYear(ltmStart.getFullYear() - 1);

  const ltmOrders = orders.filter(o => o.date >= ltmStart && o.date <= now);

  return {
    amount: ltmOrders.reduce((sum, o) => sum + o.amountHT, 0),
    margin: ltmOrders.reduce((sum, o) => sum + (o.marginHT || 0), 0),
    orderCount: ltmOrders.length,
  };
}

/**
 * Analyze by product type
 */
function analyzeByProductType(orders: Order[]): { type: string; amount: number; percent: number }[] {
  const total = orders.reduce((sum, o) => sum + o.amountHT, 0);
  const byType = new Map<string, number>();

  for (const order of orders) {
    const existing = byType.get(order.productType) || 0;
    byType.set(order.productType, existing + order.amountHT);
  }

  return Array.from(byType.entries())
    .map(([type, amount]) => ({
      type,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Analyze by region/department
 */
function analyzeByRegion(orders: Order[]): { region: string; department: string; amount: number; percent: number }[] {
  const total = orders.reduce((sum, o) => sum + o.amountHT, 0);
  const byRegion = new Map<string, { department: string; amount: number }>();

  for (const order of orders) {
    const region = order.region || 'Non renseigné';
    const department = order.department || 'Non renseigné';
    const key = `${region}|${department}`;

    const existing = byRegion.get(key) || { department, amount: 0 };
    existing.amount += order.amountHT;
    byRegion.set(key, existing);
  }

  return Array.from(byRegion.entries())
    .map(([key, data]) => {
      const [region] = key.split('|');
      return {
        region,
        department: data.department,
        amount: data.amount,
        percent: total > 0 ? (data.amount / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Analyze by client
 */
function analyzeByClient(orders: Order[]): { client: string; amount: number; percent: number; cumulative: number }[] {
  const total = orders.reduce((sum, o) => sum + o.amountHT, 0);
  const byClient = new Map<string, number>();

  for (const order of orders) {
    const existing = byClient.get(order.clientName) || 0;
    byClient.set(order.clientName, existing + order.amountHT);
  }

  const sorted = Array.from(byClient.entries())
    .map(([client, amount]) => ({
      client,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
      cumulative: 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate cumulative
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.percent;
    item.cumulative = cumulative;
  }

  return sorted;
}

/**
 * Analyze by sales person
 */
function analyzeBySalesPerson(orders: Order[]): { name: string; amount: number; margin: number; orderCount: number }[] {
  const bySales = new Map<string, { amount: number; margin: number; count: number }>();

  for (const order of orders) {
    const name = order.salesPerson || 'Non assigné';
    const existing = bySales.get(name) || { amount: 0, margin: 0, count: 0 };

    existing.amount += order.amountHT;
    existing.margin += order.marginHT || 0;
    existing.count++;

    bySales.set(name, existing);
  }

  return Array.from(bySales.entries())
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      margin: data.margin,
      orderCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Analyze by size bucket
 */
function analyzeBySizeBucket(orders: Order[]): { bucket: string; count: number; amount: number; percent: number }[] {
  const total = orders.reduce((sum, o) => sum + o.amountHT, 0);
  const buckets = [
    { min: 0, max: 1000, label: '< 1k€' },
    { min: 1000, max: 5000, label: '1-5k€' },
    { min: 5000, max: 10000, label: '5-10k€' },
    { min: 10000, max: 25000, label: '10-25k€' },
    { min: 25000, max: 50000, label: '25-50k€' },
    { min: 50000, max: 100000, label: '50-100k€' },
    { min: 100000, max: 150000, label: '100-150k€' },
    { min: 150000, max: Infinity, label: '> 150k€' },
  ];

  const result = buckets.map(b => ({ bucket: b.label, count: 0, amount: 0, percent: 0 }));

  for (const order of orders) {
    for (let i = 0; i < buckets.length; i++) {
      if (order.amountHT >= buckets[i].min && order.amountHT < buckets[i].max) {
        result[i].count++;
        result[i].amount += order.amountHT;
        break;
      }
    }
  }

  // Calculate percentages
  for (const item of result) {
    item.percent = total > 0 ? (item.amount / total) * 100 : 0;
  }

  return result;
}

/**
 * Calculate top 10 clients concentration
 */
function calculateTop10Percent(orders: Order[]): number {
  const byClient = analyzeByClient(orders);
  const top10 = byClient.slice(0, 10);
  return top10.reduce((sum, c) => sum + c.percent, 0);
}

/**
 * Calculate top 1 client concentration
 */
function calculateTop1Percent(orders: Order[]): number {
  const byClient = analyzeByClient(orders);
  return byClient.length > 0 ? byClient[0].percent : 0;
}

// =============================================================================
// Reconciliation with FEC
// =============================================================================

export interface ReconciliationResult {
  orderRegisterTotal: number;
  fecInvoicedTotal: number;
  difference: number;
  differencePercent: number;
  status: 'matched' | 'minor_diff' | 'major_diff';
  notes: string[];
}

/**
 * Reconcile order register with FEC invoicing
 */
export function reconcileWithFEC(
  register: OrderRegister,
  fecChiffreAffaires: number,
  tolerance: number = 0.05 // 5% tolerance
): ReconciliationResult {
  const orderTotal = register.totalAmountHT;
  const difference = fecChiffreAffaires - orderTotal;
  const differencePercent = orderTotal > 0 ? Math.abs(difference / orderTotal) : 0;

  const notes: string[] = [];

  if (difference > 0) {
    notes.push(`FEC shows ${Math.abs(difference).toLocaleString()}€ more than order register`);
    notes.push('Possible causes: invoiced orders not in register, adjustments, older orders');
  } else if (difference < 0) {
    notes.push(`Order register shows ${Math.abs(difference).toLocaleString()}€ more than FEC`);
    notes.push('Possible causes: pending orders, cancelled orders still in register, timing differences');
  }

  let status: ReconciliationResult['status'];
  if (differencePercent <= 0.01) {
    status = 'matched';
    notes.push('Reconciliation within 1% - acceptable');
  } else if (differencePercent <= tolerance) {
    status = 'minor_diff';
    notes.push(`Reconciliation within ${(tolerance * 100).toFixed(0)}% tolerance`);
  } else {
    status = 'major_diff';
    notes.push('Significant reconciliation difference - requires investigation');
  }

  return {
    orderRegisterTotal: orderTotal,
    fecInvoicedTotal: fecChiffreAffaires,
    difference,
    differencePercent,
    status,
    notes,
  };
}

// =============================================================================
// Order Bridge Analysis (Y-o-Y comparison)
// =============================================================================

export interface OrderBridgeItem {
  label: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'end';
}

/**
 * Generate order amount bridge between two periods
 */
export function generateOrderBridge(
  previousAnalysis: OrderAnalysis,
  currentAnalysis: OrderAnalysis
): OrderBridgeItem[] {
  const bridge: OrderBridgeItem[] = [];

  const prevTotal = previousAnalysis.ltm.amount;
  const currTotal = currentAnalysis.ltm.amount;

  bridge.push({
    label: 'Commandes N-1',
    value: prevTotal,
    type: 'start',
  });

  // Analyze drivers of change
  const prevByType = new Map(previousAnalysis.byProductType.map(t => [t.type, t.amount]));
  const currByType = new Map(currentAnalysis.byProductType.map(t => [t.type, t.amount]));

  // Product type variations
  for (const [type, currAmount] of currByType) {
    const prevAmount = prevByType.get(type) || 0;
    const variation = currAmount - prevAmount;

    if (Math.abs(variation) > prevTotal * 0.01) { // Only show if > 1% impact
      bridge.push({
        label: `Δ ${type}`,
        value: variation,
        type: variation >= 0 ? 'positive' : 'negative',
      });
    }
  }

  // New product types
  for (const [type, prevAmount] of prevByType) {
    if (!currByType.has(type) && prevAmount > prevTotal * 0.01) {
      bridge.push({
        label: `Δ ${type}`,
        value: -prevAmount,
        type: 'negative',
      });
    }
  }

  bridge.push({
    label: 'Commandes N',
    value: currTotal,
    type: 'end',
  });

  return bridge;
}

// =============================================================================
// Current Trading Projections
// =============================================================================

export interface CurrentTradingProjection {
  ordersToDate: number;
  projectedFullYear: number;
  projectionMethod: 'run_rate' | 'seasonality_adjusted';
  confidenceLevel: 'high' | 'medium' | 'low';
  notes: string[];
}

/**
 * Project full year based on current trading
 */
export function projectCurrentTrading(
  currentPeriodOrders: Order[],
  periodEndDate: Date,
  fiscalYearEnd: Date,
  previousYearMonthly?: { month: Date; amount: number }[]
): CurrentTradingProjection {
  const notes: string[] = [];

  // Calculate orders to date
  const ordersToDate = currentPeriodOrders.reduce((sum, o) => sum + o.amountHT, 0);

  // Calculate days elapsed and remaining
  const fiscalYearStart = new Date(fiscalYearEnd);
  fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
  fiscalYearStart.setDate(fiscalYearStart.getDate() + 1);

  const daysElapsed = Math.floor((periodEndDate.getTime() - fiscalYearStart.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((fiscalYearEnd.getTime() - fiscalYearStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = totalDays - daysElapsed;

  let projectedFullYear: number;
  let projectionMethod: CurrentTradingProjection['projectionMethod'];
  let confidenceLevel: CurrentTradingProjection['confidenceLevel'];

  // Try seasonality-adjusted projection if we have previous year data
  if (previousYearMonthly && previousYearMonthly.length >= 12) {
    const prevYearTotal = previousYearMonthly.reduce((sum, m) => sum + m.amount, 0);

    // Calculate what % of previous year was done by this point
    let prevYearToDateAmount = 0;
    for (const monthData of previousYearMonthly) {
      if (monthData.month <= periodEndDate) {
        prevYearToDateAmount += monthData.amount;
      }
    }

    const prevYearToDatePercent = prevYearTotal > 0 ? prevYearToDateAmount / prevYearTotal : 0;

    if (prevYearToDatePercent > 0.1) { // At least 10% of year to have meaningful seasonality
      projectedFullYear = ordersToDate / prevYearToDatePercent;
      projectionMethod = 'seasonality_adjusted';
      confidenceLevel = daysElapsed > 180 ? 'high' : daysElapsed > 90 ? 'medium' : 'low';
      notes.push(`Based on ${(prevYearToDatePercent * 100).toFixed(1)}% of N-1 at same point`);
    } else {
      // Fall back to run rate
      projectedFullYear = (ordersToDate / daysElapsed) * totalDays;
      projectionMethod = 'run_rate';
      confidenceLevel = 'low';
      notes.push('Insufficient N-1 data for seasonality, using simple run rate');
    }
  } else {
    // Simple run rate projection
    projectedFullYear = (ordersToDate / daysElapsed) * totalDays;
    projectionMethod = 'run_rate';
    confidenceLevel = daysElapsed > 180 ? 'medium' : 'low';
    notes.push(`Run rate projection: ${ordersToDate.toLocaleString()}€ over ${daysElapsed} days`);
  }

  notes.push(`${daysRemaining} days remaining in fiscal year`);

  return {
    ordersToDate,
    projectedFullYear,
    projectionMethod,
    confidenceLevel,
    notes,
  };
}
