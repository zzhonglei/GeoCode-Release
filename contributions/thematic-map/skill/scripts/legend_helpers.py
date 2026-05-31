"""
Helper functions for building composite legend panels using matplotlib's
OffsetBox system.

Copy this file to your map-rendering script's directory and import the
helpers you need:

    from legend_helpers import text_area, ...

Each helper returns an OffsetBox child that can be appended to the `rows`
list passed to `make_panel(ax, rows, ...)`.
"""

from matplotlib.lines import Line2D
from matplotlib.offsetbox import (
    AnchoredOffsetbox, DrawingArea, HPacker, TextArea, VPacker,
)
from matplotlib.patches import Rectangle
from matplotlib.text import Text


# Fixed marker-icon size (in display pixels) — keeps every patch / point / line
# entry visually consistent across the legend.
_ICON_W = 20
_ICON_H = 12
_ICON_INSET = 2          # inner inset of the patch inside its DrawingArea
_ICON_LABEL_SEP = 1      # gap between icon and label


def text_area(text, size=8, weight="normal", style="normal", color="black"):
    """Create a text element for a legend title, subtitle, or plain annotation row.

    Parameters
    ----------
    text : str
        The text to display.
    size : int or float, default 8
        Font size in points.
    weight : str, default 'normal'
        Font weight: ``'normal'`` or ``'bold'``.
    style : str, default 'normal'
        Font style: ``'normal'`` or ``'italic'``.
    color : str, default 'black'
        Font color.

    Returns
    -------
    matplotlib.offsetbox.TextArea
        A self-sizing text container that can be added to a `make_panel` rows list.
    """
    return TextArea(text, textprops={
        "fontsize": size,
        "fontweight": weight,
        "fontstyle": style,
        "color": color,
    })


def patch_entry(label, label_size=8, **rect_kw):
    """Create a polygon (rectangle) legend entry.

    Used for any area-based feature: study areas, land-cover categories,
    protected zones (with hatching), buffer zones, etc.

    Parameters
    ----------
    label : str
        Text label shown next to the patch.
    label_size : int or float, default 8
        Font size of the label, in points.
    **rect_kw
        Keyword arguments forwarded to ``matplotlib.patches.Rectangle``:
        ``facecolor`` / ``edgecolor`` / ``linewidth`` / ``hatch`` / ``alpha``
        and any other valid Rectangle keyword.

        Defaults applied if not provided:
            - ``facecolor='white'``
            - ``edgecolor='black'``
            - ``linewidth=0.5``

    Returns
    -------
    matplotlib.offsetbox.HPacker
        A row containing a fixed-size patch and a label, ready to be added
        to a `make_panel` rows list.
    """
    rect_kw.setdefault("facecolor", "white")
    rect_kw.setdefault("edgecolor", "black")
    rect_kw.setdefault("linewidth", 0.5)

    da = DrawingArea(_ICON_W, _ICON_H, 0, 0)
    da.add_artist(Rectangle(
        (_ICON_INSET, _ICON_INSET),
        _ICON_W - 2 * _ICON_INSET,
        _ICON_H - 2 * _ICON_INSET,
        **rect_kw,
    ))
    return HPacker(
        children=[da, text_area(label, size=label_size)],
        align="center", pad=0, sep=_ICON_LABEL_SEP,
    )


