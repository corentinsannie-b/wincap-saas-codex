"""
Unit tests for exception handling.

Tests custom exception hierarchy and error handling patterns.
"""

import pytest
from src.exceptions import (
    WincapException,
    FECParsingError,
    ValidationError,
    ConfigurationError,
    ExportError,
    MappingError,
    CalculationError,
    SessionError,
)


class TestExceptionHierarchy:
    """Tests for exception class hierarchy."""

    def test_all_exceptions_inherit_from_wincap_exception(self):
        """Test all custom exceptions inherit from WincapException."""
        exceptions = [
            FECParsingError,
            ValidationError,
            ConfigurationError,
            ExportError,
            MappingError,
            CalculationError,
            SessionError,
        ]
        for exc_class in exceptions:
            assert issubclass(exc_class, WincapException)

    def test_wincap_exception_inherits_from_exception(self):
        """Test WincapException inherits from Python Exception."""
        assert issubclass(WincapException, Exception)


class TestExceptionInstantiation:
    """Tests for exception instantiation and message handling."""

    def test_wincap_exception_with_message(self):
        """Test WincapException can be raised with message."""
        with pytest.raises(WincapException, match="Test error message"):
            raise WincapException("Test error message")

    def test_fec_parsing_error(self):
        """Test FECParsingError for file parsing failures."""
        with pytest.raises(FECParsingError, match="Invalid FEC format"):
            raise FECParsingError("Invalid FEC format")

    def test_validation_error(self):
        """Test ValidationError for data validation failures."""
        with pytest.raises(ValidationError, match="Invalid account code"):
            raise ValidationError("Invalid account code")

    def test_configuration_error(self):
        """Test ConfigurationError for configuration issues."""
        with pytest.raises(ConfigurationError, match="Missing API_PORT"):
            raise ConfigurationError("Missing API_PORT")

    def test_export_error(self):
        """Test ExportError for export operation failures."""
        with pytest.raises(ExportError, match="PDF generation failed"):
            raise ExportError("PDF generation failed")

    def test_mapping_error(self):
        """Test MappingError for account mapping failures."""
        with pytest.raises(MappingError, match="Unknown account class"):
            raise MappingError("Unknown account class")

    def test_calculation_error(self):
        """Test CalculationError for calculation failures."""
        with pytest.raises(CalculationError, match="Trial balance mismatch"):
            raise CalculationError("Trial balance mismatch")

    def test_session_error(self):
        """Test SessionError for session management failures."""
        with pytest.raises(SessionError, match="Session expired"):
            raise SessionError("Session expired")


class TestExceptionCatching:
    """Tests for exception catching patterns."""

    def test_catch_specific_exception(self):
        """Test catching specific exception type."""
        try:
            raise FECParsingError("Test error")
        except FECParsingError as e:
            assert str(e) == "Test error"

    def test_catch_base_exception(self):
        """Test catching base WincapException catches specific errors."""
        exceptions_to_test = [
            FECParsingError("parsing"),
            ValidationError("validation"),
            ConfigurationError("config"),
        ]

        for exc in exceptions_to_test:
            try:
                raise exc
            except WincapException as e:
                assert isinstance(e, WincapException)

    def test_exception_message_preservation(self):
        """Test exception messages are preserved through raise."""
        message = "Detailed error with context: account 401 not found"
        try:
            raise MappingError(message)
        except MappingError as e:
            assert message in str(e)


class TestExceptionContext:
    """Tests for exception with context."""

    def test_exception_with_cause(self):
        """Test exception with cause chain."""
        try:
            try:
                raise ValueError("Original error")
            except ValueError as e:
                raise CalculationError("Calculation failed") from e
        except CalculationError as e:
            assert e.__cause__ is not None
            assert isinstance(e.__cause__, ValueError)

    def test_exception_traceback(self):
        """Test exception preserves traceback information."""
        import traceback

        try:
            raise FECParsingError("Parse failed at line 42")
        except FECParsingError:
            tb_lines = traceback.format_exc()
            assert "FECParsingError" in tb_lines
            assert "Parse failed at line 42" in tb_lines
