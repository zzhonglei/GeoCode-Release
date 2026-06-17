"""
Helper for adding a tiled basemap to a cartopy GeoAxes in one call.

Copy this file to your map-rendering script's directory and import the
helper:

    from basemap_helpers import add_basemap

    add_basemap(ax)                    # default "ocean" basemap, sits under your data

It reads what it needs from the axes you already created (projection, extent,
physical size, dpi), picks a tile zoom that matches the map's display scale
(plus a per-source detail offset), reprojects the tiles to your canvas at the
figure's true output resolution, caches tiles per service, and draws the
basemap beneath your data layers.

For a clean, tile-free vector backdrop instead (Natural Earth sea/land/coast/
rivers/lakes — best for national and regional maps), use `add_vector_basemap`:

    from basemap_helpers import add_vector_basemap

    add_vector_basemap(ax)
"""

import io
import math
import os
import platform
from urllib.request import Request, urlopen

import numpy as np
import cartopy.crs as ccrs
import cartopy.feature as cfeature
import cartopy.io.img_tiles as cimgt
from PIL import Image


# Tile services. Each entry has:
#   url    - the ArcGIS tile URL template
#   cache  - a per-service cache folder name (kept separate so services don't
#            cross-contaminate each other's cache)
#   detail - a per-source integer zoom offset (see _auto_zoom). The pure scale
#            match (detail 0) is a clean geometric quantity; this offset adapts
#            it to how much each source generalizes its content at a given zoom.
#            All three ArcGIS sources read sharpest three levels finer than the
#            nominal scale (+3, tuned against rendered maps — lands a whole-China
#            map at z6).
#
# There is deliberately no hard-coded max_zoom: a source's real data ceiling
# varies by region (deep ocean thins out earlier than coastlines), so we probe
# for it at run time instead (see _real_max_zoom). _HARD_MAX is only a loop guard.
_HARD_MAX = 19

_STYLES = {
    "ocean": {
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
        "cache": "ocean",
        "detail": 3,
    },
    "imagery": {
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        "cache": "imagery",
        "detail": 3,
    },
    "relief": {
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        "cache": "shaded_relief",
        "detail": 3,
    },
}


def _cache_dir(service):
    """Return a per-service persistent tile cache directory (cross-platform)."""
    if platform.system() == "Windows":
        root = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))  # C:\Users\<user>\AppData\Local
    else:
        root = os.path.expanduser("~/.cache")                          # macOS / Linux
    path = os.path.join(root, "cartopy_tiles", service)
    os.makedirs(path, exist_ok=True)
    return path


# --- Two independent decisions, each from a different quantity -----------------
#
# ZOOM is chosen by DISPLAY SCALE, NOT export dpi — the same standard web-map
# rule used by Leaflet / OpenLayers / contextily. A tile at zoom z has a fixed
# native resolution (metres per pixel in web-mercator); we pick the z whose
# native resolution matches the map's display resolution = web-mercator extent ÷
# the figure's physical pixel count at the OGC standard 0.28 mm reference pixel.
# Using that standard pixel (not the export dpi) is what keeps zoom independent
# of dpi: a high-dpi export just resamples the same scale-matched tiles sharper.
# A per-source `detail` offset then adapts the pure scale match to how much each
# source generalizes (see _STYLES) — this is the clean, named home for what used
# to be a hidden magic bias.
#
# REGRID resolution is chosen by OUTPUT PIXELS (figsize × dpi). Cartopy must
# reproject web-mercator tiles onto your (e.g. Albers) canvas, and its default
# only resamples to 750 px on the short side — far below a high-dpi figure, which
# is why the basemap looks soft no matter the zoom. We tie it to the real output
# size instead so the reprojected raster is as crisp as the figure it's saved to.
_WEBMERC_WORLD_M = 2 * 20037508.342789244       # full web-mercator extent (metres)
_WEBMERC_RES0 = _WEBMERC_WORLD_M / 256.0         # zoom-0 resolution: 156543.034 m/px
_STD_PIXEL_M = 0.00028                           # OGC WMTS reference pixel: 0.28 mm (~90.7 dpi)
_INCH_TO_M = 0.0254
_MAX_MERC_LAT = 85.05112878                      # web-mercator latitude limit


def _merc_y(lat_deg):
    """Latitude (deg) -> web-mercator northing (metres), clamped to the valid band."""
    lat = max(-_MAX_MERC_LAT, min(_MAX_MERC_LAT, lat_deg))
    return 6378137.0 * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def _webmerc_extent_m(ax):
    """The axes' extent measured in web-mercator metres (width, height).

    Read from ``get_extent(PlateCarree())`` so it is correct the moment the
    basemap is added (``get_xlim`` is stale before the first draw). Width comes
    from the longitude span, height from the mercator-projected latitudes — this
    matches the tiles' own CRS, so the scale match is projection-independent.
    """
    lon0, lon1, lat0, lat1 = ax.get_extent(ccrs.PlateCarree())
    lon_w = (lon1 - lon0) % 360.0 or 360.0
    width_m = _WEBMERC_WORLD_M * lon_w / 360.0
    south, north = sorted((lat0, lat1))
    height_m = abs(_merc_y(north) - _merc_y(south))
    return width_m, height_m


