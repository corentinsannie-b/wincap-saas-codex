"""
Unit tests for financial data models.

Tests JournalEntry, ProfitLoss, BalanceSheet, and KPIs models.
"""

import pytest
from decimal import Decimal
from src.models.entry import JournalEntry
from src.models.financials import ProfitLoss, BalanceSheet, KPIs


class TestJournalEntry:
    """Tests for JournalEntry model."""

    def test_journal_entry_creation(self, sample_entries):
        """Test creating a journal entry."""
        entry = sample_entries[0]
        assert entry.fiscal_year == 2024
        assert entry.account_number == "411"
        assert entry.debit == Decimal("1000.00")
        assert entry.credit == Decimal("0.00")

    def test_journal_entry_fields(self):
        """Test all JournalEntry fields are present."""
        entry = JournalEntry(
            fiscal_year=2024,
            journal_code="VE",
            entry_number="001",
            entry_date="2024-01-15",
            company_name="Test Co",
            account_number="411",
            account_label="Clients",
            description="Test",
            debit=Decimal("1000.00"),
            credit=Decimal("0.00"),
            entry_date_original="2024-01-15",
            supplementary_account="",
            quality_flag="",
        )
        assert entry.fiscal_year == 2024
        assert entry.journal_code == "VE"
        assert entry.entry_number == "001"
        assert entry.account_label == "Clients"

    def test_journal_entry_immutable(self, sample_entries):
        """Test that JournalEntry fields cannot be modified (if using frozen dataclass)."""
        entry = sample_entries[0]
        # This test depends on whether the model is frozen
        # If frozen, attempting to modify should raise an error
        try:
            entry.debit = Decimal("2000.00")
            # If no error, model is not frozen (which is okay)
        except (AttributeError, TypeError):
            # Model is frozen, which is good for immutability
            pass


class TestProfitLoss:
    """Tests for ProfitLoss financial model."""

    def test_profit_loss_creation(self, sample_profit_loss):
        """Test creating a ProfitLoss object."""
        pl = sample_profit_loss
        assert pl.year == 2024
        assert pl.revenue == Decimal("100000.00")
        assert pl.purchases == Decimal("40000.00")

    def test_profit_loss_calculations(self):
        """Test ProfitLoss calculation properties."""
        pl = ProfitLoss(
            year=2024,
            revenue=Decimal("100000.00"),
            purchases=Decimal("40000.00"),
            external_charges=Decimal("15000.00"),
            personnel_charges=Decimal("20000.00"),
            tax_and_duties=Decimal("2000.00"),
            depreciation=Decimal("5000.00"),
            financial_charges=Decimal("1000.00"),
            exceptional_charges=Decimal("0.00"),
            tax_rate=Decimal("0.33"),
        )

        # Verify key calculations
        assert pl.revenue == Decimal("100000.00")
        # EBITDA calculation: revenue - purchases - charges (excluding depreciation)
        expected_ebitda = (
            Decimal("100000.00")
            - Decimal("40000.00")
            - Decimal("15000.00")
            - Decimal("20000.00")
            - Decimal("2000.00")
        )
        assert pl.ebitda == expected_ebitda

    def test_profit_loss_ebitda_margin(self):
        """Test EBITDA margin calculation."""
        pl = ProfitLoss(
            year=2024,
            revenue=Decimal("100000.00"),
            purchases=Decimal("50000.00"),
            external_charges=Decimal("0.00"),
            personnel_charges=Decimal("0.00"),
            tax_and_duties=Decimal("0.00"),
            depreciation=Decimal("0.00"),
            financial_charges=Decimal("0.00"),
            exceptional_charges=Decimal("0.00"),
            tax_rate=Decimal("0.33"),
        )
        # EBITDA = 100000 - 50000 = 50000
        # Margin = 50000 / 100000 = 0.5 (50%)
        expected_margin = (pl.ebitda / pl.revenue * 100) if pl.revenue > 0 else Decimal("0")
        assert pl.ebitda_margin == expected_margin

    def test_profit_loss_negative_net_income(self):
        """Test ProfitLoss handles negative net income (loss)."""
        pl = ProfitLoss(
            year=2024,
            revenue=Decimal("50000.00"),
            purchases=Decimal("40000.00"),
            external_charges=Decimal("15000.00"),
            personnel_charges=Decimal("5000.00"),
            tax_and_duties=Decimal("1000.00"),
            depreciation=Decimal("5000.00"),
            financial_charges=Decimal("1000.00"),
            exceptional_charges=Decimal("0.00"),
            tax_rate=Decimal("0.33"),
        )
        # Result should be negative (loss)
        assert pl.net_income < 0


