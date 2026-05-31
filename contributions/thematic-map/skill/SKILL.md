---
name: thematic-map
description: "Create well-designed maps that follow standard cartographic conventions. Use this skill when you need to create a map. If the map requires GIS or remote sensing data processing, complete all data preparation and processing steps BEFORE reading this skill. Only read this skill when the data is fully ready and you are about to begin composing the map."
---

# Thematic Map Creation Skill

This document is **GeoCode's official cartographic specification for thematic mapping**. As a GeoAgent, you MUST strictly follow every instruction in this document when producing any thematic map — no step may be skipped, abridged, or substituted with your own judgment.

**You cannot directly operate the QGIS graphical interface; all thematic maps must therefore be produced through Python code.**

## Runtime Environment and Dependencies

Before mapping, confirm whether the following dependencies are installed in the user's Python environment. **Do not install any library without asking the user first** — clarify their environment setup before deciding on the installation approach.

| Library        | Purpose                                                                       | Required |
| -------------- | ----------------------------------------------------------------------------- | -------- |
| Cartopy        | Map projections and geographic features                                       | Yes      |
| Matplotlib     | Plotting and visualization                                                    | Yes      |
| frykit\[data\] | Graticules, scale bars, north arrows, and other mapping utilities             | Yes      |
| GeoPandas      | Reading and processing vector data (.shp / .geojson / etc.)                   | Yes      |
| rioxarray      | Reading and processing raster data (.tif / GeoTIFF)                           | Yes      |
| mapclassify    | Data classification (Jenks Natural Breaks) for choropleths / categorical data | Optional |
| cmcrameri      | Perceptually-uniform, colorblind-friendly scientific colormaps                | Optional |
| palettable     | ColorBrewer and other ready-made color palettes                               | Optional |

The three **Optional** libraries are only needed when a reference explicitly calls for them (data classification, colormap / palette choices) — install them on demand, not upfront.

# Producing a Thematic Map

> This chapter walks you **step by step** through producing a **high-quality, standards-compliant** thematic map in Python. A thematic map combines several visual elements: a geographic frame (projection, extent, graticules), a data layer carrying the analytical content, context layers (boundaries, basemaps), and decorative elements (titles, legends, scale bars, north arrows).

## How to Work Through This Document

**One element at a time: read its reference, write its code, then move to the next. Never read all references up front. Never write the whole script in one pass.**

Reading everything first floods your context and leads to a rushed, broken script. Read a bit, write a bit.

**Run the script only once, after all the code is written — do NOT render the figure to check it after every element.**

## Commenting Conventions

The user reads, runs, and modifies every script you write — and well-placed comments are what make the script actually adjustable. Follow these commenting conventions in every script you produce.

- **Annotate every adjustable map element parameter** (title, legend, scale bar, colorbar, etc.) so the user knows exactly where to tweak the appearance.
- **Comment the purpose of each major step** in the script — what it does and why.

## Establishing the Geographic Frame

Every map starts with two decisions: **what region it shows** (the extent) and **how that region is projected onto the page**. Make both before drawing anything else — the rest of the map hinges on them.

1. **Find the data's lat/lon range.** Use the `ReadGeoData` tool to read the input file's bounds.
2. **Set the map extent** — slightly larger than the data's lat/lon range, leaving a small margin on each side.
3. **Choose a projection** that suits the extent and your cartographic purpose. The wrong choice silently distorts distances, areas, or angles, so think this one through. If you know which projection you want but aren't sure how to construct it in Cartopy, look it up in [`references/cartopy-projection.md`](references/cartopy-projection.md).

Every thematic map script opens with this scaffold — set the lon/lat bounds and projection parameters to match your map.

```python
import sys
sys.dont_write_bytecode = True  # keep the folder clean — don't generate __pycache__ / .pyc files

import cartopy.crs as ccrs
import matplotlib.pyplot as plt

plt.rcParams["font.family"] = ["Times New Roman", "SimSun", "Songti SC", "Noto Serif CJK SC"]  # default fonts: English + Chinese serif fallbacks
plt.rcParams["axes.unicode_minus"] = False

lon_min, lon_max, lat_min, lat_max = 73.5, 135.1, 18.1, 53.6  # data's lon/lat bounds from ReadGeoData — replace with your own
lon_pad, lat_pad = (lon_max - lon_min) * 0.10, (lat_max - lat_min) * 0.10  # pad each side by 10% so data isn't pressed against the frame
extent = [lon_min - lon_pad, lon_max + lon_pad, lat_min - lat_pad, lat_max + lat_pad]

map_proj = ccrs.AlbersEqualArea(central_longitude=110, standard_parallels=(25, 47))  # pick a projected CRS that suits your map's region and purpose

fig, ax = plt.subplots(figsize=(10, 8), dpi=800, subplot_kw={"projection": map_proj})  # create the figure with the chosen projection
ax.set_extent(extent, crs=ccrs.PlateCarree())
ax.set_title("Map Title", fontsize=16, fontweight="bold", pad=12)
```

## Reading Geographic Data

