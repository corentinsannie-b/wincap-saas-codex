from setuptools import setup, find_packages

setup(
    name="wincap-api",
    version="1.0.0",
    description="Wincap Financial Due Diligence API",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "fastapi>=0.109.0",
        "uvicorn[standard]>=0.27.0",
        "pandas>=2.0",
        "openpyxl>=3.1",
        "jinja2>=3.1",
        "pyyaml>=6.0",
        "click>=8.1",
        "weasyprint>=60.0",
        "matplotlib>=3.8",
        "python-multipart>=0.0.6",
        "pydantic>=2.0",
        "pydantic-settings>=2.0",
        "rich>=13.0",
        "anthropic>=0.25.0",
    ],
)
