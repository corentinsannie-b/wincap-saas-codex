/**
 * Wincap API Service
 * ==================
 * Frontend service to communicate with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export interface UploadResponse {
  session_id: string;
  files: {
    filename: string;
    entries: number;
    years: number[];
    encoding: string;
  }[];
  total_entries: number;
  years: number[];
}

export interface ProcessRequest {
  session_id: string;
  company_name: string;
  years?: number[];
  detailed?: boolean;
  vat_rate?: number;
}

export interface ProcessResponse {
  session_id: string;
  status: string;
  years: number[];
  summary: {
    years: number[];
    pl_summary: {
      year: number;
      revenue: number;
      ebitda: number;
      ebitda_margin: number;
      net_income: number;
    }[];
    balance_summary: {
      year: number;
      total_assets: number;
      equity: number;
      net_debt: number;
    }[];
    kpis: {
      year: number;
      dso: number | null;
      dpo: number | null;
      dio: number | null;
    }[];
  };
}

export interface FinancialData {
  metadata: {
    company_name: string;
    generated_at: string;
    years: number[];
  };
  pl: {
    year: number;
    revenue: number;
    ebitda: number;
    ebitda_margin: number;
    net_income: number;
    value_added: number;
    personnel_costs: number;
    depreciation: number;
    ebit: number;
    financial_result: number;
    exceptional_result: number;
    corporate_tax: number;
  }[];
  balance: {
    year: number;
    fixed_assets: number;
    inventory: number;
    receivables: number;
    cash: number;
    total_assets: number;
    equity: number;
    financial_debt: number;
    trade_payables: number;
    working_capital: number;
    net_debt: number;
  }[];
  kpis: {
    year: number;
    dso: number | null;
    dpo: number | null;
    dio: number | null;
    cash_conversion_cycle: number | null;
    ebitda_adjusted: number | null;
  }[];
  monthly: Record<number, { month: number; revenue: number }[]>;
  variance: Record<string, unknown>;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('API is not available');
  }
  return response.json();
}

/**
 * Upload FEC files
 */
export async function uploadFEC(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload files');
  }

  return response.json();
}

/**
 * Process uploaded FEC data
 */
export async function processFEC(request: ProcessRequest): Promise<ProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to process FEC data');
  }

  return response.json();
}

/**
 * Get full financial data for dashboard
 */
export async function getFinancialData(sessionId: string): Promise<FinancialData> {
  const response = await fetch(`${API_BASE_URL}/api/data/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch data');
  }

  return response.json();
}

/**
 * Download Excel export
 */
export async function downloadExcel(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/export/xlsx/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate Excel');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Databook_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download PDF export
 */
export async function downloadPDF(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/export/pdf/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate PDF');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rapport_DD_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Delete session and clean up
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/session/${sessionId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Export default API object
// =============================================================================

export const api = {
  checkHealth,
  uploadFEC,
  processFEC,
  getFinancialData,
  downloadExcel,
  downloadPDF,
  deleteSession,
};

export default api;
