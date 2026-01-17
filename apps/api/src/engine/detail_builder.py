"""Detail builder for account-level analysis."""

from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Tuple

from src.mapper.account_mapper import AccountMapper
from src.models.entry import JournalEntry


class DetailBuilder:
    """Build detailed account-level breakdowns."""

    def __init__(self, mapper: AccountMapper):
        self.mapper = mapper

    def build_account_summary(
        self, entries: List[JournalEntry]
    ) -> Dict[int, List[Dict]]:
        """
        Build account summary by year.

        Returns: {year: [{account, label, debit, credit, balance}, ...]}
        """
        # Aggregate by year and account
        aggregated = defaultdict(lambda: defaultdict(lambda: {
            "debit": Decimal("0"),
            "credit": Decimal("0"),
            "label": "",
        }))

        for entry in entries:
            year = entry.fiscal_year
            account = entry.account_num
            aggregated[year][account]["debit"] += entry.debit
            aggregated[year][account]["credit"] += entry.credit
            if not aggregated[year][account]["label"]:
                aggregated[year][account]["label"] = entry.label

        # Convert to list format
        result = {}
        for year, accounts in aggregated.items():
            result[year] = []
            for account, data in sorted(accounts.items()):
                category = self.mapper.get_category(account)
                result[year].append({
                    "account": account,
                    "label": data["label"],
                    "category": category or "Non classé",
                    "debit": data["debit"],
                    "credit": data["credit"],
                    "balance": data["debit"] - data["credit"],
                })

        return result

    def build_top_accounts(
        self,
        entries: List[JournalEntry],
        year: int,
        account_type: str = "expense",
        top_n: int = 10,
    ) -> List[Dict]:
        """
        Get top N accounts by amount for a given year.

        account_type: "expense" (classe 6) or "revenue" (classe 7)
        """
        # Filter entries
        class_filter = "6" if account_type == "expense" else "7"
        year_entries = [
            e for e in entries
            if e.fiscal_year == year and e.account_num.startswith(class_filter)
        ]

        # Aggregate by account
        account_totals = defaultdict(lambda: {"total": Decimal("0"), "label": ""})
        for entry in year_entries:
            if account_type == "expense":
                amount = entry.debit - entry.credit
            else:
                amount = entry.credit - entry.debit

            account_totals[entry.account_num]["total"] += amount
            if not account_totals[entry.account_num]["label"]:
                account_totals[entry.account_num]["label"] = entry.label

        # Sort and get top N
        sorted_accounts = sorted(
            account_totals.items(),
            key=lambda x: abs(x[1]["total"]),
            reverse=True,
        )[:top_n]

        return [
            {
                "account": acc,
                "label": data["label"],
                "amount": data["total"],
                "category": self.mapper.get_category(acc) or "Non classé",
            }
            for acc, data in sorted_accounts
        ]

    def build_category_breakdown(
        self, entries: List[JournalEntry], year: int
    ) -> Dict[str, Dict]:
        """
        Build breakdown by category for a given year.

        Returns: {category: {total, count, accounts: [...]}}
        """
        year_entries = [e for e in entries if e.fiscal_year == year]

        categories = defaultdict(lambda: {
            "total": Decimal("0"),
            "count": 0,
            "accounts": set(),
        })

        for entry in year_entries:
            category = self.mapper.get_category(entry.account_num)
            if category:
                # Determine sign based on account class
                if entry.account_num[0] in ("6",):  # Expenses
                    amount = entry.debit - entry.credit
                elif entry.account_num[0] in ("7",):  # Revenue
                    amount = entry.credit - entry.debit
                else:  # Balance sheet
                    amount = entry.debit - entry.credit

                categories[category]["total"] += amount
                categories[category]["count"] += 1
                categories[category]["accounts"].add(entry.account_num)

        # Convert sets to lists
        for cat in categories:
            categories[cat]["accounts"] = sorted(categories[cat]["accounts"])

        return dict(categories)

    def build_pl_detail(
        self, entries: List[JournalEntry], year: int
    ) -> List[Dict]:
        """
        Build detailed P&L with account-level breakdown.

        Groups accounts under their P&L categories.
        """
        year_entries = [e for e in entries if e.fiscal_year == year]

        # Define P&L structure
        pl_structure = [
            ("Chiffre d'affaires", "revenue"),
            ("Autres produits", "other_revenue"),
            ("Achats", "purchases"),
            ("Charges externes", "external_charges"),
            ("Impôts et taxes", "taxes"),
            ("Charges de personnel", "personnel"),
            ("Autres charges", "other_charges"),
            ("Dotations aux amortissements", "depreciation"),
            ("Charges financières", "financial_expense"),
            ("Produits financiers", "financial_income"),
            ("Charges exceptionnelles", "exceptional_expense"),
            ("Produits exceptionnels", "exceptional_income"),
        ]

        # Aggregate by account within each category
        account_data = defaultdict(lambda: defaultdict(lambda: {
            "debit": Decimal("0"),
            "credit": Decimal("0"),
            "label": "",
        }))

        for entry in year_entries:
            category = self.mapper.get_pl_category(entry.account_num)
            if category:
                account_data[category][entry.account_num]["debit"] += entry.debit
                account_data[category][entry.account_num]["credit"] += entry.credit
                if not account_data[category][entry.account_num]["label"]:
                    account_data[category][entry.account_num]["label"] = entry.label

        # Build result
        result = []
        for label, category in pl_structure:
            category_total = Decimal("0")
            account_details = []

            for account, data in sorted(account_data.get(category, {}).items()):
                # Determine amount based on category type
                if category in ("revenue", "other_revenue", "financial_income", "exceptional_income"):
                    amount = data["credit"] - data["debit"]
                else:
                    amount = data["debit"] - data["credit"]

                category_total += amount
                account_details.append({
                    "account": account,
                    "label": data["label"],
                    "amount": amount,
                })

            result.append({
                "category_label": label,
                "category": category,
                "total": category_total,
                "accounts": account_details,
            })

        return result

    def build_journal_extract(
        self,
        entries: List[JournalEntry],
        year: int,
        account_filter: str = None,
        limit: int = 100,
    ) -> List[Dict]:
        """
        Extract journal entries for review.

        Optionally filter by account prefix.
        """
        filtered = [e for e in entries if e.fiscal_year == year]

        if account_filter:
            filtered = [e for e in filtered if e.account_num.startswith(account_filter)]

        # Sort by date
        filtered = sorted(filtered, key=lambda e: e.date)[:limit]

        return [
            {
                "date": entry.date.strftime("%d/%m/%Y"),
                "account": entry.account_num,
                "label": entry.label,
                "debit": entry.debit,
                "credit": entry.credit,
                "category": self.mapper.get_category(entry.account_num) or "Non classé",
            }
            for entry in filtered
        ]

    def build_balance_detail(
        self, entries: List[JournalEntry], year: int
    ) -> List[Dict]:
        """
        Build detailed balance sheet with account-level breakdown.

        Groups accounts under their balance sheet categories.
        """
        year_entries = [e for e in entries if e.effective_year <= year]

        # Define balance sheet structure
        balance_structure = [
            ("ACTIF", None),
            ("Immobilisations", "fixed_assets"),
            ("Stocks", "inventory"),
            ("Créances clients", "receivables"),
            ("Autres créances", "other_receivables"),
            ("Trésorerie", "cash"),
            ("PASSIF", None),
            ("Capitaux propres", "equity"),
            ("Provisions", "provisions"),
            ("Dettes financières", "financial_debt"),
            ("Dettes fournisseurs", "payables"),
            ("Autres dettes", "other_payables"),
        ]

        # Aggregate by account within each category
        account_data = defaultdict(lambda: defaultdict(lambda: {
            "debit": Decimal("0"),
            "credit": Decimal("0"),
            "label": "",
        }))

        for entry in year_entries:
            category = self.mapper.get_balance_category(entry.account_num)
            if category:
                account_data[category][entry.account_num]["debit"] += entry.debit
                account_data[category][entry.account_num]["credit"] += entry.credit
                if not account_data[category][entry.account_num]["label"]:
                    account_data[category][entry.account_num]["label"] = entry.label

        # Build result
        result = []
        for label, category in balance_structure:
            if category is None:
                # Section header
                result.append({
                    "category_label": label,
                    "category": None,
                    "total": None,
                    "accounts": [],
                    "is_section": True,
                })
                continue

            category_total = Decimal("0")
            account_details = []

            for account, data in sorted(account_data.get(category, {}).items()):
                # Determine amount based on account nature
                if self.mapper.is_debit_positive(account):
                    amount = data["debit"] - data["credit"]
                else:
                    amount = data["credit"] - data["debit"]

                category_total += amount
                account_details.append({
                    "account": account,
                    "label": data["label"],
                    "amount": amount,
                })

            result.append({
                "category_label": label,
                "category": category,
                "total": category_total,
                "accounts": account_details,
                "is_section": False,
            })

        return result

    def build_top_accounts_all_years(
        self,
        entries: List[JournalEntry],
        top_n: int = 10,
    ) -> List[Dict]:
        """
        Get top N accounts by total volume across all years.

        Returns accounts sorted by total debit+credit volume.
        """
        # Aggregate by account across all years
        account_totals = defaultdict(lambda: {
            "total_debit": Decimal("0"),
            "total_credit": Decimal("0"),
            "label": "",
        })

        for entry in entries:
            account_totals[entry.account_num]["total_debit"] += entry.debit
            account_totals[entry.account_num]["total_credit"] += entry.credit
            if not account_totals[entry.account_num]["label"]:
                account_totals[entry.account_num]["label"] = entry.label

        # Sort by total volume (debit + credit)
        sorted_accounts = sorted(
            account_totals.items(),
            key=lambda x: x[1]["total_debit"] + x[1]["total_credit"],
            reverse=True,
        )[:top_n]

        return [
            {
                "account_num": acc,
                "label": data["label"],
                "total_debit": data["total_debit"],
                "total_credit": data["total_credit"],
                "volume": data["total_debit"] + data["total_credit"],
                "category": self.mapper.get_category(acc) or "Non classé",
            }
            for acc, data in sorted_accounts
        ]

    def build_category_breakdown_all_years(
        self, entries: List[JournalEntry]
    ) -> Dict[str, Dict]:
        """
        Build breakdown by category across all years.

        Returns: {category: {debit, credit, balance}}
        """
        categories = defaultdict(lambda: {
            "debit": Decimal("0"),
            "credit": Decimal("0"),
        })

        for entry in entries:
            category = self.mapper.get_category(entry.account_num)
            if category:
                categories[category]["debit"] += entry.debit
                categories[category]["credit"] += entry.credit

        # Add balance calculation
        result = {}
        for category, data in categories.items():
            result[category] = {
                "debit": data["debit"],
                "credit": data["credit"],
                "balance": data["debit"] - data["credit"],
            }

        return result
