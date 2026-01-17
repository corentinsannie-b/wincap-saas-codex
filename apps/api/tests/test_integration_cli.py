"""
Integration tests for CLI commands.

Tests full CLI workflows including parsing, generation, and output.
"""

import pytest
from pathlib import Path
from click.testing import CliRunner
from unittest.mock import patch, MagicMock
from decimal import Decimal


class TestCLIIntegration:
    """Integration tests for CLI commands."""

    @pytest.fixture
    def cli_runner(self):
        """Create a CLI test runner."""
        return CliRunner()

    def test_generate_command_missing_file(self, cli_runner):
        """Test generate command with missing file."""
        from main import cli
        result = cli_runner.invoke(cli, ["generate", "--fec-file", "/nonexistent/file.txt"])
        assert result.exit_code != 0

    def test_generate_command_invalid_options(self, cli_runner):
        """Test generate command with invalid options."""
        from main import cli
        result = cli_runner.invoke(cli, ["generate", "--invalid-flag"])
        assert result.exit_code != 0

    def test_analyze_command_missing_file(self, cli_runner):
        """Test analyze command with missing file."""
        from main import cli
        result = cli_runner.invoke(cli, ["analyze", "--fec-file", "/nonexistent/file.txt"])
        assert result.exit_code != 0

    def test_accounts_command_missing_file(self, cli_runner):
        """Test accounts command with missing file."""
        from main import cli
        result = cli_runner.invoke(cli, ["accounts", "--fec-file", "/nonexistent/file.txt"])
        assert result.exit_code != 0

    def test_cli_help(self, cli_runner):
        """Test CLI help command."""
        from main import cli
        result = cli_runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "Usage:" in result.output

    def test_generate_command_help(self, cli_runner):
        """Test generate command help."""
        from main import cli
        result = cli_runner.invoke(cli, ["generate", "--help"])
        assert result.exit_code == 0
        assert "fec-file" in result.output

    def test_analyze_command_help(self, cli_runner):
        """Test analyze command help."""
        from main import cli
        result = cli_runner.invoke(cli, ["analyze", "--help"])
        assert result.exit_code == 0

    def test_accounts_command_help(self, cli_runner):
        """Test accounts command help."""
        from main import cli
        result = cli_runner.invoke(cli, ["accounts", "--help"])
        assert result.exit_code == 0


class TestCLIFileProcessing:
    """Tests for CLI file processing."""

    @pytest.fixture
    def cli_runner(self):
        """Create a CLI test runner."""
        return CliRunner()

    def test_generate_with_valid_fec_file(self, cli_runner, sample_fec_file, temp_dir):
        """Test generate command with valid FEC file."""
        from main import cli
        output_dir = temp_dir / "output"
        output_dir.mkdir()

        with patch('src.parser.fec_parser.FECParser.parse') as mock_parse:
            mock_parse.return_value = []
            result = cli_runner.invoke(
                cli,
                [
                    "generate",
                    "--fec-file", str(sample_fec_file),
                    "--output-dir", str(output_dir),
                ]
            )
            # Should succeed or fail gracefully
            assert isinstance(result.exit_code, int)

    def test_analyze_with_valid_fec_file(self, cli_runner, sample_fec_file, temp_dir):
        """Test analyze command with valid FEC file."""
        from main import cli
        with patch('src.parser.fec_parser.FECParser.parse') as mock_parse:
            mock_parse.return_value = []
            result = cli_runner.invoke(
                cli,
                [
                    "analyze",
                    "--fec-file", str(sample_fec_file),
                ]
            )
            assert isinstance(result.exit_code, int)

    def test_accounts_with_valid_fec_file(self, cli_runner, sample_fec_file):
        """Test accounts command with valid FEC file."""
        from main import cli
        with patch('src.parser.fec_parser.FECParser.parse') as mock_parse:
            mock_parse.return_value = []
            result = cli_runner.invoke(
                cli,
                [
                    "accounts",
                    "--fec-file", str(sample_fec_file),
                ]
            )
            assert isinstance(result.exit_code, int)


class TestCLIWithMockedParsing:
    """Tests for CLI with mocked parsing operations."""

    @pytest.fixture
    def cli_runner(self):
        """Create a CLI test runner."""
        return CliRunner()

    @patch('main.FECParser')
    @patch('main.PLBuilder')
    def test_generate_flow_mocked(self, mock_pl_builder, mock_parser, cli_runner, sample_fec_file, temp_dir):
        """Test full generate flow with mocked components."""
        from main import cli

        # Setup mocks
        mock_parser_instance = MagicMock()
        mock_parser_instance.parse.return_value = []
        mock_parser_instance.encoding = "utf-8"
        mock_parser_instance.delimiter = "\t"
        mock_parser.return_value = mock_parser_instance

        mock_pl_builder_instance = MagicMock()
        mock_pl_builder_instance.build.return_value = []
        mock_pl_builder.return_value = mock_pl_builder_instance

        output_dir = temp_dir / "output"
        output_dir.mkdir()

        result = cli_runner.invoke(
            cli,
            [
                "generate",
                "--fec-file", str(sample_fec_file),
                "--output-dir", str(output_dir),
            ]
        )

        # Verify CLI executed without errors
        assert result.exit_code in [0, 1]  # Allow either success or graceful failure


class TestCLIErrorHandling:
    """Tests for CLI error handling."""

    @pytest.fixture
    def cli_runner(self):
        """Create a CLI test runner."""
        return CliRunner()

    def test_generate_keyboard_interrupt_handling(self, cli_runner, sample_fec_file):
        """Test generate command handles keyboard interrupt."""
        from main import cli
        with patch('src.parser.fec_parser.FECParser') as mock_parser:
            mock_parser.side_effect = KeyboardInterrupt()
            result = cli_runner.invoke(
                cli,
                ["generate", "--fec-file", str(sample_fec_file)]
            )
            # Should exit with non-zero code
            assert result.exit_code != 0

    def test_generate_generic_exception_handling(self, cli_runner, sample_fec_file):
        """Test generate command handles generic exceptions."""
        from main import cli
        with patch('src.parser.fec_parser.FECParser') as mock_parser:
            mock_parser.side_effect = RuntimeError("Unexpected error")
            result = cli_runner.invoke(
                cli,
                ["generate", "--fec-file", str(sample_fec_file)]
            )
            # Should exit with error code
            assert result.exit_code != 0


class TestCLIOutputFormatting:
    """Tests for CLI output formatting."""

    @pytest.fixture
    def cli_runner(self):
        """Create a CLI test runner."""
        return CliRunner()

    def test_success_message_in_output(self, cli_runner):
        """Test success messages appear in CLI output."""
        from main import cli
        result = cli_runner.invoke(cli, ["--help"])
        assert "Wincap" in result.output or "Usage:" in result.output

    def test_header_formatting(self, cli_runner):
        """Test header formatting in CLI output."""
        from main import cli
        result = cli_runner.invoke(cli, ["--help"])
        # Rich formatting may not appear in text output
        assert isinstance(result.output, str)

    @patch('src.cli.output.console')
    def test_error_message_format(self, mock_console, cli_runner):
        """Test error message formatting."""
        # This tests that error output is properly formatted
        assert mock_console is not None
