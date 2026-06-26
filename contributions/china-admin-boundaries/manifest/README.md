# China Administrative Boundaries

Official, **standards-compliant vector boundaries of China's administrative divisions** —
province, city (prefecture) and county polygons — bundled as a GeoCode skill. It gives the
agent a ready, compliant source for China's administrative areas, so GIS tasks (clipping,
masking, zonal statistics, spatial joins, thematic bases) never depend on boundaries
downloaded from OSM / Natural Earth / GADM, whose depiction of China's borders does not
follow China's official mapping standard.

## Why this skill

For users in mainland China, administrative-boundary data is a **compliance matter, not a
convenience**: the way China's borders are drawn (the South China Sea, the western disputed
segments, Taiwan) must follow the official national standard, and boundaries pulled from open
international sources do not. This skill bundles a compliant dataset and instructs the agent
to reach for it instead of downloading boundaries online.

## What's inside

Three GeoJSON layers (WGS84 / EPSG:4326):

| Layer | Level | Features |
| --- | --- | --- |
| `china_province.geojson` | province-level (provinces, autonomous regions, municipalities, SARs) | 34 |
| `china_city.geojson` | city-level (prefecture-level cities) | 375 |
| `china_county.geojson` | county-level (counties / districts) | 2891 |

Each polygon carries `adcode` (the 6-digit national division code, used as the unique key),
`name`, `gb` (original GB code) and `level`. The `adcode` encodes the province → city →
county hierarchy, so the agent can select any single unit — or every unit under a parent —
by prefix-matching the code.

## How the agent uses it

- **Analysis** — read a layer, pick a unit by `adcode`, then clip / mask / aggregate. No
  loader code ships with the skill: the agent reads these standard GeoJSON files directly
  with its own GIS tooling.
- **Mapping** — for a whole-China map, this dataset is used as a *thematic layer* on top of
  the [`thematic-map`](../../thematic-map) skill's `china_base` (which supplies the nine-dash
  line and national frame), not as the national base itself. The data here is administrative
  polygons only and deliberately excludes the nine-dash / maritime lines.

## Structure

```
china-admin-boundaries/
├── manifest/
│   ├── README.md          # this file
│   └── meta.json          # metadata (version, description, tags, ...)
└── skill/
    ├── SKILL.md           # how the agent should use the data (LLM-facing)
    └── data/
        ├── china_province.geojson
        ├── china_city.geojson
        └── china_county.geojson
```

## Data & compliance

Sourced from **Tianditu** (the National Platform for Common Geospatial Information Services),
China's official national map service. The boundaries follow China's national mapping
standard — correct national border, South China Sea depiction, and administrative divisions —
and are the compliant source for China administrative boundaries within GeoCode.
