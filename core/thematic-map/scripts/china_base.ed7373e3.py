"""
china_base.py - one-call renderer for the standard China base map.

Usage:
    from china_base import create_china_map, draw_china

    fig, ax = create_china_map("landscape")          # (fig, ax) with the base map ready
    draw_china(ax, lambda a: a.add_geometries(...))  # overlay thematic data (auto-syncs the inset)
    ax.set_title("...")                              # title etc. via standard matplotlib
    fig.savefig("china.png", bbox_inches="tight")

create_china_map only handles the standard China base map (projection / extent / national
boundary / nine-dash line / maritime gradient / South China Sea inset). Title, legend,
scale bar, north arrow and other generic elements are left to the skill's main workflow.

Depends on basemap_helpers.py (ocean basemap) in the same directory and the base-map data
under ../data/.
"""
import os

import cartopy.crs as ccrs
import cartopy.feature as cfeature
import geopandas as gpd
import matplotlib.pyplot as plt
import frykit.plot as fplt

from basemap_helpers import add_basemap

# ---- Data: ../data/ next to this module (scripts/china_base.py -> ../data/*.gpkg) ----
_GPKG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data",
                     "china_thematic_base_wgs84.gpkg")

_PC = ccrs.PlateCarree()
_PROJ = ccrs.AlbersEqualArea(central_longitude=105, standard_parallels=(25, 47))

_LAYER_NAMES = {
    "province": "province", "coast": "coast", "ninedash": "ninedash",
    "border": "border", "buf0": "buf_0_15km", "buf15": "buf_15_30km",
}
_D = {k: gpd.read_file(_GPKG, layer=v) for k, v in _LAYER_NAMES.items()}

# ---- Fixed national-standard rendering params (not exposed) ----
_LW = 0.4
_C_COAST, _C_BORDER, _C_NINE = "#008FDE", "#000000", "#000000"
_C_BUF0, _C_BUF15 = "#B9B2D4", "#D1D4E8"          # maritime gradient: inner dark / outer light
_PROV_DEFAULT = {"edgecolor": "#9a9a9a", "linewidth": _LW, "linestyle": "-"}

# ---- Layouts ----
_LAYOUTS = {
    "landscape": dict(extent=[78, 133, 14, 53], figsize=(11, 8.5), mini=True),
    "portrait":  dict(extent=[83, 124, 3, 54],  figsize=(8.5, 10), mini=False),
}
_MINI_EXTENT, _MINI_SHRINK = [107, 120, 2.5, 23], 0.35


def _province_kwargs(province_style):
    """Merge the user's province style (allow 'color' as an alias for 'edgecolor')."""
    st = dict(_PROV_DEFAULT)
    if province_style:
        if "color" in province_style:
            st["edgecolor"] = province_style["color"]
        st.update({k: v for k, v in province_style.items() if k != "color"})
    return st


def _draw_base(ax, basemap, land_fill, province, province_style, regrid_shape):
    """Draw the full base map onto one GeoAxes (shared by main axes and inset)."""
    if basemap:
        add_basemap(ax, style=basemap, zorder=0, regrid_shape=regrid_shape)
    if land_fill:                                   # solid land fill (clean; good for overlaying land data)
        ax.add_feature(cfeature.LAND.with_scale("50m"), facecolor=land_fill,
                       edgecolor="none", zorder=1)
    # Foreground lines use high zorder (20+) and the gradient 25, so user thematic data
    # drawn at a normal zorder (e.g. 10) stays BELOW the boundaries: the base map's
    # province / national / coast lines sit on top of your fills (no double edges).
    ax.add_geometries(_D["coast"].geometry, crs=_PC, facecolor="none",
                      edgecolor=_C_COAST, linewidth=_LW, zorder=20)
    if province:
        ax.add_geometries(_D["province"].geometry, crs=_PC, facecolor="none",
                          zorder=20.5, **_province_kwargs(province_style))
    ax.add_geometries(_D["border"].geometry, crs=_PC, facecolor="none",
                      edgecolor=_C_BORDER, linewidth=_LW, zorder=21)
    ax.add_geometries(_D["ninedash"].geometry, crs=_PC, facecolor="none",
                      edgecolor=_C_NINE, linewidth=_LW, zorder=21.5)
    # Maritime gradient on top of everything (inner dark / outer light)
    ax.add_geometries(_D["buf15"].geometry, crs=_PC, facecolor=_C_BUF15, edgecolor="none", zorder=25.0)
    ax.add_geometries(_D["buf0"].geometry,  crs=_PC, facecolor=_C_BUF0,  edgecolor="none", zorder=25.1)


def create_china_map(layout="landscape", *, basemap="ocean", land_fill=None,
                     province=True, province_style=None, dpi=800):
    """Create a China map with the standard base map ready; return (fig, ax).

    layout         : "landscape" (with the South China Sea inset) / "portrait"
                     (mainland + South China Sea in one frame, no inset)
    basemap        : ocean basemap style "ocean"/"imagery"/"relief", or None for no basemap
    land_fill      : None = native land from the basemap; a color (e.g. "#f7f4ec") = solid land fill
    province       : whether to draw province boundaries
    province_style : dict overriding the default province style (supports color/linewidth/linestyle)
    dpi            : output resolution (800 recommended for a country-scale China map)
    """
    if layout not in _LAYOUTS:
        raise ValueError(f"layout must be 'landscape' or 'portrait', got {layout!r}")
    cfg = _LAYOUTS[layout]
    regrid = 6000 if dpi >= 600 else 2500          # match basemap reprojection detail to high dpi

    fig = plt.figure(figsize=cfg["figsize"], dpi=dpi)
    ax = fig.add_subplot(projection=_PROJ)
    ax.set_extent(cfg["extent"], crs=_PC)
    _draw_base(ax, basemap, land_fill, province, province_style, regrid)

    fplt.set_map_ticks(ax, extents=cfg["extent"], dx=10, dy=10, mx=0, my=0)
    ax.tick_params(which="major", length=5, width=0.8, labelsize=8, direction="out",
                   top=False, right=False, labeltop=False, labelright=False)
    for spine in ax.spines.values():
        spine.set_linewidth(1.0)
    ax.gridlines(xlocs=range(70, 141, 10), ylocs=range(0, 61, 10),
                 linewidth=1, linestyle="--", color="gray", alpha=0.35)

    extras = []
    if cfg["mini"]:
        mini = fplt.add_mini_axes(ax, shrink=_MINI_SHRINK, loc="lower right")
        mini.set_extent(_MINI_EXTENT, crs=_PC)
        _draw_base(mini, basemap, land_fill, province, province_style, None)
        extras.append(mini)
    ax._china_extras = extras                       # used by draw_china to sync the inset
    return fig, ax


def draw_china(ax, paint):
    """Run paint(a) on the main axes + the South China Sea inset (portrait has no inset, main only).

    paint : a callable taking one GeoAxes and drawing thematic data on it, e.g.
            draw_china(ax, lambda a: a.add_geometries(gdf.geometry, crs=ccrs.PlateCarree(), ...))
    """
    for a in [ax, *getattr(ax, "_china_extras", [])]:
        paint(a)
