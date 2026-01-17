from .excel_writer import ExcelWriter, export_dashboard_json

# PDF export is optional - requires system libraries
try:
    from .pdf_writer import PDFWriter
    __all__ = ["ExcelWriter", "PDFWriter", "export_dashboard_json"]
except OSError:
    # WeasyPrint system dependencies not available
    PDFWriter = None
    __all__ = ["ExcelWriter", "export_dashboard_json"]
