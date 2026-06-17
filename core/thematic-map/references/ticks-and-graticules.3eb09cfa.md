# Ticks and Graticules

Ticks, labels, and graticules turn a bare canvas into a readable map — they tell the viewer the latitude and longitude of any point on sight. This reference covers:

- **`set_map_ticks`** (frykit) — set lat/lon ticks and formatted labels in one line
- **`ax.gridlines`** (Cartopy) — draw graticule lines across the map interior
- **The map frame** — the border around the map edge: a plain black frame by default, or an optional GMT-style checkerboard

All of these work on a GeoAxes that already has its extent and projection set up.

## Ticks and Labels with `set_map_ticks`

frykit's `set_map_ticks` configures the GeoAxes' tick positions, intervals, and lat/lon formatted labels in one call. It replaces several lines of native Cartopy boilerplate.

```python
import frykit.plot as fplt

# Set ticks every 10 degrees along both axes
fplt.set_map_ticks(ax, extents=extent, dx=10, dy=10)
```

Key parameters:

- `extents` — the map extent `[lon_min, lon_max, lat_min, lat_max]`. Pass the same value you used in `set_extent`.
- `dx` / `dy` — the longitude / latitude tick interval, in degrees. `10` is a good default for country-level maps; use `5` or `2` for province-level, `1` or smaller for city-level.
- `mx` / `my` — number of **minor** ticks between each pair of major ticks. Set `mx=1, my=1` if you plan to add a GMT-style frame (the frame uses minor ticks to draw the checkerboard segments).

`set_map_ticks` automatically applies `LongitudeFormatter` and `LatitudeFormatter`, so tick labels read as `120°E`, `30°N` rather than raw numbers.

For finer style control (label size, tick length, tick direction, etc.), use Matplotlib's native `ax.tick_params(...)` after `set_map_ticks`:

```python
ax.tick_params(which="major", labelsize=10, length=5, direction="in")
ax.tick_params(which="minor", length=3, direction="in")
```

## Gridlines (Graticules Inside the Map)

Gridlines are the lat/lon lines drawn **across the map interior** (not just along the edge as ticks). They give the viewer a spatial reference at every point. Use Cartopy's native `ax.gridlines(...)`:

```python
ax.gridlines(
    xlocs=range(70, 141, 10),
    ylocs=range(10, 61, 10),
    linewidth=0.5,
    linestyle="--",
    color="gray",
    alpha=0.5,
)
```

Key parameters:

- `xlocs` / `ylocs` — longitude / latitude positions to draw. Usually match the tick positions from `set_map_ticks`.
- `linewidth` — keep it light (`0.4` – `0.6`). Heavy gridlines distract from the data.
- `linestyle` — `"--"` (dashed) is the most common; solid lines compete with the data.
- `color` — `"gray"` or `"lightgray"`. Avoid black.
- `alpha` — `0.3` – `0.6`. Keeps the lines subtle.

**Gridlines are optional.** Skip them for maps with a busy data layer (dense raster, many vector features) — they would only add visual clutter.

## The Map Frame

### Plain black frame (default — use this for most maps)

The border drawn around the map edge is the **plain black frame by default** — you don't need to do anything to get it. `set_map_ticks` plus the default axes spines already give a clean black border that works with **any projection**. Optionally adjust its thickness:

```python
for spine in ax.spines.values():
    spine.set_linewidth(0.8)
```

This is the right choice for the great majority of thematic maps.

### GMT-style checkerboard frame (optional)

An alternative border style that replaces the plain spines with a black-and-white checkerboard pattern. It's purely a stylistic option — reach for it only when you specifically want that look.

```python
# Required: configure minor ticks first
fplt.set_map_ticks(ax, extents=extent, dx=10, dy=10, mx=1, my=1)

# Then add the frame
fplt.add_frame(ax, width=5)  # `width` is in points (pt)
```

- `width` — frame thickness in points (`4` – `6` for most maps).
- `edgecolor` / `facecolor` — e.g. `facecolor=["navy", "white"]` for a navy/white pattern.
- Requires minor ticks (`mx`, `my`) on `set_map_ticks`.
