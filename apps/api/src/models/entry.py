from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass
class JournalEntry:
    """Represents a single FEC journal entry."""

    date: date
    account_num: str
    label: str
    debit: Decimal
    credit: Decimal
    source_year: Optional[int] = field(default=None)
    """Year extracted from FEC filename (e.g., 844118190FEC20241231.txt -> 2024).
    Used for correct balance sheet cumulation. If None, falls back to fiscal_year."""

    @property
    def amount(self) -> Decimal:
        """Net amount (debit - credit)."""
        return self.debit - self.credit

    @property
    def account_class(self) -> str:
        """First digit of account number (PCG class)."""
        return self.account_num[0] if self.account_num else ""

    @property
    def fiscal_year(self) -> int:
        """Extract fiscal year from entry date."""
        return self.date.year

    @property
    def effective_year(self) -> int:
        """Year to use for balance sheet grouping.
        Prefers source_year (from filename) over fiscal_year (from entry date).
        This is critical for correct cumulative balance calculation."""
        return self.source_year if self.source_year is not None else self.date.year

    def __repr__(self) -> str:
        return f"JournalEntry({self.date}, {self.account_num}, {self.amount})"
