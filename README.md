<p align="center">
  <img src="assets/logo.svg" width="500" alt="GeoCode">
</p>

<p align="center"><strong>A desktop AI assistant for geoscience data processing</strong></p>

<p align="center">
  English &nbsp;·&nbsp; <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/QGIS-589632?style=flat-square&logo=qgis&logoColor=white" alt="QGIS">
  <img src="https://img.shields.io/badge/GDAL-5CAE58?style=flat-square&logo=osgeo&logoColor=white" alt="GDAL">
  <img src="https://img.shields.io/badge/GEE-4285F4?style=flat-square&logo=googleearth&logoColor=white" alt="Google Earth Engine">
  <img src="https://img.shields.io/badge/macOS-arm64-blue?style=flat-square&logo=apple&logoColor=white" alt="macOS arm64">
  <img src="https://img.shields.io/badge/Windows-x64-blue?style=flat-square&logo=windows&logoColor=white" alt="Windows x64">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License">
  </a>
</p>

<p align="center">
  <a href="https://github.com/zzhonglei/GeoCode-Release/releases">🚀 Download</a>
  ·
  <a href="contributions/">✨ Skill Bazaar</a>
  ·
  <a href="https://github.com/sst/opencode">🌳 Upstream OpenCode</a>
</p>

---

## What GeoCode Can Do

Tackle complex geoscience data processing through conversation — empowering anyone to analyze the planet 🌏...

| Capability                  | Scope                                                          | Examples                                                          |
| --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| 🗺️ **QGIS**                 | **All hundreds of algorithms** in QGIS Processing              | Spatial analysis, vector/raster batch processing, format conversion, accessibility analysis... |
| 🛰️ **Google Earth Engine** | **Full GEE Python API** — any remote sensing task you can express | Temporal compositing, classification, change detection, land surface temperature, image download... |
| 🐍 **Python**              | Run **arbitrary Python scripts** in an isolated env, full scientific computing stack | Geospatial processing, thematic mapping, deep learning... |
| ✨ **Skill**                | On-demand capability packs that **let GeoCode grow as you need** | Pull community-built packs anytime, build the geoscience ecosystem together... |

## How to Use

### 1. What environment do you need?

No complex setup required. Before installing GeoCode, only two things need to be on your machine:

- **[QGIS](https://qgis.org/download/)** — desktop GIS app, GeoCode calls its algorithms
- **A Python environment manager** (recommend [Miniconda](https://docs.anaconda.com/miniconda/)) — isolates Python dependencies so GeoCode's scripts don't interfere with each other

> [!TIP]
> Give GeoCode's agent a **dedicated Python environment** (create a fresh one with Conda / Mamba). The agent will install, uninstall, and upgrade Python packages on its own as it works — a dedicated env keeps your other projects clean and helps the agent run more reliably.

### 2. GeoCode Versions

**v0.9.0** is GeoCode's **first public preview**, covering macOS arm64 and Windows x64. Grab it from [Releases](https://github.com/zzhonglei/GeoCode-Release/releases). Early adopters and feedback are welcome.

### 3. How to configure

After installing QGIS and your environment manager, launch GeoCode and type `/set` in the input box to enter the setup wizard. Just follow the prompts to the end.

<p align="center">
  <img src="assets/setup-wizard.png" width="700" alt="Type /set in GeoCode to launch the setup wizard">
</p>

## Skill Bazaar

Skills are a key piece of how smoothly the agent works. GeoCode ships a built-in management UI for them — browse, install, enable, disable, all click-driven, no manual file shuffling.

<p align="center">
  <img src="assets/skill-bazaar.png" width="700" alt="GeoCode Settings → Skill Bazaar">
</p>

> [!TIP]
> The Skill catalog is small in both quantity and polish in these early days. As more users and contributors join, the bazaar will fill up with higher-quality skills.

### How to contribute your own Skill

All GeoCode Skills live under [`contributions/`](contributions/) — anyone can open a Pull Request to add a new one. The standard layout of a Skill package:

```
contributions/<your-skill-id>/
├── manifest/
│   ├── README.md       # Human-facing description of the Skill
│   └── meta.json       # Metadata: version / description / author / tags ...
└── skill/
    ├── SKILL.md        # Required, the core prompt (LLM-facing, with frontmatter)
    └── <dir>/          # Optional, any name and any nesting — references, templates, scripts, etc.
```

Submission flow:

1. Fork this repo and create your Skill directory under `contributions/`
2. Fill in `manifest/` and `skill/` following the layout above
3. Open a Pull Request — CI auto-validates schema, version, and structure
4. Once reviewed, the maintainer merges and publishes

> [!TIP]
> Skills are loaded into the agent's prompt and directly affect its behavior. Every PR is reviewed manually before merging to screen for malicious instructions or unsafe operations.

## Acknowledgements

GeoCode benefited from guidance on design and technical decisions from the following research groups:

- China University of Geosciences (Wuhan) · [**UrbanComp Lab**](https://urbancomp.net/)
- LIESMARS, Wuhan University · [**Urban Spatial Intelligence Research Group**](https://github.com/WHU-USI3DV)

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