def point_entry(label, label_size=8, **marker_kw):
    """Create a point legend entry (marker + label).

    Used for any point-like feature: cities, sample sites, mountain peaks,
    airports, capitals, etc.

    Parameters
    ----------
    label : str
        Text label shown next to the marker.
    label_size : int or float, default 8
        Font size of the label, in points.
    **marker_kw
        Keyword arguments forwarded to ``matplotlib.lines.Line2D`` for marker
        styling. Commonly used:

            - ``marker``: matplotlib marker character
                (``'o'`` / ``'s'`` / ``'^'`` / ``'*'`` / ``'D'`` / ``'P'`` / ``'X'`` / ...).
            - ``markersize``: marker size in points.
            - ``markerfacecolor`` (``mfc``): fill color; use ``'none'`` for hollow markers.
            - ``markeredgecolor`` (``mec``): edge color.
            - ``markeredgewidth`` (``mew``): edge line width.
            - ``alpha``: transparency.

        Defaults applied if not provided:
            - ``marker='o'``
            - ``markersize=8``
            - ``markerfacecolor='red'``
            - ``markeredgecolor='black'``
            - ``markeredgewidth=0.5``

        Note: ``linestyle='None'`` is forced internally so only the marker
        is drawn (no connecting line).

    Returns
    -------
    matplotlib.offsetbox.HPacker
        A row containing a fixed-size marker and a label, ready to be added
        to a `make_panel` rows list.
    """
    marker_kw.setdefault("marker", "o")
    marker_kw.setdefault("markersize", 8)
    marker_kw.setdefault("markerfacecolor", "red")
    marker_kw.setdefault("markeredgecolor", "black")
    marker_kw.setdefault("markeredgewidth", 0.5)
    marker_kw["linestyle"] = "None"  # only draw the marker, no line

    da = DrawingArea(_ICON_W, _ICON_H, 0, 0)
    da.add_artist(Line2D(
        [_ICON_W / 2], [_ICON_H / 2],
        **marker_kw,
    ))
    return HPacker(
        children=[da, text_area(label, size=label_size)],
        align="center", pad=0, sep=_ICON_LABEL_SEP,
    )


def line_entry(label, label_size=8, **line_kw):
    """Create a line legend entry (line segment + label).

    Used for any linear feature: rivers, roads, boundaries, trajectories,
    transects, etc.

    Parameters
    ----------
    label : str
        Text label shown next to the line segment.
    label_size : int or float, default 8
        Font size of the label, in points.
    **line_kw
        Keyword arguments forwarded to ``matplotlib.lines.Line2D`` for line
        styling. Commonly used:

            - ``color``: line color.
            - ``linewidth`` (``lw``): line thickness in points.
            - ``linestyle`` (``ls``): ``'-'`` / ``'--'`` / ``':'`` / ``'-.'``.
            - ``alpha``: transparency.

        Defaults applied if not provided:
            - ``color='blue'``
            - ``linewidth=1.0``
            - ``linestyle='-'``

        Small-size optimization: when ``linestyle`` is ``'--'`` / ``':'`` / ``'-.'``
        and ``dashes`` is not explicitly given, a compact ``dashes`` pattern
        is auto-applied so the dash sequence renders legibly inside the
        narrow 16-pixel icon area (avoids matplotlib's default dash pattern
        looking sparse at this size).

        Note: ``marker='None'`` is forced internally so only the line is drawn
        (no markers at the endpoints).

    Returns
    -------
    matplotlib.offsetbox.HPacker
        A row containing a fixed-size line segment and a label, ready to be
        added to a `make_panel` rows list.
    """
    line_kw.setdefault("color", "blue")
    line_kw.setdefault("linewidth", 1.0)
    line_kw.setdefault("linestyle", "-")
    line_kw["marker"] = "None"  # only draw the line, no marker

    # Compact dash patterns tuned for the 16px-wide icon area.
    ls = line_kw.get("linestyle")
    if "dashes" not in line_kw:
        if ls == "--":
            line_kw["dashes"] = (2, 2)
        elif ls == ":":
            line_kw["dashes"] = (0.5, 1)
        elif ls == "-.":
            line_kw["dashes"] = (3, 1, 0.5, 1)

    da = DrawingArea(_ICON_W, _ICON_H, 0, 0)
    da.add_artist(Line2D(
        [_ICON_INSET, _ICON_W - _ICON_INSET],
        [_ICON_H / 2, _ICON_H / 2],
        **line_kw,
    ))
    return HPacker(
        children=[da, text_area(label, size=label_size)],
        align="center", pad=0, sep=_ICON_LABEL_SEP,
    )


