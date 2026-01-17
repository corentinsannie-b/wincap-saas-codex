"""
CLI output utilities using Rich library.

Provides formatted console output with colors, tables, progress bars,
and other Rich features for improved user experience.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.table import Table
from rich.text import Text

from src.models.financials import BalanceSheet, KPIs, ProfitLoss

# Global console instance
console = Console()


# =============================================================================
# Basic Message Functions
# =============================================================================


def print_header(title: str, subtitle: str = None, width: int = 70) -> None:
    """
    Print a formatted header with optional subtitle.

    Args:
        title: Main title text
        subtitle: Optional subtitle
        width: Width of header line
    """
    console.print(f"\n[bold cyan]{'=' * width}[/bold cyan]")
    console.print(f"[bold cyan]{title}[/bold cyan]")
    if subtitle:
        console.print(f"[cyan]{subtitle}[/cyan]")
    console.print(f"[bold cyan]{'=' * width}[/bold cyan]\n")


def print_success(message: str, indent: int = 0) -> None:
    """Print success message with checkmark."""
    prefix = " " * indent
    console.print(f"{prefix}[green]✓[/green] {message}")


def print_error(message: str, indent: int = 0) -> None:
    """Print error message with X mark."""
    prefix = " " * indent
    console.print(f"{prefix}[red]✗[/red] {message}")


def print_warning(message: str, indent: int = 0) -> None:
    """Print warning message with warning symbol."""
    prefix = " " * indent
    console.print(f"{prefix}[yellow]⚠[/yellow] {message}")


def print_info(message: str, indent: int = 0) -> None:
    """Print info message with info symbol."""
    prefix = " " * indent
    console.print(f"{prefix}[blue]ℹ[/blue] {message}")


def print_section(title: str, indent: int = 0) -> None:
    """Print section header."""
    prefix = " " * indent
    console.print(f"{prefix}[bold cyan]{title}[/bold cyan]")


# =============================================================================
# Table Functions
# =============================================================================


def print_financial_summary(pl_list: List[ProfitLoss]) -> None:
    """
    Print formatted financial summary table.

    Args:
        pl_list: List of ProfitLoss objects
    """
    if not pl_list:
        print_warning("No financial data to display")
        return

    table = Table(title="Financial Summary", show_header=True, header_style="bold cyan")

    table.add_column("Fiscal Year", style="cyan", justify="center")
    table.add_column("Revenue", justify="right", style="magenta")
    table.add_column("EBITDA", justify="right")
    table.add_column("EBITDA %", justify="right")
    table.add_column("Net Income", justify="right")

    for pl in pl_list:
        table.add_row(
            str(pl.year),
            f"{float(pl.revenue / 1000):,.0f} k€",
            f"{float(pl.ebitda / 1000):,.0f} k€",
            f"{float(pl.ebitda_margin):.1f}%",
            f"{float(pl.net_income / 1000):,.0f} k€",
        )

    console.print(table)


def print_balance_sheet_summary(balance_list: List[BalanceSheet]) -> None:
    """
    Print formatted balance sheet summary table.

    Args:
        balance_list: List of BalanceSheet objects
    """
    if not balance_list:
        print_warning("No balance sheet data to display")
        return

    table = Table(title="Balance Sheet Summary", show_header=True, header_style="bold cyan")

    table.add_column("Year", style="cyan", justify="center")
    table.add_column("Total Assets", justify="right", style="magenta")
    table.add_column("Total Liabilities", justify="right")
    table.add_column("Equity", justify="right")

    for bs in balance_list:
        table.add_row(
            str(bs.year),
            f"{float(bs.total_assets / 1000):,.0f} k€",
            f"{float(bs.total_liabilities / 1000):,.0f} k€",
            f"{float(bs.equity / 1000):,.0f} k€",
        )

    console.print(table)


def print_kpi_summary(kpis_list: List[KPIs]) -> None:
    """
    Print formatted KPI summary table.

    Args:
        kpis_list: List of KPIs objects
    """
    if not kpis_list:
        print_warning("No KPI data to display")
        return

    table = Table(title="Key Performance Indicators", show_header=True, header_style="bold cyan")

    table.add_column("Year", style="cyan", justify="center")
    table.add_column("DSO (days)", justify="right")
    table.add_column("DPO (days)", justify="right")
    table.add_column("DIO (days)", justify="right")
    table.add_column("ROE (%)", justify="right")
    table.add_column("Debt/EBITDA", justify="right")

    for kpi in kpis_list:
        table.add_row(
            str(kpi.year),
            f"{float(kpi.dso):.0f}",
            f"{float(kpi.dpo):.0f}",
            f"{float(kpi.dio):.0f}",
            f"{float(kpi.roe):.1f}%",
            f"{float(kpi.debt_to_ebitda):.2f}x",
        )

    console.print(table)


def print_account_distribution(account_data: Dict[str, Dict[str, Any]]) -> None:
    """
    Print account class distribution table.

    Args:
        account_data: Dictionary with account class data
    """
    if not account_data:
        print_warning("No account data to display")
        return

    table = Table(title="Account Distribution", show_header=True, header_style="bold cyan")

    table.add_column("Account Class", style="cyan")
    table.add_column("Description", style="white")
    table.add_column("Count", justify="right")
    table.add_column("Total Amount", justify="right")

    for class_code, data in sorted(account_data.items()):
        table.add_row(
            f"Class {class_code}",
            data.get("name", ""),
            str(data.get("count", 0)),
            f"{data.get('total', 0):,.0f} €",
        )

    console.print(table)


def print_file_info_table(files_info: List[Dict[str, Any]]) -> None:
    """
    Print table of uploaded files and their info.

    Args:
        files_info: List of file information dictionaries
    """
    if not files_info:
        print_warning("No file information to display")
        return

    table = Table(title="Uploaded Files", show_header=True, header_style="bold cyan")

    table.add_column("Filename", style="cyan")
    table.add_column("Entries", justify="right")
    table.add_column("Years", style="magenta")
    table.add_column("Encoding", style="yellow")

    for file_info in files_info:
        years_str = ", ".join(str(y) for y in file_info.get("years", []))
        table.add_row(
            file_info.get("filename", ""),
            str(file_info.get("entries", 0)),
            years_str,
            file_info.get("encoding", "unknown"),
        )

    console.print(table)


# =============================================================================
# Progress Functions
# =============================================================================


def progress_bar(
    total: int, description: str = "Processing", spinner: bool = True
) -> Progress:
    """
    Create and return a progress bar context.

    Usage:
        with progress_bar(100, "Processing files") as progress:
            task = progress.add_task("[cyan]Task...", total=100)
            # ... do work ...
            progress.update(task, advance=1)

    Args:
        total: Total number of items
        description: Description text
        spinner: Whether to show spinner

    Returns:
        Progress context manager
    """
    columns = []

    if spinner:
        columns.append(SpinnerColumn())

    columns.extend([
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    ])

    return Progress(*columns)


# =============================================================================
# Panel and Box Functions
# =============================================================================


def print_panel(title: str, content: str, expand: bool = False) -> None:
    """
    Print content in a bordered panel.

    Args:
        title: Panel title
        content: Panel content (text or formatted string)
        expand: Whether to expand panel to console width
    """
    panel = Panel(
        content,
        title=title,
        expand=expand,
        border_style="cyan",
    )
    console.print(panel)


def print_box(content: str, style: str = "cyan") -> None:
    """
    Print content in a simple box.

    Args:
        content: Content to display
        style: Style for box border (e.g., "cyan", "green", "red")
    """
    panel = Panel(content, border_style=style)
    console.print(panel)


# =============================================================================
# Utility Functions
# =============================================================================


def format_currency(amount: Decimal, precision: int = 2, unit: str = "€") -> str:
    """
    Format amount as currency string.

    Args:
        amount: Amount to format
        precision: Number of decimal places
        unit: Currency unit symbol

    Returns:
        Formatted string like "1,234.56 €"
    """
    format_spec = f",.{precision}f"
    return f"{float(amount):{format_spec}} {unit}"


def format_percentage(value: Decimal, precision: int = 1) -> str:
    """
    Format value as percentage string.

    Args:
        value: Value to format
        precision: Number of decimal places

    Returns:
        Formatted string like "12.5%"
    """
    format_spec = f".{precision}f"
    return f"{float(value):{format_spec}}%"


def format_ratio(value: Decimal, precision: int = 2) -> str:
    """
    Format value as ratio string.

    Args:
        value: Ratio value
        precision: Number of decimal places

    Returns:
        Formatted string like "1.50x"
    """
    format_spec = f".{precision}f"
    return f"{float(value):{format_spec}}x"


def print_summary_text(title: str, data: Dict[str, Any]) -> None:
    """
    Print key-value summary.

    Args:
        title: Summary title
        data: Dictionary of key-value pairs to display
    """
    print_section(title)

    for key, value in data.items():
        if isinstance(value, Decimal):
            value_str = format_currency(value)
        elif isinstance(value, (int, float)):
            value_str = f"{value:,.2f}"
        else:
            value_str = str(value)

        console.print(f"  [cyan]{key}:[/cyan] {value_str}")

    console.print()


# =============================================================================
# Status and Result Functions
# =============================================================================


def print_processing_complete(
    file_count: int, total_entries: int, duration_seconds: float
) -> None:
    """
    Print processing completion message.

    Args:
        file_count: Number of files processed
        total_entries: Total entries processed
        duration_seconds: Processing time in seconds
    """
    print_header("PROCESSING COMPLETE", width=50)

    console.print(f"[green]✓[/green] [bold]Success![/bold]")
    console.print(f"  Files processed: {file_count}")
    console.print(f"  Total entries: {total_entries:,}")
    console.print(f"  Duration: {duration_seconds:.1f}s")
    console.print()


def print_export_summary(exports: Dict[str, str]) -> None:
    """
    Print export file summary.

    Args:
        exports: Dictionary of export type to file path
    """
    print_section("Generated Files", indent=2)

    for export_type, file_path in exports.items():
        size_mb = 0  # Would need to get actual file size

        if size_mb:
            print_success(f"{export_type.upper()}: {file_path} ({size_mb:.1f} MB)")
        else:
            print_success(f"{export_type.upper()}: {file_path}")
