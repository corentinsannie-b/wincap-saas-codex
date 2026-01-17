# Development Guide

This guide covers development setup, testing, and code quality practices for the Wincap API.

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- Virtual environment tool (venv)
- Git

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/corentinsannie-b/wincap-dashboard.git
cd wincap-dashboard/apps/api
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
# Install base dependencies
pip install -e .

# Install dev dependencies for testing and quality tools
pip install -e ".[dev]"
```

## Running the Application

### CLI

```bash
# Generate reports from FEC files
wincap generate --fec-file data.txt --output-dir ./reports

# Analyze FEC file
wincap analyze --fec-file data.txt

# Show account distribution
wincap accounts --fec-file data.txt
```

### API Server

```bash
# Development server (auto-reload)
python3 api.py

# Or with specific host/port
API_HOST=0.0.0.0 API_PORT=8080 python3 api.py
```

## Development Workflow

### Code Quality

We enforce code quality through automated checks:

```bash
# Format code with Black
make format

# Lint code with Ruff
make lint

# Type check with MyPy
make type-check

# Run all checks
make quality
```

### Testing

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test file
python3 -m pytest tests/test_validators.py -v

# Run specific test
python3 -m pytest tests/test_validators.py::TestFileValidation::test_validate_fec_file_valid_extension -v

# Run tests matching pattern
python3 -m pytest tests/ -k "validate_" -v
```

### Debugging

```bash
# Run with debug logging
LOG_LEVEL=DEBUG wincap generate --fec-file data.txt

# Run tests with print statements visible
python3 -m pytest tests/ -v -s

# Run with Python debugger
python3 -m pdb main.py generate --fec-file data.txt
```

## Project Structure

```
apps/api/
├── config/
│   └── settings.py           # Application configuration
├── src/
│   ├── cli/
│   │   ├── __init__.py
│   │   └── output.py         # Rich console output utilities
│   ├── config/
│   │   └── constants.py      # Application constants
│   ├── exceptions.py         # Custom exception classes
│   ├── validators.py         # Input validation functions
│   ├── cleanup.py            # Session cleanup utilities
│   ├── logging_config.py     # Logging setup
│   ├── models/
│   │   ├── entry.py          # JournalEntry model
│   │   └── financials.py     # ProfitLoss, BalanceSheet, KPIs models
│   ├── parser/
│   │   └── fec_parser.py     # FEC file parser
│   ├── mapper/
│   │   └── account_mapper.py # Account classification
│   ├── builders/
│   │   ├── pl_builder.py     # P&L statement builder
│   │   ├── balance_builder.py
│   │   ├── kpi_builder.py
│   │   └── variance_builder.py
│   └── export/
│       ├── excel_writer.py   # Excel export
│       └── pdf_writer.py     # PDF export
├── tests/
│   ├── conftest.py           # Test configuration and fixtures
│   ├── test_validators.py    # Validator tests
│   ├── test_exceptions.py    # Exception tests
│   ├── test_config.py        # Settings and logging tests
│   ├── test_models.py        # Data model tests
│   ├── test_cli_output.py    # CLI output tests
│   ├── test_integration_cli.py
│   └── test_api_endpoints.py
├── main.py                   # CLI entry point
├── api.py                    # API entry point
├── pyproject.toml            # Project dependencies
├── pytest.ini                # Pytest configuration
├── Makefile                  # Development commands
└── README.md                 # Project documentation
```

## Adding Features

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Write Tests First (TDD)

```python
# tests/test_my_feature.py
import pytest

def test_my_feature():
    # Arrange
    input_data = ...

    # Act
    result = my_feature_function(input_data)

    # Assert
    assert result == expected
```

### 3. Implement Feature

```python
# src/my_feature.py
def my_feature_function(data):
    """Description of what this does."""
    # Implementation
    return result
```

### 4. Run Quality Checks

```bash
# Make sure all tests pass
make test

# Ensure code quality
make quality
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: Add my feature"
git push origin feature/my-feature
```

### 6. Create Pull Request

