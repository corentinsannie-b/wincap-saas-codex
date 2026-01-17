"""P&L (Profit & Loss) builder from FEC entries."""

from collections import defaultdict
from decimal import Decimal
from typing import Dict, List

from src.mapper.account_mapper import AccountMapper
from src.models.entry import JournalEntry
from src.models.financials import ProfitLoss


class PLBuilder:
    """Build P&L statements from journal entries."""

    def __init__(self, mapper: AccountMapper):
        self.mapper = mapper

    def build(self, entries: List[JournalEntry], year: int) -> ProfitLoss:
        """Build P&L for a specific fiscal year."""
        # Filter entries for the year (use effective_year for consistency with balance sheet)
        year_entries = [e for e in entries if e.effective_year == year]

        # Aggregate by category
        totals: Dict[str, Decimal] = defaultdict(Decimal)

        for entry in year_entries:
            category = self.mapper.get_pl_category(entry.account_num)
            if category:
                # For P&L: Credit increases income (7x), Debit increases expenses (6x)
                account_class = entry.account_num[0] if entry.account_num else ""

                if account_class == "7":
                    # Income accounts: credit is positive
                    amount = entry.credit - entry.debit
                else:
                    # Expense accounts: debit is positive
                    amount = entry.debit - entry.credit

                totals[category] += amount

        # Build ProfitLoss object
        return ProfitLoss(
            year=year,
            revenue=totals.get("revenue", Decimal("0")),
            other_revenue=totals.get("other_revenue", Decimal("0")),
            purchases=totals.get("purchases", Decimal("0")),
            external_charges=totals.get("external_charges", Decimal("0")),
            taxes=totals.get("taxes", Decimal("0")),
            personnel=totals.get("personnel", Decimal("0")),
            other_charges=totals.get("other_charges", Decimal("0")),
            depreciation=totals.get("depreciation", Decimal("0")),
            financial_income=totals.get("financial_income", Decimal("0")),
            financial_expense=totals.get("financial_expense", Decimal("0")),
            exceptional_income=totals.get("exceptional_income", Decimal("0")),
            exceptional_expense=totals.get("exceptional_expense", Decimal("0")),
            income_tax=totals.get("income_tax", Decimal("0")),
        )

    def build_multi_year(self, entries: List[JournalEntry]) -> List[ProfitLoss]:
        """Build P&L for all years in the data."""
        years = sorted(set(e.effective_year for e in entries))
        return [self.build(entries, year) for year in years]

    def compute_variations(self, pl_list: List[ProfitLoss]) -> List[Dict]:
        """Compute year-over-year variations."""
        if len(pl_list) < 2:
            return []

        variations = []
        for i in range(1, len(pl_list)):
            prev = pl_list[i - 1]
            curr = pl_list[i]

            var = {
                "from_year": prev.year,
                "to_year": curr.year,
                "revenue_delta": curr.revenue - prev.revenue,
                "revenue_pct": self._pct_change(prev.revenue, curr.revenue),
                "ebitda_delta": curr.ebitda - prev.ebitda,
                "ebitda_pct": self._pct_change(prev.ebitda, curr.ebitda),
                "net_income_delta": curr.net_income - prev.net_income,
                "net_income_pct": self._pct_change(prev.net_income, curr.net_income),
            }
            variations.append(var)

        return variations

    def _pct_change(self, old: Decimal, new: Decimal) -> Decimal:
        """Calculate percentage change."""
        if old == 0:
            return Decimal("0")
        return ((new - old) / abs(old)) * 100
