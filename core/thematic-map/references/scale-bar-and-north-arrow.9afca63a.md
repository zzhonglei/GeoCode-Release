# Scale Bar and North Arrow

Both the scale bar and the north arrow come from `frykit`. They share the same usage pattern: pick a position in Axes coordinates (0–1 range), set a size, and place the element in a free corner of the map.

## North Arrow

`fplt.add_compass` offers three built-in styles. All styles automatically include the **"N"** label above the compass, and on a `GeoAxes` the arrow auto-rotates to true north based on its position.

```python
import frykit.plot as fplt

fplt.add_compass(ax, x=0.94, y=0.86, size=20, style="arrow")    # black/white dual-color arrow (default)
fplt.add_compass(ax, x=0.94, y=0.86, size=20, style="star")     # four-pointed star compass
fplt.add_compass(ax, x=0.94, y=0.86, size=20, style="circle")   # arrow with a surrounding ring
```

| `style`  | Look                                                               |
| -------- | ------------------------------------------------------------------ |
| `arrow`  | Classic black/white dual-color arrow — clean and elegant (default) |
| `star`   | Four-directional star compass — suitable for more decorative maps  |
| `circle` | Arrow with a central ring — resembling a traditional compass rose  |

If you want to hide the **"N"** label, pass `text_kwargs={"visible": False}`:

```python
fplt.add_compass(ax, x=0.94, y=0.86, size=20, style="arrow", text_kwargs={"visible": False})
```

## Scale Bar

`fplt.add_scale_bar` returns a `ScaleBar` object (a matplotlib `Axes` subclass), so its appearance is customised by calling normal `Axes` methods on it. The unit is set via `units="km"` (default) or `units="m"`. Two recommended styles:

### Style 1: Default

```python
import frykit.plot as fplt

sb = fplt.add_scale_bar(ax, x=0.75, y=0.05, length=1000)
sb.set_xticks([0, 500, 1000])
sb.set_xticklabels(["0", "500", "1000 km"])
sb.set_xlabel("")
```

A simple bar with tick marks at each labeled position; the unit (`km`) is merged into the last tick.

### Style 2: GMT Checkerboard

```python
import frykit.plot as fplt

sb = fplt.add_scale_bar(ax, x=0.75, y=0.05, length=1000)
sb.set_xticks([0, 250, 500, 1000])
fplt.add_frame(sb, linewidth=0.5)
for spine in sb.spines.values():
    spine.set_linewidth(0.5)  # match the frame width so all four edges look uniform
sb.tick_params(length=0, pad=4.5)
sb.set_xlabel("")
sb.text(1.02, 0, "km", transform=sb.transAxes,  # 'km' to the right of the bar, baseline aligned with bar bottom
        va="baseline", ha="left", fontsize="small")
```

Classic cartographic-atlas style with alternating black-and-white segments — the standard look in published map atlases. **Recommended for most thematic maps.**