def _auto_zoom(ax, detail):
    """Pick the tile zoom whose native resolution matches the map's display scale.

    `detail` is the per-source integer offset (see _STYLES). Projection-agnostic
    and independent of export dpi. Capped only by the _HARD_MAX loop guard — the
    real per-region data ceiling is found later by _real_max_zoom.
    """
    fig_w, fig_h = ax.figure.get_size_inches()
    bbox = ax.get_position()
    target_px_w = fig_w * bbox.width * _INCH_TO_M / _STD_PIXEL_M        # display pixels across the axes
    target_px_h = fig_h * bbox.height * _INCH_TO_M / _STD_PIXEL_M
    merc_w, merc_h = _webmerc_extent_m(ax)
    target_res = max(merc_w / target_px_w, merc_h / target_px_h)        # required m/px (coarser side)
    z = round(math.log2(_WEBMERC_RES0 / target_res)) + detail
    return max(1, min(z, _HARD_MAX))


def _center_tile(ax, z):
    """The (x, y) tile index covering the map centre at zoom z."""
    lon0, lon1, lat0, lat1 = ax.get_extent(ccrs.PlateCarree())
    lon = (lon0 + lon1) / 2
    lat = max(-_MAX_MERC_LAT, min(_MAX_MERC_LAT, (lat0 + lat1) / 2))
    n = 2 ** z
    x = int((lon + 180) / 360 * n) % n
    lat_r = math.radians(lat)
    y = int((1 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2 * n)
    return x, max(0, min(n - 1, y))


def _fetch_tile(url, z, x, y, timeout=10):
    """Fetch one tile as an RGB array, or None on any failure."""
    try:
        req = Request(url.format(z=z, x=x, y=y), headers={"User-Agent": "Mozilla/5.0"})
        data = urlopen(req, timeout=timeout).read()
        return np.asarray(Image.open(io.BytesIO(data)).convert("RGB"))
    except Exception:
        return None


def _is_placeholder(url, z, x, y):
    """True if zoom z serves a "data not yet available" placeholder here.

    The placeholder is the SAME image everywhere, so the centre tile and another
    tile a quarter-world away come back identical; real data differs from place
    to place.
    """
    n = 2 ** z
    a = _fetch_tile(url, z, x, y)
    b = _fetch_tile(url, z, (x + n // 4 + 1) % n, y)
    if a is None or b is None or a.shape != b.shape:
        return False                                       # network hiccup → don't over-trim
    return float(np.abs(a.astype(int) - b.astype(int)).mean()) < 2.0


def _real_max_zoom(ax, url, z, floor=1):
    """Step down from z to the first zoom that serves real (non-placeholder) data.

    Probes two small tiles per level over the network (these are not saved to the
    render cache, so each level costs two lightweight requests). Returns z
    unchanged the moment it finds a level that already has real data — so a map
    whose scale-matched zoom is fine pays for just one level's probe.
    """
    for zz in range(z, floor - 1, -1):
        x, y = _center_tile(ax, zz)
        if not _is_placeholder(url, zz, x, y):
            return zz
    return floor


def _auto_regrid_shape(ax, cap=4000):
    """Tie the reprojection grid to the axes' output pixels (short side), capped.

    Replaces Cartopy's 750 px default so the warped basemap stays crisp at the
    figure's export dpi. Capped to keep memory / runtime sane at very high dpi.
    """
    fig = ax.figure
    w, h = fig.get_size_inches()
    bbox = ax.get_position()
    short_px = min(w * bbox.width, h * bbox.height) * fig.dpi
    return int(max(1500, min(short_px, cap)))


def add_basemap(ax, style="ocean", zorder=0, detail_level=None,
                zoom=None, probe=True, regrid_shape=None):
    """Add a tiled basemap underneath your data, in one call.

    Parameters
    ----------
    ax : cartopy.mpl.geoaxes.GeoAxes
        The map axes you already created, with its projection and extent set.
        Tile zoom, coverage, and reprojection resolution are all derived from it.
    style : {'ocean', 'imagery', 'relief'}, default 'ocean'
        - ``'ocean'``   : pale land + light blue sea. The default — light enough
          that any data layer reads clearly on top, works at every scale.
        - ``'imagery'`` : true-color satellite photo. Use when real ground
          texture matters.
        - ``'relief'``  : terrain hillshade. Use when terrain is the backdrop theme.
    zorder : int, default 0
        Drawing order. Left at ``0`` the basemap sits at the very bottom; give
        every data layer / boundary you draw afterwards a higher zorder (e.g.
        ``zorder=10``) so the basemap stays behind them.
    detail_level : int, optional
        Integer offset on the auto-chosen zoom. ``None`` uses the style's tuned
        default (see _STYLES). Pass ``+1`` / ``-1`` for a one-level finer / coarser
        basemap when a particular map wants more or less texture.
    zoom : int, optional
        Force a specific tile zoom. Honoured exactly — it bypasses both the
        automatic scale match and the placeholder probe.
    probe : bool, default True
        Only applies to the automatic zoom (ignored when ``zoom`` is given).
        Steps the auto zoom down to the source's real data ceiling for this region
        when the chosen level only serves "data not yet available" placeholder
        tiles — adapting to each source/region instead of a hard-coded cap. Set
        ``False`` to skip the network probe.
    regrid_shape : int, optional
        Reprojection grid (short side). ``None`` ties it to the figure's output
        pixels — leave it unless you have a specific reason to override.

    Returns
    -------
    cartopy.io.img_tiles.GoogleTiles
        The tile source added to the axes. You normally don't need it.
    """
    if style not in _STYLES:
        raise ValueError(f"unknown style {style!r}; choose from {list(_STYLES)}")
    spec = _STYLES[style]
    detail = spec["detail"] + (detail_level or 0)          # offset on the source default

    if zoom is None:
        zoom = _auto_zoom(ax, detail)
        if probe:
            zoom = _real_max_zoom(ax, spec["url"], zoom)   # back off to real data ceiling
    # An explicit zoom= is honoured exactly — no probing, no clamping.
    if regrid_shape is None:
        regrid_shape = _auto_regrid_shape(ax)

    tiles = cimgt.GoogleTiles(url=spec["url"], cache=_cache_dir(spec["cache"]))
    ax.add_image(tiles, zoom, zorder=zorder, regrid_shape=regrid_shape,
                 interpolation="bilinear")
    return tiles


# Natural Earth vector colours, tuned for a clean reference basemap.
_VEC_OCEAN = "#dbeaf2"     # pale blue sea
_VEC_LAND = "#f4f1ea"      # warm off-white land
_VEC_COAST = "#33414d"     # dark slate coastline
_VEC_WATERLINE = "#7fa8c4" # river / lake edge blue
_VEC_LAKE = "#cfe3ef"      # lake fill
_VEC_BORDER = "#5a6470"    # country border grey


def _vector_scale(ax):
    """Pick a Natural Earth resolution from the map's longitude span.

    Two tiers only: 50 m for national / regional maps (smooth coastlines without
    the heavy 10 m geometry), 10 m once you zoom into provinces and smaller. The
    coarse 110 m set is skipped — it renders visibly faceted coastlines even at
    national scale.
    """
    lon0, lon1, _, _ = ax.get_extent(ccrs.PlateCarree())
    return "50m" if abs(lon1 - lon0) > 15 else "10m"


def add_vector_basemap(ax, coastline=True, rivers=True, lakes=True,
                       borders=False, scale=None, zorder=0):
    """Draw a clean vector basemap from Natural Earth data, in one call.

    Unlike `add_basemap` (raster tiles), this draws crisp vector features — sea
    and land fill plus coastlines, rivers, and lakes — so it stays sharp at any
    export resolution and needs no tile download. It is the right choice for a
    light, uncluttered backdrop on national / regional maps.

    Scope note: Natural Earth is small-scale data. It has no streets, built-up
    areas, or local detail, so a vector basemap looks nearly empty at city scale
    — use ``add_basemap(ax, style="imagery")`` for those.

    Parameters
    ----------
    ax : cartopy.mpl.geoaxes.GeoAxes
        The map axes you already created, with its projection and extent set.
    coastline, rivers, lakes : bool
        Which features to draw. Coastline, rivers, and lakes are on by default.
    borders : bool, default False
        Draw country borders. Off by default (border depiction is often contested
        and many thematic maps supply their own study-area boundary instead).
    scale : {'10m', '50m'}, optional
        Natural Earth resolution. ``None`` picks it from the map's span (50 m for
        national / regional, 10 m for province and smaller).
    zorder : int, default 0
        Drawing order of the basemap as a whole; the fills sit at ``zorder`` and
        the line features just above it, all beneath your data layers.

    Returns
    -------
    str
        The Natural Earth resolution actually used.
    """
    s = scale or _vector_scale(ax)
    ax.add_feature(cfeature.OCEAN.with_scale(s), facecolor=_VEC_OCEAN, zorder=zorder)
    ax.add_feature(cfeature.LAND.with_scale(s), facecolor=_VEC_LAND, zorder=zorder)
    if lakes:
        ax.add_feature(cfeature.LAKES.with_scale(s), facecolor=_VEC_LAKE,
                       edgecolor=_VEC_WATERLINE, linewidth=0.3, zorder=zorder + 1)
    if rivers:
        ax.add_feature(cfeature.RIVERS.with_scale(s), edgecolor=_VEC_WATERLINE,
                       linewidth=0.4, zorder=zorder + 1)
    if coastline:
        ax.add_feature(cfeature.COASTLINE.with_scale(s), edgecolor=_VEC_COAST,
                       linewidth=0.5, zorder=zorder + 2)
    if borders:
        ax.add_feature(cfeature.BORDERS.with_scale(s), edgecolor=_VEC_BORDER,
                       linewidth=0.4, zorder=zorder + 2)
    return s
