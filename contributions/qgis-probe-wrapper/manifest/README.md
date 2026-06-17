# QGIS Probe Wrapper

Fixes GeoCode's QGIS environment probe JSON parsing failure on Windows.

## Problem

When configuring QGIS path in GeoCode with `python-qgis-ltr.bat`, the probe fails with JSON parsing error. This is because the batch file call chain (`o4w_env.bat` → `etc\ini\*.bat`) outputs additional information to stdout, which interferes with JSON parsing.

## Solution

This skill provides a wrapper batch file that:
1. Suppresses all batch file internal output
2. Keeps only the last line (JSON output)
3. Ensures clean JSON for GeoCode to parse

## Usage

1. Install this skill in GeoCode
2. When configuring QGIS path, use the wrapper instead of the original batch file:
   ```
   <QGIS_INSTALL_DIR>\bin\qgis-geocode-probe.bat
   ```

## Files

- `skill/qgis-geocode-probe.bat` - Wrapper batch file
- `skill/qgis_geocode_probe.py` - Python probe script (optional, for standalone testing)

## Environment

- OS: Windows x64
- QGIS: 3.34.x (OSGeo4W)
- Python: 3.12.x

## Author

Greeneggdog