def columns(*entry_lists, sep=4):
    """Lay out multiple columns of entries side by side.

    Useful when a legend has many entries — stacking them in 2 (or more)
    columns saves vertical space and is a common atlas convention for
    classification categories (e.g. land-cover types).

    Parameters
    ----------
    *entry_lists : list of HPacker
        Each positional argument is a list of entries belonging to one
        column. Pass as many lists as you need columns.
    sep : int or float, default 4
        Horizontal separation between adjacent columns, in points.

    Returns
    -------
    matplotlib.offsetbox.HPacker
        A horizontal container of column VPackers. Add it as a single row
        to a `make_panel` rows list.

    Examples
    --------
    Two columns of land-cover categories::

        rows = [
            text_area('Land Cover', size=9, weight='bold'),
            columns(
                [patch_entry('Forest', facecolor='#3fa040'),
                    patch_entry('Cropland', facecolor='#f4cf4a'),
                    patch_entry('Water', facecolor='#3f7fbf')],
                    [patch_entry('Urban', facecolor='#999999'),
                    patch_entry('Grassland', facecolor='#bce072'),
                    patch_entry('Bare land', facecolor='#d2b48c')],
            ),
        ]
    """
    cols = [VPacker(children=entries, align="left", pad=0, sep=1)
            for entries in entry_lists]
    return HPacker(children=cols, align="top", pad=0, sep=sep)


# Fixed colorbar geometry (in display pixels).
_BAR_N = 256             # gradient segments — high enough to look smooth
_BAR_MARGIN = 6          # side padding so the centered end labels aren't clipped
_HBAR_W = 90             # horizontal bar: width
_HBAR_H = 10             # horizontal bar: height
_VBAR_W = 20             # vertical bar: width (height is 4:3 of this)
_VBAR_GAP = 3            # vertical bar: gap between bar and its end labels


def _fmt_end(v, span):
    """Format a colorbar end label with span-aware precision.

    Wide value ranges don't need decimals (they only make the label long and
    risk overflowing the bar); narrow ranges keep enough precision to be useful.
    """
    if span >= 10:
        return f"{v:.0f}"
    if span >= 1:
        return f"{v:.1f}"
    return f"{v:.2f}"


def colorbar_entry(im, label=None, label_size=8, orientation="horizontal"):
    """Create a gradient colorbar entry for a continuous raster.

    Use this to put the color scale of a continuous raster layer (rendered
    with ``ax.imshow(...)``) directly inside the legend panel, alongside the
    other entries. The colormap and value range are read automatically from
    the image, so they always match what is drawn on the map.

    Only the minimum and maximum values are labeled, each centered on its end
    of the bar.

    Parameters
    ----------
    im : matplotlib.cm.ScalarMappable
        The object returned by ``ax.imshow(...)`` (or any ScalarMappable). Its
        colormap and ``vmin`` / ``vmax`` define the bar's gradient and labels.
    label : str, optional
        Title shown above the bar (e.g. ``'Elevation (m)'``); always bold.
        Omitted if None.
    label_size : int or float, default 8
        Font size of the title, in points. The end-value labels are drawn one
        point smaller.
    orientation : str, default ``'horizontal'``
        ``'horizontal'`` draws a wide bar with min/max below its two ends;
        ``'vertical'`` draws a tall bar (min at the bottom, max at the top)
        with the values to its right.

    Returns
    -------
    matplotlib.offsetbox.DrawingArea or VPacker
        A legend row ready to be added to a `make_panel` rows list. Returns a
        plain DrawingArea when ``label`` is None, or a VPacker (title + bar)
        otherwise.
    """
    cmap = im.get_cmap()
    vmin, vmax = im.norm.vmin, im.norm.vmax
    end_label_size = label_size - 1
    span = abs(vmax - vmin)
    vmin_str, vmax_str = _fmt_end(vmin, span), _fmt_end(vmax, span)

    if orientation == "vertical":
        bar_w = _VBAR_W
        bar_h = bar_w * 4 / 3
        label_pad = end_label_size * 3.2          # room for the right-side labels
        da = DrawingArea(bar_w + _VBAR_GAP + label_pad, bar_h + _BAR_MARGIN, 0, 0)
        x0 = 0
        y0 = _BAR_MARGIN / 2

        # gradient: N thin rectangles, bottom (vmin) -> top (vmax)
        seg_h = bar_h / _BAR_N
        for i in range(_BAR_N):
            da.add_artist(Rectangle(
                (x0, y0 + i * seg_h), bar_w, seg_h + 0.6,
                facecolor=cmap(i / (_BAR_N - 1)), edgecolor="none",
            ))
        # frame
        da.add_artist(Rectangle((x0, y0), bar_w, bar_h, facecolor="none",
                                edgecolor="black", linewidth=0.5))
        # min / max labels on the right, centered on each end
        tx = x0 + bar_w + _VBAR_GAP
        da.add_artist(Text(tx, y0, vmin_str,
                           ha="left", va="center", fontsize=end_label_size))
        da.add_artist(Text(tx, y0 + bar_h, vmax_str,
                           ha="left", va="center", fontsize=end_label_size))
    else:
        bar_w, bar_h = _HBAR_W, _HBAR_H
        label_h = end_label_size + 4
        da = DrawingArea(bar_w + 2 * _BAR_MARGIN, bar_h + label_h, 0, 0)
        x0 = _BAR_MARGIN
        y0 = label_h

        # gradient: N thin rectangles spanning the colormap
        seg_w = bar_w / _BAR_N
        for i in range(_BAR_N):
            da.add_artist(Rectangle(
                (x0 + i * seg_w, y0), seg_w + 0.6, bar_h,
                facecolor=cmap(i / (_BAR_N - 1)), edgecolor="none",
            ))
        # frame
        da.add_artist(Rectangle((x0, y0), bar_w, bar_h, facecolor="none",
                                edgecolor="black", linewidth=0.5))
        # min / max labels, each centered on its end of the bar
        da.add_artist(Text(x0, y0 - 2, vmin_str,
                           ha="center", va="top", fontsize=end_label_size))
        da.add_artist(Text(x0 + bar_w, y0 - 2, vmax_str,
                           ha="center", va="top", fontsize=end_label_size))

    if label:
        return VPacker(children=[text_area(label, size=label_size, weight="bold"), da],
                       align="left", pad=0, sep=1)
    return da


