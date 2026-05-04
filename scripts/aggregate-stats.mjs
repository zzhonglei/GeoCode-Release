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
const STATS_URL =
  "https://data.jsdelivr.com/v1/stats/packages/gh/zzhonglei/GeoCode-Release/files?period=all"

/**
 * jsdelivr returns one entry per served file. Aggregate by skill id by
 * matching the well-known SKILL.<hash>.md path pattern. Each install pulls
 * SKILL.md exactly once, so summing those is a fair proxy for "installs".
 */
function aggregateBySkill(files) {
  const counts = {}
  for (const file of files) {
    const name = typeof file?.name === "string" ? file.name : ""
    const m = name.match(/^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/)
    if (!m) continue
    const id = m[1]
    const hits = Number(file?.hits?.total ?? file?.hits ?? 0)
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
    return []
  }
  if (!res.ok) throw new Error(`Stats API failed: ${res.status} ${res.statusText}`)
  const body = await res.json()
  // jsdelivr's response shape is `{ files: [...] }` in newer schemas and a
  // bare array in older ones. Tolerate both.
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.files)) return body.files
  return []
}

async function main() {
  let catalog
  try {
    catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))
  } catch (err) {
    console.error(`No catalog at ${CATALOG_PATH} — nothing to refresh.`)
    process.exit(0) // not an error: release branch may not be built yet
  }

  const files = await fetchStats()
  const counts = aggregateBySkill(files)

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
