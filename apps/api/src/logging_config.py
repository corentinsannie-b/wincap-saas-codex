"""
Logging configuration for Wincap SaaS.

Provides centralized logging setup for both CLI and API components,
with support for console and file logging.
"""

import logging
import logging.handlers
import sys
from pathlib import Path

from config.settings import settings
from src.config.constants import LOG_LEVELS, DEFAULT_LOG_LEVEL


def setup_logging(
    name: str = "wincap",
    level: str = None,
    log_file: str = None,
    format_string: str = None,
) -> logging.Logger:
    """
    Configure logging for Wincap application.

    Args:
        name: Logger name (default: "wincap")
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
               If None, uses settings.LOG_LEVEL
        log_file: Path to log file. If None, uses settings.LOG_FILE
        format_string: Custom log format. If None, uses default

    Returns:
        Configured logger instance
    """
    # Get configuration
    log_level = level or settings.LOG_LEVEL or DEFAULT_LOG_LEVEL
    log_path = log_file or settings.LOG_FILE

    if log_level.upper() not in LOG_LEVELS:
        log_level = DEFAULT_LOG_LEVEL

    log_level_int = getattr(logging, log_level.upper())

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # Logger captures all, handlers filter

    # Clear existing handlers (avoid duplicates)
    logger.handlers.clear()

    # Default format string
    if format_string is None:
        format_string = (
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    formatter = logging.Formatter(format_string)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level_int)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler (if configured)
    if log_path:
        try:
            log_file_path = Path(log_path)
            log_file_path.parent.mkdir(parents=True, exist_ok=True)

            file_handler = logging.handlers.RotatingFileHandler(
                log_path,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except (OSError, PermissionError) as e:
            console_handler.emit(
                logging.LogRecord(
                    name=name,
                    level=logging.WARNING,
                    pathname="",
                    lineno=0,
                    msg=f"Failed to setup file logging to {log_path}: {e}",
                    args=(),
                    exc_info=None,
                )
            )

    return logger


def get_logger(name: str = "wincap") -> logging.Logger:
    """
    Get or create a logger instance.

    Args:
        name: Logger name

    Returns:
        Logger instance
    """
    return logging.getLogger(name)


# Initialize default logger on import
logger = setup_logging()
