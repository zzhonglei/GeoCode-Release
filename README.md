# GeoCode-Release

Public distribution repo for [GeoCode](https://github.com/zzhonglei/GeoCode):

- **Releases**: macOS / Windows installers under [Releases](https://github.com/zzhonglei/GeoCode-Release/releases).
- **Skill store**: GIS-focused skills served via jsdelivr CDN to GeoCode clients.

## Repository layout

```
contributions/              ← skill source (one directory per skill)
  <skill-id>/
    manifest/
      README.md             ← user-facing description (shown in store UI)
      meta.json             ← metadata (description, tags, author, ...)
    skill/
      SKILL.md              ← OpenCode-protocol skill content (frontmatter: name, description)
      ...                   ← any other files / subdirs (free-form)

scripts/                    ← CI tooling
  validate-skill.mjs        ← PR-time checks
  build-store.mjs           ← merge-time build of dist/ → release branch
  aggregate-stats.mjs       ← hourly cron to refresh download counts

.github/workflows/          ← GitHub Actions
```

The `release` branch is CI-managed and contains the built artifacts under
`store/` (catalog + readmes) and `core/` (skill packages with content-hashed
filenames). jsdelivr mirrors `release` automatically — clients fetch from
`https://cdn.jsdelivr.net/gh/zzhonglei/GeoCode-Release@release/...`.
