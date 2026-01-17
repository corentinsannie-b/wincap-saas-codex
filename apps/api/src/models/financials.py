from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict


@dataclass
class ProfitLoss:
    """P&L statement for a fiscal year."""

    year: int

    # Revenue
    revenue: Decimal = Decimal("0")  # CA - Chiffre d'affaires (70)
    other_revenue: Decimal = Decimal("0")  # Autres produits (74, 75, 78, 79)

    # Costs
    purchases: Decimal = Decimal("0")  # Achats (60)
    external_charges: Decimal = Decimal("0")  # Services extérieurs (61, 62)
    taxes: Decimal = Decimal("0")  # Impôts et taxes (63)
    personnel: Decimal = Decimal("0")  # Charges personnel (64)
    other_charges: Decimal = Decimal("0")  # Autres charges (65)
    depreciation: Decimal = Decimal("0")  # Dotations amortissements (68)

    # Financial
    financial_income: Decimal = Decimal("0")  # Produits financiers (76)
    financial_expense: Decimal = Decimal("0")  # Charges financières (66)

    # Exceptional
    exceptional_income: Decimal = Decimal("0")  # Produits exceptionnels (77)
    exceptional_expense: Decimal = Decimal("0")  # Charges exceptionnelles (67)

    # Tax
    income_tax: Decimal = Decimal("0")  # Impôt sur les sociétés (69)

    @property
    def production(self) -> Decimal:
        """Total production = CA + autres produits."""
        return self.revenue + self.other_revenue

    @property
    def total_charges(self) -> Decimal:
        """Total operating charges before depreciation."""
        return (self.purchases + self.external_charges + self.taxes +
                self.personnel + self.other_charges)

    @property
    def ebitda(self) -> Decimal:
        """EBITDA = Production - Total charges."""
        return self.production - self.total_charges

    @property
    def ebit(self) -> Decimal:
        """EBIT = EBITDA - Depreciation."""
        return self.ebitda - self.depreciation

    @property
    def financial_result(self) -> Decimal:
        """Résultat financier."""
        return self.financial_income - self.financial_expense

    @property
    def exceptional_result(self) -> Decimal:
        """Résultat exceptionnel."""
        return self.exceptional_income - self.exceptional_expense

    @property
    def net_income(self) -> Decimal:
        """Résultat net."""
        return self.ebit + self.financial_result + self.exceptional_result - self.income_tax

    @property
    def ebitda_margin(self) -> Decimal:
        """EBITDA margin (%)."""
        if self.production == 0:
            return Decimal("0")
        return (self.ebitda / self.production) * 100


@dataclass
class BalanceSheet:
    """Balance sheet at fiscal year end."""

    year: int

    # Assets - Actif
    fixed_assets: Decimal = Decimal("0")  # Immobilisations (classe 2)
    inventory: Decimal = Decimal("0")  # Stocks (classe 3)
    receivables: Decimal = Decimal("0")  # Créances clients (41)
    other_receivables: Decimal = Decimal("0")  # Autres créances (42-49)
    cash: Decimal = Decimal("0")  # Trésorerie (51, 53)

    # Liabilities - Passif
    equity: Decimal = Decimal("0")  # Capitaux propres (classe 1)
    provisions: Decimal = Decimal("0")  # Provisions (15)
    financial_debt: Decimal = Decimal("0")  # Dettes financières (16, 17)
    payables: Decimal = Decimal("0")  # Fournisseurs (40)
    other_payables: Decimal = Decimal("0")  # Autres dettes (42-49)

    @property
    def total_assets(self) -> Decimal:
        """Total actif."""
        return (self.fixed_assets + self.inventory + self.receivables +
                self.other_receivables + self.cash)

    @property
    def total_liabilities(self) -> Decimal:
        """Total passif."""
        return (self.equity + self.provisions + self.financial_debt +
                self.payables + self.other_payables)

    @property
    def working_capital(self) -> Decimal:
        """BFR = Stocks + Clients - Fournisseurs."""
        return self.inventory + self.receivables - self.payables

    @property
    def net_debt(self) -> Decimal:
        """Dette nette = Dettes financières - Trésorerie."""
        return self.financial_debt - self.cash


@dataclass
class KPIs:
    """Key Performance Indicators."""

    year: int

    # Computed from P&L
    revenue: Decimal = Decimal("0")
    ebitda: Decimal = Decimal("0")
    ebitda_margin: Decimal = Decimal("0")
    net_income: Decimal = Decimal("0")

    # Working capital
    dso: Decimal = Decimal("0")  # Days Sales Outstanding
    dpo: Decimal = Decimal("0")  # Days Payable Outstanding
    dio: Decimal = Decimal("0")  # Days Inventory Outstanding

    # Cash
    working_capital: Decimal = Decimal("0")  # BFR
    net_debt: Decimal = Decimal("0")

    # QoE adjustments
    qoe_adjustments: Dict[str, Decimal] = field(default_factory=dict)

    @property
    def adjusted_ebitda(self) -> Decimal:
        """EBITDA after QoE adjustments."""
        return self.ebitda + sum(self.qoe_adjustments.values())
