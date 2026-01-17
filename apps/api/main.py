#!/usr/bin/env python3
"""WincapAgent - Transform French FEC files into financial reports."""

import json
import sys
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

import click

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

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
    output_dir = Path(output)
    output_dir.mkdir(parents=True, exist_ok=True)

    click.echo(f"WincapAgent - Processing {len(fec_files)} file(s)...")

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

    # Filter by years if specified
    if years:
        target_years = [int(y.strip()) for y in years.split(",")]
        all_entries = [e for e in all_entries if e.fiscal_year in target_years]
        click.echo(f"  Filtered to years: {target_years}")

    # Basic trial balance check per year
    year_totals = defaultdict(lambda: {"debit": Decimal("0"), "credit": Decimal("0")})
    for entry in all_entries:
        totals = year_totals[entry.fiscal_year]
        totals["debit"] += entry.debit
        totals["credit"] += entry.credit

    for year, totals in sorted(year_totals.items()):
        diff = totals["debit"] - totals["credit"]
        if abs(diff) > Decimal("0.01"):
            click.echo(f"  Warning: FY{year} imbalance (debit-credit): {diff}", err=True)

    # Initialize mapper
    mapper = AccountMapper(config) if config else AccountMapper()
    click.echo(f"  Account mapping loaded: {len(mapper.mapping)} prefixes")

    # Load QoE adjustments
    qoe_adjustments = {}
    if adjustments:
        with open(adjustments, "r") as f:
            adj_data = json.load(f)
            for adj in adj_data.get("adjustments", []):
                year = adj.get("year")
                label = adj.get("label")
                amount = Decimal(str(adj.get("amount", 0)))
                if year not in qoe_adjustments:
                    qoe_adjustments[year] = {}
                qoe_adjustments[year][label] = amount
        click.echo(f"  QoE adjustments loaded: {len(qoe_adjustments)} year(s)")

    # Build financial statements
    click.echo("\nBuilding financial statements...")

    pl_builder = PLBuilder(mapper)
    pl_list = pl_builder.build_multi_year(all_entries)
    click.echo(f"  P&L: {len(pl_list)} year(s)")

    balance_builder = BalanceBuilder(mapper)
    balance_list = balance_builder.build_multi_year(all_entries)
    click.echo(f"  Balance: {len(balance_list)} year(s)")

    kpi_calculator = KPICalculator(qoe_adjustments, vat_rate=Decimal(str(vat_rate)))
    kpis_list = kpi_calculator.calculate_multi_year(pl_list, balance_list)
    click.echo(f"  KPIs: {len(kpis_list)} year(s)")

    # Build additional analysis
    cashflow_builder = CashFlowBuilder()
    cashflows = cashflow_builder.build_multi_year(pl_list, balance_list)
    click.echo(f"  Cash-Flow: {len(cashflows)} year(s)")

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
        click.echo(f"  Monthly (detailed): {len(monthly_revenue)} year(s)")
    else:
        click.echo(f"  Monthly: {len(monthly_revenue)} year(s)")

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
                pl_list[-2], pl_list[-1], {}, {}  # TODO: Get actual client data when available
            )
            variance_data["kpi_evolution"] = variance_builder.build_kpi_evolution(kpis_list)
            click.echo(f"  Variances (detailed): FY{pl_list[-2].year} → FY{pl_list[-1].year}")
        else:
            click.echo(f"  Variances: FY{pl_list[-2].year} → FY{pl_list[-1].year}")

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
        # Use all-years methods that don't require year parameter
        detail_data["top_accounts"] = detail_builder.build_top_accounts_all_years(all_entries, top_n=20)
        detail_data["category_breakdown"] = detail_builder.build_category_breakdown_all_years(all_entries)
        # Build per-year details for the most recent year
        years = sorted(set(e.fiscal_year for e in all_entries))
        latest_year = years[-1] if years else None
        if latest_year:
            detail_data["pl_detail"] = detail_builder.build_pl_detail(all_entries, latest_year)
            detail_data["balance_detail"] = detail_builder.build_balance_detail(all_entries, latest_year)
        click.echo(f"  Account details: {len(detail_data['top_accounts'])} top accounts")

    # Generate outputs
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if excel:
        click.echo("\nGenerating Excel Databook...")
        excel_writer = ExcelWriter(company_name)
        excel_path = output_dir / f"Databook_{timestamp}.xlsx"
        excel_writer.generate(
            pl_list, balance_list, kpis_list, excel_path,
            entries=all_entries,
            cashflows=cashflows,
            monthly_data=monthly_data,
            variance_data=variance_data,
            detail_data=detail_data if detailed else None,
        )
        click.echo(f"  → {excel_path}")

    if pdf:
        click.echo("\nGenerating PDF Report...")
        try:
            pdf_writer = PDFWriter(company_name)
            pdf_path = output_dir / f"Rapport_DD_{timestamp}.pdf"
            pdf_writer.generate(pl_list, balance_list, kpis_list, pdf_path)
            click.echo(f"  → {pdf_path}")
        except ImportError as e:
            click.echo(f"  Warning: PDF generation skipped - {e}", err=True)

    if json:
        click.echo("\nGenerating Dashboard JSON...")
        json_path = output_dir / f"dashboard_data_{timestamp}.json"
        export_dashboard_json(
            pl_list, balance_list, kpis_list,
            company_name, json_path,
            monthly_data=monthly_data,
            variance_data=variance_data,
        )
        click.echo(f"  → {json_path}")

    # Print summary
    click.echo("\n" + "=" * 50)
    click.echo("SUMMARY")
    click.echo("=" * 50)

    for pl in pl_list:
        click.echo(f"\nFY{pl.year}:")
        click.echo(f"  CA: {float(pl.revenue/1000):,.0f} k€")
        click.echo(f"  EBITDA: {float(pl.ebitda/1000):,.0f} k€ ({float(pl.ebitda_margin):.1f}%)")
        click.echo(f"  Résultat Net: {float(pl.net_income/1000):,.0f} k€")

    click.echo("\nDone!")


@cli.command()
@click.argument("fec_file", type=click.Path(exists=True))
def analyze(fec_file: str):
    """Quick analysis of a FEC file without generating reports."""
    click.echo(f"Analyzing: {fec_file}\n")

    parser = FECParser(fec_file)
    entries = parser.parse()

    click.echo(f"Total entries: {len(entries)}")
    click.echo(f"Years: {parser.years}")
    click.echo(f"Encoding: {parser._encoding}")
    click.echo(f"Delimiter: {repr(parser._delimiter)}")

    # Account classes distribution
    click.echo("\nAccount classes:")
    class_counts = {}
    for entry in entries:
        cls = entry.account_class
        class_counts[cls] = class_counts.get(cls, 0) + 1

    for cls in sorted(class_counts.keys()):
        click.echo(f"  Classe {cls}: {class_counts[cls]} entries")

    # Sample entries
    click.echo("\nSample entries:")
    for entry in entries[:5]:
        click.echo(f"  {entry.date} | {entry.account_num} | {entry.label[:30]} | D:{entry.debit} C:{entry.credit}")


@cli.command()
def accounts():
    """List available account mappings."""
    mapper = AccountMapper()

    click.echo("Account Mappings (PCG → Category):\n")

    categories = {}
    for prefix, category in sorted(mapper.mapping.items(), key=lambda x: x[0]):
        if category not in categories:
            categories[category] = []
        categories[category].append(prefix)

    for category, prefixes in sorted(categories.items()):
        click.echo(f"{category}:")
        click.echo(f"  Prefixes: {', '.join(sorted(prefixes))}")
        click.echo()


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
