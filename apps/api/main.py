#!/usr/bin/env python3
"""WincapAgent - Transform French FEC files into financial reports."""

import json
import logging
import sys
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

import click

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from config.settings import settings
from src.cleanup import cleanup_old_sessions, get_temp_directory_stats
from src.cli.output import (
    console,
    print_header,
    print_section,
    print_success,
    print_error,
    print_warning,
    print_info,
    print_financial_summary,
    print_balance_sheet_summary,
    print_kpi_summary,
    print_file_info_table,
    print_panel,
)
from src.config.constants import (
    TIMESTAMP_FORMAT,
    EXCEL_FILENAME_TEMPLATE,
    PDF_FILENAME_TEMPLATE,
    JSON_FILENAME_TEMPLATE,
)
from src.logging_config import setup_logging, get_logger
from src.parser.fec_parser import FECParser
from src.mapper.account_mapper import AccountMapper
from src.engine.pl_builder import PLBuilder
from src.engine.balance_builder import BalanceBuilder
from src.engine.kpi_calculator import KPICalculator
from src.engine.cashflow_builder import CashFlowBuilder
from src.engine.monthly_builder import MonthlyBuilder
from src.engine.variance_builder import VarianceBuilder
from src.engine.detail_builder import DetailBuilder
from src.export.excel_writer import ExcelWriter, export_dashboard_json
from src.export.pdf_writer import PDFWriter

# Setup logging
logger = setup_logging(__name__)


@click.group()
@click.version_option(version="0.2.0")
def cli():
    """WincapAgent - Transform French FEC accounting files into financial reports."""
    pass


