"""
Unit tests for input validators.

Tests file validation, data sanitization, and business rule validation.
"""

import pytest
from pathlib import Path
from decimal import Decimal
from src.validators import (
    validate_fec_file,
    sanitize_filename,
    validate_year,
    validate_vat_rate,
    validate_account_code,
    validate_amount,
)


class TestFileValidation:
    """Tests for FEC file validation."""

    def test_validate_fec_file_valid_extension(self, temp_dir):
        """Test validation of file with valid extension."""
        test_file = temp_dir / "test.txt"
        test_file.write_text("test")
        is_valid, error = validate_fec_file(test_file, test_file.stat().st_size)
        assert is_valid is True
        assert error == ""

    def test_validate_fec_file_invalid_extension(self, temp_dir):
        """Test validation rejects invalid file extension."""
        test_file = temp_dir / "test.xlsx"
        test_file.write_text("test")
        is_valid, error = validate_fec_file(test_file, test_file.stat().st_size)
        assert is_valid is False
        assert "Invalid file type" in error

    def test_validate_fec_file_too_large(self, temp_dir):
        """Test validation rejects files exceeding size limit."""
        test_file = temp_dir / "test.txt"
        test_file.write_text("x" * 1000)
        # Pass size larger than limit (50MB default)
        is_valid, error = validate_fec_file(test_file, 60 * 1024 * 1024)
        assert is_valid is False
        assert "File too large" in error

    def test_validate_fec_file_too_small(self, temp_dir):
        """Test validation rejects files that are too small."""
        test_file = temp_dir / "test.txt"
        test_file.write_text("x" * 50)
        is_valid, error = validate_fec_file(test_file, 50)
        assert is_valid is False
        assert "File too small" in error


class TestFilenameSanitization:
    """Tests for filename sanitization."""

    def test_sanitize_filename_normal(self):
        """Test sanitization of normal filename."""
        result = sanitize_filename("fec_2024.txt")
        assert result == "fec_2024.txt"

    def test_sanitize_filename_path_traversal(self):
        """Test sanitization blocks path traversal."""
        result = sanitize_filename("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    def test_sanitize_filename_special_chars(self):
        """Test sanitization removes dangerous characters."""
        result = sanitize_filename('file"<>:|?.txt')
        assert '"' not in result
        assert '<' not in result
        assert '>' not in result
        assert ':' not in result
        assert '|' not in result
        assert '?' not in result

    def test_sanitize_filename_leading_dots(self):
        """Test sanitization removes leading dots."""
        result = sanitize_filename("...hidden.txt")
        assert not result.startswith(".")

    def test_sanitize_filename_empty_after_sanitization(self):
        """Test handling of filenames that become empty after sanitization."""
        result = sanitize_filename("...")
        # Should have some default or be empty
        assert isinstance(result, str)


class TestYearValidation:
    """Tests for fiscal year validation."""

    def test_validate_year_valid(self):
        """Test validation of valid fiscal year."""
        assert validate_year(2024) is True
        assert validate_year(2023) is True
        assert validate_year(2020) is True

    def test_validate_year_too_old(self):
        """Test validation rejects years before 1900."""
        assert validate_year(1899) is False

    def test_validate_year_future(self):
        """Test validation allows future years (current + 1)."""
        import datetime
        current = datetime.datetime.now().year
        assert validate_year(current + 1) is True
        assert validate_year(current + 2) is False


class TestVATRateValidation:
    """Tests for VAT rate validation."""

    def test_validate_vat_rate_valid_standard(self):
        """Test validation of standard 20% VAT rate."""
        assert validate_vat_rate(1.20) is True
        assert validate_vat_rate(1.21) is True

    def test_validate_vat_rate_valid_reduced(self):
        """Test validation of reduced VAT rates."""
        assert validate_vat_rate(1.055) is True
        assert validate_vat_rate(1.10) is True

    def test_validate_vat_rate_invalid_too_low(self):
        """Test validation rejects rates below 0.5."""
        assert validate_vat_rate(0.49) is False

    def test_validate_vat_rate_invalid_too_high(self):
        """Test validation rejects rates above 2.0."""
        assert validate_vat_rate(2.01) is False

    def test_validate_vat_rate_invalid_non_numeric(self):
        """Test validation rejects non-numeric values."""
        assert validate_vat_rate("invalid") is False
        assert validate_vat_rate(None) is False


class TestAccountCodeValidation:
    """Tests for French PCG account code validation."""

    def test_validate_account_code_valid(self):
        """Test validation of valid account codes."""
        assert validate_account_code("401") is True
        assert validate_account_code("701") is True
        assert validate_account_code("1234567") is True

    def test_validate_account_code_invalid_empty(self):
        """Test validation rejects empty account code."""
        assert validate_account_code("") is False

    def test_validate_account_code_invalid_too_long(self):
        """Test validation rejects codes longer than 8 digits."""
        assert validate_account_code("123456789") is False

    def test_validate_account_code_invalid_non_numeric(self):
        """Test validation rejects non-numeric codes."""
        assert validate_account_code("ABC") is False
        assert validate_account_code("40A") is False


class TestAmountValidation:
    """Tests for monetary amount validation."""

    def test_validate_amount_valid(self):
        """Test validation of valid amounts."""
        assert validate_amount(100.50) is True
        assert validate_amount("1000.00") is True
        assert validate_amount(Decimal("5000.00")) is True

    def test_validate_amount_zero(self):
        """Test validation allows zero."""
        assert validate_amount(0) is True
        assert validate_amount("0.00") is True

    def test_validate_amount_negative(self):
        """Test validation rejects negative amounts."""
        assert validate_amount(-100.50) is False
        assert validate_amount("-1000.00") is False

    def test_validate_amount_within_max(self):
        """Test validation respects maximum value."""
        max_val = Decimal("10000.00")
        assert validate_amount(5000.00, max_val) is True
        assert validate_amount(10000.00, max_val) is True

    def test_validate_amount_exceeds_max(self):
        """Test validation rejects amounts exceeding maximum."""
        max_val = Decimal("10000.00")
        assert validate_amount(10000.01, max_val) is False

    def test_validate_amount_invalid_non_numeric(self):
        """Test validation rejects non-numeric values."""
        assert validate_amount("invalid") is False
        assert validate_amount(None) is False
