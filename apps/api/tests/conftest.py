"""
Pytest configuration and shared fixtures.

Provides test utilities, sample data, and mocking infrastructure.
"""

import pytest
import tempfile
from pathlib import Path
from decimal import Decimal
from unittest.mock import Mock, patch
from typing import List

from src.models.entry import JournalEntry
from src.models.financials import ProfitLoss, BalanceSheet, KPIs


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_entries() -> List[JournalEntry]:
    """Create sample journal entries for testing."""
    return [
        JournalEntry(
            fiscal_year=2024,
            journal_code="VE",
            entry_number="001",
            entry_date="2024-01-15",
            company_name="Test Company",
            account_number="411",
            account_label="Clients",
            description="Invoice #001",
            debit=Decimal("1000.00"),
            credit=Decimal("0.00"),
            entry_date_original="2024-01-15",
            supplementary_account="",
            quality_flag="",
        ),
        JournalEntry(
            fiscal_year=2024,
            journal_code="VE",
            entry_number="002",
            entry_date="2024-01-20",
            company_name="Test Company",
            account_number="411",
            account_label="Clients",
            description="Payment received",
            debit=Decimal("0.00"),
            credit=Decimal("1000.00"),
            entry_date_original="2024-01-20",
            supplementary_account="",
            quality_flag="",
        ),
        JournalEntry(
            fiscal_year=2024,
            journal_code="AC",
            entry_number="003",
            entry_date="2024-02-01",
            company_name="Test Company",
            account_number="401",
            account_label="Suppliers",
            description="Purchase invoice",
            debit=Decimal("500.00"),
            credit=Decimal("0.00"),
            entry_date_original="2024-02-01",
            supplementary_account="",
            quality_flag="",
        ),
        JournalEntry(
            fiscal_year=2024,
            journal_code="70",
            entry_number="004",
            entry_date="2024-03-01",
            company_name="Test Company",
            account_number="701",
            account_label="Revenue",
            description="Monthly revenue",
            debit=Decimal("5000.00"),
            credit=Decimal("0.00"),
            entry_date_original="2024-03-01",
            supplementary_account="",
            quality_flag="",
        ),
        JournalEntry(
            fiscal_year=2024,
            journal_code="60",
            entry_number="005",
            entry_date="2024-03-05",
            company_name="Test Company",
            account_number="601",
            account_label="Material costs",
            description="Material purchase",
            debit=Decimal("0.00"),
            credit=Decimal("2000.00"),
            entry_date_original="2024-03-05",
            supplementary_account="",
            quality_flag="",
        ),
    ]


@pytest.fixture
def sample_fec_content() -> str:
    """Create sample FEC file content for testing."""
    header = "JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tCompteAuxNum\tCompteAuxLib\tSuiviAuxiliaire\tPieceRef\tPieceDate\tEcritureLib\tEcritureMontant\tEcritureType\tEcritureMultimonaie"
    rows = [
        "VE\tVentes\t001\t2024-01-15\t411\tClients\t\t\tN\tINV001\t2024-01-15\tInvoice #001\t1000.00\tC\tEUR",
        "VE\tVentes\t002\t2024-01-20\t411\tClients\t\t\tN\t\t2024-01-20\tPayment received\t1000.00\tD\tEUR",
        "AC\tAchats\t003\t2024-02-01\t401\tFournisseurs\t\t\tN\tINV002\t2024-02-01\tPurchase invoice\t500.00\tC\tEUR",
        "VEN\tVentes\t004\t2024-03-01\t701\tChiffre d'affaires\t\t\tN\t\t2024-03-01\tMonthly revenue\t5000.00\tD\tEUR",
        "ACH\tAchats\t005\t2024-03-05\t601\tMatière première\t\t\tN\t\t2024-03-05\tMaterial purchase\t2000.00\tC\tEUR",
    ]
    return header + "\n" + "\n".join(rows)


@pytest.fixture
def sample_fec_file(temp_dir, sample_fec_content) -> Path:
    """Create a temporary FEC test file."""
    fec_file = temp_dir / "test_fec.txt"
    fec_file.write_text(sample_fec_content, encoding="utf-8")
    return fec_file


@pytest.fixture
def sample_profit_loss() -> ProfitLoss:
    """Create a sample ProfitLoss object."""
    return ProfitLoss(
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


@pytest.fixture
def sample_balance_sheet() -> BalanceSheet:
    """Create a sample BalanceSheet object."""
    return BalanceSheet(
        year=2024,
        fixed_assets=Decimal("50000.00"),
        current_assets=Decimal("30000.00"),
        cash=Decimal("10000.00"),
        long_term_debt=Decimal("20000.00"),
        current_liabilities=Decimal("15000.00"),
        equity=Decimal("45000.00"),
    )


@pytest.fixture
def sample_kpis() -> KPIs:
    """Create a sample KPIs object."""
    return KPIs(
        year=2024,
        dso=Decimal("45.5"),
        dpo=Decimal("35.0"),
        dio=Decimal("30.0"),
        roe=Decimal("22.2"),
        roic=Decimal("15.5"),
        debt_to_ebitda=Decimal("2.5"),
        current_ratio=Decimal("2.0"),
        quick_ratio=Decimal("1.5"),
    )


@pytest.fixture
def mock_settings(monkeypatch):
    """Mock application settings."""
    settings = Mock()
    settings.API_HOST = "localhost"
    settings.API_PORT = 8000
    settings.CORS_ORIGINS = ["http://localhost:5173"]
    settings.UPLOAD_TEMP_DIR = "/tmp/wincap"
    settings.MAX_FILE_SIZE = 50 * 1024 * 1024
    settings.ALLOWED_EXTENSIONS = {".txt"}
    settings.SESSION_TTL_HOURS = 24
    settings.LOG_LEVEL = "INFO"
    settings.LOG_FILE = None
    return settings


@pytest.fixture
def mock_parser():
    """Mock FEC parser."""
    parser = Mock()
    parser.encoding = "utf-8"
    parser.delimiter = "\t"
    parser.year = 2024
    return parser
