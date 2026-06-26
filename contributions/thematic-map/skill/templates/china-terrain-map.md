# China Terrain (DEM) Map — Landscape Example

A complete end-to-end example: a landscape China terrain map built with `china_base`,
overlaying a DEM raster as hypsometric-tinted relief, finished with a legend (an embedded
horizontal color bar) and a scale bar. Replace the `sys.path`, the DEM path, and the font
with your own. The map labels are intentionally kept in Chinese (a China map's title/legend
are normally Chinese); everything else is English.

```python
import sys, os
sys.dont_write_bytecode = True                       # no __pycache__ / .pyc in the skill
sys.path.insert(0, "/absolute/path/to/this/skill/scripts")   # this skill's scripts/ dir

import cartopy.crs as ccrs
import rioxarray as rxr
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import frykit.plot as fplt
from china_base import create_china_map, draw_china
from legend_helpers import colorbar_entry, make_panel, text_area

plt.rcParams["font.family"] = ["Times New Roman", "Songti SC"]   # CJK font for the Chinese title
plt.rcParams["axes.unicode_minus"] = False
pc = ccrs.PlateCarree()

# --- DEM. This one is EPSG:4326 (WGS84), so transform = PlateCarree.
#     For a projected DEM, read da.rio.crs and build the matching cartopy projection instead. ---
dem = rxr.open_rasterio("/path/to/china_dem.tif", masked=True).squeeze()
arr = dem.values
left, bottom, right, top = dem.rio.bounds()

# Hypsometric tint: green lowland -> yellow -> brown highland -> white peak.
hyps = LinearSegmentedColormap.from_list("hyps", [
    "#2e8b57", "#7fb069", "#cfe09a", "#f3e79b",
    "#e0a96d", "#9c6b3f", "#6b4423", "#ffffff",
])
vmin, vmax = 0, 6500                                  # 0 m to 6500 m (peaks above show white)

# --- Base map (landscape: mainland + South China Sea inset) ---
fig, ax = create_china_map("landscape", dpi=800)

# --- Overlay the DEM via draw_china so the inset gets it too; capture the artist for the colorbar ---
ims = []
def paint(a):
    im = a.imshow(arr, extent=(left, right, bottom, top), transform=pc,
                  origin="upper", cmap=hyps, vmin=vmin, vmax=vmax,
                  interpolation="bilinear", zorder=10)
    ims.append(im)
draw_china(ax, paint)

# --- Legend: a horizontal elevation color bar inside a panel, lower-left ---
rows = [
    text_area("图例", size=11, weight="bold"),
    colorbar_entry(ims[0], label="高程 (m)", orientation="horizontal"),
]
make_panel(ax, rows, loc="lower left", bbox_to_anchor=(0.01, 0.06))

# --- Scale bar (GMT checkerboard), just below the legend ---
sb = fplt.add_scale_bar(ax, x=0.018, y=0.03, length=1000)
sb.set_xticks([0, 500, 1000])
fplt.add_frame(sb, linewidth=0.5)
for spine in sb.spines.values():
    spine.set_linewidth(0.5)
sb.tick_params(length=0, pad=4.5)
sb.set_xlabel("")
sb.text(1.02, 0, "km", transform=sb.transAxes, va="baseline", ha="left", fontsize="small")

ax.set_title("中国地形图", fontsize=18, fontweight="bold", pad=14)
fig.savefig("china_terrain.png", dpi=800, bbox_inches="tight")
```
