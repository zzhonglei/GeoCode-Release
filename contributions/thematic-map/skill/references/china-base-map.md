# China Base Map

`china_base.py` renders a **standards-compliant base map of the whole of China** in one
call — correct national boundary, nine-dash line, province boundaries, coastline,
maritime gradient, and (for the landscape layout) the South China Sea inset. Reach for it
whenever the study area is **all of China**, so you don't have to assemble these national
elements yourself.

> Not for sub-national / regional extents or non-China maps — use the general workflow
> (projection + `basemap_helpers` + your own layers) for those.

## 1. Importing the module

`china_base.py` lives in this skill's `scripts/` directory and reads its base-map data
(~6 MB) from the skill's `data/` directory **relative to its own location**. So do **NOT**
copy it into your working directory — that would break the data path. Instead, add the
skill's `scripts/` directory to `sys.path` and import it.

Set `sys.dont_write_bytecode = True` **before** importing (so it leaves no `__pycache__` in
the skill), then add this skill's `scripts/` directory to `sys.path` by its absolute path:

```python
import sys
sys.dont_write_bytecode = True                      # no __pycache__ / .pyc in the skill
sys.path.insert(0, "/absolute/path/to/this/skill/scripts")
from china_base import create_china_map, draw_china
```

(`basemap_helpers.py` is imported automatically as a dependency — you do not copy or import
it separately for this.)

## 2. Creating the base map

```python
fig, ax = create_china_map("landscape")             # standard 800-dpi China base map
```

`create_china_map(layout, *, basemap, land_fill, province, province_style, dpi)`:

| Argument | Meaning | Default |
| --- | --- | --- |
| `layout` | `"landscape"` (mainland + South China Sea inset) / `"portrait"` (mainland + South China Sea in one frame, no inset) | `"landscape"` |
| `basemap` | ocean basemap style: `"ocean"` (sea-floor terrain) / `"imagery"` (satellite) / `"relief"` / `None` (no basemap) | `"ocean"` |
| `land_fill` | `None` = native land from the basemap (has terrain texture); a color such as `"#f7f4ec"` = clean solid land — better when you overlay data on land | `None` |
| `province` | whether to draw province boundaries | `True` |
| `province_style` | dict overriding the province style, e.g. `{"color": "#888", "linewidth": 0.5}` | `None` |
| `dpi` | output resolution | `800` |

Everything that is part of the national standard — projection (Albers), extent, national
boundary, nine-dash line, coastline, maritime gradient, graticule and ticks — is fixed.
You only choose the options above.

## 3. Overlaying your thematic data

Draw your data **exactly as the main workflow teaches** (`gdf.plot(...)` for vectors — see
vector-data.md; `imshow(...)` for rasters — see raster-data.md), with one change: the
landscape layout has a South China Sea inset, so every overlay must go onto **both** the
main axes and the inset. Wrap it in `draw_china(ax, paint)` and draw on the callback's axes
`a` instead of `ax`; `draw_china` runs your callback on the main axes and the inset
(portrait has no inset, so it just draws once).

> **Always wrap landscape overlays in `draw_china`.** A plain `gdf.plot(ax=ax, ...)` fills
> only the main axes and leaves the South China Sea inset blank.

Vector — the same `gdf.plot(...)` as the main workflow, just on `a`. **Fill only, no edges**
(`edgecolor="none"`): the base map already draws the province boundaries, national boundary,
coastline and nine-dash line, so drawing your own would double them up or misalign them.

```python
import cartopy.crs as ccrs

draw_china(ax, lambda a: gdf.plot(ax=a, column="value", cmap=cmap, norm=norm,
                                  edgecolor="none",
                                  transform=ccrs.PlateCarree(), zorder=10))
```

Raster, or any multi-step rendering — use a `def`:

```python
def paint(a):
    a.imshow(arr, extent=(left, right, bottom, top), transform=ccrs.PlateCarree(),
             origin="upper", cmap="viridis", vmin=vmin, vmax=vmax, zorder=10)
draw_china(ax, paint)
```

- **zorder**: the base map's boundary lines sit at zorder ~20 and the maritime gradient at
  ~25, so thematic data at a normal zorder (e.g. `10`) stays **below** them — the
  province / national lines sit on top of your fills (this is why your fills carry no
  edges). Use a zorder above ~21 only if you deliberately want data drawn over the boundaries.

## 4. Title, legend, scale bar, north arrow

`create_china_map` builds only the base map. Add the rest the normal way (see the other
references) — it returns a regular Matplotlib `fig, ax`:

```python
ax.set_title("China - ...", fontsize=16, fontweight="bold", pad=12)   # title
# legend     -> legend_helpers.py (legend.md)
# scale bar  -> scale-bar-and-north-arrow.md
fig.savefig("china.png", bbox_inches="tight")
```

> Convention for a whole-China map: a **north arrow is usually unnecessary** — the graticule
> already indicates orientation. A **scale bar is optional** — add one only when needed.
