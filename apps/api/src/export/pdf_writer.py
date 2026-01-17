"""PDF report writer using WeasyPrint."""

import base64
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional, Union

from jinja2 import Environment, FileSystemLoader

from src.models.financials import BalanceSheet, KPIs, ProfitLoss

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


class PDFWriter:
    """Generate PDF report from financial data."""

    def __init__(self, company_name: str = "", template_dir: Optional[Path] = None):
        self.company_name = company_name

        if template_dir is None:
            template_dir = Path(__file__).parent.parent.parent / "templates" / "pdf"

        self.template_dir = Path(template_dir)
        self.env = Environment(loader=FileSystemLoader(str(self.template_dir)))

    def generate(
        self,
        pl_list: List[ProfitLoss],
        balance_list: List[BalanceSheet],
        kpis_list: List[KPIs],
        output_path: Union[str, Path],
    ) -> Path:
        """Generate PDF report."""
        if not WEASYPRINT_AVAILABLE:
            raise ImportError("WeasyPrint is required for PDF generation. Install with: pip install weasyprint")

        output_path = Path(output_path)
        years = [pl.year for pl in pl_list]
        dec_labels = [f"Dec-{str(year)[-2:]}" for year in years]

        # Prepare data for template
        context = {
            "company_name": self.company_name,
            "date": datetime.now().strftime("%d/%m/%Y"),
            "years": years,
            "dec_labels": dec_labels,
            "synthesis_data": self._prepare_synthesis_data(kpis_list),
            "pl_data": self._prepare_pl_data(pl_list),
            "balance_data": self._prepare_balance_data(balance_list),
            "bfr_data": self._prepare_bfr_data(balance_list),
            "kpis": kpis_list,
            "kpi_data": self._prepare_kpi_data(kpis_list),
            "key_observations": self._generate_observations(pl_list, kpis_list),
        }

        # Generate EBITDA chart if matplotlib is available
        if MATPLOTLIB_AVAILABLE:
            context["ebitda_chart"] = self._generate_ebitda_chart(pl_list)

        # Render template
        template = self.env.get_template("base.html")
        html_content = template.render(**context)

        # Load CSS
        css_path = self.template_dir / "styles.css"
        css = CSS(filename=str(css_path)) if css_path.exists() else None

        # Generate PDF
        html = HTML(string=html_content, base_url=str(self.template_dir))
        if css:
            html.write_pdf(output_path, stylesheets=[css])
        else:
            html.write_pdf(output_path)

        return output_path

    def _prepare_synthesis_data(self, kpis_list: List[KPIs]) -> List[Dict]:
        """Prepare synthesis table data."""
        indicators = [
            ("CA (k€)", "revenue", 1000, "{:,.0f}"),
            ("EBITDA (k€)", "ebitda", 1000, "{:,.0f}"),
            ("Marge EBITDA (%)", "ebitda_margin", 1, "{:.1f}%"),
            ("Résultat Net (k€)", "net_income", 1000, "{:,.0f}"),
            ("BFR (k€)", "working_capital", 1000, "{:,.0f}"),
            ("DSO (jours)", "dso", 1, "{:.0f}"),
            ("DPO (jours)", "dpo", 1, "{:.0f}"),
        ]

        data = []
        for label, attr, divisor, fmt in indicators:
            row = {"label": label, "values": []}
            for kpi in kpis_list:
                value = getattr(kpi, attr, Decimal("0"))
                if divisor > 1:
                    value = float(value) / divisor
                else:
                    value = float(value)
                row["values"].append(fmt.format(value))
            data.append(row)

        return data

    def _prepare_pl_data(self, pl_list: List[ProfitLoss]) -> List[Dict]:
        """Prepare P&L table data."""
        lines = [
            ("Chiffre d'affaires", "revenue", False),
            ("Autres produits", "other_revenue", False),
            ("Production", "production", True),
            ("Achats", "purchases", False),
            ("Charges externes", "external_charges", False),
            ("Impôts et taxes", "taxes", False),
            ("Charges de personnel", "personnel", False),
            ("Autres charges", "other_charges", False),
            ("EBITDA", "ebitda", True),
            ("Dotations aux amortissements", "depreciation", False),
            ("EBIT", "ebit", True),
            ("Résultat financier", "financial_result", False),
            ("Résultat exceptionnel", "exceptional_result", False),
            ("Impôt sur les sociétés", "income_tax", False),
            ("Résultat Net", "net_income", True),
        ]

        data = []
        for label, attr, is_total in lines:
            row = {"label": label, "values": [], "is_total": is_total, "var_pct": None}

            for pl in pl_list:
                value = getattr(pl, attr, Decimal("0"))
                row["values"].append("{:,.0f}".format(float(value) / 1000))

            # Calculate variation
            if len(pl_list) >= 2:
                prev = getattr(pl_list[-2], attr, Decimal("0"))
                curr = getattr(pl_list[-1], attr, Decimal("0"))
                if prev != 0:
                    row["var_pct"] = float((curr - prev) / abs(prev)) * 100

            data.append(row)

        return data

    def _prepare_balance_data(self, balance_list: List[BalanceSheet]) -> List[Dict]:
        """Prepare balance sheet data."""
        lines = [
            ("ACTIF", None, True, False),
            ("Immobilisations nettes", "fixed_assets", False, False),
            ("Stocks", "inventory", False, False),
            ("Créances clients", "receivables", False, False),
            ("Autres créances", "other_receivables", False, False),
            ("Trésorerie", "cash", False, False),
            ("Total Actif", "total_assets", False, True),
            ("PASSIF", None, True, False),
            ("Capitaux propres", "equity", False, False),
            ("Provisions", "provisions", False, False),
            ("Dettes financières", "financial_debt", False, False),
            ("Dettes fournisseurs", "payables", False, False),
            ("Autres dettes", "other_payables", False, False),
            ("Total Passif", "total_liabilities", False, True),
        ]

        data = []
        for label, attr, is_section, is_total in lines:
            row = {"label": label, "values": [], "is_section": is_section, "is_total": is_total}

            if attr:
                for balance in balance_list:
                    value = getattr(balance, attr, Decimal("0"))
                    row["values"].append("{:,.0f}".format(float(value) / 1000))
            else:
                row["values"] = [""] * len(balance_list)

            data.append(row)

        return data

    def _prepare_bfr_data(self, balance_list: List[BalanceSheet]) -> List[Dict]:
        """Prepare BFR analysis data."""
        lines = [
            ("Stocks (k€)", "inventory", False),
            ("Créances clients (k€)", "receivables", False),
            ("Dettes fournisseurs (k€)", "payables", False),
            ("BFR (k€)", "working_capital", True),
        ]

        data = []
        for label, attr, is_total in lines:
            row = {"label": label, "values": [], "is_total": is_total}

            for balance in balance_list:
                value = getattr(balance, attr, Decimal("0"))
                row["values"].append("{:,.0f}".format(float(value) / 1000))

            data.append(row)

        return data

    def _prepare_kpi_data(self, kpis_list: List[KPIs]) -> List[Dict]:
        """Prepare KPI table data."""
        indicators = [
            ("CA (k€)", "revenue", 1000, "{:,.0f}"),
            ("EBITDA (k€)", "ebitda", 1000, "{:,.0f}"),
            ("Marge EBITDA (%)", "ebitda_margin", 1, "{:.1f}%"),
            ("Résultat Net (k€)", "net_income", 1000, "{:,.0f}"),
            ("BFR (k€)", "working_capital", 1000, "{:,.0f}"),
            ("Dette nette (k€)", "net_debt", 1000, "{:,.0f}"),
            ("DSO (jours)", "dso", 1, "{:.0f}"),
            ("DPO (jours)", "dpo", 1, "{:.0f}"),
            ("DIO (jours)", "dio", 1, "{:.0f}"),
        ]

        data = []
        for label, attr, divisor, fmt in indicators:
            row = {"label": label, "values": []}
            for kpi in kpis_list:
                value = getattr(kpi, attr, Decimal("0"))
                if divisor > 1:
                    value = float(value) / divisor
                else:
                    value = float(value)
                row["values"].append(fmt.format(value))
            data.append(row)

        return data

    def _generate_observations(
        self, pl_list: List[ProfitLoss], kpis_list: List[KPIs]
    ) -> List[str]:
        """Generate key observations based on the data."""
        observations = []

        if len(pl_list) >= 2:
            # Revenue trend
            prev_rev = pl_list[-2].revenue
            curr_rev = pl_list[-1].revenue
            if prev_rev > 0:
                rev_var = float((curr_rev - prev_rev) / prev_rev) * 100
                if rev_var > 5:
                    observations.append(
                        f"Croissance du CA de {rev_var:.1f}% entre FY{pl_list[-2].year} et FY{pl_list[-1].year}"
                    )
                elif rev_var < -5:
                    observations.append(
                        f"Baisse du CA de {abs(rev_var):.1f}% entre FY{pl_list[-2].year} et FY{pl_list[-1].year}"
                    )

            # EBITDA margin evolution
            prev_margin = pl_list[-2].ebitda_margin
            curr_margin = pl_list[-1].ebitda_margin
            margin_diff = float(curr_margin - prev_margin)
            if abs(margin_diff) > 2:
                direction = "amélioration" if margin_diff > 0 else "dégradation"
                observations.append(
                    f"{direction.capitalize()} de la marge EBITDA de {abs(margin_diff):.1f} points"
                )

        if kpis_list:
            latest = kpis_list[-1]
            # DSO observation
            if float(latest.dso) > 60:
                observations.append(
                    f"DSO élevé à {float(latest.dso):.0f} jours - recouvrement clients à surveiller"
                )
            # BFR observation
            if float(latest.working_capital) < 0:
                observations.append("BFR négatif - structure de financement favorable")

        return observations

    def _generate_ebitda_chart(self, pl_list: List[ProfitLoss]) -> Optional[str]:
        """Generate EBITDA evolution chart as base64."""
        if not MATPLOTLIB_AVAILABLE or len(pl_list) < 2:
            return None

        years = [pl.year for pl in pl_list]
        ebitda_values = [float(pl.ebitda) / 1000 for pl in pl_list]

        fig, ax = plt.subplots(figsize=(8, 4))

        # Bar chart
        bars = ax.bar(years, ebitda_values, color='#2E75B6', width=0.6)

        # Add value labels
        for bar, value in zip(bars, ebitda_values):
            height = bar.get_height()
            ax.annotate(
                f'{value:,.0f}',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center',
                va='bottom',
                fontsize=10,
            )

        ax.set_ylabel('EBITDA (k€)')
        ax.set_xlabel('Exercice')
        ax.set_title('Évolution de l\'EBITDA')
        ax.set_xticks(years)

        # Style
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)

        # Save to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close()

        return image_base64
