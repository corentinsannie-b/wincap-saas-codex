"""Variance analysis builder for year-over-year comparisons."""

from decimal import Decimal
from typing import Dict, List, Tuple

from src.models.financials import ProfitLoss, BalanceSheet, KPIs


class VarianceBuilder:
    """Build variance analysis and bridge charts data."""

    def build_pl_variance(
        self, pl_prev: ProfitLoss, pl_curr: ProfitLoss
    ) -> List[Dict]:
        """
        Build P&L variance analysis between two years.

        Returns list of variance items for bridge chart.
        """
        variances = []

        # Revenue variance
        rev_var = pl_curr.revenue - pl_prev.revenue
        variances.append({
            "label": f"CA FY{pl_prev.year}",
            "value": pl_prev.revenue,
            "type": "start",
        })
        variances.append({
            "label": "Variation CA",
            "value": rev_var,
            "type": "positive" if rev_var >= 0 else "negative",
        })

        # Other revenue variance
        other_rev_var = pl_curr.other_revenue - pl_prev.other_revenue
        if other_rev_var != 0:
            variances.append({
                "label": "Autres produits",
                "value": other_rev_var,
                "type": "positive" if other_rev_var >= 0 else "negative",
            })

        # Cost variances (negative impact shown as negative)
        cost_items = [
            ("Achats", "purchases"),
            ("Charges externes", "external_charges"),
            ("Impôts et taxes", "taxes"),
            ("Personnel", "personnel"),
            ("Autres charges", "other_charges"),
        ]

        for label, attr in cost_items:
            prev_val = getattr(pl_prev, attr, Decimal("0"))
            curr_val = getattr(pl_curr, attr, Decimal("0"))
            var = -(curr_val - prev_val)  # Negative because costs reduce profit
            if var != 0:
                variances.append({
                    "label": label,
                    "value": var,
                    "type": "positive" if var >= 0 else "negative",
                })

        # EBITDA end
        variances.append({
            "label": f"EBITDA FY{pl_curr.year}",
            "value": pl_curr.ebitda,
            "type": "end",
        })

        return variances

    def build_ebitda_bridge(
        self, pl_prev: ProfitLoss, pl_curr: ProfitLoss
    ) -> List[Dict]:
        """
        Build EBITDA bridge from previous to current year.

        Classic waterfall format.
        """
        bridge = [
            {
                "label": f"EBITDA {pl_prev.year}",
                "value": float(pl_prev.ebitda / 1000),
                "cumulative": float(pl_prev.ebitda / 1000),
                "type": "start",
            }
        ]

        # Volume effect (revenue change at same margin)
        rev_change = pl_curr.revenue - pl_prev.revenue
        prev_margin = pl_prev.ebitda / pl_prev.production if pl_prev.production else Decimal("0")
        volume_effect = rev_change * prev_margin

        bridge.append({
            "label": "Effet volume",
            "value": float(volume_effect / 1000),
            "cumulative": float((pl_prev.ebitda + volume_effect) / 1000),
            "type": "positive" if volume_effect >= 0 else "negative",
        })

        # Price/Mix effect
        price_mix = (pl_curr.ebitda - pl_prev.ebitda) - volume_effect
        bridge.append({
            "label": "Effet prix/mix",
            "value": float(price_mix / 1000),
            "cumulative": float(pl_curr.ebitda / 1000),
            "type": "positive" if price_mix >= 0 else "negative",
        })

        bridge.append({
            "label": f"EBITDA {pl_curr.year}",
            "value": float(pl_curr.ebitda / 1000),
            "cumulative": float(pl_curr.ebitda / 1000),
            "type": "end",
        })

        return bridge

    def build_revenue_bridge(
        self, pl_prev: ProfitLoss, pl_curr: ProfitLoss
    ) -> List[Dict]:
        """Build revenue bridge between two years."""
        bridge = [
            {
                "label": f"CA {pl_prev.year}",
                "value": float(pl_prev.revenue / 1000),
                "type": "start",
            },
            {
                "label": "Variation",
                "value": float((pl_curr.revenue - pl_prev.revenue) / 1000),
                "type": "positive" if pl_curr.revenue >= pl_prev.revenue else "negative",
            },
            {
                "label": f"CA {pl_curr.year}",
                "value": float(pl_curr.revenue / 1000),
                "type": "end",
            },
        ]
        return bridge

    def build_cost_breakdown_variance(
        self, pl_prev: ProfitLoss, pl_curr: ProfitLoss
    ) -> List[Dict]:
        """Build detailed cost variance breakdown."""
        cost_items = [
            ("Achats", "purchases"),
            ("Charges externes", "external_charges"),
            ("Impôts et taxes", "taxes"),
            ("Personnel", "personnel"),
            ("Autres charges", "other_charges"),
            ("Amortissements", "depreciation"),
        ]

        breakdown = []
        for label, attr in cost_items:
            prev_val = getattr(pl_prev, attr, Decimal("0"))
            curr_val = getattr(pl_curr, attr, Decimal("0"))
            var_abs = curr_val - prev_val
            var_pct = (var_abs / prev_val * 100) if prev_val != 0 else Decimal("0")

            breakdown.append({
                "label": label,
                "prev_year": pl_prev.year,
                "prev_value": float(prev_val / 1000),
                "curr_year": pl_curr.year,
                "curr_value": float(curr_val / 1000),
                "var_abs": float(var_abs / 1000),
                "var_pct": float(var_pct),
            })

        return breakdown

    def build_kpi_evolution(self, kpis_list: List[KPIs]) -> List[Dict]:
        """Build KPI evolution table with trends."""
        if len(kpis_list) < 2:
            return []

        evolution = []
        kpi_items = [
            ("CA (k€)", "revenue", 1000),
            ("EBITDA (k€)", "ebitda", 1000),
            ("Marge EBITDA (%)", "ebitda_margin", 1),
            ("BFR (k€)", "working_capital", 1000),
            ("DSO (jours)", "dso", 1),
            ("DPO (jours)", "dpo", 1),
        ]

        for label, attr, divisor in kpi_items:
            row = {"label": label, "values": [], "trend": "stable"}

            for kpi in kpis_list:
                value = getattr(kpi, attr, Decimal("0"))
                row["values"].append(float(value / divisor) if divisor > 1 else float(value))

            # Determine trend
            if len(row["values"]) >= 2:
                first = row["values"][0]
                last = row["values"][-1]
                if first != 0:
                    change_pct = (last - first) / abs(first) * 100
                    if change_pct > 5:
                        row["trend"] = "up"
                    elif change_pct < -5:
                        row["trend"] = "down"

            evolution.append(row)

        return evolution
