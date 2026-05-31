# Raster Data

## 1. Rendering a Continuous Raster

```python
import numpy as np
import cartopy.crs as ccrs
import rioxarray as rxr

da = rxr.open_rasterio("path/to/raster.tif", masked=True).squeeze()

arr = da.values
vmin, vmax = np.nanpercentile(arr, [2, 98])                  # 2–98% percentile clip — matches QGIS / ArcGIS default stretch
left, bottom, right, top = da.rio.bounds()

im = ax.imshow(
    arr,
    extent=(left, right, bottom, top),
    transform=ccrs.PlateCarree(),                            # the raster's CRS as a cartopy projection object (not da.rio.crs)
    origin="upper",
    cmap="viridis",                                          # adjustable: see §2
    vmin=vmin, vmax=vmax,
    interpolation="bilinear",
)
```

Rules every continuous-raster call must follow:

| Rule                                           | Why                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `masked=True`                                  | nodata → NaN; otherwise nodata pollutes the colormap                       |
| `vmin / vmax = np.nanpercentile(arr, [2, 98])` | raw `min` / `max` lets outliers stretch the cmap                           |
| `origin='upper'`                               | rioxarray returns rows top→bottom                                          |
| `interpolation='bilinear'`                     | smooth blending for continuous data (categorical uses `'nearest'`, see §3) |

## 2. Colormap Decisions

### 2.1 Classify your data first

| Data shape                            | Family         | Rule                                                  |
| ------------------------------------- | -------------- | ----------------------------------------------------- |
| Single-direction (low→high)           | **Sequential** | brightness scales monotonically with value            |
| Has a center point (anomalies, diffs) | **Diverging**  | `vmin / vmax` **must be symmetric** around the center |
| Periodic (angles, phases)             | **Cyclic**     | start and end colors match                            |

For diverging data, enforce symmetry:

```python
v = max(abs(np.nanmin(arr)), abs(np.nanmax(arr)))
vmin, vmax = -v, v
```

### 2.2 Where to pick a cmap

- **Default to matplotlib built-ins** ([gallery](https://matplotlib.org/stable/users/explain/colors/colormaps.html))
- **Need perceptual uniformity, colorblind-friendly, B&W-legible?** Use `cmcrameri` ([catalogue](https://www.fabiocrameri.ch/colourmaps/)):

  ```python
  # pip install cmcrameri
  from cmcrameri import cm as cmc

  ax.imshow(..., cmap=cmc.batlowK)        # Sequential
  ax.imshow(..., cmap=cmc.vik)            # Diverging
  ax.imshow(..., cmap=cmc.romaO)          # Cyclic
  ```

### 2.3 Custom cmap

```python
from matplotlib.colors import LinearSegmentedColormap

custom_cmap = LinearSegmentedColormap.from_list(
    "custom_cmap",
    [(0.00, "#ffffff"), (0.50, "#888888"), (1.00, "#000000")],
)
```

Each tuple is `(stop, hex)`, stops in `[0, 1]`.

## 3. Rendering a Categorical Raster

```python
import numpy as np
import cartopy.crs as ccrs
import rioxarray as rxr
from matplotlib.colors import ListedColormap, BoundaryNorm

da = rxr.open_rasterio("path/to/raster.tif", masked=True).squeeze()
arr = da.values
left, bottom, right, top = da.rio.bounds()

bounds = [...]                                               # K+1 edges; choose by §3.1
class_colors = [...]                                         # K hex colors; choose by §3.2
cmap = ListedColormap(class_colors)
norm = BoundaryNorm(boundaries=bounds, ncolors=len(class_colors))

im = ax.imshow(
    arr,
    extent=(left, right, bottom, top),
    transform=ccrs.PlateCarree(),                            # the raster's CRS as a cartopy projection object (not da.rio.crs)
    origin="upper",
    cmap=cmap, norm=norm,
    interpolation="nearest",                                 # NEVER use bilinear for categorical
)
```

Rules every categorical-raster call must follow:

| Rule                                                 | Why                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `interpolation='nearest'`                            | bilinear interpolates between class labels — produces fake intermediate colors |
| Legend via `patch_entry × N`, **not** `fig.colorbar` | colorbars imply continuity; classes need discrete swatches                     |

### 3.1 Choosing bin edges

Four standard classification methods (Jenks needs `pip install mapclassify`):

| Method                        | Code                                          | Use when                             | Fails when                                               |
| ----------------------------- | --------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| **Manual** (自定义阈值)       | hand-pick K+1 edges                           | discipline has standard cut points   | —                                                        |
| **Equal Interval** (等间距)   | `np.linspace(arr.min(), arr.max(), K+1)`      | data is roughly uniform              | skewed data — most pixels collapse to one class          |
| **Quantile** (分位数)         | `np.nanquantile(arr, np.linspace(0, 1, K+1))` | equal pixel count per class          | absolute thresholds matter (ignores semantic cut points) |
| **Natural Breaks** (自然断点) | `np.r_[arr.min(), mapclassify.NaturalBreaks(arr, k=K).bins]` | no domain cut points; let data drive | —                                                        |

### 3.2 Choosing class colors

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
