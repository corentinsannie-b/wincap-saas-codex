# Wincap SaaS - CLI Specification

## Overview

The Wincap CLI (`wincap`) is a command-line tool for batch processing French FEC accounting files into financial reports. It serves as the primary interface for automated, non-interactive report generation.

## Installation

```bash
cd apps/api
pip install -e .
```

After installation, the `wincap` command is available globally.

## Command Structure

```
wincap
├── generate       # Main report generation
├── analyze        # Quick FEC file analysis
├── accounts       # List account mappings
├── template       # Template management
├── batch          # Batch processing
├── version        # Show version
└── help           # Show this help
```

---

## GENERATE Command

### Purpose
Generate complete financial reports from FEC file(s).

### Syntax
```bash
wincap generate [OPTIONS]
```

### Options

#### Input Files (Required)
```
-f, --fec TEXT                  FEC file path(s) to process
                                Can be specified multiple times
                                Example: -f file1.txt -f file2.txt
                                [required]
```

#### Output Configuration
```
-o, --output PATH               Output directory for generated files
                                [default: ./output]

--format [xlsx|pdf|json|all]    Export formats to generate
                                Multiple: --format xlsx --format pdf
                                [default: all]

--excel / --no-excel            Generate Excel Databook
                                [default: True]

--pdf / --no-pdf                Generate PDF Report
                                [default: True]

--json / --no-json              Generate JSON for dashboard
                                [default: False]

--pptx / --no-pptx              Generate PowerPoint (future)
                                [default: False]
```

#### Metadata
```
-n, --name TEXT                 Company name for reports
                                [default: ""]

--author TEXT                   Author name in metadata
                                [default: "Wincap"]

--date TEXT                     Report date (YYYY-MM-DD)
                                [default: today's date]

--template PATH                 Custom Jinja2 template directory
```

#### Data Filtering
```
-y, --years TEXT                Fiscal years to include
                                Format: "2022,2023,2024"
                                [default: all years in files]
```

#### Analysis Options
```
--detailed / --no-detailed      Include detailed analysis
                                Monthly breakdown, account details, extended variance
                                [default: False]

--qoe PATH                      QoE adjustments JSON file
                                See: docs/QOE_TEMPLATE.json

--config PATH                   Custom account mapping YAML file
                                [default: config/account_mapping.yaml]

--vat-rate FLOAT                VAT rate for DSO/DPO calculations
                                [default: 1.20]
```

#### Performance & Logging
```
--parallel INT                  Number of files to process in parallel
                                [default: 1 (sequential)]

--verbose / --no-verbose        Show detailed processing log
                                [default: False]

--quiet / --no-quiet            Suppress progress output
                                [default: False]

--log-file PATH                 Write logs to file
```

#### Advanced
```
--validate / --no-validate      Validate trial balance before processing
                                [default: True]

--strict / --no-strict          Treat warnings as errors
                                [default: False]

--dry-run / --no-dry-run        Simulate processing without output files
                                [default: False]
```

### Examples

#### Basic usage (all formats, default settings)
```bash
wincap generate -f accounting.txt -n "ACME Inc"
# Output: output/Databook_*.xlsx, output/Rapport_DD_*.pdf
```

#### Multi-year analysis
```bash
wincap generate \
  -f fy2022.txt \
  -f fy2023.txt \
  -f fy2024.txt \
  -n "ACME Inc" \
  -o reports/
```

#### Excel only, detailed analysis
```bash
wincap generate \
  -f fy2024.txt \
  --no-pdf \
  --detailed \
  -n "ACME Inc"
```

#### Filter specific years
```bash
wincap generate \
  -f fy2022.txt -f fy2023.txt -f fy2024.txt \
  -y "2023,2024" \
  -n "ACME Inc"
```

#### With QoE adjustments
```bash
wincap generate \
  -f fy2024.txt \
  --qoe adjustments.json \
  -n "ACME Inc"
```

#### Verbose output with dry-run
```bash
wincap generate \
  -f fy2024.txt \
  --verbose \
  --dry-run \
  -n "ACME Inc"
```

### Output Format

#### Success
```
✓ Wincap - Processing 1 file(s)...
  📄 Parsing: fy2024.txt
    → 2,847 entries loaded
    → Years: [2024]

  ✓ Account mapping loaded: 42 prefixes

  Building financial statements...
  ✓ P&L: 1 year
  ✓ Balance Sheet: 1 year
  ✓ KPIs: 1 year
  ✓ Cash Flow: 1 year
  ✓ Monthly data: 1 year
  ✓ Variance analysis: N/A (single year)

  Generating exports...
  ✓ Excel Databook (892 KB)
  ✓ PDF Report (234 KB)

  ═══════════════════════════════════
  FINANCIAL SUMMARY
  ═══════════════════════════════════

  FY2024:
    Revenue:        1,250,000 €
    EBITDA:           187,500 € (15.0%)
    Net Income:        93,750 €

  ✓ Done! Files saved to: output/
```