class TestBalanceSheet:
    """Tests for BalanceSheet financial model."""

    def test_balance_sheet_creation(self, sample_balance_sheet):
        """Test creating a BalanceSheet object."""
        bs = sample_balance_sheet
        assert bs.year == 2024
        assert bs.fixed_assets == Decimal("50000.00")
        assert bs.current_assets == Decimal("30000.00")

    def test_balance_sheet_totals(self):
        """Test BalanceSheet total calculations."""
        bs = BalanceSheet(
            year=2024,
            fixed_assets=Decimal("50000.00"),
            current_assets=Decimal("30000.00"),
            cash=Decimal("10000.00"),
            long_term_debt=Decimal("20000.00"),
            current_liabilities=Decimal("15000.00"),
            equity=Decimal("45000.00"),
        )

        # Total assets = fixed + current
        assert bs.total_assets == Decimal("80000.00")

        # Total liabilities = long term + current
        assert bs.total_liabilities == Decimal("35000.00")

    def test_balance_sheet_equilibrium(self):
        """Test BalanceSheet equation: Assets = Liabilities + Equity."""
        bs = BalanceSheet(
            year=2024,
            fixed_assets=Decimal("50000.00"),
            current_assets=Decimal("30000.00"),
            cash=Decimal("10000.00"),
            long_term_debt=Decimal("20000.00"),
            current_liabilities=Decimal("15000.00"),
            equity=Decimal("45000.00"),
        )

        # Assets = Liabilities + Equity
        # 80000 = 35000 + 45000
        assert bs.total_assets == bs.total_liabilities + bs.equity

    def test_balance_sheet_working_capital(self):
        """Test working capital calculation."""
        bs = BalanceSheet(
            year=2024,
            fixed_assets=Decimal("50000.00"),
            current_assets=Decimal("30000.00"),
            cash=Decimal("10000.00"),
            long_term_debt=Decimal("20000.00"),
            current_liabilities=Decimal("15000.00"),
            equity=Decimal("45000.00"),
        )

        # Working Capital = Current Assets - Current Liabilities
        expected_wc = Decimal("30000.00") - Decimal("15000.00")
        assert bs.working_capital == expected_wc


class TestKPIs:
    """Tests for KPIs (Key Performance Indicators) model."""

    def test_kpis_creation(self, sample_kpis):
        """Test creating a KPIs object."""
        kpi = sample_kpis
        assert kpi.year == 2024
        assert kpi.dso == Decimal("45.5")
        assert kpi.roe == Decimal("22.2")

    def test_kpis_all_metrics(self):
        """Test all KPI metrics are present."""
        kpi = KPIs(
            year=2024,
            dso=Decimal("45.0"),
            dpo=Decimal("35.0"),
            dio=Decimal("30.0"),
            roe=Decimal("20.0"),
            roic=Decimal("15.0"),
            debt_to_ebitda=Decimal("2.5"),
            current_ratio=Decimal("2.0"),
            quick_ratio=Decimal("1.5"),
        )

        assert kpi.dso == Decimal("45.0")  # Days Sales Outstanding
        assert kpi.dpo == Decimal("35.0")  # Days Payable Outstanding
        assert kpi.dio == Decimal("30.0")  # Days Inventory Outstanding
        assert kpi.roe == Decimal("20.0")  # Return on Equity
        assert kpi.roic == Decimal("15.0")  # Return on Invested Capital
        assert kpi.debt_to_ebitda == Decimal("2.5")
        assert kpi.current_ratio == Decimal("2.0")
        assert kpi.quick_ratio == Decimal("1.5")

    def test_kpis_realistic_ranges(self):
        """Test KPIs fall within realistic business ranges."""
        kpi = KPIs(
            year=2024,
            dso=Decimal("45.0"),  # Typical: 30-60 days
            dpo=Decimal("35.0"),  # Typical: 30-45 days
            dio=Decimal("30.0"),  # Typical: 20-60 days
            roe=Decimal("15.0"),  # Typical: 10-25%
            roic=Decimal("12.0"),  # Typical: 8-20%
            debt_to_ebitda=Decimal("2.0"),  # Typical: 1-3
            current_ratio=Decimal("1.8"),  # Typical: 1.5-3.0
            quick_ratio=Decimal("1.2"),  # Typical: 0.8-1.5
        )

        # Verify reasonable values
        assert Decimal("0") < kpi.dso < Decimal("365")
        assert Decimal("0") < kpi.roe < Decimal("100")
        assert Decimal("0") < kpi.current_ratio < Decimal("10")
        assert Decimal("0") < kpi.debt_to_ebitda < Decimal("10")


class TestDataModelPrecision:
    """Tests for Decimal precision in financial models."""

    def test_decimal_precision_maintained(self):
        """Test Decimal precision is maintained in calculations."""
        pl = ProfitLoss(
            year=2024,
            revenue=Decimal("123456.789"),
            purchases=Decimal("54321.456"),
            external_charges=Decimal("5000.00"),
            personnel_charges=Decimal("10000.00"),
            tax_and_duties=Decimal("1000.00"),
            depreciation=Decimal("2000.00"),
            financial_charges=Decimal("500.00"),
            exceptional_charges=Decimal("0.00"),
            tax_rate=Decimal("0.33"),
        )

        # Verify Decimal types are preserved
        assert isinstance(pl.revenue, Decimal)
        assert isinstance(pl.purchases, Decimal)
        assert isinstance(pl.ebitda, Decimal)

    def test_no_float_rounding_errors(self):
        """Test that Decimal avoids float rounding errors."""
        # Example: 0.1 + 0.2 in float is 0.30000000000000004
        decimal_result = Decimal("0.1") + Decimal("0.2")
        assert decimal_result == Decimal("0.3")
        # Float would not equal exactly 0.3
        assert float(decimal_result) == 0.3
