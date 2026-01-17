"""
Centralized configuration management for Wincap API.

Configuration values are loaded from:
1. Environment variables (.env file or OS environment)
2. Defaults specified here
"""

import os
from decimal import Decimal
from pathlib import Path
from typing import Optional, Set, List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # =========================================================================
    # API Configuration
    # =========================================================================
    API_HOST: str = os.getenv("API_HOST", "localhost")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_WORKERS: int = int(os.getenv("API_WORKERS", "1"))

    # =========================================================================
    # CORS Configuration
    # =========================================================================
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
        ).split(",")
    ]
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    CORS_ALLOW_METHODS: List[str] = [
        method.strip()
        for method in os.getenv("CORS_ALLOW_METHODS", "GET,POST").split(",")
    ]
    CORS_ALLOW_HEADERS: List[str] = [
        header.strip() for header in os.getenv("CORS_ALLOW_HEADERS", "*").split(",")
    ]

    # =========================================================================
    # File Upload Configuration
    # =========================================================================
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(50 * 1024 * 1024)))  # 50 MB
    ALLOWED_EXTENSIONS: Set[str] = set(
        ext.strip() for ext in os.getenv("ALLOWED_EXTENSIONS", ".txt").split(",")
    )
    UPLOAD_TEMP_DIR: str = os.getenv("UPLOAD_TEMP_DIR", "/tmp/wincap")

    # =========================================================================
    # Session Configuration
    # =========================================================================
    SESSION_TTL_HOURS: int = int(os.getenv("SESSION_TTL_HOURS", "24"))
    CLEANUP_INTERVAL_HOURS: int = int(os.getenv("CLEANUP_INTERVAL_HOURS", "6"))

    # =========================================================================
    # Processing Configuration
    # =========================================================================
    VAT_RATE_DEFAULT: Decimal = Decimal(os.getenv("VAT_RATE_DEFAULT", "1.20"))
    MAX_PARALLEL_FILES: int = int(os.getenv("MAX_PARALLEL_FILES", "4"))

    # =========================================================================
    # Logging Configuration
    # =========================================================================
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: Optional[str] = os.getenv("LOG_FILE", None)
    LOG_FORMAT: str = (
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # =========================================================================
    # Environment
    # =========================================================================
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"

    class Config:
        """Pydantic config."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    def validate(self) -> None:
        """Validate configuration values."""
        # Ensure no wildcard in CORS origins
        if "*" in self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS cannot contain wildcard '*'")

        # Ensure reasonable file size limit (at least 1 MB)
        if self.MAX_FILE_SIZE < 1024 * 1024:
            raise ValueError("MAX_FILE_SIZE must be at least 1 MB")

        # Ensure temp directory is writable
        temp_path = Path(self.UPLOAD_TEMP_DIR)
        try:
            temp_path.mkdir(parents=True, exist_ok=True)
        except (OSError, PermissionError) as e:
            raise ValueError(f"Cannot create/write to UPLOAD_TEMP_DIR: {e}")

        # Validate VAT rate (typically 0.5 to 2.0)
        if not (Decimal("0.5") <= self.VAT_RATE_DEFAULT <= Decimal("2.0")):
            raise ValueError("VAT_RATE_DEFAULT must be between 0.5 and 2.0")


# Initialize global settings instance
try:
    settings = Settings()
    settings.validate()
except Exception as e:
    import sys
    print(f"Configuration Error: {e}", file=sys.stderr)
    sys.exit(1)
