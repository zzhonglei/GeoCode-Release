# Basemap

## 1. Overview

A basemap is the visual context behind your data — pale land and sea, terrain, or a satellite photo. It is **decorative**: most thematic maps don't need one, and a busy basemap competes with your data. Add one only when the context genuinely helps the reader.

**Adding a basemap never changes your map projection.** Keep the projection you set when establishing the geographic frame (Albers, Lambert, etc.); the basemap is reprojected onto your canvas automatically, exactly as QGIS does.

There are two kinds of basemap, each a single call from the helper module `basemap_helpers.py`:

| Function | Source | Best for |
| --- | --- | --- |
| `add_basemap(ax)` | Raster tiles (downloaded) | Terrain or satellite texture; works at any scale |
| `add_vector_basemap(ax)` | Vector data (Natural Earth, local) | A clean, uncluttered backdrop for national / regional maps |

**First, copy** `basemap_helpers.py` (located at `scripts/basemap_helpers.py` in this skill) into the directory of your map-rendering script, then import whichever you need:

```python
from basemap_helpers import add_basemap          # raster tiles
from basemap_helpers import add_vector_basemap   # vector
```

> **Don't worry about how the helpers are implemented — just call them.**

**The basemap must sit *under* your data.** Both helpers draw at `zorder=0` by default, so give every data layer, boundary, and annotation you add afterwards a higher zorder (e.g. `zorder=10`) — otherwise the basemap covers them.

## 2. Raster Basemap — `add_basemap`

Downloads map tiles and draws them under your data. One call, everything derived from the axes you already set up:

```python
add_basemap(ax)                        # default "ocean" style
```

It automatically picks the tile zoom that matches your map's display scale, reprojects the tiles onto your canvas at full output resolution, and caches tiles on disk so later runs are fast. **You don't pass extent, figsize, dpi, or zoom — it reads them from `ax`.**

### 2.1 Choosing a style

Pass `style=` to pick the tile source:

```python
add_basemap(ax)                        # 'ocean'   — pale land + light blue sea (default)
add_basemap(ax, style="imagery")       # 'imagery' — true-color satellite photo
add_basemap(ax, style="relief")        # 'relief'  — terrain hillshade
```

| `style` | Look | Use when |
| --- | --- | --- |
| `'ocean'` *(default)* | Pale land + light blue sea | Most thematic maps — light enough that your data reads clearly on top |
| `'imagery'` | True-color satellite photo | You want real ground texture (also the right choice at city scale, where vector and ocean run out of detail — note it pulls many tiles and renders slower there) |
| `'relief'` | Terrain hillshade | Terrain itself is the backdrop theme |

### 2.2 Adjusting the detail level

The auto-chosen zoom suits most maps. When a particular map wants a little more or less texture, nudge it with `detail_level` — a **relative** offset, not an absolute zoom:

```python
add_basemap(ax)                        # auto zoom
add_basemap(ax, detail_level=+1)       # one level finer (more texture)
add_basemap(ax, detail_level=-1)       # one level coarser (cleaner, sparser)
```

A coarser level reads cleaner under dense data; a finer level shows more terrain/coastline detail but can look busy. Change it by one level at a time and re-render.

### 2.3 Keeping the basemap under your data

`add_basemap` draws at `zorder=0`. Give every layer you draw afterwards a higher zorder:

```python
add_basemap(ax)                                          # zorder 0 (bottom)
ax.imshow(..., zorder=10)                                # raster data on top
gdf.plot(ax=ax, ..., zorder=10)                          # vector data on top
```

### 2.4 Other parameters

You rarely need these, but they exist for full control:

- `zoom=` — force a specific tile zoom. Honoured exactly: it bypasses both the automatic scale match and the probe below.
- `probe=` (default `True`) — applies only to the automatic zoom. Before drawing, the helper checks whether the chosen zoom actually has real data for this region and steps down if the source only returns "data not yet available" placeholder tiles (a source's true detail ceiling varies by region). Set `probe=False` to skip this network check when you already know the zoom is safe.
- `zorder=` — change the drawing layer (default `0`).

## 3. Vector Basemap — `add_vector_basemap`

Draws a clean backdrop from Natural Earth **vector** data — sea and land fill, coastlines, rivers, and lakes — instead of raster tiles. Because it's vector, it stays crisp at any export resolution and needs no tile download:

```python
add_vector_basemap(ax)                 # sea/land fill + coastline + rivers + lakes
```

Reach for this when you want a **light, uncluttered reference backdrop** rather than terrain or photographic texture — it's the cleaner choice for national and regional maps.

> **Scope limit — not for city scale.** Natural Earth is small-scale data: no streets, no built-up areas, no local detail. A vector basemap looks nearly empty once you zoom into a city. For city-scale maps use `add_basemap(ax, style="imagery")` instead.

### 3.1 Choosing which features to draw

The sea/land fill is always drawn (it's the backdrop). Coastline, rivers, and lakes are on by default; turn any off, or turn country borders on:

```python
add_vector_basemap(ax)                       # coastline + rivers + lakes (default)
add_vector_basemap(ax, rivers=False)         # drop the rivers
add_vector_basemap(ax, lakes=False, rivers=False)  # coastline only — minimal
add_vector_basemap(ax, borders=True)         # add country borders
```

Borders are off by default — border depiction is often contested, and many thematic maps draw their own study-area boundary instead (see study-area-boundary.md).

### 3.2 Choosing the resolution

`scale` selects the Natural Earth detail level. Left as `None` it's picked automatically from the map's span — `'50m'` for national / regional maps, `'10m'` once you zoom into a province or smaller. Override it when you want to force a level:

```python
add_vector_basemap(ax)                        # auto: 50m for a country, 10m for a province
add_vector_basemap(ax, scale="10m")           # force the finest level
add_vector_basemap(ax, scale="50m")           # force the medium level
```

Only `'10m'` and `'50m'` are offered: the coarser `'110m'` set renders visibly faceted coastlines even at national scale, so it's deliberately not used.

### 3.3 Keeping the basemap under your data

Like the raster version, it draws at `zorder=0` (fills at `zorder`, the line features just above). Give your data layers a higher zorder so they sit on top:

```python
add_vector_basemap(ax)                                   # zorder 0 (bottom)
gdf.plot(ax=ax, ..., zorder=10)                          # data on top
```

`add_vector_basemap` returns the resolution string it actually used (e.g. `"50m"`), in case you want to log or reuse it.

## 4. Caveat

**Missing patches in a raster basemap mean an unstable network, not a bug — just rerun.** Tiles are cached on disk as they download, so a second run reuses what arrived and fetches only the gaps. (This applies to `add_basemap` only; `add_vector_basemap` uses local data and isn't affected.)
