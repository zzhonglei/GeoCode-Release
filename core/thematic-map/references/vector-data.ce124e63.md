# Vector Data

The core of vector data display on a thematic map is filling polygons with the right colors and labeling them by name — points and lines render with straightforward `gdf.plot()` defaults and need no special guidance.

## 1. Filling Polygons with Color

Two ways `gdf.plot()` colors polygons on a cartopy `GeoAxes`:

### 1.1 By attribute value (`column=`)

GeoPandas maps the values of one column through a `cmap` + `norm`. Use this whenever the color encodes a numeric attribute (population, GDP, value index, etc.):

```python
import cartopy.crs as ccrs
from matplotlib.colors import ListedColormap, BoundaryNorm

bounds = [...]                                               # K+1 edges; choose by §2
class_colors = [...]                                         # K hex colors; choose by §3
cmap = ListedColormap(class_colors)
norm = BoundaryNorm(boundaries=bounds, ncolors=len(class_colors))

gdf.plot(
    ax=ax,
    column='attr_name',                                      # attribute column to color by
    cmap=cmap, norm=norm,
    edgecolor='black', linewidth=0.3,                        # polygon outline
    transform=ccrs.PlateCarree(),                            # set to match the vector's CRS
)
```

### 1.2 By direct per-row color (`color=`)

For categorical attributes (zones, land-use types, etc.), build a `{category: hex}` mapping and assign one color per row — no `cmap` / `norm` needed:

```python
cat_to_color = {'East': '#e41a1c', 'West': '#377eb8', ...}
gdf['_color'] = gdf['zone'].map(cat_to_color)

gdf.plot(
    ax=ax,
    color=gdf['_color'],
    edgecolor='black', linewidth=0.3,
    transform=ccrs.PlateCarree(),                            # set to match the vector's CRS
)
```

## 2. Choosing bin edges

Four standard classification methods (Jenks needs `pip install mapclassify`). All operate on `values = gdf['attr_name'].values`:

| Method | Code | Use when | Fails when |
| --- | --- | --- | --- |
| **Manual** (自定义阈值) | hand-pick K+1 edges | discipline has standard cut points | — |
| **Equal Interval** (等间距) | `np.linspace(values.min(), values.max(), K+1)` | data is roughly uniform | skewed data — most polygons collapse to one class |
| **Quantile** (分位数) | `np.nanquantile(values, np.linspace(0, 1, K+1))` | equal polygon count per class | absolute thresholds matter (ignores semantic cut points) |
| **Natural Breaks** (自然断点) | `np.r_[values.min(), mapclassify.NaturalBreaks(values, k=K).bins]` | no domain cut points; let data drive | — |

## 3. Choosing class colors

Tools you can use to obtain `class_colors`:

- **matplotlib built-ins** — discretize any cmap to K colors:

  ```python
  plt.get_cmap('YlOrBr')(np.linspace(0.1, 0.9, K))    # sequential discretized
  plt.get_cmap('Set2')(np.arange(K))                  # qualitative
  ```

- **`palettable`** (`pip install palettable`) — ColorBrewer K-optimized variants, cartocolors, tableau, etc.:

  ```python
  from palettable.colorbrewer.qualitative import Set1_5
  class_colors = Set1_5.hex_colors
  ```

- **`cmcrameri`** — scientific palettes; discretize a sequential like `cmc.batlowK` (same syntax as matplotlib built-ins).
- **Custom** — hand-pick K hex codes if a specific design is required.

## 4. Labeling Polygons by Name

Need to write polygon names on the map (one label per polygon, placed at its center)? **DO NOT write Python code to compute label positions yourself** — methods like `gdf.geometry.centroid` or `representative_point()` often fall outside the polygon (concave shapes, multi-polygons with detached islands) or sit in visually wrong spots.

Use a QGIS algorithm instead:

- **`native:centroids`** — geometric centroid; fine for convex shapes
- **`native:pointonsurface`** — always lands inside the polygon; safer default for irregular shapes