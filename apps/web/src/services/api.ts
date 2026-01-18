/**
 * Wincap API Service
 * ==================
 * Frontend service to communicate with the FastAPI backend
 */

/**
 * Validate and get API base URL from environment.
 * Throws an error if VITE_API_URL is not set in production.
 */
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    const isDev = import.meta.env.DEV;
    if (isDev) {
      console.warn('⚠️ VITE_API_URL not set. Using default http://localhost:8000');
      return 'http://localhost:8000';
    }
    throw new Error(
      'FATAL: VITE_API_URL environment variable is not set. ' +
      'Please set VITE_API_URL in your .env file before building.'
    );
  }

  return apiUrl;
}

export const API_BASE_URL = getApiBaseUrl();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get default fetch headers for API requests
 */
function getHeaders(includeJson: boolean = true): HeadersInit {
  const headers: HeadersInit = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

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

export interface AgentSummary {
  years: number[];
  pl_summary: Array<{
    year: number;
    revenue: number;
    ebitda: number;
    ebitda_margin: number;
    net_income: number;
  }>;
  balance_summary: Array<{
    year: number;
    total_assets: number;
    equity: number;
    net_debt: number;
  }>;
  kpis: Array<{
    year: number;
    dso: number | null;
    dpo: number | null;
    dio: number | null;
  }>;
}

export interface JournalEntry {
  date: string;
  account_num: string;
  label: string;
  amount: number;
}

export interface TraceResult {
  value: number;
  entry_count: number;
  entries: JournalEntry[];
}

export interface AnomalyEntry extends JournalEntry {
  z_score: number;
}

export interface AnomaliesResult {
  year: number;
  anomaly_count: number;
  entries: AnomalyEntry[];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    headers: getHeaders(false),
  });
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

  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': getAPIKey(),
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload files';
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || errorMessage;
      } catch (e) {
        // Response is not JSON, use status text
        errorMessage = `Upload failed: ${response.statusText} (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Upload error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Process uploaded FEC data
 */
export async function processFEC(request: ProcessRequest): Promise<ProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    headers: getHeaders(),
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
  const response = await fetch(`${API_BASE_URL}/api/data/${sessionId}`, {
    headers: getHeaders(false),
  });

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
  const response = await fetch(`${API_BASE_URL}/api/export/xlsx/${sessionId}`, {
    headers: getHeaders(false),
  });

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
  const response = await fetch(`${API_BASE_URL}/api/export/pdf/${sessionId}`, {
    headers: getHeaders(false),
  });

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
    headers: getHeaders(false),
  });
}

// =============================================================================
// Agent Tools API Functions (Phase B)
// =============================================================================

/**
 * Get executive summary of the deal
 */
export async function getAgentSummary(sessionId: string): Promise<AgentSummary> {
  const response = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/summary`
, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch summary');
  }
  return response.json();
}

/**
 * Get P&L statement for a fiscal year
 */
export async function getAgentPL(sessionId: string, year?: number): Promise<any> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/pl`);
  if (year) url.searchParams.set('year', year.toString());
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch P&L');
  }
  return response.json();
}

/**
 * Get balance sheet for a fiscal year
 */
export async function getAgentBalance(sessionId: string, year?: number): Promise<any> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/balance`);
  if (year) url.searchParams.set('year', year.toString());
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch balance sheet');
  }
  return response.json();
}

/**
 * Get KPIs for a fiscal year
 */
export async function getAgentKPIs(sessionId: string, year?: number): Promise<any> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/kpis`);
  if (year) url.searchParams.set('year', year.toString());
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch KPIs');
  }
  return response.json();
}

/**
 * Search and filter journal entries
 */
export async function getAgentEntries(
  sessionId: string,
  options?: {
    compte_prefix?: string;
    year?: number;
    min_amount?: number;
    label_contains?: string;
    limit?: number;
  }
): Promise<any> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/entries`);
  if (options) {
    if (options.compte_prefix) url.searchParams.set('compte_prefix', options.compte_prefix);
    if (options.year) url.searchParams.set('year', options.year.toString());
    if (options.min_amount) url.searchParams.set('min_amount', options.min_amount.toString());
    if (options.label_contains) url.searchParams.set('label_contains', options.label_contains);
    if (options.limit) url.searchParams.set('limit', options.limit.toString());
  }
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch entries');
  }
  return response.json();
}

/**
 * Explain variance between years for a metric
 */
export async function getAgentExplainVariance(
  sessionId: string,
  metric: string,
  yearFrom: number,
  yearTo: number
): Promise<any> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/explain`);
  url.searchParams.set('metric', metric);
  url.searchParams.set('year_from', yearFrom.toString());
  url.searchParams.set('year_to', yearTo.toString());
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to explain variance');
  }
  return response.json();
}

/**
 * Get trace (provenance) for a metric
 */
export async function getAgentTrace(
  sessionId: string,
  metric: string,
  year: number
): Promise<TraceResult> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/trace`);
  url.searchParams.set('metric', metric);
  url.searchParams.set('year', year.toString());
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch trace');
  }
  return response.json();
}

/**
 * Find statistically anomalous entries
 */
export async function getAgentAnomalies(
  sessionId: string,
  year?: number,
  zThreshold?: number
): Promise<AnomaliesResult> {
  const url = new URL(`${API_BASE_URL}/api/agent/${sessionId}/anomalies`);
  if (year) url.searchParams.set('year', year.toString());
  if (zThreshold) url.searchParams.set('z_threshold', zThreshold.toString());
  const response = await fetch(url, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch anomalies');
  }
  return response.json();
}

/**
 * Chat with Claude about financial data using tool calling
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<{ role: string; content: string }> {
  const response = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send chat message');
  }

  return response.json();
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
  getAgentSummary,
  getAgentPL,
  getAgentBalance,
  getAgentKPIs,
  getAgentEntries,
  getAgentExplainVariance,
  getAgentTrace,
  getAgentAnomalies,
  sendChatMessage,
};

export default api;
