---
name: projection-selection
description: "Select an appropriate projected coordinate system for geographic data analysis or cartographic tasks. Consult this skill when you need to determine which projection to use. Before using this skill, you MUST first identify the latitude/longitude extent of the study area, as key parameters — such as zone numbers, standard parallels, and central meridians — all depend on its location and extent. To obtain the precise extent, you can search for relevant reference materials or create a boundary vector file (e.g., .shp, .geojson) for the study area."
---

This skill is a built-in skill of GeoAgent. Please read all the following content carefully and strictly follow the guidelines during task execution.

# Projection Coordinate System Selection Guide

This skill provides a comprehensive knowledge framework for selecting projected coordinate systems, helping you make sound projection choices when faced with geographic data analysis or cartographic tasks.

> **Prerequisite:** You can only begin selecting a projection once the study area's latitude/longitude extent is known. Many projection parameters (such as UTM/Gauss-Krüger zone numbers, conic projection standard parallels, central meridians, etc.) depend on the specific location and extent of the study area — without this information, a correct projection choice cannot be made.

---

## I. Distortion Properties of Projections

This is the **first decision dimension** for projection selection — what geometric property does your task need to preserve?

### Four Types of Distortion

| Distortion Property | What It Preserves                            | What It Sacrifices                                                             | Typical Use Cases                                                                                                |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Conformal**       | Local shapes and angles                      | Area distortion (high-latitude regions are enlarged)                           | Navigation, weather maps, ocean current maps, wind field maps, any direction-critical scenario                   |
| **Equal-area**      | Correct area proportions for any region      | Shape distortion (regions far from standard lines are compressed or stretched) | Population density, land use, precipitation distribution, any statistical thematic map requiring area comparison |
| **Equidistant**     | Distances from a given point or line         | Both angles and areas are distorted                                            | Distance analysis from a city, communication coverage, airline distance maps                                     |
| **Compromise**      | Nothing strictly, but overall visual balance | All properties have slight distortion                                          | General-purpose display maps, educational maps, world maps in publications                                       |

### Key Principles of Distortion

1. **Conformal and equal-area are mutually exclusive** — A projection cannot be both conformal and equal-area simultaneously; this is a mathematically proven theorem.
2. **Distortion increases with distance** — The farther from where the projection surface is tangent/secant to the sphere (standard lines), the greater the distortion.
3. **Negligible at small scales** — When the mapping area is sufficiently small (e.g., a single city), differences between projections are negligible.

---

## II. Projection Families and Applicable Ranges

This is the **second decision dimension** for projection selection — how large is your map's coverage, what shape is the region, and at what latitude is it located?

### Classification by Projection Surface

Projections are classified into families by the type of geometric surface, each naturally suited to different regional shapes:

### 1. Cylindrical Projections

Project the earth onto a cylinder wrapped around it, then unroll.

- **Characteristics**: Meridians are equally spaced parallel straight lines; parallels are also parallel straight lines
- **Best suited for**: Regions near the equator, extending in the east-west direction
- **Distortion pattern**: Minimum along the equator (or standard parallels), increasing toward the poles

**Common projections:**

| Projection Name                        | Distortion Property           | Use Cases                                                             |
| -------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Mercator                               | Conformal                     | Marine navigation, web maps (not suitable for global area comparison) |
| Transverse Mercator                    | Conformal                     | North-south elongated small regions (basis of UTM, Gauss-Krüger)      |
| Equal-Area Cylindrical                 | Equal-area                    | Area statistics near the equator                                      |
| Plate Carrée (Equidistant Cylindrical) | Equidistant (along meridians) | Quick display, default coordinates for data exchange                  |

### 2. Conic Projections

Project the earth onto a cone placed over it, then unroll.

- **Characteristics**: Meridians are straight lines radiating from the apex; parallels are concentric circular arcs
- **Best suited for**: Mid-latitude (30°–60°) regions extending in the east-west direction
- **Distortion pattern**: Minimum along the standard parallels, increasing to the north and south
- **Key parameter**: Two standard parallels, typically placed at approximately 1/6 inward from the north and south boundaries of the mapping area

**Common projections:**

| Projection Name         | Distortion Property | Use Cases                                                       |
| ----------------------- | ------------------- | --------------------------------------------------------------- |
| Lambert Conformal Conic | Conformal           | Mid-latitude country/continent mapping (weather, aviation)      |
| Albers Equal-Area Conic | Equal-area          | Statistical thematic maps for mid-latitude countries/continents |
| Equidistant Conic       | Equidistant         | Distance measurement in mid-latitude regions                    |

### 3. Azimuthal Projections

Project the earth onto a plane tangent to a single point.

- **Characteristics**: Radial pattern from the tangent point; azimuth angles from the center point are always correct
- **Best suited for**: Polar regions, or circular areas centered on a specific point
- **Distortion pattern**: Increases outward from the tangent point

**Common projections:**

| Projection Name              | Distortion Property             | Use Cases                                                    |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Stereographic                | Conformal                       | Polar mapping, precise local area mapping                    |
| Lambert Azimuthal Equal-Area | Equal-area                      | Area statistics centered on a point (e.g., continental maps) |
| Azimuthal Equidistant        | Equidistant (from center point) | Distance display from a city, airline route maps             |

### 4. Pseudocylindrical Projections

Variants of cylindrical projections where parallels remain straight lines but meridians curve.

- **Characteristics**: Overall oval or similar shape, visually close to the earth's "natural feel"
- **Best suited for**: World maps
- **Distortion pattern**: Most accurate near the central meridian and equator, increasing toward edges

**Common projections:**

