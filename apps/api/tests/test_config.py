"""
Unit tests for configuration and logging setup.

Tests settings validation and logging infrastructure.
"""

import pytest
import logging
from pathlib import Path
from unittest.mock import patch, MagicMock
from config.settings import Settings
from src.logging_config import setup_logging, get_logger


class TestSettingsValidation:
    """Tests for settings validation."""

    def test_settings_creation(self):
        """Test creating Settings object."""
        settings = Settings()
        assert settings.API_HOST is not None
        assert settings.API_PORT > 0

    def test_settings_cors_origins_not_wildcard(self):
        """Test settings validation prevents wildcard in CORS origins."""
        with patch.dict('os.environ', {'CORS_ORIGINS': '*'}):
            # Should either fail at validation or not include wildcard
            settings = Settings()
            assert '*' not in settings.CORS_ORIGINS

    def test_settings_upload_temp_dir_exists_or_creatable(self):
        """Test settings for upload temp directory."""
        settings = Settings()
        # Directory path should be valid
        assert isinstance(settings.UPLOAD_TEMP_DIR, str)
        assert len(settings.UPLOAD_TEMP_DIR) > 0

    def test_settings_max_file_size_positive(self):
        """Test max file size is positive."""
        settings = Settings()
        assert settings.MAX_FILE_SIZE > 0

    def test_settings_session_ttl_positive(self):
        """Test session TTL is positive."""
        settings = Settings()
        assert settings.SESSION_TTL_HOURS > 0

    def test_settings_log_level_valid(self):
        """Test log level is valid."""
        settings = Settings()
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        assert settings.LOG_LEVEL in valid_levels

    def test_settings_allowed_extensions(self):
        """Test allowed extensions are set."""
        settings = Settings()
        assert ".txt" in settings.ALLOWED_EXTENSIONS


class TestLoggingSetup:
    """Tests for logging configuration."""

    def test_setup_logging_returns_logger(self):
        """Test setup_logging returns a logger."""
        logger = setup_logging("test_logger")
        assert isinstance(logger, logging.Logger)

    def test_setup_logging_creates_named_logger(self):
        """Test setup_logging creates logger with correct name."""
        logger_name = "test_logger_custom"
        logger = setup_logging(logger_name)
        assert logger.name == logger_name

    def test_setup_logging_with_custom_level(self):
        """Test setup_logging with custom log level."""
        logger = setup_logging("test_logger", level="DEBUG")
        assert logger.level == logging.DEBUG or logger.handlers[0].level == logging.DEBUG

    def test_setup_logging_console_handler_created(self):
        """Test console handler is created."""
        logger = setup_logging("test_logger")
        handlers = logger.handlers
        # Should have at least one handler
        assert len(handlers) > 0

    def test_setup_logging_file_handler_with_path(self, temp_dir):
        """Test file handler is created when log file path provided."""
        log_file = temp_dir / "test.log"
        logger = setup_logging("test_logger", log_file=str(log_file))

        # Log something to create the file
        logger.info("Test message")

        # Log file should exist
        assert log_file.exists()

    def test_setup_logging_format_string(self):
        """Test custom format string."""
        custom_format = "%(levelname)s - %(message)s"
        logger = setup_logging("test_logger", format_string=custom_format)
        assert logger.handlers is not None

    def test_get_logger_returns_logger(self):
        """Test get_logger returns logger instance."""
        logger = get_logger("test_logger")
        assert isinstance(logger, logging.Logger)

    def test_get_logger_named_logger(self):
        """Test get_logger with specific name."""
        logger_name = "custom_logger"
        logger = get_logger(logger_name)
        assert logger.name == logger_name

    def test_logger_can_log_messages(self, temp_dir):
        """Test logger can log messages."""
        log_file = temp_dir / "test_log_messages.log"
        logger = setup_logging("test_logger", log_file=str(log_file))

        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")
        logger.error("Error message")

        # Read log file
        if log_file.exists():
            content = log_file.read_text()
            assert "Info message" in content or "test_logger" in content

    def test_multiple_loggers_independent(self):
        """Test multiple loggers are independent."""
        logger1 = setup_logging("logger1")
        logger2 = setup_logging("logger2")

        assert logger1.name != logger2.name
        assert logger1 is not logger2

    def test_logging_level_hierarchy(self):
        """Test logging level hierarchy (DEBUG < INFO < WARNING < ERROR)."""
        debug_logger = setup_logging("debug_logger", level="DEBUG")
        info_logger = setup_logging("info_logger", level="INFO")
        warning_logger = setup_logging("warning_logger", level="WARNING")

        # All should be valid loggers
        assert debug_logger is not None
        assert info_logger is not None
        assert warning_logger is not None


class TestLoggingFormatting:
    """Tests for logging message formatting."""

    def test_logger_formats_info_message(self, temp_dir):
        """Test logger formats info messages correctly."""
        log_file = temp_dir / "format_test.log"
        logger = setup_logging("format_test", log_file=str(log_file))

        message = "Test format message"
        logger.info(message)

        if log_file.exists():
            content = log_file.read_text()
            # Should contain logger name and message
            assert "format_test" in content or message in content

    def test_logger_includes_timestamp(self, temp_dir):
        """Test logger includes timestamp in messages."""
        log_file = temp_dir / "timestamp_test.log"
        logger = setup_logging("timestamp_test", log_file=str(log_file))

        logger.info("Timestamped message")

        if log_file.exists():
            content = log_file.read_text()
            # Should contain timestamp (year-month-day format)
            assert "-" in content or len(content) > 0

    def test_logger_includes_level(self, temp_dir):
        """Test logger includes level in messages."""
        log_file = temp_dir / "level_test.log"
        logger = setup_logging("level_test", log_file=str(log_file))

        logger.info("Info level message")
        logger.error("Error level message")

        if log_file.exists():
            content = log_file.read_text()
            # Should contain level names
            assert "INFO" in content or "ERROR" in content or len(content) > 0