@cli.command()
@click.option(
    "--fec",
    "-f",
    "fec_files",
    multiple=True,
    type=click.Path(exists=True),
    required=True,
    help="FEC file(s) to process. Can be specified multiple times for multi-year analysis.",
)
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True),
    help="Custom account mapping YAML config file.",
)
@click.option(
    "--adjustments",
    "-a",
    type=click.Path(exists=True),
    help="QoE adjustments JSON file.",
)
@click.option(
    "--output",
    "-o",
    type=click.Path(),
    default="./output",
    help="Output directory for generated files.",
)
@click.option(
    "--company-name",
    "-n",
    default="",
    help="Company name to display in reports.",
)
@click.option(
    "--years",
    "-y",
    help="Specific years to include (comma-separated, e.g., '2022,2023,2024').",
)
@click.option(
    "--excel/--no-excel",
    default=True,
    help="Generate Excel Databook.",
)
@click.option(
    "--pdf/--no-pdf",
    default=True,
    help="Generate PDF report.",
)
@click.option(
    "--detailed/--no-detailed",
    default=False,
    help="Include detailed analysis (monthly costs/EBITDA, account details, extended variances).",
)
@click.option(
    "--vat-rate",
    type=float,
    default=1.20,
    help="VAT rate for DSO/DPO calculations (default: 1.20 for French 20%).",
)
@click.option(
    "--json/--no-json",
    default=False,
    help="Generate JSON data for dashboard consumption.",
)
def generate(
    fec_files: tuple,
    config: Optional[str],
    adjustments: Optional[str],
    output: str,
    company_name: str,
    years: Optional[str],
    excel: bool,
    pdf: bool,
    detailed: bool,
    vat_rate: float,
    json: bool,
):
    """Generate financial reports from FEC file(s)."""
    try:
        output_dir = Path(output)
        output_dir.mkdir(parents=True, exist_ok=True)

        print_header("WINCAP - Report Generation")
        logger.info(f"Starting processing of {len(fec_files)} file(s)")

        # Parse FEC files
        print_section("Parsing FEC Files", indent=2)
        all_entries = []
        file_info = []

        for fec_file in fec_files:
            try:
                print_info(f"Parsing: {fec_file}", indent=4)
                parser = FECParser(fec_file)
                entries = parser.parse()
                all_entries.extend(entries)
                logger.info(f"Successfully parsed {fec_file}: {len(entries)} entries")
                print_success(f"{len(entries)} entries loaded", indent=6)

                file_info.append({
                    "filename": Path(fec_file).name,
                    "entries": len(entries),
                    "years": sorted(set(e.fiscal_year for e in entries)),
                    "encoding": parser.encoding,
                })
            except Exception as e:
                logger.error(f"Failed to parse {fec_file}: {e}", exc_info=True)
                print_error(f"Failed to parse {fec_file}: {e}", indent=4)
                sys.exit(1)

        if not all_entries:
            print_error("No entries found in FEC file(s).")
            logger.error("No entries found in any FEC file")
            sys.exit(1)

        print_file_info_table(file_info)

        # Filter by years if specified
        if years:
            target_years = [int(y.strip()) for y in years.split(",")]
            all_entries = [e for e in all_entries if e.fiscal_year in target_years]
            print_info(f"Filtered to years: {target_years}", indent=4)
            logger.info(f"Filtered entries to years: {target_years}")

        # Basic trial balance check per year
        print_section("Validating Trial Balance", indent=2)
        year_totals = defaultdict(lambda: {"debit": Decimal("0"), "credit": Decimal("0")})
        for entry in all_entries:
            totals = year_totals[entry.fiscal_year]
            totals["debit"] += entry.debit
            totals["credit"] += entry.credit

        for year, totals in sorted(year_totals.items()):
            diff = totals["debit"] - totals["credit"]
            if abs(diff) > Decimal("0.01"):
                print_warning(f"FY{year} imbalance (debit-credit): {diff}", indent=4)
                logger.warning(f"FY{year} trial balance imbalance: {diff}")
            else:
                print_success(f"FY{year} trial balance: balanced", indent=4)

        # Initialize mapper
        print_section("Loading Account Mapping", indent=2)
        mapper = AccountMapper(config) if config else AccountMapper()
        print_success(f"Account mapping loaded: {len(mapper.mapping)} prefixes", indent=4)
        logger.info(f"Account mapping loaded: {len(mapper.mapping)} prefixes")

        # Load QoE adjustments
        qoe_adjustments = {}
        if adjustments:
            try:
                with open(adjustments, "r") as f:
                    adj_data = json.load(f)
                    for adj in adj_data.get("adjustments", []):
                        year = adj.get("year")
                        label = adj.get("label")
                        amount = Decimal(str(adj.get("amount", 0)))
                        if year not in qoe_adjustments:
                            qoe_adjustments[year] = {}
                        qoe_adjustments[year][label] = amount
                print_success(f"QoE adjustments loaded: {len(qoe_adjustments)} year(s)", indent=4)
                logger.info(f"QoE adjustments loaded for {len(qoe_adjustments)} years")
            except Exception as e:
                print_warning(f"Failed to load QoE adjustments: {e}", indent=4)
                logger.warning(f"QoE adjustments loading failed: {e}")

        # Build financial statements
        print_section("Building Financial Statements", indent=2)

        pl_builder = PLBuilder(mapper)
        pl_list = pl_builder.build_multi_year(all_entries)
        print_success(f"P&L statements: {len(pl_list)} year(s)", indent=4)

        balance_builder = BalanceBuilder(mapper)
        balance_list = balance_builder.build_multi_year(all_entries)
        print_success(f"Balance sheets: {len(balance_list)} year(s)", indent=4)

        kpi_calculator = KPICalculator(qoe_adjustments, vat_rate=Decimal(str(vat_rate)))
        kpis_list = kpi_calculator.calculate_multi_year(pl_list, balance_list)
        print_success(f"KPI calculations: {len(kpis_list)} year(s)", indent=4)

        # Build additional analysis
        cashflow_builder = CashFlowBuilder()
        cashflows = cashflow_builder.build_multi_year(pl_list, balance_list)
        print_success(f"Cash flow statements: {len(cashflows)} year(s)", indent=4)

        monthly_builder = MonthlyBuilder(mapper)
        monthly_revenue = monthly_builder.build_monthly_revenue(all_entries)
        monthly_data = {"revenue": monthly_revenue}

        # Add detailed monthly analysis if requested
        if detailed:
            monthly_data["costs"] = monthly_builder.build_monthly_costs(all_entries)
            monthly_data["ebitda"] = monthly_builder.build_monthly_ebitda(all_entries)
            monthly_data["quarterly"] = monthly_builder.build_quarterly_summary(monthly_revenue)
            monthly_data["cumulative"] = monthly_builder.build_cumulative_revenue(monthly_revenue)
            monthly_data["seasonality"] = monthly_builder.get_seasonality_index(monthly_revenue)
            print_success(f"Monthly analysis (detailed): {len(monthly_revenue)} year(s)", indent=4)
            logger.info(f"Detailed monthly analysis for {len(monthly_revenue)} years")
        else:
            print_success(f"Monthly summary: {len(monthly_revenue)} year(s)", indent=4)
            logger.info(f"Basic monthly summary for {len(monthly_revenue)} years")

        variance_data = {}
        if len(pl_list) >= 2:
            variance_builder = VarianceBuilder()
            variance_data = {
                "cost_breakdown": variance_builder.build_cost_breakdown_variance(pl_list[-2], pl_list[-1]),
                "ebitda_bridge": variance_builder.build_ebitda_bridge(pl_list[-2], pl_list[-1]),
            }

            # Add detailed variance analysis if requested
            if detailed:
                variance_data["pl_variance"] = variance_builder.build_pl_variance(pl_list[-2], pl_list[-1])
                variance_data["revenue_bridge"] = variance_builder.build_revenue_bridge(
                    pl_list[-2], pl_list[-1], {}, {}
                )
                variance_data["kpi_evolution"] = variance_builder.build_kpi_evolution(kpis_list)
                print_success(f"Variance analysis (detailed): FY{pl_list[-2].year} → FY{pl_list[-1].year}", indent=4)
                logger.info(f"Detailed variance analysis")
            else:
                print_success(f"Variance analysis: FY{pl_list[-2].year} → FY{pl_list[-1].year}", indent=4)
                logger.info(f"Basic variance analysis")

        # Build BFR evolution analysis
        bfr_evolution = balance_builder.compute_bfr_evolution(balance_list)
        variance_data["bfr_evolution"] = bfr_evolution

        # Build P&L variations
        if len(pl_list) >= 2:
            pl_variations = pl_builder.compute_variations(pl_list)
            variance_data["pl_variations"] = pl_variations

        # Build KPI synthesis and QoE bridge
        kpi_synthesis = kpi_calculator.build_synthesis_table(kpis_list)
        variance_data["kpi_synthesis"] = kpi_synthesis
        if kpis_list:
            variance_data["qoe_bridge"] = kpi_calculator.build_qoe_bridge(kpis_list[-1])

        # Build account-level details if requested
        detail_data = {}
        if detailed:
            detail_builder = DetailBuilder(mapper)
            detail_data["account_summary"] = detail_builder.build_account_summary(all_entries)
            detail_data["top_accounts"] = detail_builder.build_top_accounts_all_years(all_entries, top_n=20)
            detail_data["category_breakdown"] = detail_builder.build_category_breakdown_all_years(all_entries)
            years = sorted(set(e.fiscal_year for e in all_entries))
            latest_year = years[-1] if years else None
            if latest_year:
                detail_data["pl_detail"] = detail_builder.build_pl_detail(all_entries, latest_year)
                detail_data["balance_detail"] = detail_builder.build_balance_detail(all_entries, latest_year)
            print_success(f"Account details: {len(detail_data.get('top_accounts', []))} top accounts", indent=4)
            logger.info(f"Detailed account analysis")

        # Generate outputs
        print_section("Generating Reports", indent=2)
        timestamp = datetime.now().strftime(TIMESTAMP_FORMAT)

        if excel:
            try:
                excel_writer = ExcelWriter(company_name)
                excel_path = output_dir / EXCEL_FILENAME_TEMPLATE.format(timestamp=timestamp)
                excel_writer.generate(
                    pl_list, balance_list, kpis_list, excel_path,
                    entries=all_entries,
                    cashflows=cashflows,
                    monthly_data=monthly_data,
                    variance_data=variance_data,
                    detail_data=detail_data if detailed else None,
                )
                print_success(f"Excel Databook: {excel_path.name}", indent=4)
                logger.info(f"Excel exported: {excel_path}")
            except Exception as e:
                print_error(f"Excel export failed: {e}", indent=4)
                logger.error(f"Excel export failed: {e}", exc_info=True)

        if pdf:
            try:
                pdf_writer = PDFWriter(company_name)
                pdf_path = output_dir / PDF_FILENAME_TEMPLATE.format(timestamp=timestamp)
                pdf_writer.generate(pl_list, balance_list, kpis_list, pdf_path)
                print_success(f"PDF Report: {pdf_path.name}", indent=4)
                logger.info(f"PDF exported: {pdf_path}")
            except ImportError as e:
                print_warning(f"PDF generation skipped: {e}", indent=4)
                logger.warning(f"PDF generation not available: {e}")
            except Exception as e:
                print_error(f"PDF export failed: {e}", indent=4)
                logger.error(f"PDF export failed: {e}", exc_info=True)

        if json:
            try:
                json_path = output_dir / JSON_FILENAME_TEMPLATE.format(timestamp=timestamp)
                export_dashboard_json(
                    pl_list, balance_list, kpis_list,
                    company_name, json_path,
                    monthly_data=monthly_data,
                    variance_data=variance_data,
                )
                print_success(f"JSON Data: {json_path.name}", indent=4)
                logger.info(f"JSON exported: {json_path}")
            except Exception as e:
                print_error(f"JSON export failed: {e}", indent=4)
                logger.error(f"JSON export failed: {e}", exc_info=True)

        # Display financial summary
        print_header("FINANCIAL SUMMARY")
        print_financial_summary(pl_list)

        if balance_list:
            print_balance_sheet_summary(balance_list)

        if kpis_list:
            print_kpi_summary(kpis_list)

        # Cleanup temporary files
        cleanup_old_sessions()

        print_section("Processing Complete", width=50)
        logger.info("Processing completed successfully")

    except KeyboardInterrupt:
        print_error("\nProcessing interrupted by user")
        logger.warning("Processing interrupted by user")
        sys.exit(5)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        logger.error(f"Unexpected error during processing: {e}", exc_info=True)
        sys.exit(1)


