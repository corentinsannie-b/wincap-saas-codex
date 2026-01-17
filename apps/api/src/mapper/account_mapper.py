"""Account mapper - maps PCG account numbers to financial categories."""

from pathlib import Path
from typing import Dict, List, Optional, Union

import yaml


class AccountMapper:
    """Map PCG account numbers to financial statement categories."""

    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """Initialize mapper with config file."""
        if config_path is None:
            # Use default config
            config_path = Path(__file__).parent.parent.parent / "config" / "default_mapping.yml"

        self.config_path = Path(config_path)
        self.mapping: Dict[str, List[str]] = {}
        self._load_config()

    def _load_config(self):
        """Load mapping configuration from YAML."""
        with open(self.config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        # Build prefix -> category mapping
        self.mapping = {}
        for category, prefixes in config.items():
            if isinstance(prefixes, list):
                for item in prefixes:
                    if isinstance(item, dict) and "prefix" in item:
                        prefix = str(item["prefix"])
                        self.mapping[prefix] = category

    def get_category(self, account_num: str) -> Optional[str]:
        """
        Get financial category for an account number.

        Returns the most specific match (longest prefix).
        """
        account = str(account_num).strip()

        # Try progressively shorter prefixes
        best_match = None
        best_length = 0

        for prefix, category in self.mapping.items():
            if account.startswith(prefix) and len(prefix) > best_length:
                best_match = category
                best_length = len(prefix)

        return best_match

    def get_pl_category(self, account_num: str) -> Optional[str]:
        """Get P&L category (classe 6 and 7 only)."""
        category = self.get_category(account_num)
        pl_categories = {
            "revenue", "other_revenue", "purchases", "external_charges",
            "taxes", "personnel", "other_charges", "depreciation",
            "financial_expense", "financial_income",
            "exceptional_expense", "exceptional_income", "income_tax"
        }
        return category if category in pl_categories else None

    def get_balance_category(self, account_num: str) -> Optional[str]:
        """Get balance sheet category (classe 1-5)."""
        category = self.get_category(account_num)
        balance_categories = {
            "fixed_assets", "inventory", "receivables", "other_receivables",
            "cash", "equity", "provisions", "financial_debt",
            "payables", "other_payables"
        }
        return category if category in balance_categories else None

    def is_debit_positive(self, account_num: str) -> bool:
        """
        Determine if debit increases the account value.

        Assets and expenses: debit is positive
        Liabilities and income: credit is positive
        """
        account = str(account_num).strip()
        if not account:
            return True

        category = self.get_balance_category(account)
        if category:
            asset_categories = {
                "fixed_assets", "inventory", "receivables", "other_receivables", "cash"
            }
            liability_categories = {
                "equity", "provisions", "financial_debt", "payables", "other_payables"
            }
            if category in asset_categories:
                return True
            if category in liability_categories:
                return False

        first_digit = account[0]

        # Classes 2, 3, 4, 5, 6 (Assets and Expenses): debit positive
        # Classes 1, 7 (Liabilities/Equity and Income): credit positive
        return first_digit in ("2", "3", "4", "5", "6")

    def __repr__(self) -> str:
        return f"AccountMapper({len(self.mapping)} prefixes)"
