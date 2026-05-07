# Update Test

Throwaway verification skill for the GeoCode skill-store **update** path.
Companion to `hello-geocode`, which verifies the **install** path.

## What it does

When the user asks the LLM for the "update test version", the skill
instructs the model to reply with a single hard-coded line containing
the current version number. After bumping `manifest/meta.json` to a
higher version (and updating the version string inside `skill/SKILL.md`)
and republishing, the reply should change accordingly — that's how you
know the [Update] click actually pulled new files onto disk.

## Why install it

Pure verification. Use this skill once to confirm the four-step update
loop works end-to-end:

1. **Catalog detects new version** — `version` in `manifest/meta.json`
   is bumped on `main`, CI rebuilds `dist/store/catalog.json` on the
   `release` branch, jsdelivr serves the new catalog.
2. **Client sees [Update] badge** — Settings → Skill Bazaar surfaces
   the badge on the row whose installed version is strictly older than
   the catalog version (semver compare).
3. **Click [Update] replaces files** — backend pulls the package files
   from `dist/core/update-test/SKILL.<hash>.md` into the local install
   path and rewrites the version in the install record.
4. **Re-invoke confirms swap** — the LLM now reads the new SKILL.md
   contents and replies with the new version string.

After verification, disable or uninstall it. The skill has no real
functionality outside the test.

## Author

GeoCode.