@cli.command()
@click.argument("fec_file", type=click.Path(exists=True))
def analyze(fec_file: str):
    """Quick analysis of a FEC file without generating reports."""
    try:
        print_header("FEC File Analysis")
        print_info(f"Analyzing: {fec_file}\n", indent=2)
        logger.info(f"Starting FEC file analysis: {fec_file}")

        parser = FECParser(fec_file)
        entries = parser.parse()

        # Basic information
        print_section("File Information", indent=2)
        console.print(f"  Total entries: [cyan]{len(entries):,}[/cyan]")
        console.print(f"  Fiscal years: [magenta]{sorted(set(e.fiscal_year for e in entries))}[/magenta]")
        console.print(f"  Encoding: [yellow]{parser.encoding}[/yellow]")
        console.print(f"  Delimiter: [yellow]{repr(parser.delimiter)}[/yellow]")
        logger.info(f"File info: {len(entries)} entries, encoding={parser.encoding}")

        # Account classes distribution
        print_section("Account Distribution", indent=2)
        class_counts = {}
        class_totals = {}
        for entry in entries:
            cls = entry.account_class
            class_counts[cls] = class_counts.get(cls, 0) + 1
            class_totals[cls] = class_totals.get(cls, Decimal("0")) + (entry.debit - entry.credit)

        from rich.table import Table
        table = Table(show_header=True, header_style="bold cyan")
        table.add_column("Account Class", style="cyan")
        table.add_column("Entry Count", justify="right")
        table.add_column("Total Amount", justify="right")

        for cls in sorted(class_counts.keys()):
            table.add_row(
                f"Class {cls}",
                str(class_counts[cls]),
                f"{float(class_totals[cls]):,.2f} €"
            )

        console.print(table)
        logger.info(f"Account distribution: {len(class_counts)} classes")

        # Sample entries
        print_section("Sample Entries (First 5)", indent=2)
        sample_table = Table(show_header=True, header_style="bold cyan")
        sample_table.add_column("Date", style="cyan")
        sample_table.add_column("Account", style="magenta")
        sample_table.add_column("Description")
        sample_table.add_column("Debit", justify="right")
        sample_table.add_column("Credit", justify="right")

        for entry in entries[:5]:
            sample_table.add_row(
                str(entry.date),
                entry.account_num,
                entry.label[:40],
                f"{float(entry.debit):,.2f}" if entry.debit > 0 else "",
                f"{float(entry.credit):,.2f}" if entry.credit > 0 else "",
            )

        console.print(sample_table)
        logger.info(f"Analysis completed successfully")

    except Exception as e:
        print_error(f"Analysis failed: {e}")
        logger.error(f"FEC analysis failed: {e}", exc_info=True)
        sys.exit(1)


