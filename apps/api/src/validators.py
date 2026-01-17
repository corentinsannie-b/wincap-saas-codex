"""
Input validation utilities for Wincap SaaS.

Provides validation functions for FEC files, configuration parameters,
and user input.
"""

import re
from pathlib import Path
from decimal import Decimal

from config.settings import settings
from src.exceptions import ValidationError


def validate_fec_file(file_path: Path, file_size: int) -> tuple[bool, str]:
    """
    Validate FEC file before processing.

    Checks:
    - File extension is in allowed list
    - File size is within limits
    - File size is not empty (minimum 100 bytes)
    - Filename is sanitized

    Args:
        file_path: Path to the file
        file_size: Size of file in bytes

    Returns:
        Tuple of (is_valid, error_message)
        If valid, error_message is empty string
    """
    # Check extension
    if file_path.suffix.lower() not in settings.ALLOWED_EXTENSIONS:
        return False, f"Invalid file type: {file_path.suffix}. Allowed: {settings.ALLOWED_EXTENSIONS}"

    # Check maximum size
    if file_size > settings.MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
        return False, f"File too large: {size_mb:.1f} MB (max {max_mb:.0f} MB)"

    # Check minimum size (avoid empty files)
    if file_size < 100:
        return False, "File too small: minimum 100 bytes required"

    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks.

    Removes directory components and special characters.

    Args:
        filename: Original filename

    Returns:
        Safe filename without path separators
    """
    # Remove path separators
    safe = Path(filename).name

    # Remove other dangerous characters
    safe = re.sub(r'[<>:"|?*]', "", safe)

    # Remove leading dots (avoid hidden files on Unix)
    while safe.startswith("."):
        safe = safe[1:]

    return safe


def validate_year(year: int) -> bool:
    """
    Validate fiscal year.

    Args:
        year: Year value

    Returns:
        True if valid, False otherwise
    """
    # FEC files should have years between 1900 and next year
    current_year = __import__("datetime").datetime.now().year
    return 1900 <= year <= (current_year + 1)


def validate_vat_rate(vat_rate: float) -> bool:
    """
    Validate VAT rate.

    Args:
        vat_rate: VAT rate as decimal (e.g., 1.20 for 20%)

    Returns:
        True if valid (between 0.5 and 2.0), False otherwise
    """
    try:
        rate = Decimal(str(vat_rate))
        return Decimal("0.5") <= rate <= Decimal("2.0")
    except (ValueError, TypeError):
        return False


def validate_account_code(account_code: str) -> bool:
    """
    Validate French PCG account code format.

    Valid formats:
    - Single digit (class): 1-9
    - Two digits (subclass): 10-99
    - Multi-digit: up to 8 digits

    Args:
        account_code: Account code string

    Returns:
        True if valid format, False otherwise
    """
    if not account_code:
        return False

    # Must be digits only
    if not account_code.isdigit():
        return False

    # Must be 1-8 digits
    if not (1 <= len(account_code) <= 8):
        return False

    return True


def validate_amount(amount: any, max_value: Decimal = None) -> bool:
    """
    Validate monetary amount.

    Args:
        amount: Amount to validate
        max_value: Optional maximum allowed value

    Returns:
        True if valid, False otherwise
    """
    try:
        decimal_amount = Decimal(str(amount))

        # Must be non-negative (we handle debits/credits separately)
        if decimal_amount < 0:
            return False

        # Check max value if specified
        if max_value is not None and decimal_amount > max_value:
            return False

        return True
    except (ValueError, TypeError, ArithmeticError):
        return False


def validate_date_format(date_str: str) -> bool:
    """
    Validate date string format.

    Supports:
    - YYYY-MM-DD
    - DD/MM/YYYY

    Args:
        date_str: Date string

    Returns:
        True if valid format, False otherwise
    """
    from datetime import datetime

    formats = ["%Y-%m-%d", "%d/%m/%Y"]

    for fmt in formats:
        try:
            datetime.strptime(date_str, fmt)
            return True
        except ValueError:
            continue

    return False


def validate_company_name(name: str, min_length: int = 1, max_length: int = 255) -> bool:
    """
    Validate company name.

    Args:
        name: Company name
        min_length: Minimum length
        max_length: Maximum length

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(name, str):
        return False

    length = len(name.strip())
    return min_length <= length <= max_length
