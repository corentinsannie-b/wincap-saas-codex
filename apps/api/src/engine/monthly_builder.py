"""Monthly analysis builder for detailed revenue and cost breakdown."""

from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Tuple

from src.mapper.account_mapper import AccountMapper
from src.models.entry import JournalEntry


class MonthlyBuilder:
    """Build monthly breakdown of financial metrics."""

    MONTH_NAMES = {
        1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
        5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
        9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
    }

    def __init__(self, mapper: AccountMapper):
        self.mapper = mapper

    def build_monthly_revenue(
        self, entries: List[JournalEntry]
    ) -> Dict[int, Dict[int, Decimal]]:
        """
        Build monthly revenue breakdown by year.

        Returns: {year: {month: revenue}}
        """
        monthly = defaultdict(lambda: defaultdict(Decimal))

        for entry in entries:
            category = self.mapper.get_pl_category(entry.account_num)
            if category == "revenue":
                year = entry.fiscal_year
                month = entry.date.month
                # Revenue: credit is positive
                amount = entry.credit - entry.debit
                monthly[year][month] += amount

        return dict(monthly)

    def build_monthly_costs(
        self, entries: List[JournalEntry]
    ) -> Dict[int, Dict[int, Decimal]]:
        """
        Build monthly costs breakdown by year.

        Returns: {year: {month: total_costs}}
        """
        cost_categories = {
            "purchases", "external_charges", "taxes", "personnel", "other_charges"
        }
        monthly = defaultdict(lambda: defaultdict(Decimal))

        for entry in entries:
            category = self.mapper.get_pl_category(entry.account_num)
            if category in cost_categories:
                year = entry.fiscal_year
                month = entry.date.month
                # Costs: debit is positive
                amount = entry.debit - entry.credit
                monthly[year][month] += amount

        return dict(monthly)

    def build_monthly_ebitda(
        self, entries: List[JournalEntry]
    ) -> Dict[int, Dict[int, Decimal]]:
        """
        Build monthly EBITDA breakdown by year.

        Returns: {year: {month: ebitda}}
        """
        revenue = self.build_monthly_revenue(entries)
        costs = self.build_monthly_costs(entries)

        monthly_ebitda = defaultdict(lambda: defaultdict(Decimal))

        # Get all years
        all_years = set(revenue.keys()) | set(costs.keys())

        for year in all_years:
            for month in range(1, 13):
                rev = revenue.get(year, {}).get(month, Decimal("0"))
                cost = costs.get(year, {}).get(month, Decimal("0"))
                monthly_ebitda[year][month] = rev - cost

        return dict(monthly_ebitda)

    def build_quarterly_summary(
        self, entries: List[JournalEntry]
    ) -> Dict[int, Dict[str, Decimal]]:
        """
        Build quarterly revenue summary.

        Returns: {year: {"Q1": revenue, "Q2": revenue, ...}}
        """
        monthly_rev = self.build_monthly_revenue(entries)
        quarterly = {}

        for year, months in monthly_rev.items():
            quarterly[year] = {
                "Q1": sum(months.get(m, Decimal("0")) for m in [1, 2, 3]),
                "Q2": sum(months.get(m, Decimal("0")) for m in [4, 5, 6]),
                "Q3": sum(months.get(m, Decimal("0")) for m in [7, 8, 9]),
                "Q4": sum(months.get(m, Decimal("0")) for m in [10, 11, 12]),
            }

        return quarterly

    def build_cumulative_revenue(
        self, entries: List[JournalEntry]
    ) -> Dict[int, Dict[int, Decimal]]:
        """
        Build cumulative (YTD) revenue by month.

        Returns: {year: {month: cumulative_revenue}}
        """
        monthly_rev = self.build_monthly_revenue(entries)
        cumulative = {}

        for year, months in monthly_rev.items():
            cumulative[year] = {}
            running_total = Decimal("0")
            for month in range(1, 13):
                running_total += months.get(month, Decimal("0"))
                cumulative[year][month] = running_total

        return cumulative

    def get_seasonality_index(
        self, entries: List[JournalEntry]
    ) -> Dict[int, Decimal]:
        """
        Calculate seasonality index by month (average across years).

        Returns: {month: index} where 100 = average month
        """
        monthly_rev = self.build_monthly_revenue(entries)

        if not monthly_rev:
            return {m: Decimal("100") for m in range(1, 13)}

        # Sum revenue by month across all years
        month_totals = defaultdict(Decimal)
        year_count = len(monthly_rev)

        for year, months in monthly_rev.items():
            for month, amount in months.items():
                month_totals[month] += amount

        # Calculate average monthly revenue
        total_revenue = sum(month_totals.values())
        if total_revenue == 0:
            return {m: Decimal("100") for m in range(1, 13)}

        avg_monthly = total_revenue / 12

        # Calculate index (100 = average)
        seasonality = {}
        for month in range(1, 13):
            month_avg = month_totals.get(month, Decimal("0")) / year_count
            if avg_monthly > 0:
                seasonality[month] = (month_avg / avg_monthly) * 100
            else:
                seasonality[month] = Decimal("100")

        return seasonality