@cli.command()
def accounts():
    """List available account mappings (French PCG)."""
    try:
        print_header("Account Mappings (PCG)", width=50)

        mapper = AccountMapper()
        print_info(f"Loaded {len(mapper.mapping)} account prefixes", indent=2)
        logger.info(f"Displaying {len(mapper.mapping)} account mappings")

        categories = {}
        for prefix, category in sorted(mapper.mapping.items(), key=lambda x: x[0]):
            if category not in categories:
                categories[category] = []
            categories[category].append(prefix)

        # Display as table
        from rich.table import Table
        table = Table(title="Account Categories", show_header=True, header_style="bold cyan")
        table.add_column("Category", style="cyan")
        table.add_column("Account Prefixes", style="magenta")
        table.add_column("Count", justify="right")

        for category, prefixes in sorted(categories.items()):
            sorted_prefixes = sorted(prefixes)
            table.add_row(
                category,
                ", ".join(sorted_prefixes),
                str(len(sorted_prefixes)),
            )

        console.print(table)

        print_info(f"Total categories: {len(categories)}", indent=2)
        logger.info(f"Displayed {len(categories)} account categories")

    except Exception as e:
        print_error(f"Failed to display accounts: {e}")
        logger.error(f"Account listing failed: {e}", exc_info=True)
        sys.exit(1)


