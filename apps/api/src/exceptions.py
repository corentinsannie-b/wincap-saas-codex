"""
Custom exception classes for Wincap SaaS.

Provides a hierarchy of domain-specific exceptions for better error handling
and debugging throughout the application.
"""


class WincapException(Exception):
    """Base exception for all Wincap-specific errors."""

    pass


class FECParsingError(WincapException):
    """Raised when FEC file parsing fails.

    This includes encoding detection failures, delimiter mismatches,
    malformed entries, or invalid date formats.
    """

    pass


class ValidationError(WincapException):
    """Raised when data validation fails.

    This includes trial balance failures, invalid account codes,
    or data integrity issues.
    """

    pass


class ConfigurationError(WincapException):
    """Raised when configuration is invalid or missing.

    This includes missing required settings, invalid enum values,
    or misconfigured dependencies.
    """

    pass


class ExportError(WincapException):
    """Raised when report export fails.

    This includes failures in Excel generation, PDF rendering,
    or file I/O operations.
    """

    pass


class MappingError(WincapException):
    """Raised when account mapping fails.

    This includes missing mappings, ambiguous mappings, or
    invalid account classifications.
    """

    pass


class CalculationError(WincapException):
    """Raised when financial calculations fail.

    This includes division by zero, overflow, or mathematical inconsistencies.
    """

    pass


class SessionError(WincapException):
    """Raised when session management fails.

    This includes missing sessions, expired sessions, or session storage errors.
    """

    pass
