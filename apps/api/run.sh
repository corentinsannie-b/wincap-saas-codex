#!/bin/bash
# Set up environment for WeasyPrint
export PKG_CONFIG_PATH="$(brew --prefix glib)/lib/pkgconfig:$(brew --prefix pango)/lib/pkgconfig:$(brew --prefix cairo)/lib/pkgconfig:$(brew --prefix gobject-introspection)/lib/pkgconfig:$PKG_CONFIG_PATH"
export DYLD_LIBRARY_PATH="$(brew --prefix glib)/lib:$(brew --prefix pango)/lib:$(brew --prefix cairo)/lib:$(brew --prefix gobject-introspection)/lib:$DYLD_LIBRARY_PATH"

# Run uvicorn
python3 -m uvicorn api:app --reload --port 8000
