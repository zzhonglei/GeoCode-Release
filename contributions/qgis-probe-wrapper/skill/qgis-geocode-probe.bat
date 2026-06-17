@echo off
setlocal enabledelayedexpansion

REM QGIS Probe Wrapper for GeoCode
REM Cleans batch output, keeps only JSON

call "%~dp0\o4w_env.bat" >nul 2>&1
@echo off

path %OSGEO4W_ROOT%\apps\qgis-ltr\bin;%PATH%
set QGIS_PREFIX_PATH=%OSGEO4W_ROOT:\=/%/apps/qgis-ltr
set GDAL_FILENAME_IS_UTF8=YES
set VSI_CACHE=TRUE
set VSI_CACHE_SIZE=1000000
set QT_PLUGIN_PATH=%OSGEO4W_ROOT%\apps\qgis-ltr\qtplugins;%OSGEO4W_ROOT%\apps\qt5\plugins
set PYTHONPATH=%OSGEO4W_ROOT%\apps\qgis-ltr\python;%PYTHONPATH%

REM Execute and capture only last line (JSON output)
set "last_line="
for /f "tokens=*" %%i in ('python %* 2^>nul') do (
    set "last_line=%%i"
)
echo !last_line!