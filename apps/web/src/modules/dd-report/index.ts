/**
 * DD Report Automation Platform
 * ==============================
 * Main module exports for Financial Due Diligence report generation
 *
 * Modules:
 * - FEC Parser: Parse French accounting files
 * - P&L Engine: Generate profit & loss statements
 * - Balance Sheet Engine: Generate balance sheets with WC metrics
 * - Cash Flow Engine: Generate cash flow statements
 * - QoE Engine: Quality of Earnings adjustments
 * - Order Analyzer: Commercial order analysis
 * - PDF Renderer: Report assembly and export
 * - PPTX Generator: PowerPoint presentation generation
 * - PDF Converter: LibreOffice-based PDF conversion
 */

// Types
export * from './types';

// Configuration
export * from './config/pcg-mapping';
export * from './config/colors';

// Parsers
export * from './parsers/fec-parser';

// Engines
export * from './engines/pnl-engine';
export * from './engines/balance-sheet-engine';
export * from './engines/cash-flow-engine';
export * from './engines/qoe-engine';

// Analyzers
export * from './analyzers/order-analyzer';

// Renderers
export * from './renderers/pdf-renderer';
export * from './renderers/pptx-generator';
export * from './renderers/xlsx-exporter';
export * from './renderers/pdf-exporter';
// Note: pdf-converter.ts is server-side only (Node.js) for PPTX→PDF conversion via LibreOffice
// Import it directly when needed: import { convertPPTXtoPDF } from './renderers/pdf-converter'

// Chart Components
export * from './components/charts';

// Dashboard Component
export { DDReportDashboard } from './components/DDReportDashboard';
