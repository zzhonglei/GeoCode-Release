---
name: gee-scripting
description: "GEE scripting and remote sensing analysis workflow guide. Read this skill when the task involves Google Earth Engine.When analyzing a study area with defined boundaries, always prepare a local boundary vector file in advance (e.g., .shp, .geojson). Do NOT use GEE's built-in boundary datasets, and do NOT produce the final boundary file within GEE."
---

This skill is a built-in skill for GeoAgent. Follow these guidelines when writing and executing GEE scripts — they will help you avoid the most common failure scenarios and write efficient, reliable scripts.

# GEE Scripting Workflow Guide

All GEE scripts must be executed using the RunGeeScript tool. When performing GEE operations, you MUST strictly follow this skill and read the document `references/image-composite.md`(first 600 lines).

---

## 1. Script Mode Selection

RunGeeScript provides two execution modes:

**Inline mode** (`script` parameter) — suitable for quick queries and simple one-off operations: querying image bands, collection size, date ranges; single-step computations and quick validations.

**File mode** (`script_path` parameter) — suitable for multi-step tasks: data filtering → processing → analysis → export pipelines; complex scripts requiring iterative debugging; scripts worth preserving for the user.

---

## 2. Script Writing Standards

### Standard Script Structure

```python
# 1. Imports
from geocode import init_gee, load_region, download_image, check_coverage, heartbeat
import ee

# 2. Initialization (must be the first step)
init_gee("project-id")

# 3. Define study area
roi = load_region("/path/to/boundary.shp").geometry()

# 4. Data retrieval and processing (wrap each slow operation with heartbeat)
with heartbeat("Filtering collection"):
    ... read: references/image-composite.md ...

# 5. Compositing
with heartbeat("Computing composite"):
    composite = ......

# 6. Quality check — decide whether to proceed or adjust parameters
report = check_coverage(composite, roi)

# 7. Output
download_image(composite, "/path/to/output.tif", roi, scale=10)
```

### Heartbeat Usage Rules

**When in doubt, wrap it.** Any operation involving GEE server-side computation should be wrapped — because you cannot accurately predict server-side execution time, and a single missed heartbeat could cause the script to be unexpectedly terminated.

Common operations that must be wrapped: `.getInfo()`, `reduceRegion()`/`reduceRegions()`, `classify()`, `train()`, `download_image()`/`export_image()`.

```python
# heartbeat wraps slow operations, outputting status every 30 seconds to keep the process alive
with heartbeat("Computing NDVI statistics"):
    stats = ndvi.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=roi, scale=30, maxPixels=1e9
    ).getInfo()
print(f"NDVI mean: {stats['NDVI_mean']:.4f}")
```

The equivalent code without heartbeat could silently wait 2-3 minutes on large regions before being terminated by timeout.

When chaining operations, use a separate heartbeat for each stage, and print stage results between heartbeat blocks. This both keeps the process alive and lets the user track progress.

### Print Output Standards

Good output habits help the user understand what the script is doing and where it's at:

- Print a description and key parameters at the start of the task (study area, time range, etc.)
- Print stage results after each stage completes
- Structure the final results clearly
- Use `flush=True` to ensure immediate visibility

---

## 3. geocode Module Practical Notes

The tool description already lists the complete API signatures for the geocode module. Here are supplementary notes on key practical considerations.

### init_gee(project_id)

The first step in every script. `project_id` is the user's GEE Cloud Project ID — if unknown, ask the user to confirm.

### load_region(file_path)

Uploads a local vector file (.shp, .geojson) as an `ee.FeatureCollection`.

Process the boundary files locally before uploading them to GEE; do not process the boundary files on GEE!

Prefer this function for loading study area boundaries over GEE's built-in boundary datasets (e.g., FAO/GAUL, USDOS/LSIB). Local files are more precise and user-controlled, and built-in datasets' administrative boundaries may not match the user's specific needs.

The return value is an `ee.FeatureCollection` — you typically need `.geometry()` to get the boundary for `filterBounds()` and `clip()`. Uploading large vector files may be slow; the function has built-in heartbeat.

### check_coverage(image, roi)

Call after compositing, before downloading. If coverage is insufficient, adjust parameters (expand date range, relax cloud threshold) or fill gaps with `unmask()` before proceeding to download.

### download_image vs export_image

`download_image` is preferred — it downloads directly to a local GeoTIFF without Google Drive as an intermediary. It uses geemap chunked downloading, writing to a temporary file first then atomically moving it, so incomplete files are never produced.

`export_image` is for scenarios where `download_image` cannot handle the job: images covering extremely large areas (e.g., nationwide at 10m resolution), download timeouts, or batch large-file exports. The trade-off is that the user must manually download from Drive.

Key considerations for download_image parameters:

| Parameter | Key Points                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `scale`   | Match source data resolution (Sentinel-2: 10, Landsat: 30, MODIS: 250/500/1000). Too small → huge files or limits exceeded |
| `crs`     | Default EPSG:4326. For projected coordinate systems, refer to the projection-selection skill                               |
| `dtype`   | Use `"uint8"` or `"int16"` for classification results to reduce file size; `"float32"` for continuous values               |

---

## Knowledge Index

Read the corresponding reference document based on the current task type:

- **Image filtering, cloud masking, and compositing** → `references/image-composite.md`->**Recommended reading**
- **Classification and clustering** → `references/classification.md`
- **Change detection** → `references/change-detection.md`

## Templates

- **Single-date image selection** (user needs a real observation from one date, not a composite) → `templates/single-date-image.md`
