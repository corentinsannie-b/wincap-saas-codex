"""FEC file parser - handles French accounting export files."""

import csv
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import StringIO
from pathlib import Path
from typing import List, Optional, Union

from src.models.entry import JournalEntry

logger = logging.getLogger(__name__)


@dataclass
class ParseError:
    """Represents a parsing error with context."""
    row: int
    column: str
    value: str
    message: str

    def __str__(self) -> str:
        return f"Row {self.row}, column '{self.column}': {self.message} (value: '{self.value}')"


@dataclass
class ParseResult:
    """Result of parsing a FEC file with entries and any errors."""
    entries: List[JournalEntry] = field(default_factory=list)
    errors: List[ParseError] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    total_rows: int = 0

    @property
    def success_rate(self) -> float:
        """Percentage of rows successfully parsed."""
        if self.total_rows == 0:
            return 0.0
        return (self.total_rows - len(self.errors)) / self.total_rows * 100

    @property
    def has_errors(self) -> bool:
        """Check if there are any parsing errors."""
        return len(self.errors) > 0


class FECParser:
    """Parse FEC (Fichier d'Écritures Comptables) files."""

    # Common FEC column names (case-insensitive)
    DATE_COLUMNS = {"dateecriture", "ecrituredate", "date"}
    ACCOUNT_COLUMNS = {"comptenum", "compte", "accountnum", "account"}
    LABEL_COLUMNS = {"libelle", "ecriturelib", "label", "description"}
    DEBIT_COLUMNS = {"debit", "montantdebit"}
    CREDIT_COLUMNS = {"credit", "montantcredit"}

    # Encoding detection order
    ENCODINGS = ["utf-8", "utf-8-sig", "iso-8859-1", "cp1252", "latin-1"]

    # Pattern to extract year from FEC filename (e.g., 844118190FEC20241231.txt)
    FEC_YEAR_PATTERN = re.compile(r"FEC(\d{4})")

    # Default error threshold (percentage of rows that can fail before raising)
    DEFAULT_ERROR_THRESHOLD = 5.0

    def __init__(
        self,
        file_path: Union[str, Path],
        error_threshold: float = DEFAULT_ERROR_THRESHOLD,
    ):
        """
        Initialize FEC parser.

        Args:
            file_path: Path to the FEC file
            error_threshold: Maximum percentage of rows that can fail parsing
                           before raising an error (default: 5.0%)
        """
        self.file_path = Path(file_path)
        self.entries: List[JournalEntry] = []
        self._encoding: Optional[str] = None
        self._delimiter: Optional[str] = None
        self._source_year: Optional[int] = self._extract_source_year()
        self._error_threshold = error_threshold
        self._parse_result: Optional[ParseResult] = None

    def _extract_source_year(self) -> Optional[int]:
        """Extract source year from FEC filename.

        FEC filenames typically follow the pattern: SIRETFEC{YYYY}MMDD.txt
        e.g., 844118190FEC20241231.txt -> 2024

        This year is critical for correct balance sheet cumulation,
        as it indicates which fiscal year's complete data the file contains.
        """
        match = self.FEC_YEAR_PATTERN.search(self.file_path.name)
        if match:
            return int(match.group(1))
        return None

    @property
    def source_year(self) -> Optional[int]:
        """The source year extracted from the FEC filename."""
        return self._source_year

    def parse(self) -> List[JournalEntry]:
        """Parse FEC file and return list of JournalEntry objects.

        For detailed error information, use parse_with_result() instead.
        """
        result = self.parse_with_result()
        return result.entries

    def parse_with_result(self) -> ParseResult:
        """Parse FEC file and return detailed ParseResult with errors.

        Returns:
            ParseResult containing entries, errors, warnings, and stats.

        Raises:
            ValueError: If error rate exceeds threshold.
        """
        content = self._read_file()
        self._delimiter = self._detect_delimiter(content)
        self._parse_result = self._parse_content(content)
        self.entries = self._parse_result.entries

        # Check error threshold
        if self._parse_result.total_rows > 0:
            error_rate = 100 - self._parse_result.success_rate
            if error_rate > self._error_threshold:
                raise ValueError(
                    f"Parse error rate ({error_rate:.1f}%) exceeds threshold "
                    f"({self._error_threshold}%). {len(self._parse_result.errors)} "
                    f"of {self._parse_result.total_rows} rows failed to parse. "
                    f"First error: {self._parse_result.errors[0] if self._parse_result.errors else 'N/A'}"
                )

        # Log warnings for any errors below threshold
        if self._parse_result.has_errors:
            logger.warning(
                f"Parsed {self.file_path.name}: {len(self._parse_result.entries)} entries, "
                f"{len(self._parse_result.errors)} errors ({100 - self._parse_result.success_rate:.1f}%)"
            )

        return self._parse_result

    @property
    def parse_result(self) -> Optional[ParseResult]:
        """Get the last parse result, if available."""
        return self._parse_result

    def _read_file(self) -> str:
        """Read file with encoding detection."""
        for encoding in self.ENCODINGS:
            try:
                content = self.file_path.read_text(encoding=encoding)
                self._encoding = encoding
                return content
            except UnicodeDecodeError:
                continue
        raise ValueError(f"Could not decode file {self.file_path} with any known encoding")

    def _detect_delimiter(self, content: str) -> str:
        """Detect CSV delimiter from first line."""
        first_line = content.split("\n")[0]

        # Count potential delimiters
        delimiters = {
            ";": first_line.count(";"),
            ",": first_line.count(","),
            "\t": first_line.count("\t"),
            "|": first_line.count("|"),
        }

        # Return delimiter with highest count (minimum 2 occurrences)
        best = max(delimiters.items(), key=lambda x: x[1])
        if best[1] >= 2:
            return best[0]

        # Default to semicolon (French standard)
        return ";"

    def _parse_content(self, content: str) -> ParseResult:
        """Parse CSV content into JournalEntry objects.

        Uses StringIO to properly handle multiline quoted fields.

        Returns:
            ParseResult with entries, errors, and stats.
        """
        result = ParseResult()

        # Use StringIO for proper CSV parsing (handles multiline quoted fields)
        reader = csv.reader(StringIO(content), delimiter=self._delimiter)

        # Parse header
        try:
            raw_headers = next(reader)
        except StopIteration:
            return result

        headers = [h.strip().lower() for h in raw_headers]

        # Map columns
        col_map = self._map_columns(headers)

        # Parse data rows
        for row_num, row in enumerate(reader, start=2):
            if not row or all(not cell.strip() for cell in row):
                continue  # Skip empty rows

            result.total_rows += 1

            try:
                entry = self._parse_row(row, col_map, row_num)
                if entry:
                    result.entries.append(entry)
            except ValueError as e:
                # Extract column info from error message if possible
                error = ParseError(
                    row=row_num,
                    column="unknown",
                    value=str(row)[:100],
                    message=str(e),
                )
                result.errors.append(error)
                logger.debug(f"Parse error: {error}")

        return result

    def _map_columns(self, headers: List[str]) -> dict:
        """Map header names to column indices."""
        col_map = {
            "date": None,
            "account": None,
            "label": None,
            "debit": None,
            "credit": None,
        }

        for idx, header in enumerate(headers):
            if header in self.DATE_COLUMNS:
                col_map["date"] = idx
            elif header in self.ACCOUNT_COLUMNS:
                col_map["account"] = idx
            elif header in self.LABEL_COLUMNS:
                col_map["label"] = idx
            elif header in self.DEBIT_COLUMNS:
                col_map["debit"] = idx
            elif header in self.CREDIT_COLUMNS:
                col_map["credit"] = idx

        # Validate required columns
        missing = [k for k, v in col_map.items() if v is None]
        if missing:
            raise ValueError(f"Missing required columns: {missing}. Headers found: {headers}")

        return col_map

    def _parse_row(self, row: List[str], col_map: dict, row_num: int) -> Optional[JournalEntry]:
        """Parse a single row into a JournalEntry."""
        try:
            # Parse date
            date_str = row[col_map["date"]].strip()
            entry_date = self._parse_date(date_str)

            # Parse account
            account = row[col_map["account"]].strip()
            if not account:
                raise ValueError("Empty account number")

            # Parse label
            label = row[col_map["label"]].strip()

            # Parse amounts with column names for better error messages
            debit = self._parse_amount(row[col_map["debit"]], "debit")
            credit = self._parse_amount(row[col_map["credit"]], "credit")

            return JournalEntry(
                date=entry_date,
                account_num=account,
                label=label,
                debit=debit,
                credit=credit,
                source_year=self._source_year,
            )

        except (IndexError, ValueError) as e:
            raise ValueError(f"Error parsing row {row_num}: {e}")

    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string in various formats."""
        formats = [
            "%Y-%m-%d",  # 2024-01-15
            "%d/%m/%Y",  # 15/01/2024
            "%d-%m-%Y",  # 15-01-2024
            "%Y%m%d",    # 20240115
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        raise ValueError(f"Could not parse date: {date_str}")

    def _parse_amount(self, amount_str: str, column_name: str = "amount") -> Decimal:
        """Parse amount string to Decimal.

        Args:
            amount_str: The amount string to parse
            column_name: Name of the column (for error messages)

        Returns:
            Parsed Decimal value

        Raises:
            ValueError: If the amount cannot be parsed
        """
        if not amount_str or not amount_str.strip():
            return Decimal("0")

        # Clean the string
        cleaned = amount_str.strip()
        original = cleaned  # Keep original for error messages

        # Handle French decimal format (comma as decimal separator)
        if "," in cleaned and "." not in cleaned:
            cleaned = cleaned.replace(",", ".")
        elif "," in cleaned and "." in cleaned:
            # Assume format like 1.234,56 (French thousands separator)
            cleaned = cleaned.replace(".", "").replace(",", ".")

        # Remove spaces (thousands separator)
        cleaned = cleaned.replace(" ", "").replace("\u00a0", "")

        try:
            return Decimal(cleaned)
        except InvalidOperation:
            raise ValueError(f"Invalid {column_name} value: '{original}'")

    @property
    def years(self) -> List[int]:
        """Get unique fiscal years in the data."""
        return sorted(set(e.fiscal_year for e in self.entries))

    def entries_by_year(self, year: int) -> List[JournalEntry]:
        """Filter entries for a specific fiscal year."""
        return [e for e in self.entries if e.fiscal_year == year]

    def __repr__(self) -> str:
        return f"FECParser({self.file_path.name}, {len(self.entries)} entries)"