def make_panel(ax, rows, loc="lower left", bbox_to_anchor=(0, 0), pad=3):
    """Assemble all entries into a legend panel and anchor it to the map.

    This is the final step of the legend workflow: pass the list of entries
    (built with `text_area`, `patch_entry`, `point_entry`, `line_entry`,
    `colorbar_entry`, and/or `columns`) and `make_panel` will stack them
    vertically, frame the panel, and place it at the requested corner of
    the map.

    Parameters
    ----------
    ax : matplotlib.axes.Axes
        The main map axes (the `ax` you draw your data on).
    rows : list
        Entry boxes returned by the entry helpers, in the order they should
        appear from top to bottom.
    loc : str, default ``'lower left'``
        Which corner of the panel itself serves as the anchor point.
        One of ``'lower left'`` / ``'lower right'`` / ``'upper left'`` /
        ``'upper right'``.
    bbox_to_anchor : tuple of float, default ``(0, 0)``
        Where to place the anchor in the map's ``transAxes`` coordinates
        (``(0, 0)`` = bottom-left of the map, ``(1, 1)`` = top-right).
    pad : int or float, default 3
        Padding inside the panel between the content and the panel edge.

    Returns
    -------
    matplotlib.offsetbox.AnchoredOffsetbox
        The anchored panel artist (already added to ``ax``). You normally
        do not need to interact with the returned object.

    Examples
    --------
    Minimal legend at the map's bottom-left corner::

        rows = [
            text_area('Legend', size=12, weight='bold'),
            patch_entry('Study Area', facecolor='white', edgecolor='red', linewidth=1),
            patch_entry('Forest', facecolor='#3fa040'),
        ]
        make_panel(ax, rows)

    Place the panel at the bottom-right corner instead::

        make_panel(ax, rows, loc='lower right', bbox_to_anchor=(1, 0))
    """
    panel = VPacker(children=rows, align="left", pad=pad, sep=1)
    anchored = AnchoredOffsetbox(
        loc=loc, child=panel,
        pad=0.0, borderpad=0.0,
        frameon=False,
        bbox_to_anchor=bbox_to_anchor,
        bbox_transform=ax.transAxes,
    )
    ax.add_artist(anchored)
    return anchored
