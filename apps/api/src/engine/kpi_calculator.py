"""KPI calculator for financial analysis."""

from decimal import Decimal
from typing import Dict, List, Optional

from src.models.financials import BalanceSheet, KPIs, ProfitLoss


class KPICalculator:
    """Calculate financial KPIs from P&L and Balance Sheet."""

    # Standard days per year for DSO/DPO calculations
    DAYS_IN_YEAR = Decimal("360")

    # Default VAT rate (France)
    DEFAULT_VAT_RATE = Decimal("1.20")

    def __init__(
        self,
        qoe_adjustments: Optional[Dict[int, Dict[str, Decimal]]] = None,
        vat_rate: Optional[Decimal] = None,
    ):
        """
        Initialize calculator.

        Args:
            qoe_adjustments: Dict of year -> {label: amount} for QoE adjustments
            vat_rate: VAT rate for DSO/DPO calculations (default: 1.20 for French 20%)
        """
        self.qoe_adjustments = qoe_adjustments or {}
        self.vat_rate = vat_rate if vat_rate is not None else self.DEFAULT_VAT_RATE

    def calculate(self, pl: ProfitLoss, balance: BalanceSheet) -> KPIs:
        """Calculate KPIs for a single year."""
        kpis = KPIs(
            year=pl.year,
            revenue=pl.revenue,
            ebitda=pl.ebitda,
            ebitda_margin=pl.ebitda_margin,
            net_income=pl.net_income,
            working_capital=balance.working_capital,
            net_debt=balance.net_debt,
        )

        # DSO: Days Sales Outstanding = (Clients / CA_TTC) * 360
        if pl.revenue > 0:
            ca_ttc = pl.revenue * self.vat_rate
            kpis.dso = (balance.receivables / ca_ttc) * self.DAYS_IN_YEAR

        # DPO: Days Payable Outstanding = (Fournisseurs / Achats_TTC) * 360
        if pl.purchases > 0:
            achats_ttc = pl.purchases * self.vat_rate
            kpis.dpo = (balance.payables / achats_ttc) * self.DAYS_IN_YEAR

        # DIO: Days Inventory Outstanding = (Stocks / Achats) * 360
        if pl.purchases > 0:
            kpis.dio = (balance.inventory / pl.purchases) * self.DAYS_IN_YEAR

        # QoE adjustments
        year_adjustments = self.qoe_adjustments.get(pl.year, {})
        kpis.qoe_adjustments = year_adjustments

        return kpis

    def calculate_multi_year(
        self, pl_list: List[ProfitLoss], balance_list: List[BalanceSheet]
    ) -> List[KPIs]:
        """Calculate KPIs for multiple years."""
        # Match P&L and Balance by year
        balance_by_year = {b.year: b for b in balance_list}

        kpis_list = []
        for pl in pl_list:
            balance = balance_by_year.get(pl.year)
            if balance:
                kpis = self.calculate(pl, balance)
                kpis_list.append(kpis)

        return kpis_list

    def build_synthesis_table(self, kpis_list: List[KPIs]) -> List[Dict]:
        """Build synthesis table for executive summary."""
        synthesis = []

        for kpis in kpis_list:
            row = {
                "Exercice": kpis.year,
                "CA (k€)": float(kpis.revenue / 1000),
                "EBITDA (k€)": float(kpis.ebitda / 1000),
                "Marge EBITDA (%)": float(kpis.ebitda_margin),
                "Résultat Net (k€)": float(kpis.net_income / 1000),
                "BFR (k€)": float(kpis.working_capital / 1000),
                "DSO (jours)": float(kpis.dso),
                "DPO (jours)": float(kpis.dpo),
            }

            # Add adjusted EBITDA if there are QoE adjustments
            if kpis.qoe_adjustments:
                row["EBITDA Ajusté (k€)"] = float(kpis.adjusted_ebitda / 1000)

            synthesis.append(row)

        return synthesis

    def build_qoe_bridge(self, kpis: KPIs) -> List[Dict]:
        """Build QoE EBITDA bridge for a specific year."""
        if not kpis.qoe_adjustments:
            return []

        bridge = [{"Libellé": "EBITDA Comptable", "Montant (k€)": float(kpis.ebitda / 1000)}]

        for label, amount in kpis.qoe_adjustments.items():
            bridge.append({"Libellé": label, "Montant (k€)": float(amount / 1000)})

        bridge.append(
            {"Libellé": "EBITDA Ajusté", "Montant (k€)": float(kpis.adjusted_ebitda / 1000)}
        )

        return bridge
