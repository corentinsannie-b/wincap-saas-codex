"""Shared statement schemas for report builders/exporters."""

from typing import List, Optional, TypedDict


class ReportLine(TypedDict):
    label: str
    attr: Optional[str]
    is_total: bool
    line_type: str  # "data" | "section" | "spacer"


class CategoryLine(TypedDict):
    label: str
    category: Optional[str]
    is_section: bool


PL_REPORT_LINES: List[ReportLine] = [
    {"label": "Chiffre d'affaires", "attr": "revenue", "is_total": False, "line_type": "data"},
    {"label": "Autres produits", "attr": "other_revenue", "is_total": False, "line_type": "data"},
    {"label": "Production", "attr": "production", "is_total": True, "line_type": "data"},
    {"label": "", "attr": None, "is_total": False, "line_type": "spacer"},
    {"label": "Achats", "attr": "purchases", "is_total": False, "line_type": "data"},
    {"label": "Charges externes", "attr": "external_charges", "is_total": False, "line_type": "data"},
    {"label": "Impôts et taxes", "attr": "taxes", "is_total": False, "line_type": "data"},
    {"label": "Charges de personnel", "attr": "personnel", "is_total": False, "line_type": "data"},
    {"label": "Autres charges", "attr": "other_charges", "is_total": False, "line_type": "data"},
    {"label": "Total charges", "attr": "total_charges", "is_total": True, "line_type": "data"},
    {"label": "", "attr": None, "is_total": False, "line_type": "spacer"},
    {"label": "EBITDA", "attr": "ebitda", "is_total": True, "line_type": "data"},
    {"label": "Marge EBITDA (%)", "attr": "ebitda_margin", "is_total": True, "line_type": "data"},
    {"label": "", "attr": None, "is_total": False, "line_type": "spacer"},
    {"label": "Dotations aux amortissements", "attr": "depreciation", "is_total": False, "line_type": "data"},
    {"label": "EBIT", "attr": "ebit", "is_total": True, "line_type": "data"},
    {"label": "", "attr": None, "is_total": False, "line_type": "spacer"},
    {"label": "Résultat financier", "attr": "financial_result", "is_total": False, "line_type": "data"},
    {"label": "Résultat exceptionnel", "attr": "exceptional_result", "is_total": False, "line_type": "data"},
    {"label": "Impôt sur les sociétés", "attr": "income_tax", "is_total": False, "line_type": "data"},
    {"label": "", "attr": None, "is_total": False, "line_type": "spacer"},
    {"label": "Résultat Net", "attr": "net_income", "is_total": True, "line_type": "data"},
]

BALANCE_REPORT_LINES: List[ReportLine] = [
    {"label": "ACTIF", "attr": None, "is_total": False, "line_type": "section"},
    {"label": "Immobilisations nettes", "attr": "fixed_assets", "is_total": False, "line_type": "data"},
    {"label": "Stocks", "attr": "inventory", "is_total": False, "line_type": "data"},
    {"label": "Créances clients", "attr": "receivables", "is_total": False, "line_type": "data"},
    {"label": "Autres créances", "attr": "other_receivables", "is_total": False, "line_type": "data"},
    {"label": "Trésorerie", "attr": "cash", "is_total": False, "line_type": "data"},
    {"label": "Total Actif", "attr": "total_assets", "is_total": True, "line_type": "data"},
    {"label": "", "attr": None, "is_total": False, "line_type": "spacer"},
    {"label": "PASSIF", "attr": None, "is_total": False, "line_type": "section"},
    {"label": "Capitaux propres", "attr": "equity", "is_total": False, "line_type": "data"},
    {"label": "Provisions", "attr": "provisions", "is_total": False, "line_type": "data"},
    {"label": "Dettes financières", "attr": "financial_debt", "is_total": False, "line_type": "data"},
    {"label": "Dettes fournisseurs", "attr": "payables", "is_total": False, "line_type": "data"},
    {"label": "Autres dettes", "attr": "other_payables", "is_total": False, "line_type": "data"},
    {"label": "Total Passif", "attr": "total_liabilities", "is_total": True, "line_type": "data"},
]

PL_CATEGORY_LINES: List[CategoryLine] = [
    {"label": "Chiffre d'affaires", "category": "revenue", "is_section": False},
    {"label": "Autres produits", "category": "other_revenue", "is_section": False},
    {"label": "Achats", "category": "purchases", "is_section": False},
    {"label": "Charges externes", "category": "external_charges", "is_section": False},
    {"label": "Impôts et taxes", "category": "taxes", "is_section": False},
    {"label": "Charges de personnel", "category": "personnel", "is_section": False},
    {"label": "Autres charges", "category": "other_charges", "is_section": False},
    {"label": "Dotations aux amortissements", "category": "depreciation", "is_section": False},
    {"label": "Charges financières", "category": "financial_expense", "is_section": False},
    {"label": "Produits financiers", "category": "financial_income", "is_section": False},
    {"label": "Charges exceptionnelles", "category": "exceptional_expense", "is_section": False},
    {"label": "Produits exceptionnels", "category": "exceptional_income", "is_section": False},
]

BALANCE_CATEGORY_LINES: List[CategoryLine] = [
    {"label": "ACTIF", "category": None, "is_section": True},
    {"label": "Immobilisations", "category": "fixed_assets", "is_section": False},
    {"label": "Stocks", "category": "inventory", "is_section": False},
    {"label": "Créances clients", "category": "receivables", "is_section": False},
    {"label": "Autres créances", "category": "other_receivables", "is_section": False},
    {"label": "Trésorerie", "category": "cash", "is_section": False},
    {"label": "PASSIF", "category": None, "is_section": True},
    {"label": "Capitaux propres", "category": "equity", "is_section": False},
    {"label": "Provisions", "category": "provisions", "is_section": False},
    {"label": "Dettes financières", "category": "financial_debt", "is_section": False},
    {"label": "Dettes fournisseurs", "category": "payables", "is_section": False},
    {"label": "Autres dettes", "category": "other_payables", "is_section": False},
]
