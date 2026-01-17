from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Tuple, Optional


@dataclass
class TracedValue:
    """A financial value with provenance tracking.

    Tracks a monetary amount and links it back to the journal entries that created it.
    This enables the "click to trace" feature - every number in P&L and Balance can
    show its source entries.
    """

    value: Decimal = Decimal("0")
    """The actual monetary value."""

    entries: List[Tuple[str, str, str, Decimal]] = field(default_factory=list)
    """List of contributing journal entries.
    Each entry is: (date_str, account_num, label, amount)
    Example: ("2024-01-15", "701000", "Vente produits finis", Decimal("12500"))
    """

    def add(self, amount: Decimal, entry: Tuple[str, str, str, Decimal]) -> None:
        """Add an amount and track its source entry."""
        self.value += amount
        self.entries.append(entry)

    def add_value(self, other: "TracedValue") -> None:
        """Combine with another TracedValue, merging entries."""
        self.value += other.value
        self.entries.extend(other.entries)

    def get_trace(self) -> Dict:
        """Export trace as JSON-serializable dict."""
        return {
            "value": float(self.value),
            "entry_count": len(self.entries),
            "entries": [
                {
                    "date": date,
                    "account": account,
                    "label": label,
                    "amount": float(amount)
                }
                for date, account, label, amount in self.entries
            ]
        }


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

    # Trace tracking (not included in init, internal use only)
    _traces: Dict[str, TracedValue] = field(default_factory=dict, init=False, repr=False)

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

    # Trace/Provenance Methods (Phase A Feature)

    def set_traced(self, field_name: str, traced_value: TracedValue) -> None:
        """Set traced value for a field.

        Args:
            field_name: Name of the field (e.g., 'revenue', 'purchases')
            traced_value: TracedValue object with value and source entries
        """
        self._traces[field_name] = traced_value

    def get_trace(self, field_name: str) -> Optional[Dict]:
        """Get trace for a field.

        Args:
            field_name: Name of the field (e.g., 'revenue', 'purchases')

        Returns:
            Dict with value, entry_count, and list of source entries
            Returns None if no trace exists for this field
        """
        if field_name in self._traces:
            return self._traces[field_name].get_trace()
        return None

    def get_all_traces(self) -> Dict[str, Dict]:
        """Get all traces for this P&L.

        Returns:
            Dict mapping field names to their trace data
        """
        return {name: traced.get_trace() for name, traced in self._traces.items()}


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

    # Trace tracking (not included in init, internal use only)
    _traces: Dict[str, TracedValue] = field(default_factory=dict, init=False, repr=False)

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

    # Trace/Provenance Methods (Phase A Feature)

    def set_traced(self, field_name: str, traced_value: TracedValue) -> None:
        """Set traced value for a field.

        Args:
            field_name: Name of the field (e.g., 'receivables', 'payables')
            traced_value: TracedValue object with value and source entries
        """
        self._traces[field_name] = traced_value

    def get_trace(self, field_name: str) -> Optional[Dict]:
        """Get trace for a field.

        Args:
            field_name: Name of the field (e.g., 'receivables', 'payables')

        Returns:
            Dict with value, entry_count, and list of source entries
            Returns None if no trace exists for this field
        """
        if field_name in self._traces:
            return self._traces[field_name].get_trace()
        return None

    def get_all_traces(self) -> Dict[str, Dict]:
        """Get all traces for this balance sheet.

        Returns:
            Dict mapping field names to their trace data
        """
        return {name: traced.get_trace() for name, traced in self._traces.items()}


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
