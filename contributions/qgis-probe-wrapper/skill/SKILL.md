---
name: qgis-probe-wrapper
description: Fixes QGIS environment probe JSON parsing on Windows. Use when QGIS probe fails with JSON parsing error.
---

# QGIS Probe Wrapper

This skill fixes the QGIS environment probe JSON parsing failure on Windows systems.

## When to Use

Use this skill when:
- GeoCode's QGIS probe fails with "JSON parsing error"
- QGIS is installed at a path containing spaces (e.g., `Program Files`)
- Using `python-qgis-ltr.bat` as the QGIS path

## How to Fix

1. Locate your QGIS installation directory (e.g., `D:\Program Files\QGIS 3.34.8`)
2. Copy `qgis-geocode-probe.bat` to `<QGIS_INSTALL_DIR>\bin\`
3. In GeoCode `/set` configuration, use the wrapper path:
   ```
   D:\Program Files\QGIS 3.34.8\bin\qgis-geocode-probe.bat
   ```

## Technical Details

The wrapper:
- Calls `o4w_env.bat` with output suppressed (`>nul 2>&1`)
- Executes Python with stderr redirected (`2>nul`)
- Captures only the last line of output (the JSON)
- Outputs clean JSON for GeoCode to parse

## Verification

Test the wrapper manually:
```bash
"<QGIS_PATH>\bin\qgis-geocode-probe.bat" -c "import sys; import json; print(json.dumps({'python': sys.version, 'qgis': 'ok'}))"
```

Expected output:
```json
{"python": "3.12.x", "qgis": "ok"}
```