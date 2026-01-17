"""Balance sheet builder from FEC entries."""

from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Tuple

from src.mapper.account_mapper import AccountMapper
from src.models.entry import JournalEntry
from src.models.financials import BalanceSheet, TracedValue


class BalanceBuilder:
    """Build balance sheets from journal entries."""

    def __init__(self, mapper: AccountMapper):
        self.mapper = mapper

    def build(self, entries: List[JournalEntry], year: int) -> BalanceSheet:
        """
        Build balance sheet at year end with trace tracking.

        Balance = sum of all movements up to year end.
        Uses effective_year (source_year from filename if available) for correct
        cumulative balance calculation across multi-year FEC files.
        """
        # Filter entries up to and including the year using effective_year
        # This ensures correct cumulation when loading FECs from different years
        year_entries = [e for e in entries if e.effective_year <= year]

        # Aggregate by category + track traces
        totals: Dict[str, Decimal] = defaultdict(Decimal)
        traces: Dict[str, TracedValue] = defaultdict(lambda: TracedValue())

        for entry in year_entries:
            category = self.mapper.get_balance_category(entry.account_num)
            if category:
                # Determine sign based on account nature
                if self.mapper.is_debit_positive(entry.account_num):
                    # Assets: debit is positive
                    amount = entry.debit - entry.credit
                else:
                    # Liabilities: credit is positive
                    amount = entry.credit - entry.debit

                totals[category] += amount

                # Track this entry in the trace (Phase A)
                entry_tuple: Tuple[str, str, str, Decimal] = (
                    entry.date.isoformat(),
                    entry.account_num,
                    entry.label,
                    amount
                )
                traces[category].add(amount, entry_tuple)

        # Build BalanceSheet object
        bs = BalanceSheet(
            year=year,
            fixed_assets=totals.get("fixed_assets", Decimal("0")),
            inventory=totals.get("inventory", Decimal("0")),
            receivables=totals.get("receivables", Decimal("0")),
            other_receivables=totals.get("other_receivables", Decimal("0")),
            cash=totals.get("cash", Decimal("0")),
            equity=totals.get("equity", Decimal("0")),
            provisions=totals.get("provisions", Decimal("0")),
            financial_debt=totals.get("financial_debt", Decimal("0")),
            payables=totals.get("payables", Decimal("0")),
            other_payables=totals.get("other_payables", Decimal("0")),
        )

        # Set traces on the balance sheet (Phase A feature)
        for category, traced_value in traces.items():
            bs.set_traced(category, traced_value)

        return bs

    def build_multi_year(self, entries: List[JournalEntry]) -> List[BalanceSheet]:
        """Build balance sheets for all years in the data.

        Uses effective_year for correct grouping when source_year is available.
        """
        years = sorted(set(e.effective_year for e in entries))
        return [self.build(entries, year) for year in years]

    def compute_bfr_evolution(self, balance_list: List[BalanceSheet]) -> List[Dict]:
        """Compute BFR (Working Capital) evolution."""
        evolution = []

        for balance in balance_list:
            bfr = {
                "year": balance.year,
                "stocks": balance.inventory,
                "clients": balance.receivables,
                "fournisseurs": balance.payables,
                "bfr": balance.working_capital,
            }
            evolution.append(bfr)

        return evolution
