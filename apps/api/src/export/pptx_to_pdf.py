"""PPTX to PDF Converter using LibreOffice CLI.

Converts PowerPoint presentations to PDF format using LibreOffice's
headless conversion capability. This is a server-side only utility.
"""

import subprocess
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class LibreOfficeConverter:
    """Convert PPTX files to PDF using LibreOffice."""

    # Platform-specific LibreOffice executable paths
    LIBREOFFICE_PATHS = {
        'darwin': [
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',
            '/usr/local/bin/soffice',
            'soffice',
        ],
        'linux': [
            '/usr/bin/soffice',
            '/usr/bin/libreoffice',
            '/usr/local/bin/soffice',
            '/opt/libreoffice/program/soffice',
            'soffice',
            'libreoffice',
        ],
        'win32': [
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            'soffice',
        ],
    }

    def __init__(self):
        """Initialize converter."""
        self._libreoffice_path: Optional[str] = None

    def _get_libreoffice_path(self) -> Optional[str]:
        """Detect LibreOffice installation."""
        if self._libreoffice_path:
            return self._libreoffice_path

        platform = sys.platform
        paths = self.LIBREOFFICE_PATHS.get(platform, ['soffice', 'libreoffice'])

        for path in paths:
            try:
                # Test if executable exists and works
                result = subprocess.run(
                    [path, '--version'],
                    capture_output=True,
                    timeout=5,
                    text=True
                )
                if result.returncode == 0:
                    self._libreoffice_path = path
                    logger.info(f"Found LibreOffice at: {path}")
                    return path
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue

        logger.warning("LibreOffice not found in any known location")
        return None

    def convert(
        self,
        input_path: str,
        output_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Convert PPTX to PDF.

        Args:
            input_path: Path to PPTX file
            output_path: Path for output PDF (optional)

        Returns:
            Dict with status and metadata
        """
        # Validate input
        input_file = Path(input_path)
        if not input_file.exists():
            return {
                'success': False,
                'error': f'Input file not found: {input_path}',
            }

        if not input_file.suffix.lower() == '.pptx':
            return {
                'success': False,
                'error': f'Invalid file format. Expected .pptx, got {input_file.suffix}',
            }

        # Determine output path
        if output_path is None:
            output_path = input_file.with_suffix('.pdf')

        output_file = Path(output_path)
        output_dir = output_file.parent

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # Find LibreOffice
        lo_path = self._get_libreoffice_path()
        if not lo_path:
            return {
                'success': False,
                'error': 'LibreOffice not installed or not found',
            }

        try:
            # Run LibreOffice conversion
            # Use headless mode with PDF conversion
            cmd = [
                lo_path,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', str(output_dir),
                str(input_file),
            ]

            logger.info(f"Converting {input_file.name} to PDF...")
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=300,  # 5 minutes timeout
                text=True
            )

            if result.returncode != 0:
                error_msg = result.stderr or result.stdout
                logger.error(f"Conversion failed: {error_msg}")
                return {
                    'success': False,
                    'error': f'LibreOffice conversion failed: {error_msg}',
                }

            # Verify output file was created
            # LibreOffice creates file with same name as input but .pdf extension
            expected_output = output_dir / f"{input_file.stem}.pdf"

            if not expected_output.exists():
                return {
                    'success': False,
                    'error': f'Output file was not created: {expected_output}',
                }

            # If different output name requested, rename file
            if output_file != expected_output:
                expected_output.rename(output_file)

            logger.info(f"✅ Conversion successful: {output_file}")
            return {
                'success': True,
                'output_path': str(output_file),
                'file_size': output_file.stat().st_size,
            }

        except subprocess.TimeoutExpired:
            logger.error("Conversion timeout (>5 minutes)")
            return {
                'success': False,
                'error': 'Conversion timeout (file too large?)',
            }

        except Exception as e:
            logger.error(f"Conversion error: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Conversion error: {str(e)}',
            }


# Global converter instance
_converter = LibreOfficeConverter()


def convert_pptx_to_pdf(
    input_path: str,
    output_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convert PPTX file to PDF.

    Args:
        input_path: Path to PPTX file
        output_path: Path for output PDF

    Returns:
        Dict with conversion result and metadata
    """
    return _converter.convert(input_path, output_path)
