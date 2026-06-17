# Study Area Boundary

The study area boundary tells the reader exactly which region the map analyzes — it is one of the most important elements on a thematic map. Pick **one** of the two methods below depending on the map's purpose.

## Method 1: Simple Black Outline (fast, minimal)

**Best for**: maps where the data layer is the main visual focus and the boundary just needs to mark the study region without drawing extra attention. Quick, low-risk, no extra geometry math.

```python
# study_area: a GeoDataFrame holding the study-area boundary polygon(s).
# Obtain it however suits your data — load a boundary file, filter a larger
# vector by its actual attribute column, dissolve sub-units, etc.

# Draw the boundary outline
ax.add_geometries(study_area.geometry, crs=ccrs.PlateCarree(),  # crs = the vector's own CRS
                  facecolor="none", edgecolor="black", linewidth=1.0, zorder=5)
```

That's it — one filter + one `add_geometries` call. Tweak `linewidth` (0.8–1.5 pt) and `edgecolor` to taste.

## Method 2: Two-layer Purple Halo (polished atlas style)

**Best for**: maps where the study area is the central subject. The double halo makes the area visually pop against the basemap and clearly separates "inside" from "outside" — a polished look common in published cartographic atlases.

Filter, reproject to the map's CRS (so buffer distances are in meters), then paint two concentric buffer rings followed by a black outline:

```python
# study_area: a GeoDataFrame holding the study-area boundary polygon(s) —
# obtain it however suits your data (see Method 1's note).

# Reproject to the map's CRS so buffer distances are in meters
study_area_proj = study_area.to_crs(map_proj.proj4_init)
inner_proj = study_area_proj.geometry.union_all()

# Buffer distances — keep the inner:outer ratio at ≈ 3:5, and scale both to fit your study area (see guidance below)
buf_inner = inner_proj.buffer(600)    # adjust to your map's scale
buf_outer = inner_proj.buffer(1000)   # ≈ buf_inner * 5/3

# Outer ring (lighter purple)
ax.add_geometries([buf_outer.difference(buf_inner)], crs=map_proj,
                  facecolor="#e0d0eb", edgecolor="none", zorder=98)
# Inner ring (darker purple)
ax.add_geometries([buf_inner.difference(inner_proj)], crs=map_proj,
                  facecolor="#b8a0d0", edgecolor="none", zorder=99)
# Main boundary line on top (reuse the reprojected geometry — same CRS as the rings above)
ax.add_geometries(study_area_proj.geometry, crs=map_proj,
                  facecolor="none", edgecolor="black", linewidth=0.5, zorder=100)
```

### Buffer Distance: the 3:5 Convention

The two buffer distances are **not absolute values** — the right scale depends entirely on the geographic size of your study area, which varies enormously across countries and regions. **What you must keep constant is the ratio:**

> **Inner : Outer ≈ 3 : 5** — the inner ring should be roughly 60 % of the outer ring's distance.

For the absolute distances, judge by the rendered figure: the halo should be **visually proportional to the study area** — large enough to be noticed, small enough not to dominate the data. Start with an initial guess, render the map, then scale both buffers up or down together (preserving the 3:5 ratio) until the look is right.

### Caveats for Method 2

- **Buffer must be done in a projected CRS** (meters). The `to_crs(map_proj.proj4_init)` step above handles this — if you skip it, `buffer(600)` is interpreted as 600 _degrees_, which is wrong.
