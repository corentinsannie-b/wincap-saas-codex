"""Agent tools for querying financial deal data.

This module provides the DealAgent class which implements tools for querying
and analyzing financial data from FEC files. These tools can be used:
1. Directly via Python API
2. Via HTTP endpoints (/api/agent/*)
3. By Claude via tool use for intelligent Q&A

Phase B: Agent Tools for WincapAgent
"""

from decimal import Decimal
from typing import List, Dict, Any, Optional
import statistics

from src.models.entry import JournalEntry
from src.models.financials import ProfitLoss, BalanceSheet, KPIs


class DealAgent:
    """Agent for querying and analyzing financial deal data.
    
    Provides 8 tools for intelligent financial analysis:
    1. get_pl() - Retrieve P&L statement
    2. get_balance() - Retrieve balance sheet
    3. get_kpis() - Retrieve key performance indicators
    4. get_entries() - Search and filter journal entries
    5. explain_variance() - Analyze year-over-year changes
    6. trace_metric() - Get source entries for a metric
    7. find_anomalies() - Detect statistical outliers
    8. get_summary() - Executive summary
    """

    def __init__(
        self,
        entries: List[JournalEntry],
        pl_list: List[ProfitLoss],
        balance_list: List[BalanceSheet],
        kpis_list: List[KPIs],
    ):
        """Initialize agent with financial data.
        
        Args:
            entries: List of journal entries
            pl_list: List of ProfitLoss objects (one per year)
            balance_list: List of BalanceSheet objects (one per year)
            kpis_list: List of KPIs objects (one per year)
        """
        self.entries = entries
        self.pl_list = pl_list
        self.balance_list = balance_list
        self.kpis_list = kpis_list

    # =========================================================================
    # Tool 1: get_pl - Retrieve P&L Statement
    # =========================================================================

    def get_pl(self, year: Optional[int] = None) -> Dict[str, Any]:
        """Get P&L statement for a fiscal year.
        
        Args:
            year: Fiscal year (if None, returns latest year)
            
        Returns:
            Dict with P&L line items and metrics
        """
        if not self.pl_list:
            return {"error": "No P&L data available"}

        # Get specific year or latest
        pl = self._get_for_year(self.pl_list, year)
        if not pl:
            available = [p.year for p in self.pl_list]
            return {"error": f"Year {year} not found. Available: {available}"}

        return {
            "year": pl.year,
            "revenue": float(pl.revenue),
            "other_revenue": float(pl.other_revenue),
            "production": float(pl.production),
            "purchases": float(pl.purchases),
            "external_charges": float(pl.external_charges),
            "taxes": float(pl.taxes),
            "personnel": float(pl.personnel),
            "other_charges": float(pl.other_charges),
            "total_charges": float(pl.total_charges),
            "depreciation": float(pl.depreciation),
            "ebitda": float(pl.ebitda),
            "ebit": float(pl.ebit),
            "financial_income": float(pl.financial_income),
            "financial_expense": float(pl.financial_expense),
            "financial_result": float(pl.financial_result),
            "exceptional_income": float(pl.exceptional_income),
            "exceptional_expense": float(pl.exceptional_expense),
            "exceptional_result": float(pl.exceptional_result),
            "income_tax": float(pl.income_tax),
            "net_income": float(pl.net_income),
            "ebitda_margin": float(pl.ebitda_margin),
        }

    # =========================================================================
    # Tool 2: get_balance - Retrieve Balance Sheet
    # =========================================================================

    def get_balance(self, year: Optional[int] = None) -> Dict[str, Any]:
        """Get balance sheet for a fiscal year.
        
        Args:
            year: Fiscal year (if None, returns latest year)
            
        Returns:
            Dict with balance sheet items
        """
        if not self.balance_list:
            return {"error": "No balance sheet data available"}

        bs = self._get_for_year(self.balance_list, year)
        if not bs:
            available = [b.year for b in self.balance_list]
            return {"error": f"Year {year} not found. Available: {available}"}

        return {
            "year": bs.year,
            "fixed_assets": float(bs.fixed_assets),
            "inventory": float(bs.inventory),
            "receivables": float(bs.receivables),
            "other_receivables": float(bs.other_receivables),
            "cash": float(bs.cash),
            "total_assets": float(bs.total_assets),
            "equity": float(bs.equity),
            "provisions": float(bs.provisions),
            "financial_debt": float(bs.financial_debt),
            "payables": float(bs.payables),
            "other_payables": float(bs.other_payables),
            "total_liabilities": float(bs.total_liabilities),
            "working_capital": float(bs.working_capital),
            "net_debt": float(bs.net_debt),
        }

    # =========================================================================
    # Tool 3: get_kpis - Retrieve Key Performance Indicators
    # =========================================================================

    def get_kpis(self, year: Optional[int] = None) -> Dict[str, Any]:
        """Get KPIs for a fiscal year.
        
        Args:
            year: Fiscal year (if None, returns latest year)
            
        Returns:
            Dict with KPI metrics
        """
        if not self.kpis_list:
            return {"error": "No KPI data available"}

        kpi = self._get_for_year(self.kpis_list, year)
        if not kpi:
            available = [k.year for k in self.kpis_list]
            return {"error": f"Year {year} not found. Available: {available}"}

        return {
            "year": kpi.year,
            "revenue": float(kpi.revenue),
            "ebitda": float(kpi.ebitda),
            "ebitda_margin": float(kpi.ebitda_margin),
            "net_income": float(kpi.net_income),
            "dso": float(kpi.dso),  # Days Sales Outstanding
            "dpo": float(kpi.dpo),  # Days Payable Outstanding
            "dio": float(kpi.dio),  # Days Inventory Outstanding
            "working_capital": float(kpi.working_capital),
            "net_debt": float(kpi.net_debt),
            "adjusted_ebitda": float(kpi.adjusted_ebitda),
        }

    # =========================================================================
    # Tool 4: get_entries - Search and Filter Journal Entries
    # =========================================================================

    def get_entries(
        self,
        compte_prefix: Optional[str] = None,
        year: Optional[int] = None,
        min_amount: Optional[float] = None,
        label_contains: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Search journal entries with optional filters.
        
        Args:
            compte_prefix: Filter by account code prefix (e.g., "41", "401")
            year: Filter by fiscal year
            min_amount: Filter entries with absolute value >= min_amount
            label_contains: Filter by label substring (case-insensitive)
            limit: Maximum number of entries to return
            
        Returns:
            Dict with filtered entries and summary
        """
        filtered = self.entries

        # Apply filters
        if compte_prefix:
            filtered = [e for e in filtered if e.account_num.startswith(compte_prefix)]

        if year:
            filtered = [e for e in filtered if e.fiscal_year == year]

        if min_amount:
            filtered = [
                e for e in filtered
                if abs(float(e.debit - e.credit)) >= min_amount
            ]

        if label_contains:
            label_lower = label_contains.lower()
            filtered = [e for e in filtered if label_lower in e.label.lower()]

        # Sort by date descending
        filtered = sorted(filtered, key=lambda e: e.date, reverse=True)

        # Limit results
        entries_data = []
        for entry in filtered[:limit]:
            amount = entry.debit - entry.credit
            entries_data.append({
                "date": entry.date.isoformat(),
                "account": entry.account_num,
                "label": entry.label,
                "debit": float(entry.debit),
                "credit": float(entry.credit),
                "amount": float(amount),
                "fiscal_year": entry.fiscal_year,
            })

        return {
            "total_count": len(filtered),
            "returned_count": len(entries_data),
            "entries": entries_data,
            "filters": {
                "compte_prefix": compte_prefix,
                "year": year,
                "min_amount": min_amount,
                "label_contains": label_contains,
            },
        }

    # =========================================================================
    # Tool 5: explain_variance - Analyze Year-over-Year Changes
    # =========================================================================

    def explain_variance(
        self,
        metric: str,
        year_from: int,
        year_to: int,
    ) -> Dict[str, Any]:
        """Explain what drove the change in a metric between two years.
        
        Args:
            metric: Metric to analyze (e.g., 'revenue', 'ebitda')
            year_from: Starting year
            year_to: Ending year
            
        Returns:
            Dict with variance analysis and drivers
        """
        pl_from = self._get_for_year(self.pl_list, year_from)
        pl_to = self._get_for_year(self.pl_list, year_to)

        if not pl_from or not pl_to:
            return {"error": f"Years {year_from} and/or {year_to} not found in data"}

        # Get metric values
        value_from = getattr(pl_from, metric, None)
        value_to = getattr(pl_to, metric, None)

        if value_from is None or value_to is None:
            return {"error": f"Metric '{metric}' not found in P&L"}

        value_from = float(value_from)
        value_to = float(value_to)
        change = value_to - value_from
        pct_change = (change / abs(value_from) * 100) if value_from != 0 else 0

        # Analyze component changes for key metrics
        drivers = []

        if metric == "ebitda":
            # Revenue impact
            rev_change = float(pl_to.revenue - pl_from.revenue)
            if rev_change != 0:
                drivers.append({
                    "component": "Revenue",
                    "impact": rev_change,
                    "direction": "↑" if rev_change > 0 else "↓",
                })

            # Purchases impact (negative = good)
            purch_change = float(pl_from.purchases - pl_to.purchases)
            if purch_change != 0:
                drivers.append({
                    "component": "Purchases",
                    "impact": purch_change,
                    "direction": "↑" if purch_change > 0 else "↓",
                })

            # Personnel impact (negative = bad)
            pers_change = float(pl_to.personnel - pl_from.personnel)
            if pers_change != 0:
                drivers.append({
                    "component": "Personnel",
                    "impact": -pers_change,
                    "direction": "↑" if pers_change < 0 else "↓",
                })

            # External charges impact
            ext_change = float(pl_from.external_charges - pl_to.external_charges)
            if ext_change != 0:
                drivers.append({
                    "component": "External Charges",
                    "impact": ext_change,
                    "direction": "↑" if ext_change > 0 else "↓",
                })

        # Sort by impact
        drivers = sorted(drivers, key=lambda x: abs(x["impact"]), reverse=True)

        return {
            "metric": metric,
            "year_from": year_from,
            "year_to": year_to,
            "value_from": value_from,
            "value_to": value_to,
            "change": change,
            "pct_change": pct_change,
            "drivers": drivers,
            "summary": self._generate_variance_summary(metric, change, pct_change, drivers),
        }

    # =========================================================================
    # Tool 6: trace_metric - Get Source Entries for a Metric
    # =========================================================================

    def trace_metric(self, metric: str, year: int) -> Dict[str, Any]:
        """Get all source entries for a P&L or Balance metric.
        
        Args:
            metric: Metric name (e.g., 'revenue', 'receivables')
            year: Fiscal year
            
        Returns:
            Dict with traced entries
        """
        # Try P&L first
        pl = self._get_for_year(self.pl_list, year)
        if pl and hasattr(pl, "_traces"):
            trace = pl.get_trace(metric)
            if trace:
                return {
                    "metric": metric,
                    "year": year,
                    "source": "P&L",
                    **trace,
                }

        # Try Balance Sheet
        bs = self._get_for_year(self.balance_list, year)
        if bs and hasattr(bs, "_traces"):
            trace = bs.get_trace(metric)
            if trace:
                return {
                    "metric": metric,
                    "year": year,
                    "source": "Balance Sheet",
                    **trace,
                }

        return {
            "error": f"Metric '{metric}' not found for year {year}",
            "metric": metric,
            "year": year,
        }

    # =========================================================================
    # Tool 7: find_anomalies - Detect Statistical Outliers
    # =========================================================================

    def find_anomalies(
        self,
        year: Optional[int] = None,
        z_threshold: float = 2.5,
    ) -> Dict[str, Any]:
        """Find statistically anomalous entries.
        
        Uses z-score to identify outliers in entry amounts.
        
        Args:
            year: Filter to specific year (if None, uses all years)
            z_threshold: Z-score threshold (default 2.5 = ~1.2% of data)
            
        Returns:
            Dict with anomalous entries
        """
        # Filter entries
        filtered = self.entries
        if year:
            filtered = [e for e in filtered if e.fiscal_year == year]

        if not filtered:
            return {"error": "No entries found"}

        # Calculate amounts and statistics
        amounts = [float(abs(e.debit - e.credit)) for e in filtered]

        if len(amounts) < 2:
            return {
                "anomalies": [],
                "summary": "Not enough data for anomaly detection",
            }

        mean = statistics.mean(amounts)
        stdev = statistics.stdev(amounts)

        if stdev == 0:
            return {
                "anomalies": [],
                "summary": "All entries have the same amount (no variance)",
            }

        # Find anomalies
        anomalies = []
        for entry in filtered:
            amount = float(abs(entry.debit - entry.credit))
            z_score = (amount - mean) / stdev if stdev != 0 else 0

            if abs(z_score) > z_threshold:
                anomalies.append({
                    "date": entry.date.isoformat(),
                    "account": entry.account_num,
                    "label": entry.label,
                    "amount": amount,
                    "z_score": z_score,
                    "status": "HIGH" if abs(z_score) > 3 else "MEDIUM",
                })

        # Sort by z-score
        anomalies = sorted(anomalies, key=lambda x: abs(x["z_score"]), reverse=True)

        return {
            "anomalies": anomalies,
            "statistics": {
                "total_entries": len(filtered),
                "anomaly_count": len(anomalies),
                "mean": mean,
                "stdev": stdev,
                "min": min(amounts),
                "max": max(amounts),
            },
            "threshold": z_threshold,
        }

    # =========================================================================
    # Tool 8: get_summary - Executive Summary
    # =========================================================================

    def get_summary(self) -> Dict[str, Any]:
        """Get executive summary of the deal.
        
        Returns:
            Dict with high-level metrics and trends
        """
        if not self.pl_list or not self.balance_list or not self.kpis_list:
            return {"error": "Incomplete data"}

        # Get latest year data
        latest_pl = self.pl_list[-1]
        latest_bs = self.balance_list[-1]
        latest_kpi = self.kpis_list[-1]

        summary = {
            "company": {
                "total_entries": len(self.entries),
                "years_available": sorted(list(set(e.fiscal_year for e in self.entries))),
            },
            "latest_year": latest_pl.year,
            "financial_metrics": {
                "revenue": float(latest_pl.revenue),
                "ebitda": float(latest_pl.ebitda),
                "ebitda_margin": float(latest_pl.ebitda_margin),
                "net_income": float(latest_pl.net_income),
            },
            "balance_metrics": {
                "total_assets": float(latest_bs.total_assets),
                "equity": float(latest_bs.equity),
                "working_capital": float(latest_bs.working_capital),
                "net_debt": float(latest_bs.net_debt),
            },
            "operational_metrics": {
                "dso": float(latest_kpi.dso),
                "dpo": float(latest_kpi.dpo),
                "dio": float(latest_kpi.dio),
            },
        }

        # Add trends if multiple years
        if len(self.pl_list) > 1:
            prev_pl = self.pl_list[-2]
            summary["trends"] = {
                "revenue_growth": float((latest_pl.revenue - prev_pl.revenue) / prev_pl.revenue * 100) if prev_pl.revenue != 0 else 0,
                "ebitda_change": float(latest_pl.ebitda - prev_pl.ebitda),
                "net_income_change": float(latest_pl.net_income - prev_pl.net_income),
            }

        return summary

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _get_for_year(self, items_list: List, year: Optional[int]):
        """Get item for year, or latest if year is None."""
        if not items_list:
            return None

        if year is None:
            return items_list[-1]

        for item in items_list:
            if item.year == year:
                return item

        return None

    def _generate_variance_summary(
        self,
        metric: str,
        change: float,
        pct_change: float,
        drivers: List[Dict],
    ) -> str:
        """Generate human-readable summary of variance."""
        direction = "increased" if change > 0 else "decreased"
        main_driver = drivers[0]["component"] if drivers else "no identified drivers"

        return (
            f"{metric.capitalize()} {direction} by {abs(change):.0f}€ ({abs(pct_change):.1f}%), "
            f"primarily driven by {main_driver}."
        )
