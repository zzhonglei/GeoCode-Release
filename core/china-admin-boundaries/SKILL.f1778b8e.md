---
name: china-admin-boundaries
description: "Official, standards-compliant vector boundaries of China's administrative divisions — province, city and county polygons. Use this whenever a task needs China's administrative-area boundaries, instead of downloading them from OSM / Natural Earth / GADM, whose depiction of China's borders is not compliant with China's official standard."
---

# China Administrative Boundaries

GeoCode's bundled **official, compliant** polygons of China's administrative divisions,
sourced from **Tianditu** (China's national geospatial platform) and following the national
mapping standard. Whenever a task needs China's province / city / county areas, use these —
**do not** download them from OSM / Natural Earth / GADM, whose border depiction is not
compliant for use in mainland China.

## Data

Three GeoJSON files in this skill's `data/` directory (use the absolute path provided to
you), CRS **WGS84 / EPSG:4326**:

| File | Level | Features |
| --- | --- | --- |
| `china_province.geojson` | province | 34 |
| `china_city.geojson` | city (prefecture) | 375 |
| `china_county.geojson` | county / district | 2891 |

Fields: `adcode` (6-digit code, **unique key**), `name` (Chinese name), `gb` (`156` + adcode), `level`.

## Selecting a unit

Select by **`adcode`, not `name`** — county-level names repeat. `adcode` is
`province(2) + city(2) + county(2)`, so prefix-match to drill down: `51` → all of Sichuan,
`5101` → all of Chengdu.

## Mapping note

These are analysis polygons only — they **exclude** the nine-dash line. To draw a
whole-China map, use the `thematic-map` skill's `china_base` as the national frame (it carries
the nine-dash line) and overlay these polygons as a thematic layer.