@cli.command()
@click.option(
    "--fec",
    "-f",
    "fec_files",
    multiple=True,
    type=click.Path(exists=True),
    required=True,
    help="FEC file(s) to process.",
)
@click.option(
    "--template",
    "-t",
    type=click.Path(exists=True),
    required=True,
    help="Client template Excel file to use as base.",
)
@click.option(
    "--output",
    "-o",
    type=click.Path(),
    required=True,
    help="Output file path for generated Databook.",
)
@click.option(
    "--company-name",
    "-n",
    default="",
    help="Company name to display in reports.",
)
@click.option(
    "--years",
    "-y",
    help="Specific years to include (comma-separated, e.g., '2022,2023,2024').",
)
def template(
    fec_files: tuple,
    template: str,
    output: str,
    company_name: str,
    years: str,
):
    """Generate Databook using a client template.

    This command populates an existing client template with FEC data.
    All formulas in the template are preserved, so summary sheets
    (P&L, Bilan, etc.) automatically calculate from the FEC data.
    """
    from src.export.template_writer import TemplateWriter

    click.echo(f"WincapAgent - Template-based generation")
    click.echo(f"  Template: {template}")
    click.echo(f"  Processing {len(fec_files)} FEC file(s)...")

    # Parse FEC files
    all_entries = []
    for fec_file in fec_files:
        click.echo(f"  Parsing: {fec_file}")
        parser = FECParser(fec_file)
        entries = parser.parse()
        all_entries.extend(entries)
        click.echo(f"    → {len(entries)} entries loaded")

    if not all_entries:
        click.echo("Error: No entries found in FEC file(s).", err=True)
        sys.exit(1)

    # Parse years filter
    target_years = None
    if years:
        target_years = [int(y.strip()) for y in years.split(",")]
        click.echo(f"  Filtering to years: {target_years}")

    # Generate using template
    click.echo(f"\nGenerating Databook from template...")
    writer = TemplateWriter(template)
    output_path = writer.generate(
        all_entries,
        output,
        company_name=company_name,
        years=target_years,
    )
    click.echo(f"  → {output_path}")
    click.echo("\nDone!")


if __name__ == "__main__":
    cli()
