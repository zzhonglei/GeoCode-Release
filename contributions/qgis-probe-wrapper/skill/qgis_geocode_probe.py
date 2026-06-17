#!/usr/bin/env python3
"""
GeoCode QGIS Environment Probe
Tests QGIS/GDAL/Python environment and outputs JSON result
"""

import sys
import json
import os

result = {
    "python": sys.version,
    "qgis": False,
    "qgis_version": "",
    "gdal": False,
    "gdal_version": "",
    "prefix": os.environ.get("QGIS_PREFIX_PATH", ""),
    "error": None
}

try:
    import qgis.core
    result["qgis"] = True
    result["qgis_version"] = qgis.core.Qgis.version()
except Exception as e:
    result["error"] = f"QGIS import failed: {str(e)}"

try:
    from osgeo import gdal
    result["gdal"] = True
    result["gdal_version"] = gdal.VersionInfo()
except Exception as e:
    if not result["error"]:
        result["error"] = f"GDAL import failed: {str(e)}"

print(json.dumps(result))