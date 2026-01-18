from .excel_writer import ExcelWriter, export_dashboard_json, append_trace_sheet
from .template_writer import TemplateWriter

# PDF export is optional - requires system libraries
try:
    from .pdf_writer import PDFWriter
    __all__ = ["ExcelWriter", "TemplateWriter", "PDFWriter", "export_dashboard_json", "append_trace_sheet"]
except OSError:
    # WeasyPrint system dependencies not available
    PDFWriter = None
    __all__ = ["ExcelWriter", "TemplateWriter", "export_dashboard_json", "append_trace_sheet"]
