"""
Cleanup utilities for temporary files and sessions.

Manages automatic cleanup of temporary files and expired sessions
to prevent disk space issues.
"""

import atexit
import logging
import shutil
import time
from pathlib import Path

from config.settings import settings

logger = logging.getLogger(__name__)


def cleanup_old_sessions() -> int:
    """
    Remove session directories older than SESSION_TTL_HOURS.

    Returns:
        Number of sessions cleaned up
    """
    session_root = Path(settings.UPLOAD_TEMP_DIR)

    if not session_root.exists():
        logger.debug(f"Session directory does not exist: {session_root}")
        return 0

    try:
        # Calculate cutoff time
        cutoff_time = time.time() - (settings.SESSION_TTL_HOURS * 3600)

        cleaned_count = 0
        total_size_freed = 0

        # Iterate through session directories
        for session_dir in session_root.iterdir():
            if not session_dir.is_dir():
                continue

            # Check if directory is older than TTL
            if session_dir.stat().st_mtime < cutoff_time:
                try:
                    # Calculate size before deletion
                    dir_size = sum(
                        f.stat().st_size
                        for f in session_dir.rglob("*")
                        if f.is_file()
                    )

                    # Remove directory
                    shutil.rmtree(session_dir, ignore_errors=True)
                    cleaned_count += 1
                    total_size_freed += dir_size

                    logger.info(
                        f"Cleaned up session: {session_dir.name} "
                        f"({dir_size / 1024:.1f} KB freed)"
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to cleanup session {session_dir.name}: {e}"
                    )

        if cleaned_count > 0:
            logger.info(
                f"Session cleanup completed: {cleaned_count} sessions removed, "
                f"{total_size_freed / 1024 / 1024:.1f} MB freed"
            )

        return cleaned_count

    except Exception as e:
        logger.error(f"Error during session cleanup: {e}", exc_info=True)
        return 0


def cleanup_empty_directories() -> int:
    """
    Remove empty directories from the session directory.

    Returns:
        Number of empty directories removed
    """
    session_root = Path(settings.UPLOAD_TEMP_DIR)

    if not session_root.exists():
        return 0

    try:
        removed_count = 0

        # Walk bottom-up to remove empty directories
        for dirpath in sorted(session_root.rglob("*"), reverse=True):
            if dirpath.is_dir() and not any(dirpath.iterdir()):
                try:
                    dirpath.rmdir()
                    removed_count += 1
                    logger.debug(f"Removed empty directory: {dirpath}")
                except OSError:
                    # Directory might not be empty or permission issue
                    pass

        return removed_count

    except Exception as e:
        logger.error(f"Error removing empty directories: {e}", exc_info=True)
        return 0


def cleanup_large_files(
    max_age_hours: int = None, max_size_mb: int = None
) -> int:
    """
    Remove large or old files from temporary directory.

    Args:
        max_age_hours: Remove files older than this (None = use TTL)
        max_size_mb: Remove files larger than this size

    Returns:
        Number of files removed
    """
    session_root = Path(settings.UPLOAD_TEMP_DIR)

    if not session_root.exists():
        return 0

    try:
        removed_count = 0

        # Use session TTL if not specified
        if max_age_hours is None:
            max_age_hours = settings.SESSION_TTL_HOURS

        cutoff_time = time.time() - (max_age_hours * 3600)
        max_size_bytes = max_size_mb * 1024 * 1024 if max_size_mb else float('inf')

        for file_path in session_root.rglob("*"):
            if not file_path.is_file():
                continue

            try:
                stat_info = file_path.stat()
                file_age = time.time() - stat_info.st_mtime
                file_size = stat_info.st_size

                # Check both size and age criteria
                if (file_age > max_age_hours * 3600) or (file_size > max_size_bytes):
                    file_path.unlink()
                    removed_count += 1
                    logger.info(
                        f"Removed file: {file_path.name} "
                        f"({file_size / 1024:.1f} KB, "
                        f"{file_age / 3600:.1f} hours old)"
                    )
            except OSError as e:
                logger.warning(f"Failed to remove file {file_path}: {e}")

        return removed_count

    except Exception as e:
        logger.error(f"Error during file cleanup: {e}", exc_info=True)
        return 0


def get_temp_directory_stats() -> dict:
    """
    Get statistics about the temporary directory.

    Returns:
        Dictionary with directory statistics
    """
    session_root = Path(settings.UPLOAD_TEMP_DIR)

    if not session_root.exists():
        return {
            "exists": False,
            "total_size_mb": 0,
            "file_count": 0,
            "directory_count": 0,
        }

    try:
        total_size = 0
        file_count = 0
        dir_count = 0

        for item in session_root.rglob("*"):
            if item.is_file():
                total_size += item.stat().st_size
                file_count += 1
            elif item.is_dir():
                dir_count += 1

        return {
            "exists": True,
            "path": str(session_root),
            "total_size_mb": total_size / 1024 / 1024,
            "file_count": file_count,
            "directory_count": dir_count,
        }

    except Exception as e:
        logger.error(f"Error getting directory stats: {e}")
        return {
            "exists": True,
            "error": str(e),
        }


# Register cleanup to run on exit
atexit.register(cleanup_old_sessions)
atexit.register(cleanup_empty_directories)

logger.debug(
    f"Cleanup handlers registered. "
    f"Session TTL: {settings.SESSION_TTL_HOURS} hours, "
    f"Cleanup interval: {settings.CLEANUP_INTERVAL_HOURS} hours"
)