#### Error Handling
```
✗ Error: File not found: fy2024.txt
  Use: wincap --help for usage information
  [Exit code: 1]
```

---

## ANALYZE Command

### Purpose
Quick analysis of a FEC file without generating full reports.

### Syntax
```bash
wincap analyze [OPTIONS] FILE
```

### Arguments
```
FILE                            Path to FEC file to analyze
                                [required]
```

### Options
```
--config PATH                   Custom account mapping YAML
                                [default: config/account_mapping.yaml]

--verbose / --no-verbose        Show detailed breakdowns
                                [default: False]

--export PATH                   Export analysis as JSON
                                [default: None (only show in terminal)]
```

### Examples

#### Basic analysis
```bash
wincap analyze fy2024.txt
```

#### Verbose with export
```bash
wincap analyze fy2024.txt --verbose --export analysis.json
```

### Output Format
```
╭──────────────────────────────────────────────────────╮
│               FEC FILE ANALYSIS                       │
│                    fy2024.txt                         │
╰──────────────────────────────────────────────────────╯

File Information:
  Size: 4.2 MB
  Encoding: UTF-8
  Delimiter: Tab (\t)

Parse Statistics:
  Total Entries: 2,847
  Fiscal Years: [2024]
  Date Range: 2024-01-01 to 2024-12-31

Account Distribution:
  ┌─────────┬──────────┬────────────────┐
  │ Account │  Count   │  Total Amount  │
  ├─────────┼──────────┼────────────────┤
  │ Classe 1│     156  │      850,000 € │
  │ Classe 2│     234  │    1,250,000 € │
  │ Classe 6│   1,450  │      620,000 € │
  │ Classe 7│   1,007  │    1,450,000 € │
  └─────────┴──────────┴────────────────┘

Trial Balance Check:
  Debits:  3,250,000.00 €
  Credits: 3,250,000.00 €
  ✓ Balanced

Sample Entries (first 5):
  2024-01-01 | 411000 | Client ACME  | Dr: 1,500.00 | Cr: 0.00
  2024-01-02 | 512000 | Bank deposit | Dr: 0.00     | Cr: 1,500.00
  ...
```

---

## ACCOUNTS Command

### Purpose
List all available account mappings.

### Syntax
```bash
wincap accounts [OPTIONS]
```

### Options
```
--config PATH                   Custom account mapping YAML
                                [default: config/account_mapping.yaml]

--filter TEXT                   Filter by category name
                                Example: --filter "Revenue"

--class TEXT                    Filter by account class
                                Example: --class 7

--format [table|json|csv]       Output format
                                [default: table]
```

### Examples

#### List all mappings
```bash
wincap accounts
```

#### Filter by revenue accounts
```bash
wincap accounts --filter "Revenue"
```

#### Export as JSON
```bash
wincap accounts --format json > accounts.json
```

### Output Format
```
╭──────────────────────────────────────────────────────────╮
│            ACCOUNT MAPPINGS (PCG → Category)             │
╰──────────────────────────────────────────────────────────╯

REVENUE (Produits) - Class 7
  700    → CA Nationale                    [70]
  701    → CA Exportation                  [70]
  706    → Services                        [70]
  708    → Autres                          [70]
  74     → Subventions                     [74]
  75     → Autres Produits d'Exploitation [75]

EXPENSES (Charges) - Class 6
  60     → Achats                          [60]
  61     → Transports                      [61]
  62     → Services Externes               [62]
  63     → Impôts & Taxes                  [63]
  64     → Salaires & Charges Sociales    [64]
  65     → Autres Charges                  [65]

...
[Total: 42 account mappings]
```

---

## TEMPLATE Command

### Purpose
Manage custom report templates.

### Syntax
```bash
wincap template [OPTIONS] SUBCOMMAND
```

### Subcommands

#### `list`
```bash
wincap template list
# Shows installed templates
```

#### `create`
```bash
wincap template create [NAME] [OPTIONS]

Options:
  --source PATH     Copy from existing template
  --type [excel|pdf|pptx]
```

#### `validate`
```bash
wincap template validate PATH
# Checks template syntax
```

#### `show`
```bash
wincap template show NAME
# Display template content
```

---

## BATCH Command

### Purpose
Process multiple FEC files with batch configuration.

### Syntax
```bash
wincap batch [OPTIONS] CONFIG_FILE
```

### Arguments
```
CONFIG_FILE                     YAML/JSON batch configuration file
                                [required]
```

### Options
```
--dry-run / --no-dry-run        Simulate without generating files
                                [default: False]

--parallel INT                  Number of concurrent processes
                                [default: 1]

--report FILE                   Write batch report to file
```

### Configuration File Format

```yaml
# batch_config.yaml
batch:
  name: "FY2024 Batch Processing"
  author: "Finance Team"

jobs:
  - name: "ACME Inc"
    files:
      - path: "data/acme_2024.txt"
    output: "output/acme/"
    options:
      detailed: true
      formats: [xlsx, pdf]

  - name: "TechCorp"
    files:
      - path: "data/techcorp_2022.txt"
      - path: "data/techcorp_2023.txt"
      - path: "data/techcorp_2024.txt"
    output: "output/techcorp/"
    options:
      detailed: false
      formats: [xlsx]
      years: "2023,2024"
```

