/**
 * PDF Formatting Utilities
 * ========================
 * Formatting functions for financial reports in PDF/Excel/PPTX exports
 */

/**
 * Format number as French currency (€)
 * @example formatCurrency(50000) => "50 000,00 €"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format decimal as percentage
 * @example formatPercent(0.395) => "39,5%"
 */
export function formatPercent(value: number): string {
  const percentage = (value * 100).toFixed(1).replace('.', ',');
  return `${percentage}%`;
}

/**
 * Format variance between two numbers
 * @example formatVariance(19260, 19760) => "-2.5%"
 */
export function formatVariance(current: number, previous: number): string {
  if (previous === 0) return 'N/A';
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}

/**
 * Format number with thousands separator (French style)
 * @example formatNumber(50000) => "50 000"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format decimal as percentage with sign
 * @example formatPercentWithSign(0.39) => "+39%"
 */
export function formatPercentWithSign(value: number): string {
  const percentage = Math.round(value * 100);
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage}%`;
}

/**
 * Format number with thousands separator and decimals
 * @example formatNumberWithDecimals(50000.5, 2) => "50 000,50"
 */
export function formatNumberWithDecimals(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
