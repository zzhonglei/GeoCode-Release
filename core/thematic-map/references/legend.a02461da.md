# Legend

## 1. Overview

**`ax.legend()` is not recommended for building thematic-map legends in any case.** It cannot embed a gradient color bar inside its border, cannot easily express multi-column or grouped layouts, and cannot mix standard entries with section sub-headings — all common requirements for thematic maps.

Use the helper module `legend_helpers.py` instead — it lets you quickly build legends that conform to thematic-map cartographic conventions. **First, copy** `legend_helpers.py` (located at `scripts/legend_helpers.py` in this skill) into the directory of your map-rendering script, then import:

```python
from legend_helpers import text_area, patch_entry, point_entry, line_entry, colorbar_entry, columns, make_panel
```

## 2. Drawing Each Legend Element

This section walks through how to draw each kind of legend element. For each one, pick the right helper, build the entry, and append it to your `rows` list. When all entries are ready, hand the list to `make_panel` (covered in §2.7) to assemble the panel and place it on the map.

> **Don't worry about how the helpers are implemented — just call them.**

### 2.1 Adding a title, subtitle, or plain text

When you want a text-only row — a legend title, a section heading, or a plain annotation — use `text_area`:

```python
text_area('Legend', size=12, weight='bold')                  # main title, when viewing Chinese maps, the legend can be displayed as "图例".
text_area('Land Cover', size=8, weight='bold')              # section heading
```

### 2.2 Adding a polygon entry

When you want to show an area-based feature in the legend — a study area, a land-cover category, a protected zone, a buffer — use `patch_entry`. All keyword arguments are forwarded to `matplotlib.patches.Rectangle` (`facecolor`, `edgecolor`, `linewidth`, `hatch`, `alpha`, ...).

```python
patch_entry('Study Area', facecolor='white', edgecolor='red', linewidth=1)
patch_entry('Forest', facecolor='#3fa040')
patch_entry('Protected', facecolor='white', edgecolor='red', hatch='//////')
```

> **Hatch density tip**: in the legend's 16×8-pixel patch, matplotlib's default `hatch='///'` looks sparse. Use `hatch='//////'` (≈6 chars) for a denser, more legible pattern.

### 2.3 Adding a point entry

When you want to show a point feature in the legend — a city, a sample site, a mountain peak, an airport — use `point_entry`. All keyword arguments are forwarded to `matplotlib.lines.Line2D` (`marker`, `markersize`, `markerfacecolor`, `markeredgecolor`, `markeredgewidth`, `alpha`, ...).

```python
point_entry('Capital', marker='*', markersize=14, markerfacecolor='gold')
point_entry('Major city', markersize=10)
point_entry('Sample site', markerfacecolor='none', markeredgecolor='red', markeredgewidth=1.2)
```

### 2.4 Adding a line entry

When you want to show a linear feature in the legend — a river, a boundary, a road, a trajectory — use `line_entry`. All keyword arguments are forwarded to `matplotlib.lines.Line2D` (`color`, `linewidth`, `linestyle`, `alpha`, ...).

```python
line_entry('Major river', color='#3f7fbf', linewidth=1.5)
line_entry('Province boundary', color='black', linestyle='--')
line_entry('Trail', color='brown', linestyle='-.')
```

> **Dash optimization**: when you pass `linestyle='--'` / `':'` / `'-.'` without an explicit `dashes` argument, `line_entry` auto-applies a compact `dashes` pattern so the dash sequence renders legibly inside the narrow icon area.

### 2.5 Adding a gradient colorbar entry

When you want to show the color scale of a **continuous raster** in the legend — elevation, temperature, an index — use `colorbar_entry`. Unlike the other entries, you don't pass a color: it reads the colormap and value range straight from the `im` object returned by `ax.imshow(...)`, so the bar always matches what's drawn on the map. Only the min and max values are labeled.

```python
im = ax.imshow(...)                                              # the continuous raster you drew (see raster-data.md)

colorbar_entry(im, label='Elevation (m)')                       # horizontal (default)
colorbar_entry(im, label='Temperature (°C)', orientation='vertical')
```

> **Don't use matplotlib's standalone `fig.colorbar`** — it floats at the figure edge, detached from the legend. `colorbar_entry` keeps the color scale inside the panel with every other entry.

### 2.6 Arranging entries in multiple columns

When your legend has many entries (typically 6+), stacking them all in one tall column wastes space. Use `columns` to split them side by side; each positional argument is a list of entries forming one column. The whole `columns(...)` call returns a single row you append to `rows` like any other entry.

```python
columns(
    [patch_entry('Forest',   facecolor='#3fa040'),
     patch_entry('Cropland', facecolor='#f4cf4a'),
     patch_entry('Water',    facecolor='#3f7fbf')],
    [patch_entry('Urban',     facecolor='#999999'),
     patch_entry('Grassland', facecolor='#bce072'),
     patch_entry('Bare land', facecolor='#d2b48c')],
)
```

### 2.7 Assembling and placing the panel

Once your `rows` list contains all the entries you want — in display order, top to bottom — call `make_panel` to stack them and anchor the panel to the map. The default position is the map's bottom-left corner.

To put the panel at another corner, pass `loc` and `bbox_to_anchor` together. `loc` says which corner of the panel itself is the anchor, and `bbox_to_anchor` says where that anchor sits on the map (in `ax.transAxes`, where `(0, 0)` is the map's bottom-left and `(1, 1)` is the top-right):

| Position on map     | `loc`           | `bbox_to_anchor` |
| ------------------- | --------------- | ---------------- |
| Bottom-left corner  | `'lower left'`  | `(0, 0)`         |
| Bottom-right corner | `'lower right'` | `(1, 0)`         |
| Top-left corner     | `'upper left'`  | `(0, 1)`         |
| Top-right corner    | `'upper right'` | `(1, 1)`         |

```python
make_panel(ax, rows)                                              # bottom-left (default)
make_panel(ax, rows, loc='lower right', bbox_to_anchor=(1, 0))    # bottom-right
make_panel(ax, rows, loc='upper left',  bbox_to_anchor=(0, 1))    # top-left
make_panel(ax, rows, loc='upper right', bbox_to_anchor=(1, 1))    # top-right
```

## 3. Complete Example

```python
rows = [
    text_area('Legend', size=12, weight='bold'),
    patch_entry('Study Area', facecolor='white', edgecolor='red', linewidth=1),

    text_area('Cities', size=8, weight='bold'),
    point_entry('Capital', marker='*', markersize=14, markerfacecolor='gold'),
    point_entry('Major city', markersize=10),

    text_area('Linear features', size=8, weight='bold'),
    line_entry('Major river', color='#3f7fbf', linewidth=1.5),
    line_entry('Boundary', color='black', linestyle='--'),

    text_area('Land Cover', size=8, weight='bold'),
    columns(
        [patch_entry('Forest',   facecolor='#3fa040'),
         patch_entry('Cropland', facecolor='#f4cf4a'),
         patch_entry('Water',    facecolor='#3f7fbf')],
        [patch_entry('Urban',     facecolor='#999999'),
         patch_entry('Grassland', facecolor='#bce072'),
         patch_entry('Bare land', facecolor='#d2b48c')],
    ),

    colorbar_entry(im, label='Elevation (m)'),   # im = ax.imshow(...) of the continuous raster
]
make_panel(ax, rows)
```
