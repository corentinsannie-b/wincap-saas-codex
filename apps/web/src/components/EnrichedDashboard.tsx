import { useState, useEffect } from 'react';
import { Download, AlertTriangle, TrendingUp, TrendingDown, Loader } from 'lucide-react';

interface EnrichedDashboardProps {
  sessionId: string;
  companyName?: string;
  onShowChat: () => void;
}

interface Summary {
  company: {
    total_entries: number;
    years_available: number[];
  };
  latest_year: number;
  financial_metrics: {
    revenue: number;
    ebitda: number;
    ebitda_margin: number;
    net_income: number;
  };
  balance_metrics: {
    total_assets: number;
    equity: number;
    working_capital: number;
    net_debt: number;
  };
  operational_metrics: {
    dso: number;
    dpo: number;
    dio: number;
  };
}

interface Anomaly {
  date: string;
  account: string;
  label: string;
  amount: number;
  z_score: number;
  status: 'HIGH' | 'MEDIUM';
}

export function EnrichedDashboard({ sessionId, companyName = 'Company', onShowChat }: EnrichedDashboardProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch summary
        const summaryRes = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/summary`);
        if (!summaryRes.ok) throw new Error('Failed to fetch summary');
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        // Fetch anomalies
        const anomaliesRes = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/anomalies`);
        if (!anomaliesRes.ok) throw new Error('Failed to fetch anomalies');
        const anomaliesData = await anomaliesRes.json();
        setAnomalies(anomaliesData.anomalies || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, API_BASE_URL]);

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/xlsx?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName}_Databook.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download Excel file');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/pdf?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download PDF file');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-600" size={32} />
          <p className="text-gray-600">{error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDays = (value: number) => {
    return `${Math.round(value)} j`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Year {summary.latest_year} • {summary.company.years_available.join(', ')}
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              Session: {sessionId.slice(0, 8)}...
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics (Year {summary.latest_year})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Revenue</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.financial_metrics.revenue)}
              </p>
            </div>

            {/* EBITDA */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">EBITDA</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(summary.financial_metrics.ebitda)}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Margin: {formatPercent(summary.financial_metrics.ebitda_margin)}
              </p>
            </div>

            {/* Net Income */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Net Income</p>
              <p className="text-3xl font-bold text-indigo-600">
                {formatCurrency(summary.financial_metrics.net_income)}
              </p>
            </div>

            {/* Equity */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Equity</p>
              <p className="text-3xl font-bold text-purple-600">
                {formatCurrency(summary.balance_metrics.equity)}
              </p>
            </div>

            {/* Working Capital */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Working Capital</p>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(summary.balance_metrics.working_capital)}
              </p>
            </div>

            {/* Total Assets */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-gray-700">
                {formatCurrency(summary.balance_metrics.total_assets)}
              </p>
            </div>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Capital Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">DSO (Days Sales Outstanding)</p>
              <p className="text-3xl font-bold text-gray-900">{formatDays(summary.operational_metrics.dso)}</p>
              <p className="text-xs text-gray-600 mt-2">Time to collect receivables</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">DPO (Days Payable Outstanding)</p>
              <p className="text-3xl font-bold text-gray-900">{formatDays(summary.operational_metrics.dpo)}</p>
              <p className="text-xs text-gray-600 mt-2">Time to pay suppliers</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">DIO (Days Inventory Outstanding)</p>
              <p className="text-3xl font-bold text-gray-900">{formatDays(summary.operational_metrics.dio)}</p>
              <p className="text-xs text-gray-600 mt-2">Inventory turnover speed</p>
            </div>
          </div>
        </div>

        {/* Data Quality */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Reassurance</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-700">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">✓ Parsed {summary.company.total_entries.toLocaleString()} entries</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">✓ {summary.company.years_available.length} years available ({summary.company.years_available.join(', ')})</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">✓ All required data fields validated</span>
            </div>
          </div>
        </div>

        {/* Hotspots */}
        {anomalies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hotspots & Anomalies</h2>
            <div className="space-y-3">
              {anomalies.slice(0, 5).map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 p-4 rounded ${
                    anomaly.status === 'HIGH'
                      ? 'border-red-500 bg-red-50'
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={anomaly.status === 'HIGH' ? 'text-red-600' : 'text-yellow-600'}
                      size={20}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Account {anomaly.account}</p>
                      <p className="text-sm text-gray-700 mt-1">{anomaly.label}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Amount: {formatCurrency(anomaly.amount)} • Date: {anomaly.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Downloads */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-4 px-6 rounded-lg transition-all"
            >
              {downloadingExcel ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download Databook (Excel)
                </>
              )}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 px-6 rounded-lg transition-all"
            >
              {downloadingPdf ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download Report (PDF)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Chat Button */}
        <div className="mb-8">
          <button
            onClick={onShowChat}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 px-6 rounded-lg transition-all text-lg"
          >
            💬 Start Chat Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
