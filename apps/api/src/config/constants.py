"""
Constants and configuration values for Wincap SaaS.

Centralized location for all magic strings, default values, and enumerations
used throughout the application.
"""

from decimal import Decimal

# =============================================================================
# Date/Time Formats
# =============================================================================

DATE_FORMAT = "%Y-%m-%d"
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"
TIMESTAMP_FORMAT = "%Y%m%d_%H%M%S"
TIME_FORMAT = "%H:%M:%S"

# =============================================================================
# File Naming Templates
# =============================================================================

EXCEL_FILENAME_TEMPLATE = "Databook_{timestamp}.xlsx"
PDF_FILENAME_TEMPLATE = "Rapport_DD_{timestamp}.pdf"
JSON_FILENAME_TEMPLATE = "dashboard_data_{timestamp}.json"
LOG_FILENAME_TEMPLATE = "processing_log_{timestamp}.txt"

# =============================================================================
# Account Classes (French PCG - Plan Comptable Général)
# =============================================================================

ACCOUNT_CLASSES = {
    "assets": ["1", "2", "3", "4", "5"],
    "current_assets": ["4", "5"],
    "fixed_assets": ["1", "2", "3"],
    "liabilities": ["2", "3", "4"],
    "current_liabilities": ["4"],
    "long_term_debt": ["1"],
    "equity": ["1"],
    "revenue": ["7"],
    "expenses": ["6"],
    "financial": ["66", "76"],
    "exceptional": ["67", "77"],
}

# =============================================================================
# Precision and Formatting
# =============================================================================

DECIMAL_PLACES = 2
CURRENCY_PRECISION = Decimal("0.01")

# Number formatting options
THOUSAND_SEPARATOR = ","
DECIMAL_SEPARATOR = "."

# =============================================================================
# Financial Defaults
# =============================================================================

DEFAULT_VAT_RATE = Decimal("1.20")  # 20% French VAT
DEFAULT_COMPANY_NAME = "Financial Report"
DEFAULT_AUTHOR = "Wincap"

# Valid VAT rates by country (European VAT rates)
VALID_VAT_RATES = {
    "France": Decimal("1.20"),
    "Luxembourg": Decimal("1.17"),
    "Spain": Decimal("1.21"),
    "Germany": Decimal("1.19"),
    "Italy": Decimal("1.22"),
    "Belgium": Decimal("1.21"),
    "Netherlands": Decimal("1.21"),
}

# =============================================================================
# Validation Rules
# =============================================================================

# Trial Balance Tolerance (allows for rounding differences)
TRIAL_BALANCE_TOLERANCE = Decimal("0.01")

# Account code validation
MIN_ACCOUNT_CODE_LENGTH = 1
MAX_ACCOUNT_CODE_LENGTH = 8

# Amount validation
MIN_AMOUNT = Decimal("0.00")
MAX_AMOUNT = Decimal("9999999999.99")  # Arbitrary large number

# Fiscal year validation
MIN_FISCAL_YEAR = 1900
# Max year will be set dynamically (current year + 1)

# Company name validation
MIN_COMPANY_NAME_LENGTH = 1
MAX_COMPANY_NAME_LENGTH = 255

# =============================================================================
# Performance Parameters
# =============================================================================

# Maximum number of entries to process per batch
MAX_BATCH_SIZE = 10000

# Timeout for external operations (in seconds)
OPERATION_TIMEOUT = 300

# Default page size for pagination (not implemented yet)
DEFAULT_PAGE_SIZE = 50

# =============================================================================
# Export Formats
# =============================================================================

EXPORT_FORMATS = {
    "xlsx": "Excel Databook",
    "pdf": "PDF Report",
    "json": "JSON Data",
    "pptx": "PowerPoint Presentation",
}

DEFAULT_EXPORT_FORMATS = ["xlsx", "pdf"]

# =============================================================================
# Financial Statement Names (French)
# =============================================================================

STATEMENT_NAMES = {
    "pl": "Compte de Résultat",  # Profit & Loss / Income Statement
    "balance": "Bilan Comptable",  # Balance Sheet
    "cashflow": "Flux de Trésorerie",  # Cash Flow
    "kpi": "Indicateurs Clés",  # Key Performance Indicators
}

# =============================================================================
# Metric Names (French)
# =============================================================================

METRIC_NAMES = {
    "revenue": "Chiffre d'Affaires",
    "ebitda": "EBITDA",
    "ebit": "EBIT",
    "net_income": "Résultat Net",
    "gross_margin": "Marge Brute",
    "ebitda_margin": "Marge EBITDA",
    "net_margin": "Marge Nette",
    "roe": "ROE",
    "roic": "ROIC",
    "dso": "DSO (Jours)",
    "dpo": "DPO (Jours)",
    "dio": "DIO (Jours)",
    "current_ratio": "Ratio de Liquidité",
    "debt_to_ebitda": "Endettement",
    "interest_coverage": "Couverture des Intérêts",
}

# =============================================================================
# CLI Messages and Templates
# =============================================================================

CLI_MESSAGES = {
    "welcome": "Wincap - Financial Due Diligence Report Generator",
    "processing": "Processing FEC file(s)...",
    "success": "✓ Processing complete",
    "error": "✗ Error occurred",
    "warning": "⚠ Warning",
    "info": "ℹ Information",
}

# =============================================================================
# Error Messages
# =============================================================================

ERROR_MESSAGES = {
    "file_not_found": "File not found: {filename}",
    "invalid_fec_format": "Invalid FEC format: {filename}",
    "trial_balance_failed": "Trial balance check failed for FY{year}: {amount}",
    "permission_denied": "Permission denied: {path}",
    "disk_full": "Insufficient disk space to save report",
    "timeout": "Operation timed out after {seconds} seconds",
    "invalid_config": "Invalid configuration: {message}",
}

# =============================================================================
# Logging Levels
# =============================================================================

LOG_LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
DEFAULT_LOG_LEVEL = "INFO"

# =============================================================================
# Session Management
# =============================================================================

DEFAULT_SESSION_TTL_HOURS = 24
DEFAULT_CLEANUP_INTERVAL_HOURS = 6

# =============================================================================
# Analysis Thresholds (for optional warnings)
# =============================================================================

# Warn if EBITDA margin is below this percentage (e.g., 5%)
MIN_EBITDA_MARGIN_WARNING = Decimal("5")

# Warn if DSO is above this number of days (e.g., 90)
MAX_DSO_WARNING = 90

# Warn if debt-to-EBITDA ratio is above this (e.g., 3x)
MAX_DEBT_TO_EBITDA_WARNING = Decimal("3")

# =============================================================================
# File Patterns and Regex
# =============================================================================

FEC_FILE_PATTERN = "*.txt"  # FEC files are typically .txt
FEC_YEAR_REGEX = r"FEC(\d{4})"  # Extracts year from filename like FEC20241231

# =============================================================================
# Default Configurations
# =============================================================================

DEFAULT_TIMEOUT_SECONDS = 300
DEFAULT_ENCODING = "utf-8"
DEFAULT_DELIMITER = "\t"  # Tab-separated

# =============================================================================
# Feature Flags (for future use)
# =============================================================================

FEATURES = {
    "monthly_analysis": True,
    "variance_analysis": True,
    "seasonality_index": True,
    "qoe_adjustments": True,
    "cashflow_analysis": True,
    "account_details": True,
}
