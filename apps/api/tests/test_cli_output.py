"""
Unit tests for CLI output utilities.

Tests Rich-formatted output functions and console formatting.
"""

import pytest
from io import StringIO
from unittest.mock import patch, MagicMock
from src.cli.output import (
    print_header,
    print_success,
    print_error,
    print_warning,
    print_info,
    print_section,
    format_currency,
    format_percentage,
    format_ratio,
)
from decimal import Decimal


class TestConsoleOutput:
    """Tests for basic console output functions."""

    @patch('src.cli.output.console')
    def test_print_header(self, mock_console):
        """Test header printing."""
        print_header("Test Header", "Subtitle", width=50)
        assert mock_console.print.call_count >= 4

    @patch('src.cli.output.console')
    def test_print_success(self, mock_console):
        """Test success message printing."""
        print_success("Operation successful", indent=0)
        mock_console.print.assert_called_once()
        call_args = mock_console.print.call_args[0][0]
        assert "[green]✓[/green]" in call_args
        assert "Operation successful" in call_args

    @patch('src.cli.output.console')
    def test_print_error(self, mock_console):
        """Test error message printing."""
        print_error("An error occurred", indent=0)
        mock_console.print.assert_called_once()
        call_args = mock_console.print.call_args[0][0]
        assert "[red]✗[/red]" in call_args
        assert "An error occurred" in call_args

    @patch('src.cli.output.console')
    def test_print_warning(self, mock_console):
        """Test warning message printing."""
        print_warning("Warning message", indent=0)
        mock_console.print.assert_called_once()
        call_args = mock_console.print.call_args[0][0]
        assert "[yellow]⚠[/yellow]" in call_args
        assert "Warning message" in call_args

    @patch('src.cli.output.console')
    def test_print_info(self, mock_console):
        """Test info message printing."""
        print_info("Information", indent=0)
        mock_console.print.assert_called_once()
        call_args = mock_console.print.call_args[0][0]
        assert "[blue]ℹ[/blue]" in call_args
        assert "Information" in call_args

    @patch('src.cli.output.console')
    def test_print_section(self, mock_console):
        """Test section header printing."""
        print_section("Section Title", indent=0)
        mock_console.print.assert_called_once()
        call_args = mock_console.print.call_args[0][0]
        assert "[bold cyan]Section Title[/bold cyan]" in call_args

    @patch('src.cli.output.console')
    def test_indentation(self, mock_console):
        """Test message indentation."""
        print_success("Indented message", indent=4)
        call_args = mock_console.print.call_args[0][0]
        assert call_args.startswith("    ")


class TestCurrencyFormatting:
    """Tests for currency formatting."""

    def test_format_currency_basic(self):
        """Test basic currency formatting."""
        result = format_currency(Decimal("1234.56"))
        assert "1,234.56" in result
        assert "€" in result

    def test_format_currency_thousands_separator(self):
        """Test thousands separator in currency formatting."""
        result = format_currency(Decimal("1000000.00"))
        assert "1,000,000.00" in result

    def test_format_currency_custom_precision(self):
        """Test custom precision in currency formatting."""
        result = format_currency(Decimal("1234.5678"), precision=3)
        assert "1,234.568" in result

    def test_format_currency_zero(self):
        """Test formatting zero currency."""
        result = format_currency(Decimal("0.00"))
        assert "0.00" in result

    def test_format_currency_large_amount(self):
        """Test formatting large currency amounts."""
        result = format_currency(Decimal("999999999.99"))
        assert "999,999,999.99" in result

    def test_format_currency_custom_unit(self):
        """Test custom currency unit symbol."""
        result = format_currency(Decimal("100.00"), unit="$")
        assert "$" in result


class TestPercentageFormatting:
    """Tests for percentage formatting."""

    def test_format_percentage_basic(self):
        """Test basic percentage formatting."""
        result = format_percentage(Decimal("50.5"))
        assert "50.5%" in result

    def test_format_percentage_zero(self):
        """Test formatting zero percentage."""
        result = format_percentage(Decimal("0"))
        assert "0.0%" in result

    def test_format_percentage_custom_precision(self):
        """Test custom precision in percentage formatting."""
        result = format_percentage(Decimal("33.3333"), precision=2)
        assert "33.33%" in result

    def test_format_percentage_high_value(self):
        """Test formatting high percentage values."""
        result = format_percentage(Decimal("150.0"))
        assert "150.0%" in result


class TestRatioFormatting:
    """Tests for ratio formatting."""

    def test_format_ratio_basic(self):
        """Test basic ratio formatting."""
        result = format_ratio(Decimal("2.5"))
        assert "2.50x" in result

    def test_format_ratio_one(self):
        """Test formatting ratio of 1."""
        result = format_ratio(Decimal("1.0"))
        assert "1.00x" in result

    def test_format_ratio_decimal(self):
        """Test formatting decimal ratio."""
        result = format_ratio(Decimal("0.75"))
        assert "0.75x" in result

    def test_format_ratio_custom_precision(self):
        """Test custom precision in ratio formatting."""
        result = format_ratio(Decimal("2.5555"), precision=3)
        assert "2.556x" in result


class TestFinancialTableOutput:
    """Tests for financial table output functions."""

    @patch('src.cli.output.console')
    def test_print_financial_summary_empty(self, mock_console):
        """Test financial summary with empty data."""
        from src.cli.output import print_financial_summary
        print_financial_summary([])
        # Should print warning about no data
        assert mock_console.print.called

    @patch('src.cli.output.console')
    def test_print_financial_summary_with_data(self, mock_console, sample_profit_loss):
        """Test financial summary with actual data."""
        from src.cli.output import print_financial_summary
        print_financial_summary([sample_profit_loss])
        assert mock_console.print.called

    @patch('src.cli.output.console')
    def test_print_balance_sheet_summary_empty(self, mock_console):
        """Test balance sheet summary with empty data."""
        from src.cli.output import print_balance_sheet_summary
        print_balance_sheet_summary([])
        assert mock_console.print.called

    @patch('src.cli.output.console')
    def test_print_balance_sheet_summary_with_data(self, mock_console, sample_balance_sheet):
        """Test balance sheet summary with actual data."""
        from src.cli.output import print_balance_sheet_summary
        print_balance_sheet_summary([sample_balance_sheet])
        assert mock_console.print.called

    @patch('src.cli.output.console')
    def test_print_kpi_summary_empty(self, mock_console):
        """Test KPI summary with empty data."""
        from src.cli.output import print_kpi_summary
        print_kpi_summary([])
        assert mock_console.print.called

    @patch('src.cli.output.console')
    def test_print_kpi_summary_with_data(self, mock_console, sample_kpis):
        """Test KPI summary with actual data."""
        from src.cli.output import print_kpi_summary
        print_kpi_summary([sample_kpis])
        assert mock_console.print.called