After the geographic frame is set, load the vector and raster data needed for this map using these two libraries.

```python
import geopandas as gpd
import rioxarray as rxr

gdf = gpd.read_file("path/to/your.shp")                  # vector (.shp / .geojson / .gpkg)
da = rxr.open_rasterio("path/to/your.tif", masked=True).squeeze()  # raster (.tif / GeoTIFF); masked=True → nodata becomes NaN, squeeze() drops the single-band axis
```

## Adding the Map Frame

After the geographic frame is set up, the next layer on the canvas is the map's frame — ticks, graticules, and (optionally) decorative edges that give spatial reference and a polished look.

Work through these elements:

1. **Add latitude/longitude ticks and labels** along the axes.
2. **(Optional) Add graticules** as light gridlines inside the map.
3. **(Optional) Apply a GMT-style checkerboard frame** for the map edges.

**Required reading**: read [`references/ticks-and-graticules.md`](references/ticks-and-graticules.md) **in full** before writing any code for this section. It covers the API choices, parameter recommendations, and common pitfalls for all three elements above.

## Adding a Basemap (Optional)

A basemap is mainly **decorative** — it adds land, oceans, terrain, or satellite texture behind the data. **Most thematic maps don't need one**; add one only when the visual context genuinely helps.

**If you add a basemap**: read [`references/basemap.md`](references/basemap.md) — it covers the two one-call helpers, `add_basemap` (raster tiles: ocean / imagery / relief) and `add_vector_basemap` (a clean Natural Earth vector backdrop), and how to choose between them.

## Adding the Study Area Boundary

Most thematic maps need to mark the boundary of the study area — it tells the reader exactly which region the map analyzes.

**Required reading**: read [`references/study-area-boundary.md`](references/study-area-boundary.md) **in full** before writing any code for this section. It covers the recommended methods, key parameters, and common pitfalls.

## Adding the Scale Bar and North Arrow

Scale bars and north arrows tell the reader two essential things — the map's distance scale and its orientation. Most thematic maps include both, usually placed together in a free corner of the map.

**Required reading**: read [`references/scale-bar-and-north-arrow.md`](references/scale-bar-and-north-arrow.md) **in full** before writing any code for this section. It covers the available styles and the corresponding code.

## Adding the Data Layers

The data layers carry the analytical content of the map. Thematic maps draw from two kinds of source data: **raster** (gridded fields like DEM, temperature, NDVI, classified rasters) and **vector** (points, lines, polygons from `.shp` / `.geojson` files).

**For raster layers**: read [`references/raster-data.md`](references/raster-data.md) **in full** before writing any code. It covers the rendering pipeline, colormap decisions for continuous data, and classification + class-color choices for categorical data.

**For vector layers**: read [`references/vector-data.md`](references/vector-data.md) **in full** before writing any code. It covers filling polygons by attribute value or category, the classification and class-color choices, and how to label polygons by name.

## Adding the Legend (Optional)

A legend lets readers decode the visual symbols used on the map — point markers, line styles, polygon fills, gradient color bars, and section labels. **Not every map needs a legend**, and even when one is included, only the data layers the user wants to highlight need their own entry (decorative basemaps, scale bars, and north arrows are usually omitted).

Before adding a legend, **confirm with the user**:

1. Is a legend needed for this map?
2. If yes, which visual features should appear as entries?

**If you add a legend**: read [`references/legend.md`](references/legend.md) — it covers the helper functions, how to draw each kind of legend element, and how to assemble and place the panel on the map.

## Adding Map Attribution (Optional)

Beyond the map's core elements, a thematic map often carries a line of **supplementary information** just below the frame — data source, cartographer, date, and the like. This is **optional**, and what it contains is entirely up to the user's needs; add it mainly when the map is a formal deliverable.

Place it at the lower-left, just below the map frame:

```python
ax.text(0.0, -0.05,                                                    # lower-left, just below the frame; nudge y if it overlaps the tick labels
        "Data source: SRTM 30 m DEM  |  Map by GeoAgent  |  2026-05",  # adjust the content to the user's needs
        transform=ax.transAxes, ha="left", va="top",
        fontsize=8, color="0.5")                                       # small, light grey — present but unobtrusive
```

# After the Map Is Drawn

Once the script runs and the figure is saved, finish with two steps.

## 1. Inspect the map yourself

**Open the saved image and look at it.** Check for obvious failures: garbled or overlapping text, a scale bar or north arrow off the canvas, data clipped by the frame, a colormap that hides the pattern, a legend covering the data. If you find a problem, fix the code and re-render — repeat until the map is clean.

_(If you cannot see images, skip this step and say so when you report.)_

## 2. Report to the user

Tell the user **how you made the map** — projection, extent, data layers, and which elements you added. Then give a **tunable-parameter list** so they can request changes:

> - **North arrow** — position `(0.94, 0.86)`, size `20`
> - **Scale bar** — position `(0.75, 0.05)`, length `1000 km`
> - **Title** — text `"..."`, font size `16`
> - ... _(one line per adjustable element actually in the map)_

End by inviting the user to adjust any of them.
