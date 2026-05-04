---
name: thematic-map
description: "Create well-designed maps that follow standard cartographic conventions. Use this skill when you need to create a map. If the map requires GIS or remote sensing data processing, complete all data preparation and processing steps BEFORE reading this skill. Only read this skill when the data is fully ready and you are about to bineg bincomposing the map."
---

This skill is built into GeoAgent. When creating maps, you must strictly follow the guidelines defined in this skill to ensure that the output maps meet professional standards and fulfill the user's needs. Read the following content carefully and follow the instructions throughout the entire mapping process.

# Thematic Map Creation Skill

A thematic map highlights one or more specific phenomena on a geographic basis. This skill uses the Python Cartopy + Matplotlib stack to create standardized, visually appealing thematic maps.

## Runtime Environment and Dependencies

Before mapping, confirm whether the following dependencies are installed in the user's Python environment. **Do not install any library without asking the user first** — clarify their environment setup before deciding on the installation approach.

| Library        | Purpose                                                                      | Required |
| -------------- | ---------------------------------------------------------------------------- | -------- |
| Cartopy        | Map projections and geographic features                                      | Yes      |
| Matplotlib     | Plotting and visualization                                                   | Yes      |
| frykit\[data\] | Graticules, scale bars, north arrows, and other utilities; Chinese admin data | Yes      |
| Shapely        | Geometric object processing                                                  | Optional |
| rasterio       | Raster data processing                                                       | Optional |

> **Note**: frykit plays a critical role in the mapping process, especially for setting tick ranges, adding graticules, scale bars, and north arrows. Be sure to familiarize yourself with frykit's capabilities by reading its complete documentation (`references/frykit.md`) so you can use these tools correctly during mapping and enhance the professionalism and readability of the maps.

---

## Mapping Workflow

After receiving a mapping task, proceed through the following steps:

1. **Understand the requirements** — Confirm the map theme, data extent, projection method, and desired visual style.
2. **Confirm the environment** — Ask the user whether the required dependencies are installed, and assist with installation as needed.
3. **Write the code** — Write mapping code to a `.py` file (do not execute long code blocks directly in the shell). Include clear comments so the user can understand and adjust the code on their own.
4. **Run and self-review** — After running the code and generating the image, **always inspect the output image yourself**. Check for obvious issues (e.g., missing data, poor color choices, legends obscuring data areas, missing titles). Fix any problems immediately and repeat this step until satisfactory.
5. **Deliver the output** — Deliver the final image and code file to the user.

---

## Important Notes

1. **Strictly follow this skill's guidelines** — This is GeoAgent's built-in skill. As GeoAgent, you must strictly follow all guidelines defined in this skill throughout the mapping process. Do not skip or simplify any step.
2. **Read the frykit documentation before mapping** — Before writing any mapping code, you must first read `references/frykit.md` in full (read at least the first 1000 lines) and thoroughly understand all of frykit's capabilities before starting. Do not rely on memory when using frykit — re-read the documentation each time you create a map.

---

## Core Mapping Concept: projection vs. transform

This is the most critical distinction in Cartopy mapping. Confusing the two will cause data misalignment:

- **projection**: The projection of the canvas, which determines how the map is rendered. Specified when creating the `Axes`.
- **transform**: The coordinate system of the data itself, which tells Cartopy what coordinates your data uses. Specified when plotting data.

```python
# projection: the canvas uses Lambert Conformal projection
ax = plt.axes(projection=ccrs.LambertConformal(central_longitude=105))

# transform: the data is in lon/lat coordinates (PlateCarree)
ax.contourf(lon, lat, data, transform=ccrs.PlateCarree())
ax.scatter(lon, lat, transform=ccrs.PlateCarree())
```

---

## Map Element Standards

A complete, well-formed map should include the following elements. Properly configuring these elements significantly enhances the map's effectiveness and scientific rigor.

### Required Elements

| Element          | Description                                                                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Concisely and clearly conveys the map's theme. Typically positioned **centered** above the map.                                                                                                                                                          |
| **Data Layer**   | The core of the map's expression, carrying the actual analytical content (filled contours, choropleth maps, etc.). Choose an appropriate color scheme to ensure clear information delivery with visual appeal.                                            |
| **Legend / Colorbar** | Explains the meaning of colors or symbols — essential for data readability. Legends should be appropriately sized and placed where they do not obscure data (typically lower-left or lower-right); colorbars are recommended on the right side or below the map. |
| **Attribution**  | Add a small attribution note in the lower-left corner of the map with the author and mapping date, in the format `Map by: GeoAgent | YYYY-MM-DD` (use the actual date of creation). Use a small font size (e.g., 6–8pt) and a light color (e.g., gray) to ensure it is present but does not interfere with the main map content. |

