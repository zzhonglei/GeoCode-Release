#!/usr/bin/env node
// Refresh downloadCount in store/catalog.json from jsdelivr's free stats API.
// Run by .github/workflows/refresh-stats.yml as a 1h cron, against the
// release branch (where store/catalog.json lives at the repo root).
//
// Counting policy: sum hits across every SKILL.<hash>.md ever served for a
// given skill id, so the count survives version bumps.

import { promises as fs } from "node:fs"
import path from "node:path"

// Allow publish.yml to point at dist/store/catalog.json (built but not yet
// deployed) while refresh-stats.yml runs against the in-place release
// branch's ./store/catalog.json.
const CATALOG_PATH = process.env.CATALOG_PATH
  ? path.resolve(process.env.CATALOG_PATH)
  : path.resolve("./store/catalog.json")
// jsdelivr per-file stats endpoint. The `@release` ref scopes hits to files
// served from the release branch (where our skill packages actually live).
// `period=year` is the widest window v1 supports — refresh-stats.yml runs
// hourly, so a year-long sliding window never loses data.
const STATS_URL =
  "https://data.jsdelivr.com/v1/package/gh/zzhonglei/GeoCode-Release@release/stats?period=year"

/**
 * jsdelivr v1 returns `{ total, files: { "/path/to/file": { total, dates } } }`.
 * Aggregate by skill id by matching the well-known SKILL.<hash>.md path
 * pattern. Each install pulls SKILL.md exactly once, so summing those is a
 * fair proxy for "installs".
 */
function aggregateBySkill(filesObj) {
  const counts = {}
  for (const [filePath, stats] of Object.entries(filesObj)) {
    const m = filePath.match(/^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/)
    if (!m) continue
    const id = m[1]
    const hits = Number(stats?.total ?? 0)
    if (!Number.isFinite(hits)) continue
    counts[id] = (counts[id] ?? 0) + hits
  }
  return counts
}

async function fetchStats() {
  const res = await fetch(STATS_URL, { headers: { Accept: "application/json" } })
  if (res.status === 404) {
    // jsdelivr returns 404 until the package has been served at least once.
    // Fresh repos hit this — treat as "no downloads yet".
    return {}
  }
  if (!res.ok) throw new Error(`Stats API failed: ${res.status} ${res.statusText}`)
  const body = await res.json()
  // Expected shape: { total, files: { ... } }. Tolerate the older bare-array
  // shape by converting it back to a path→stats map.
  if (body && typeof body === "object" && body.files && typeof body.files === "object" && !Array.isArray(body.files)) {
    return body.files
  }
  if (Array.isArray(body)) {
    const out = {}
    for (const f of body) {
      if (typeof f?.name === "string") out[f.name] = { total: Number(f?.hits?.total ?? f?.hits ?? 0) }
    }
    return out
  }
  return {}
}

async function main() {
  let catalog
  try {
    catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))
  } catch (err) {
    console.error(`No catalog at ${CATALOG_PATH} — nothing to refresh.`)
    process.exit(0) // not an error: release branch may not be built yet
  }

  let filesObj
  try {
    filesObj = await fetchStats()
  } catch (err) {
    // jsdelivr stats API is best-effort — 5xx, 429 throttling, and network
    // blips are common. Bail clean instead of red-flagging CI, and crucially
    // do NOT fall through with an empty object: that would zero out every
    // downloadCount in the catalog. The next hourly run will retry.
    console.warn(`Stats fetch failed (non-fatal): ${err.message}. Skipping this refresh; catalog left unchanged.`)
    return
  }
  const counts = aggregateBySkill(filesObj)

  let changed = 0
  for (const skill of catalog.skills) {
    const next = counts[skill.id] ?? 0
    if (skill.downloadCount !== next) {
      skill.downloadCount = next
      changed++
    }
  }

  if (changed === 0) {
    console.log("No downloadCount changes — skipping write.")
    return
  }

  await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf-8")
  console.log(`Updated downloadCount for ${changed} skill(s).`)
}

main().catch((err) => {
  console.error("aggregate-stats.mjs crashed:", err)
  process.exit(2)
})
