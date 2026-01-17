import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { api } from '@/services/api';
import ChatPanel from '@/components/ChatPanel';

export default function Dashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return <div>Session not found</div>;
  }

  // Fetch summary data
  const summaryQuery = useQuery({
    queryKey: ['agent-summary', sessionId],
    queryFn: () => api.getAgentSummary(sessionId),
  });

  // Fetch current financial data
  const dataQuery = useQuery({
    queryKey: ['financial-data', sessionId],
    queryFn: () => api.getFinancialData(sessionId),
  });

  const isLoading = summaryQuery.isLoading || dataQuery.isLoading;
  const error = summaryQuery.error || dataQuery.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const data = dataQuery.data;
  const latestYear = summary?.years?.[summary.years.length - 1];
  const latestPL = summary?.pl_summary?.find((p) => p.year === latestYear);
  const latestBalance = summary?.balance_summary?.find((b) => b.year === latestYear);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-8 py-8">
        <div className="max-w-full mx-auto">
          <h1 className="text-3xl font-bold mb-2">{data?.metadata?.company_name || 'Financial Analysis'}</h1>
          <p className="text-lg opacity-90">
            {summary?.years?.join(', ')} • Generated {new Date(data?.metadata?.generated_at).toLocaleDateString()}
          </p>
        </div>
      </header>

      {/* Main Content with Chat Panel */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* Left Content Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* KPI Cards */}
        {latestPL && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(latestPL.revenue / 1000000).toFixed(1)}M€
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">EBITDA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(latestPL.ebitda / 1000000).toFixed(1)}M€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(latestPL.ebitda_margin * 100).toFixed(1)}% margin
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(latestPL.net_income / 1000000).toFixed(1)}M€
                </div>
              </CardContent>
            </Card>

            {latestBalance && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cash Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(latestBalance.net_debt / 1000000).toFixed(1)}M€
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tools">Analysis Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.pl_summary && (
                  <div className="space-y-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-semibold py-2">Year</th>
                          <th className="text-right font-semibold py-2">Revenue</th>
                          <th className="text-right font-semibold py-2">EBITDA</th>
                          <th className="text-right font-semibold py-2">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.pl_summary.map((pl) => (
                          <tr key={pl.year} className="border-b">
                            <td className="py-3">{pl.year}</td>
                            <td className="text-right">€{(pl.revenue / 1000000).toFixed(1)}M</td>
                            <td className="text-right">€{(pl.ebitda / 1000000).toFixed(1)}M</td>
                            <td className="text-right">{(pl.ebitda_margin * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>P&L Statement</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.pl && (
                  <div className="space-y-2">
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-[400px]">
                      {JSON.stringify(data.pl, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.balance && (
                  <div className="space-y-2">
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-[400px]">
                      {JSON.stringify(data.balance, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Analysis Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click-to-trace functionality and advanced analysis tools will be available in Phase C Session 3.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" disabled>
                    Trace Entry Sources
                  </Button>
                  <Button variant="outline" disabled>
                    Find Anomalies
                  </Button>
                  <Button variant="outline" disabled>
                    Explain Variance
                  </Button>
                  <Button variant="outline" disabled>
                    Filter Entries
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

          {/* Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={() => api.downloadExcel(sessionId)}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Excel
              </Button>
              <Button
                onClick={() => api.downloadPDF(sessionId)}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </main>

        {/* Right Sidebar - Chat Panel */}
        <div className="w-96 overflow-hidden border-l bg-background">
          <ChatPanel sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
