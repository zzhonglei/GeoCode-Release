# Thematic Map

GeoCode's skill for producing **standards-compliant, publication-quality thematic maps** in
Python (Cartopy + Matplotlib + frykit). It turns a vague "make a map of this data" into a
guided, element-by-element workflow, so the agent follows cartographic conventions instead
of guessing at projections, colormaps, and layout.

## What it covers

A thematic map is built from several layers; the skill gives focused, verified guidance for
each one:

- **Geographic frame** — picking and constructing the right projection (37 Cartopy
  projections documented) and the map extent.
- **Map frame** — latitude/longitude ticks, graticules, and optional GMT-style edges.
- **Basemaps** — one-call raster tiles (ocean / satellite imagery / shaded relief) or a
  clean Natural Earth vector backdrop.
- **Data layers** — continuous and categorical rasters (percentile stretch, classification,
  colormap choice) and vector polygons / points / lines (attribute & categorical fills,
  labeling).
- **Legend** — composite panels combining swatches, markers, lines, and embedded color bars.
- **Scale bar, north arrow, attribution**, and a final self-check of the rendered figure.

The guidance is organized as a reverse index — *to do X, read Y* — and the agent reads and
writes one element at a time rather than dumping a whole script at once. Every code example
in the references has been run and verified.

## Built-in scene support

On top of the general workflow, the skill ships **ready-made helpers for specific mapping
scenarios**, so the agent doesn't have to reassemble fiddly, error-prone conventions every
time. The first one:

- **China base map** (`china_base`) — a single call renders a standards-compliant map of
  China (national boundary, nine-dash line, province boundaries, coastline, maritime
  gradient, and a South China Sea inset) in both landscape and portrait layouts; you then
  overlay your own thematic data on top, with the inset kept in sync automatically.

More scene-specific helpers — other regions and professional domains — will follow.

## Structure

```
thematic-map/
├── manifest/
│   ├── README.md          # this file
│   └── meta.json          # metadata (version, description, tags, ...)
└── skill/
    ├── SKILL.md           # core prompt: the map-making workflow (LLM-facing)
    ├── references/        # focused per-element guides, read on demand
    │   ├── cartopy-projection.md       # all 37 Cartopy projections
    │   ├── ticks-and-graticules.md     # ticks, graticules, map frame
    │   ├── basemap.md                  # ocean/imagery/relief tiles + vector backdrop
    │   ├── study-area-boundary.md      # study-area outline styles
    │   ├── scale-bar-and-north-arrow.md
    │   ├── raster-data.md              # continuous & categorical rasters
    │   ├── vector-data.md              # polygon / point / line rendering
    │   ├── legend.md                   # composite legend panels
    │   └── china-base-map.md           # China base-map helper
    ├── scripts/           # importable helpers
    │   ├── basemap_helpers.py          # add_basemap / add_vector_basemap
    │   ├── legend_helpers.py           # legend panel builders
    │   └── china_base.py               # create_china_map / draw_china
    ├── data/
    │   └── china_thematic_base_wgs84.gpkg   # China base-map vector data
    └── templates/
        └── china-terrain-map.md        # end-to-end DEM terrain example
```

- **`SKILL.md`** — the entry point: a reverse index that routes the agent to the right reference for each map element.
- **`references/`** — read one at a time, while that element is being drawn.
- **`scripts/`** — imported (not rewritten) for the heavier helpers.
- **`templates/`** — complete, runnable examples to adapt.

## Requirements

A Python environment with **Cartopy, Matplotlib, frykit[data], GeoPandas, and rioxarray**.
A few optional libraries (mapclassify, cmcrameri, palettable) are used on demand for data
classification and scientific colormaps.