| Projection Name | Distortion Property | Use Cases                                                            |
| --------------- | ------------------- | -------------------------------------------------------------------- |
| Mollweide       | Equal-area          | Global distribution area statistics thematic maps                    |
| Robinson        | Compromise          | General-purpose global display maps                                  |
| Sinusoidal      | Equal-area          | Global area statistics for low-latitude regions                      |
| Natural Earth   | Compromise          | Aesthetically pleasing global display maps                           |
| Equal Earth     | Equal-area          | Aesthetically balanced global equal-area thematic maps (recommended) |

---

## III. Differences in Projection Selection for GIS Analysis vs. Cartography

Projection selection is not purely a technical issue — it also depends on the **purpose** of what you're doing. GIS analysis and cartographic mapping have different logics for projection requirements.

> **Important: A single task can use multiple projections.** Within the same project, the GIS analysis phase and the final cartographic phase can use entirely different projections. For example: use an equal-area projection for area statistical analysis, then use a projection conforming to local cartographic standards for the final map output. Don't try to use a single projection for all stages — instead, choose the most suitable projection for each stage based on its purpose.

### GIS Analysis: Projection Follows the Task

In GIS spatial analysis, projection selection should **fully serve the analytical task's requirements**:

| Analysis Task                      | Property to Preserve | Projection Type to Use                     | Example                                          |
| ---------------------------------- | -------------------- | ------------------------------------------ | ------------------------------------------------ |
| Area calculation, density analysis | Area                 | Equal-area projection                      | Calculate forest cover area by country           |
| Distance/buffer analysis           | Distance             | Equidistant projection or UTM/Gauss-Krüger | Calculate distance from city to coastline        |
| Direction/angle analysis           | Angles               | Conformal projection                       | Analyze wind directions, ocean currents          |
| Shape analysis                     | Local shape          | Conformal projection                       | Terrain feature identification                   |
| Small-area comprehensive analysis  | Balanced properties  | UTM / Gauss-Krüger                         | Multi-dimensional spatial analysis at city level |

> **Principle: Accuracy of analytical results comes first; visual aesthetics don't matter.**

### Cartography: Projection Selection Requires Comprehensive Consideration

Projection selection in cartographic mapping is more complex, requiring simultaneous consideration of the following factors:

**1. Local Cartographic Standards**

Many countries and regions have official cartographic projection standards. When mapping a specific area, local standards should take priority:

- National topographic base maps usually have legally mandated projections (e.g., China uses the Gauss-Krüger projection)
- International publications may require specific projections
- Industry standards may specify projections (e.g., aviation charts use Lambert Conformal Conic)

**2. Thematic Map Subject Characteristics**

Projection selection should serve thematic expression:

- Themes showing area comparison (population density, land use) → Must use equal-area projection; otherwise area comparison will be distorted
- Themes showing direction/flow (wind fields, ocean currents, migration routes) → Prefer conformal projection
- Themes showing distance relationships (service coverage, radiation circles) → Prefer equidistant projection
- General display themes → Compromise projection is sufficient

**3. Comprehensive Trade-offs**

When standard requirements and thematic needs conflict, **cartographic standards generally take priority** — because standards ensure data comparability and interoperability. When there are no explicit standard constraints, thematic expression needs take precedence.

> **Note**: When standards and thematic needs are hard to reconcile, proactively ask the user: Do they need to follow specific cartographic standards? Do they prioritize accurate thematic data expression or overall visual aesthetics? Use this as the basis for projection selection decisions.

---

## IV. Common Scenario Quick Reference Table

The following lists recommended projection schemes for high-frequency mapping scenarios as a quick reference:

### World Maps

| Scenario                                                     | Recommended Projection   | Rationale                                    |
| ------------------------------------------------------------ | ------------------------ | -------------------------------------------- |
| Global statistical thematic maps (population, climate, etc.) | Equal Earth / Mollweide  | Equal-area, ensures accurate area comparison |
| Global general display maps                                  | Robinson / Natural Earth | Compromise, visually natural and balanced    |
| Global ocean/route maps                                      | Mercator                 | Conformal, directions and routes are correct |

### Continental / Large Regional Maps

| Scenario                             | Recommended Projection                                                | Rationale                                            |
| ------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------- |
| Continental equal-area thematic maps | Albers Equal-Area Conic / Lambert Azimuthal Equal-Area                | Equal-area, suitable for large mid-latitude areas    |
| Continental conformal mapping        | Lambert Conformal Conic                                               | Conformal, accurate shapes                           |
| Polar regions                        | Stereographic (conformal) / Lambert Azimuthal Equal-Area (equal-area) | Azimuthal projections are naturally suited for poles |

### National-Level Maps

| Scenario                                        | Recommended Projection                            | Rationale                                          |
| ----------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Mid-latitude country thematic maps (E-W extent) | Albers Equal-Area Conic / Lambert Conformal Conic | Conic projections suit mid-latitude E-W regions    |
| Equatorial country thematic maps                | Mercator / Cylindrical Equal-Area                 | Cylindrical projections suit equatorial regions    |
| North-south elongated countries (e.g., Chile)   | Transverse Mercator                               | Transverse cylindrical suits N-S elongated regions |

### Small-Area Maps

| Scenario                             | Recommended Projection | Rationale                                              |
| ------------------------------------ | ---------------------- | ------------------------------------------------------ |
| City-level precise mapping/analysis  | UTM / Gauss-Krüger     | All types of distortion are negligible at small scales |
| Distance display centered on a point | Azimuthal Equidistant  | Accurate distances from center point                   |

---

## Reference Documents

| File                                   | When to Read                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `references/中国制图投影坐标系规范.md` | **When the task involves any part of China.** — read it before selecting a projection for China. |
