"""Cash-Flow statement builder from P&L and Balance Sheet."""

from decimal import Decimal
from typing import Dict, List, Optional

from src.models.financials import BalanceSheet, ProfitLoss


class CashFlowBuilder:
    """Build Cash-Flow statements using indirect method."""

    def build(
        self,
        pl: ProfitLoss,
        balance_start: Optional[BalanceSheet],
        balance_end: BalanceSheet,
    ) -> Dict[str, Decimal]:
        """
        Build Cash-Flow for a fiscal year.

        Uses indirect method: EBITDA → Var BFR → Operating CF → Investing → Financing
        """
        cf = {
            "year": balance_end.year,
            # Operating activities
            "ebitda": pl.ebitda,
            "var_receivables": Decimal("0"),
            "var_inventory": Decimal("0"),
            "var_payables": Decimal("0"),
            "var_other_wc": Decimal("0"),
            "var_bfr": Decimal("0"),
            "operating_cf": Decimal("0"),
            # Investing activities
            "capex": Decimal("0"),
            "investing_cf": Decimal("0"),
            # Financing activities
            "var_debt": Decimal("0"),
            "var_equity": Decimal("0"),
            "financing_cf": Decimal("0"),
            # Net change
            "net_cash_change": Decimal("0"),
            "cash_start": Decimal("0"),
            "cash_end": balance_end.cash,
        }

        if balance_start:
            # Working capital variations
            cf["var_receivables"] = -(balance_end.receivables - balance_start.receivables)
            cf["var_inventory"] = -(balance_end.inventory - balance_start.inventory)
            cf["var_payables"] = balance_end.payables - balance_start.payables
            cf["var_other_wc"] = (
                -(balance_end.other_receivables - balance_start.other_receivables)
                + (balance_end.other_payables - balance_start.other_payables)
            )

            cf["var_bfr"] = (
                cf["var_receivables"] + cf["var_inventory"] +
                cf["var_payables"] + cf["var_other_wc"]
            )

            # Operating Cash Flow = EBITDA + Var BFR
            cf["operating_cf"] = pl.ebitda + cf["var_bfr"]

            # Investing (simplified: change in fixed assets + depreciation)
            cf["capex"] = -(
                (balance_end.fixed_assets - balance_start.fixed_assets) + pl.depreciation
            )
            cf["investing_cf"] = cf["capex"]

            # Financing
            cf["var_debt"] = balance_end.financial_debt - balance_start.financial_debt
            cf["var_equity"] = balance_end.equity - balance_start.equity - pl.net_income
            cf["financing_cf"] = cf["var_debt"] + cf["var_equity"]

            # Cash reconciliation
            cf["cash_start"] = balance_start.cash
            cf["net_cash_change"] = cf["operating_cf"] + cf["investing_cf"] + cf["financing_cf"]
        else:
            cf["operating_cf"] = pl.ebitda
            cf["net_cash_change"] = balance_end.cash

        return cf

    def build_multi_year(
        self,
        pl_list: List[ProfitLoss],
        balance_list: List[BalanceSheet],
    ) -> List[Dict[str, Decimal]]:
        """Build Cash-Flow for multiple years."""
        balance_by_year = {b.year: b for b in balance_list}
        pl_by_year = {p.year: p for p in pl_list}

        years = sorted(set(p.year for p in pl_list))
        cashflows = []

        for i, year in enumerate(years):
            pl = pl_by_year.get(year)
            balance_end = balance_by_year.get(year)

            if not pl or not balance_end:
                continue

            # Get previous year balance if exists
            if i > 0:
                prev_year = years[i - 1]
                balance_start = balance_by_year.get(prev_year)
            else:
                balance_start = None

            cf = self.build(pl, balance_start, balance_end)
            cashflows.append(cf)

        return cashflows
