/**
 * Wincap Brand Colors
 * ===================
 * Centralized color constants for the DD Report module
 */

// Primary brand colors
export const WINCAP_GOLD = '#C4A35A';
export const WINCAP_BLUE = '#1E4D6B';

// Darker variations
export const WINCAP_GOLD_DARK = '#B39349';
export const WINCAP_BLUE_DARK = '#163A52';

// Chart color palette
export const CHART_COLORS = {
  primary: WINCAP_GOLD,
  secondary: WINCAP_BLUE,
  positive: '#22C55E', // green
  negative: '#EF4444', // red
  neutral: '#6B7280', // gray
  background: '#F9FAFB',
};

// P&L and Financial chart colors
export const FINANCIAL_COLORS = {
  revenue: WINCAP_GOLD,
  costs: WINCAP_BLUE,
  profit: '#22C55E',
  loss: '#EF4444',
  ebitda: WINCAP_GOLD,
  margin: WINCAP_BLUE,
};

// Waterfall chart colors
export const WATERFALL_COLORS = {
  increase: '#22C55E',
  decrease: '#EF4444',
  total: WINCAP_BLUE,
  subtotal: WINCAP_GOLD,
};

// Pie chart palette
export const PIE_CHART_COLORS = [
  WINCAP_GOLD,
  WINCAP_BLUE,
  '#22C55E',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
];