```bash
# Open PR on GitHub
gh pr create --title "Add my feature" --body "Description"
```

## Common Tasks

### Adding a New Validator

```python
# src/validators.py
def validate_new_rule(value: any) -> bool:
    """Validate new business rule."""
    # Validation logic
    return is_valid

# tests/test_validators.py
def test_validate_new_rule():
    assert validate_new_rule(valid_input) is True
    assert validate_new_rule(invalid_input) is False
```

### Adding a New API Endpoint

```python
# api.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/new-endpoint/{session_id}")
async def new_endpoint(session_id: str):
    """Get new data."""
    # Implementation
    return {"data": ...}

# tests/test_api_endpoints.py
def test_new_endpoint(api_client):
    response = api_client.get("/api/new-endpoint/test-session")
    assert response.status_code in [200, 404]
```

### Adding Configuration Option

```python
# config/settings.py
class Settings(BaseSettings):
    # Add new setting
    NEW_OPTION: str = os.getenv("NEW_OPTION", "default_value")

# .env
NEW_OPTION=production_value
```

## Debugging Common Issues

### Import Errors

If you get import errors like `ModuleNotFoundError: No module named 'src'`:

```bash
# Make sure you're in the apps/api directory
cd apps/api

# Run pytest from the project root
python3 -m pytest tests/
```

### Encoding Issues

If FEC files fail to parse:

```bash
# Check file encoding
file -i data.txt

# The FEC parser auto-detects: UTF-8, Latin-1, CP1252
# If none work, convert manually:
iconv -f ISO-8859-1 -t UTF-8 data.txt > data_utf8.txt
```

### WeasyPrint Issues

PDF export requires system dependencies:

```bash
# macOS
brew install libffi cairo pango gdk-pixbuf libpng

# Ubuntu/Debian
sudo apt-get install python3-cffi python3-brlapi libcairo2 libcairo2-dev libpango-1.0-0 libpango-cairo-1.0-0 libgdk-pixbuf2.0-0

# If still failing, you can skip PDF export in tests
pytest tests/ -k "not pdf"
```

## Documentation

### Code Comments

```python
def complex_function(data: List[str]) -> Dict[str, int]:
    """
    Brief description.

    Args:
        data: List of strings to process

    Returns:
        Dictionary mapping strings to their lengths

    Example:
        >>> complex_function(["hello", "world"])
        {"hello": 5, "world": 5}
    """
    # Implementation
```

### Docstring Format

We use Google-style docstrings:

```python
def function(param1: str, param2: int) -> bool:
    """One line summary.

    Longer description if needed.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value

    Raises:
        ValueError: When validation fails
        TypeError: When types don't match

    Example:
        >>> function("test", 42)
        True
    """
```

### API Documentation

Update `docs/API_REFERENCE.md` when adding new endpoints:

1. Add endpoint section with method and path
2. Document request parameters
3. Document response with examples
4. List possible error codes
5. Add usage example

## Performance Profiling

### Profile Code Execution

```bash
# Profile test execution
python3 -m cProfile -s cumtime main.py generate --fec-file data.txt

# Or use py-spy for sampling
pip install py-spy
py-spy record -o profile.svg -- python3 main.py generate --fec-file data.txt
```

### Memory Usage

```bash
# Monitor memory with psutil
pip install psutil
python3 -c "
import psutil, main
process = psutil.Process()
print(f'Memory: {process.memory_info().rss / 1024 / 1024:.1f} MB')
"
```

## Continuous Integration

Tests run automatically on every commit via GitHub Actions:

```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -e ".[dev]"
      - run: make quality
```

## Release Process

1. Increment version in `pyproject.toml`
2. Create git tag: `git tag v1.0.0`
3. Push to GitHub: `git push --tags`
4. Create GitHub release with changelog

## Getting Help

- Check existing issues: https://github.com/corentinsannie-b/wincap-dashboard/issues
- Read documentation: `/docs/`
- Run tests with `-vv`: `pytest tests/ -vv`
- Enable debug logging: `LOG_LEVEL=DEBUG`
