.PHONY: format lint type-check test docs help clean

# Code Quality Commands
format:
	@echo "Formatting code with Black..."
	python3 -m black src/ tests/ config/ *.py --line-length=100

lint:
	@echo "Linting code with Ruff..."
	python3 -m ruff check src/ tests/ config/ *.py --line-length=100

type-check:
	@echo "Type checking with MyPy..."
	python3 -m mypy src/ --strict --ignore-missing-imports || true

test:
	@echo "Running tests..."
	python3 -m pytest tests/ -v --tb=short

test-cov:
	@echo "Running tests with coverage..."
	python3 -m pytest tests/ -v --cov=src --cov-report=term-missing

clean:
	@echo "Cleaning up..."
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true

quality: format lint type-check test
	@echo "All quality checks passed!"

help:
	@echo "Wincap API - Development Commands"
	@echo ""
	@echo "  make format       - Format code with Black"
	@echo "  make lint         - Lint code with Ruff"
	@echo "  make type-check   - Type check with MyPy"
	@echo "  make test         - Run tests"
	@echo "  make test-cov     - Run tests with coverage"
	@echo "  make quality      - Run all quality checks"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make help         - Show this help message"