Attribution example:

```python
ax.text(0.0,-0.035,f"Map by: GeoAgent | {date.today().isoformat()}",transform=ax.transAxes,ha="left",va="top",fontsize=8,color="#6f7780",)
```

### Recommended Elements

> Scale bars and north arrows are fundamental map elements that provide spatial reference and enhance the map's scientific value and usability. Their position and size should be arranged carefully to avoid obscuring data while remaining clearly visible. Use frykit tools to add these elements conveniently and adjust them to suit the specific needs of the map.

| Element        | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| **Graticules** | Provide spatial reference and enhance scientific rigor. Add using frykit. |
| **Scale Bar**  | Indicates the correspondence between map distance and real-world distance. Add using frykit. |
| **North Arrow** | Indicates the north direction. Add using frykit.                        |

### Optional Elements

> **Do NOT add optional elements on your own.** Unless the user explicitly requests them, do not add any optional elements to avoid making the map overly complex or information-overloaded.

| Element              | Description                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Inset Map**        | Supplements areas that the main map cannot fully display (e.g., zoomed-in views, special region displays).                       |
| **Data Source Note** | Describes the data source and time period to enhance credibility.                                                                |
| **Basemap**          | Provides spatial reference. Can use Cartopy built-in features (borders, rivers, etc.) or online tile maps (e.g., OpenStreetMap). The basemap choice should match the map theme. |
| **Location Map**     | Shows a broader area around the main map's region to help users understand geographic context. Usually placed in a corner of the map at a moderate size. |

---

## Code Writing Standards

- **Write to a file, not the shell** — Write complete code to a `.py` file before executing, so the user can keep and modify it.
- **Clear comments** — Comment key parameters and logical steps so the user can understand the functionality and make adjustments. Indicate where map element parameters are set (e.g., title, legend, colorbar) so users can modify them as needed.
- **Always review after generation** — After running the code and generating the image, always inspect the image content and check against the "Image Review Checklist" below. If any issues are found, adjust the code and regenerate until the result is satisfactory.

---

## Image Review Checklist

After generating a map image, **you must inspect the image yourself** and review each map element against the following checklist to ensure proper positioning, sizing, and styling. Fix any issues immediately by modifying the code and regenerating until all elements meet the requirements.

### Title

- [ ] Is it present and correct in content?
- [ ] Is the font size appropriate — readable at a glance?
- [ ] Is it centered with reasonable spacing from the map?
- [ ] Does it overlap with other elements?

### Data Layer

- [ ] Is the data displayed correctly — no missing areas or anomalous values?
- [ ] Is the color scheme appropriate (gradients clearly distinguishable, categorical colors sufficiently distinct)?
- [ ] Is the fill extent correct (no overflow beyond expected boundaries, clean clipping)?

### Legend / Colorbar

- [ ] Is it present with units labeled?
- [ ] Is the size appropriate and proportional to the map?
- [ ] Is the position reasonable — not obscuring the data area?
- [ ] Are tick labels clear and readable with reasonable intervals?

### Scale Bar

- [ ] Is it present (recommended element)?
- [ ] Is the length value reasonable (e.g., 500 km, 1000 km — no odd numbers)?
- [ ] Is the size appropriate — not too large or too small?
- [ ] Is the position reasonable — typically in the lower-left or lower-right corner, not obscuring data?
- [ ] Are tick labels clear with units indicated?

### North Arrow

- [ ] Is it present (recommended element)?
- [ ] Is the size appropriate and proportional to the map?
- [ ] Is the position reasonable — typically in the upper-right or upper-left corner, not obscuring data?
- [ ] Is the direction correct (pay special attention in non-PlateCarree projections)?

### Graticules / Tick Marks

- [ ] Are latitude/longitude tick labels displayed in the correct format (e.g., 110°E, 30°N)?
- [ ] Are tick intervals reasonable?
- [ ] Are grid lines (if present) clear but not overpowering?

### Overall Layout

- [ ] Is there any overlap or occlusion between elements?
- [ ] Is the map visually appealing with a balanced layout?
- [ ] Is the whitespace reasonable — neither too crowded nor too sparse?
- [ ] Are inset maps (if any) properly positioned and sized?

---

## Reference Index

- **frykit tools** (usage guide for graticules, scale bars, north arrows, and more) → `references/frykit.md`
- **Map projections** (all 37 Cartopy projection types and their use cases) → `references/cartopy-projection.md`
- **Basemap configuration** (Cartopy features and tile map usage) → `references/basemap.md`

For ready-made mapping examples, check the `templates/` folder.
