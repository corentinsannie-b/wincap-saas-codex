/**
 * DD Report Automation Platform
 * ==============================
 * UI-only module for Financial Due Diligence report presentation
 *
 * Business logic (parsing, calculations, exports) is in the backend API.
 * This module only handles:
 * - Chart components and visualizations
 * - Dashboard UI
 * - Types for API responses
 * - UI configuration (colors, etc.)
 */

// Types
export * from './types';

// Configuration
export * from './config/pcg-mapping';
export * from './config/colors';

// Chart Components
export * from './components/charts';

// Dashboard Component
export { DDReportDashboard } from './components/DDReportDashboard';