### Example
```bash
wincap batch batch_config.yaml --report batch_report.json
```

---

## UTILITY COMMANDS

### VERSION
```bash
wincap --version
wincap version
# Output: wincap version 1.0.0
```

### HELP
```bash
wincap --help
wincap help

wincap generate --help          # Command-specific help
```

### CONFIG
```bash
wincap config set KEY VALUE     # Set configuration value
wincap config get KEY           # Get configuration value
wincap config show              # Show all configuration
wincap config reset             # Reset to defaults
```

---

## Global Options

```
--config PATH                   Global configuration file
                                [default: ~/.wincap/config.yaml]

--debug / --no-debug            Enable debug logging
                                [default: False]

--version                       Show version and exit

--help                          Show help and exit
```

---

## Exit Codes

```
0   Execution successful
1   General error (file not found, invalid FEC, etc.)
2   Configuration error (bad config file, invalid option)
3   Validation error (trial balance failed, data error)
4   Export error (disk full, permission denied, etc.)
5   Interrupted by user (Ctrl+C)
```

---

## Progress Indicators

The CLI uses Rich library for enhanced output:

```
Spinner (Processing):
  ⠙ Processing fy2024.txt...

Progress Bar (File Upload):
  Uploading: ████████████────────────────── 45%

Status (Complete):
  ✓ Success
  ✗ Failed
  ⚠ Warning
  ℹ Information

Table (Data Display):
  ┌──────────┬──────────┬──────────┐
  │ Column 1 │ Column 2 │ Column 3 │
  ├──────────┼──────────┼──────────┤
  │   Data   │   Data   │   Data   │
  └──────────┴──────────┴──────────┘
```

---

## Configuration File

Default location: `~/.wincap/config.yaml`

```yaml
# Global defaults
output_dir: "./output"
company_name: ""
formats:
  - xlsx
  - pdf

# Processing defaults
parallel: 1
validate: true
vat_rate: 1.20

# Appearance
verbose: false
quiet: false
color: true

# Advanced
log_file: null
log_level: INFO
```

---

## Examples by Use Case

### Single Year Report
```bash
wincap generate -f fy2024.txt -n "ACME Inc"
```

### Multi-Year Comparison
```bash
wincap generate \
  -f fy2022.txt -f fy2023.txt -f fy2024.txt \
  -n "ACME Inc" \
  --detailed
```

### Batch Processing
```bash
wincap batch companies.yaml --parallel 4
```

### Quick Analysis
```bash
wincap analyze fy2024.txt --verbose
```

### Custom Mapping
```bash
wincap generate \
  -f fy2024.txt \
  --config custom_mapping.yaml \
  -n "ACME Inc"
```

### With QoE Analysis
```bash
wincap generate \
  -f fy2024.txt \
  --qoe adjustments.json \
  --detailed \
  -n "ACME Inc"
```

---

## Output Files

All files are generated in the specified output directory with timestamps:

```
output/
├── Databook_20250117_150230.xlsx        # Excel report
├── Rapport_DD_20250117_150230.pdf       # PDF report
├── dashboard_data_20250117_150230.json  # JSON data
└── processing_log_20250117_150230.txt   # Process log (if --verbose)
```

---

## Error Messages

```
Error: File not found: data/nonexistent.txt
  Check the file path and try again.

Error: Invalid FEC format
  The file does not appear to be a valid FEC file.
  Use: wincap analyze FILE to inspect the file.

Error: Trial balance failed
  Debits and credits do not match. Check source data.
  Use: wincap analyze FILE --verbose to see details.

Error: Invalid account mapping
  The account mapping config file is malformed.
  Use: wincap accounts to verify available mappings.

Error: Permission denied
  Cannot write to output directory: /path/to/dir
  Check directory permissions and try again.
```

---

## Input File Format (FEC)

The CLI expects French FEC files in the standard format:

```
JournalCode | JournalLib | EcritureNum | EcritureDate | CompteNum | CompteLib | DebitAmnt | CreditAmnt | ...
VT          | Ventes TTC | 1           | 20240101     | 411000    | ACME Inc  | 0        | 1500.00   | ...
BQ          | Banque     | 2           | 20240101     | 512000    | Bank      | 1500.00  | 0        | ...
```

Supported formats:
- Delimiters: Tab (\t), Semicolon (;), Pipe (|)
- Encodings: UTF-8, Latin-1, CP1252 (auto-detected)
- Date formats: DD/MM/YYYY, YYYY-MM-DD (auto-detected)

---

## API Compatibility

The CLI and FastAPI use the same core business logic:

```
CLI Command                  → API Endpoint
wincap generate             → POST /api/process
wincap analyze              → GET /api/analysis
wincap accounts             → GET /api/accounts
wincap batch                → POST /api/batch
```

Both paths accept the same input and produce the same output.

