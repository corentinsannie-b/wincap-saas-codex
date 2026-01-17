/**
 * DD Report Dashboard Component
 * ==============================
 * Main dashboard for creating and managing DD reports
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type {
  FECFile,
  PnLStatement,
  BalanceSheet,
  CashFlowStatement,
  QoEBridge,
  OrderAnalysis,
} from '../types';

import { parseFECContent } from '../parsers/fec-parser';
import { generatePnLStatement, generateEBITDABridge } from '../engines/pnl-engine';
import { generateBalanceSheet } from '../engines/balance-sheet-engine';
import { generateCashFlowStatement } from '../engines/cash-flow-engine';
import { detectPotentialAdjustments, generateQoEBridge, createAdjustmentFromSuggestion } from '../engines/qoe-engine';
import { WaterfallChart, MonthlyBarLineChart } from './charts';
import { formatCurrency, formatPercent } from '../renderers/pdf-renderer';
import { downloadDDReport } from '../renderers/pptx-generator';
import { downloadXLSX } from '../renderers/xlsx-exporter';
import { downloadPDF } from '../renderers/pdf-exporter';

// =============================================================================
// Dashboard State
// =============================================================================

interface DashboardState {
  step: 'upload' | 'processing' | 'review' | 'export';
  fecFiles: FECFile[];
  pnlStatements: PnLStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlowStatement[];
  qoeAnalysis: QoEBridge | null;
  orderAnalysis: OrderAnalysis | null;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

export function DDReportDashboard() {
  const [state, setState] = useState<DashboardState>({
    step: 'upload',
    fecFiles: [],
    pnlStatements: [],
    balanceSheets: [],
    cashFlows: [],
    qoeAnalysis: null,
    orderAnalysis: null,
    errors: [],
    warnings: [],
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(false);
  const [targetCompany, setTargetCompany] = useState('');
  const [buyerCompany, setBuyerCompany] = useState('');

  // File upload handler
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setProcessing(true);
    const newErrors: string[] = [];
    const newWarnings: string[] = [];
    const fecFiles: FECFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const result = parseFECContent(content, file.name);

        if (result.success && result.data) {
          fecFiles.push(result.data);
          newWarnings.push(...result.warnings);
        } else {
          newErrors.push(`${file.name}: ${result.errors.map(e => e.message).join(', ')}`);
        }
      } catch (error) {
        newErrors.push(`${file.name}: Failed to read file`);
      }
    }

    // Sort by fiscal year
    fecFiles.sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));

    // Generate financial statements
    const pnlStatements: PnLStatement[] = [];
    const balanceSheets: BalanceSheet[] = [];

    for (const fec of fecFiles) {
      const pnl = generatePnLStatement(fec.entries, fec.fiscalYear, fec.startDate, fec.endDate);
      pnlStatements.push(pnl);

      const bs = generateBalanceSheet(fec.entries, fec.endDate, fec.fiscalYear);
      balanceSheets.push(bs);
    }

    // Generate cash flows (need consecutive balance sheets)
    const cashFlows: CashFlowStatement[] = [];
    for (let i = 1; i < balanceSheets.length; i++) {
      const cf = generateCashFlowStatement(
        pnlStatements[i],
        balanceSheets[i - 1],
        balanceSheets[i]
      );
      cashFlows.push(cf);
    }

    // Detect QoE adjustments
    let qoeAnalysis: QoEBridge | null = null;
    if (fecFiles.length > 0 && pnlStatements.length > 0) {
      const allAdjustments = fecFiles.flatMap((fec, i) => {
        const suggestions = detectPotentialAdjustments(fec.entries, pnlStatements[i]);
        return suggestions.map(s =>
          createAdjustmentFromSuggestion(s, fec.fiscalYear, 'non_recurring', true)
        );
      });

      qoeAnalysis = generateQoEBridge(pnlStatements, allAdjustments);
    }

    setState({
      step: fecFiles.length > 0 ? 'review' : 'upload',
      fecFiles,
      pnlStatements,
      balanceSheets,
      cashFlows,
      qoeAnalysis,
      orderAnalysis: null,
      errors: newErrors,
      warnings: newWarnings,
    });

    setProcessing(false);
  }, []);

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Upload FEC Files</CardTitle>
        <CardDescription>
          Upload one or more FEC (Fichier des Écritures Comptables) files to generate the DD report
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Company Name Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="target-company">Target Company</Label>
            <Input
              id="target-company"
              placeholder="Enter target company name"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-company">Buyer Company</Label>
            <Input
              id="buyer-company"
              placeholder="Enter buyer company name"
              value={buyerCompany}
              onChange={(e) => setBuyerCompany(e.target.value)}
            />
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center hover:border-[#C4A35A] transition-colors">
          <input
            type="file"
            accept=".txt,.csv,.xml"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="fec-upload"
          />
          <label htmlFor="fec-upload" className="cursor-pointer">
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-700">
              Drop FEC files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports TXT, CSV, XML formats
            </p>
          </label>
        </div>

        {processing && (
          <div className="mt-6">
            <Progress value={50} className="h-2" />
            <p className="text-sm text-gray-500 mt-2 text-center">Processing files...</p>
          </div>
        )}

        {state.errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-medium text-red-800">Errors:</p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-2">
              {state.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderOverviewTab = () => {
    if (state.pnlStatements.length === 0) return null;

    const latestPnL = state.pnlStatements[state.pnlStatements.length - 1];
    const latestBS = state.balanceSheets[state.balanceSheets.length - 1];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Production {latestPnL.fiscalYear}</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(latestPnL.production)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>EBITDA</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(latestPnL.ebitda)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={latestPnL.ebitdaMargin > 10 ? 'default' : 'secondary'}>
                {formatPercent(latestPnL.ebitdaMargin)} margin
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Résultat Net</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(latestPnL.resultatNet)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Trésorerie Nette</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(latestBS.tresorerieActif - latestBS.tresoreriePassif - latestBS.dettesFinancieres)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* EBITDA Bridge */}
        {state.pnlStatements.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle>EBITDA Bridge</CardTitle>
            </CardHeader>
            <CardContent>
              <WaterfallChart
                data={generateEBITDABridge(
                  state.pnlStatements[state.pnlStatements.length - 1],
                  state.pnlStatements[state.pnlStatements.length - 2]
                )}
                height={350}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPnLTab = () => (
    <Card>
      <CardHeader>
        <CardTitle>Compte de Résultat</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>€k</TableHead>
              {state.pnlStatements.map((pnl) => (
                <TableHead key={pnl.fiscalYear} className="text-right">
                  {pnl.fiscalYear}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.pnlStatements[0]?.lines.map((line, i) => (
              <TableRow
                key={line.code}
                className={line.isSubtotal ? 'font-semibold bg-gray-50' : line.isTotal ? 'font-bold bg-gray-100' : ''}
              >
                <TableCell style={{ paddingLeft: `${(line.indent || 0) * 20 + 16}px` }}>
                  {line.label}
                </TableCell>
                {state.pnlStatements.map((pnl) => (
                  <TableCell key={pnl.fiscalYear} className="text-right">
                    {formatCurrency(pnl.lines[i]?.amount || 0)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderBalanceSheetTab = () => (
    <Card>
      <CardHeader>
        <CardTitle>Bilan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          {/* Actif */}
          <div>
            <h3 className="font-semibold text-lg mb-4">ACTIF</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>€k</TableHead>
                  {state.balanceSheets.map((bs) => (
                    <TableHead key={bs.fiscalYear} className="text-right">
                      {bs.fiscalYear}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Actif immobilisé</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.actifImmobilise)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Stocks</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.stocks)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Clients</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.clientsNet)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Trésorerie</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.tresorerieActif)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="font-bold bg-gray-100">
                  <TableCell>Total Actif</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.totalActif)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Passif */}
          <div>
            <h3 className="font-semibold text-lg mb-4">PASSIF</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>€k</TableHead>
                  {state.balanceSheets.map((bs) => (
                    <TableHead key={bs.fiscalYear} className="text-right">
                      {bs.fiscalYear}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Capitaux propres</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.capitauxPropres)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Dettes financières</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.dettesFinancieres)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Fournisseurs</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.fournisseurs)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Dettes fiscales & sociales</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.dettesFiscalesSociales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="font-bold bg-gray-100">
                  <TableCell>Total Passif</TableCell>
                  {state.balanceSheets.map((bs) => (
                    <TableCell key={bs.fiscalYear} className="text-right">
                      {formatCurrency(bs.totalPassif)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Working Capital Summary */}
        <div className="mt-8 pt-8 border-t">
          <h3 className="font-semibold text-lg mb-4">BFR & Endettement</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>€k</TableHead>
                {state.balanceSheets.map((bs) => (
                  <TableHead key={bs.fiscalYear} className="text-right">
                    {bs.fiscalYear}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>BFR Opérationnel</TableCell>
                {state.balanceSheets.map((bs) => (
                  <TableCell key={bs.fiscalYear} className="text-right">
                    {formatCurrency(bs.bfrOperationnel)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>BFR Total</TableCell>
                {state.balanceSheets.map((bs) => (
                  <TableCell key={bs.fiscalYear} className="text-right">
                    {formatCurrency(bs.bfrTotal)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Endettement Net</TableCell>
                {state.balanceSheets.map((bs) => (
                  <TableCell key={bs.fiscalYear} className="text-right">
                    {formatCurrency(bs.endettementNet)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderQoETab = () => {
    if (!state.qoeAnalysis) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Qualité de l'EBITDA (QoE)</CardTitle>
          <CardDescription>
            Ajustements identifiés automatiquement - à valider manuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ajustement</TableHead>
                {state.qoeAnalysis.periods.map((p) => (
                  <TableHead key={p.fiscalYear} className="text-right">
                    {p.fiscalYear}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-semibold">
                <TableCell>EBITDA Reporté</TableCell>
                {state.qoeAnalysis.periods.map((p) => (
                  <TableCell key={p.fiscalYear} className="text-right">
                    {formatCurrency(p.ebitdaReporte)}
                  </TableCell>
                ))}
              </TableRow>
              {state.qoeAnalysis.summary.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell className="text-sm">{adj.label}</TableCell>
                  {state.qoeAnalysis!.periods.map((p) => {
                    const periodAdj = p.adjustments.find((a) => a.type === adj.type);
                    return (
                      <TableCell key={p.fiscalYear} className="text-right">
                        {periodAdj ? formatCurrency(periodAdj.impactEBITDA) : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow className="font-bold bg-[#C4A35A]/10">
                <TableCell>EBITDA Ajusté</TableCell>
                {state.qoeAnalysis.periods.map((p) => (
                  <TableCell key={p.fiscalYear} className="text-right">
                    {formatCurrency(p.ebitdaAjuste)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Marge Ajustée</TableCell>
                {state.qoeAnalysis.periods.map((p) => (
                  <TableCell key={p.fiscalYear} className="text-right">
                    {formatPercent(p.margeEBITDAAjuste)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#1E4D6B]">DD Report Generator</h1>
            <p className="text-gray-600 mt-2">
              Financial Due Diligence Report Automation Platform
            </p>
          </div>
          {state.step === 'review' && state.pnlStatements.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  downloadXLSX({
                    metadata: {
                      targetCompany: targetCompany || 'Target Company',
                      buyerCompany: buyerCompany || 'Buyer Company',
                      preparedBy: 'Wincap Opérations',
                      date: new Date(),
                      status: 'draft',
                      version: '1.0',
                      fiscalYears: state.pnlStatements.map(p => p.fiscalYear),
                    },
                    pnlStatements: state.pnlStatements,
                    balanceSheets: state.balanceSheets,
                    cashFlows: state.cashFlows,
                    qoeAnalysis: state.qoeAnalysis || undefined,
                  });
                }}
                variant="outline"
                className="border-[#1E4D6B] text-[#1E4D6B] hover:bg-[#1E4D6B] hover:text-white"
              >
                Export XLSX
              </Button>
              <Button
                onClick={() => {
                  downloadPDF({
                    metadata: {
                      targetCompany: targetCompany || 'Target Company',
                      buyerCompany: buyerCompany || 'Buyer Company',
                      preparedBy: 'Wincap Opérations',
                      date: new Date(),
                      status: 'draft',
                      version: '1.0',
                      fiscalYears: state.pnlStatements.map(p => p.fiscalYear),
                    },
                    pnlStatements: state.pnlStatements,
                    balanceSheets: state.balanceSheets,
                    cashFlows: state.cashFlows,
                    qoeAnalysis: state.qoeAnalysis || undefined,
                  });
                }}
                variant="outline"
                className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
              >
                Export PDF
              </Button>
              <Button
                onClick={async () => {
                  await downloadDDReport({
                    metadata: {
                      targetCompany: targetCompany || 'Target Company',
                      buyerCompany: buyerCompany || 'Buyer Company',
                      preparedBy: 'Wincap Opérations',
                      date: new Date(),
                      status: 'draft',
                      version: '1.0',
                      fiscalYears: state.pnlStatements.map(p => p.fiscalYear),
                    },
                    pnlStatements: state.pnlStatements,
                    balanceSheets: state.balanceSheets,
                    cashFlows: state.cashFlows,
                    qoeAnalysis: state.qoeAnalysis || undefined,
                  });
                }}
                className="bg-[#C4A35A] hover:bg-[#B39349] text-white"
              >
                Export PPTX
              </Button>
            </div>
          )}
        </div>

        {/* Workflow Steps */}
        <div className="mb-8 flex items-center space-x-4">
          {['upload', 'processing', 'review', 'export'].map((step, i) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  state.step === step
                    ? 'bg-[#C4A35A] text-white'
                    : state.fecFiles.length > 0 && i < ['upload', 'processing', 'review', 'export'].indexOf(state.step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i + 1}
              </div>
              <span className="ml-2 text-sm font-medium capitalize">{step}</span>
              {i < 3 && <div className="w-12 h-0.5 bg-gray-200 ml-4" />}
            </div>
          ))}
        </div>

        {/* Content */}
        {state.step === 'upload' && renderUploadStep()}

        {state.step === 'review' && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pnl">P&L</TabsTrigger>
              <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
              <TabsTrigger value="qoe">QoE</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
            <TabsContent value="pnl">{renderPnLTab()}</TabsContent>
            <TabsContent value="balance">{renderBalanceSheetTab()}</TabsContent>
            <TabsContent value="qoe">{renderQoETab()}</TabsContent>
          </Tabs>
        )}

        {/* File Summary */}
        {state.fecFiles.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Loaded FEC Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {state.fecFiles.map((fec) => (
                  <Badge key={fec.filename} variant="outline">
                    {fec.fiscalYear}: {fec.entryCount.toLocaleString()} entries
                    {!fec.isBalanced && ' (unbalanced)'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warnings */}
        {state.warnings.length > 0 && (
          <Card className="mt-4 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <p className="font-medium text-yellow-800">Warnings:</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                {state.warnings.slice(0, 5).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
                {state.warnings.length > 5 && (
                  <li>...and {state.warnings.length - 5} more</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default DDReportDashboard;
