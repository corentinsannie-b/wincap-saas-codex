/**
 * Shared UI Types
 * ===============
 * Types for UI components, configuration, and responses
 */

// Color configuration
export const CHART_COLORS = {
  revenue: '#10b981',
  ebitda: '#3b82f6',
  expenses: '#ef4444',
  assets: '#8b5cf6',
  liabilities: '#f59e0b',
};

// Chart data types
export interface MetricCard {
  label: string;
  value: number;
  unit?: string;
  trend?: number; // percentage change
  color?: string;
}

export interface HotspotItem {
  description: string;
  severity: 'low' | 'medium' | 'high';
  accountCode?: string;
  amount?: number;
  date?: string;
}

// Placeholder for generated API types
// These will be in ./generated when OpenAPI generation runs
export interface UploadResponse {
  session_id: string;
  files: Array<{
    filename: string;
    entries: number;
    years: number[];
    encoding: string;
  }>;
  total_entries: number;
  years: number[];
}

export interface ProcessResponse {
  session_id: string;
  status: string;
  years: number[];
  summary: Record<string, unknown>;
}
