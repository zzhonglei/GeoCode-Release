#!/usr/bin/env node
// Refresh downloadCount in store/catalog.json from jsdelivr's free stats API.
// Run by .github/workflows/refresh-stats.yml as a 1h cron, against the
// release branch (where store/catalog.json lives at the repo root).
//
// Counting policy: per-hash max accumulation. jsdelivr's stats API caps the
// window at `period=year`, so old SKILL.<hash>.md files (from previous skill
// versions or just aged-out hits) will silently fall out of the window and
// shrink the count. To get a true "all-time" total we maintain a sidecar
// store/stats-history.json on the release branch that records the running
// max per hashed file path. Each cron tick:
//   1. read history (or {} on first run)
//   2. for every SKILL.<hash>.md path jsdelivr knows about, set
//      history[path] = max(history[path], currentHits)
//   3. aggregate the WHOLE history (not just this tick's response) into
//      per-skill downloadCount and write catalog.json + history.json
// Hash-level max is the right granularity: a single hash's hit count is
// monotonically non-decreasing in reality, so any apparent drop is purely
// the window sliding — exactly what we want to ignore.
//
// Invariants:
//   - history is the source of truth; catalog.downloadCount is a derived
//     view (re-aggregated from history every run).
//   - jsdelivr is just a data source, not a dependency. When its stats API
//     returns 5xx/429/etc, we still rebuild catalog from the existing
//     history — that's what keeps publish from zeroing downloadCount when
//     stats API is down (build-store.mjs always emits dc=0 catalogs).
//   - Once jsdelivr succeeds at least once and history is populated, every
//     subsequent run keeps catalog in sync with history regardless of
//     whether jsdelivr is reachable.

import { promises as fs } from "node:fs"
import path from "node:path"

// Allow publish.yml to point at dist/store/catalog.json (built but not yet
// deployed) while refresh-stats.yml runs against the in-place release
// branch's ./store/catalog.json. History lives next to the catalog.
const CATALOG_PATH = process.env.CATALOG_PATH
  ? path.resolve(process.env.CATALOG_PATH)
  : path.resolve("./store/catalog.json")
const HISTORY_PATH = path.join(path.dirname(CATALOG_PATH), "stats-history.json")
// jsdelivr per-file stats endpoint. The `@release` ref scopes hits to files
// served from the release branch (where our skill packages actually live).
// `period=year` is jsdelivr v1's widest window; hash-level max accumulation
// (see file header) covers anything that ages out beyond a year.
//
// We use the modern v1/stats/packages/.../files endpoint. The older
// v1/package/.../stats endpoint has been deprecated since 2023 (the response
// includes a Deprecation header) and may be removed without notice.
//
// `limit=100` is jsdelivr's hard cap on this endpoint. With 5 active skills
// and a few hash files each, our footprint is well under 100. If history
// ever grows past ~80 SKILL.<hash>.md files we should add pagination — see
// the `?page=N` parameter on the same endpoint. jsdelivr sorts by hits
// desc, so even without pagination we'd retain the most popular hashes.
const STATS_URL =
  "https://data.jsdelivr.com/v1/stats/packages/gh/zzhonglei/GeoCode-Release@release/files?period=year&limit=100"

const SKILL_PATH_REGEX = /^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/

async function fetchStats() {
  const res = await fetch(STATS_URL, { headers: { Accept: "application/json" } })
  if (res.status === 404) {
    // jsdelivr returns 404 until the package has been served at least once.
    // Fresh repos hit this — treat as "no downloads yet".
    return {}
  }
  if (!res.ok) throw new Error(`Stats API failed: ${res.status} ${res.statusText}`)
  const body = await res.json()
  // The new /files endpoint returns a bare array: [{ name, hits: { total, dates }, bandwidth: {...} }, ...]
  // We normalize it into a { path -> { total } } map so the rest of the
  // pipeline (mergeIntoHistory) stays endpoint-agnostic.
  if (Array.isArray(body)) {
    const out = {}
    for (const f of body) {
      if (typeof f?.name !== "string") continue
      const total = Number(f?.hits?.total ?? f?.hits ?? 0)
      if (!Number.isFinite(total)) continue
      out[f.name] = { total }
    }
    return out
  }
  // Fallback: the deprecated v1/package/.../stats endpoint returned
  // { total, files: { "/path": { total, dates } } }. Keep this so a
  // temporary jsdelivr regression to the old shape doesn't break us.
  if (body && typeof body === "object" && body.files && typeof body.files === "object" && !Array.isArray(body.files)) {
    return body.files
  }
  // Unknown body shape (schema change, empty response, etc). Throw so the
  // outer soft-fail catches it — falling through with {} would zero out
  // every downloadCount in the catalog.
  throw new Error("Stats API returned unexpected body shape")
}

/** Apply this tick's jsdelivr response onto the running history (max-merge). */
function mergeIntoHistory(history, filesObj) {
  let changed = false
  for (const [filePath, stats] of Object.entries(filesObj)) {
    if (!SKILL_PATH_REGEX.test(filePath)) continue
    const hits = Number(stats?.total ?? 0)
    if (!Number.isFinite(hits) || hits < 0) continue
    const prev = history[filePath] ?? 0
    if (hits > prev) {
      history[filePath] = hits
      changed = true
    }
  }
  return changed
}

/** Sum every hash belonging to a skill id, from the full history. */
function aggregateFromHistory(history) {
  const counts = {}
  for (const [filePath, hits] of Object.entries(history)) {
    const m = filePath.match(SKILL_PATH_REGEX)
    if (!m) continue
    counts[m[1]] = (counts[m[1]] ?? 0) + hits
  }
  return counts
}

async function main() {
  let catalog
  try {
    catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))
  } catch (err) {
    console.error(`No catalog at ${CATALOG_PATH} — nothing to refresh.`)
    process.exit(0) // not an error: release branch may not be built yet
  }

  // History is best-effort optional: missing file just means cold start.
  let history = {}
  try {
    history = JSON.parse(await fs.readFile(HISTORY_PATH, "utf-8"))
    if (!history || typeof history !== "object" || Array.isArray(history)) history = {}
  } catch {
    // first run on this branch — start from empty
  }

  // Fetch is best-effort. When jsdelivr's stats API is down we still rebuild
  // catalog from the existing history below — that's what lets a transient
  // 5xx during publish NOT zero out downloadCount. build-store.mjs always
  // emits a fresh catalog with downloadCount=0, so history is the only
  // place real numbers survive across runs.
  let filesObj = {}
  try {
    filesObj = await fetchStats()
  } catch (err) {
    console.warn(`Stats fetch failed (non-fatal): ${err.message}. Reusing existing history; catalog still rebuilt from it.`)
  }

  const historyChanged = mergeIntoHistory(history, filesObj)

  // Rebuild catalog.downloadCount from the full history. Skip this when
  // history is empty — that means we have nothing to derive from, and the
  // catalog's existing values (if any) are more authoritative than zeroing
  // them out. Once jsdelivr serves stats at least once, history takes over
  // as the source of truth from then on.
  let catalogChanged = false
  if (Object.keys(history).length > 0) {
    const counts = aggregateFromHistory(history)
    for (const skill of catalog.skills) {
      const next = counts[skill.id] ?? 0
      if (skill.downloadCount !== next) {
        skill.downloadCount = next
        catalogChanged = true
      }
    }
  }

  if (catalogChanged) {
    catalog.lastStatsAt = new Date().toISOString()
    await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf-8")
    console.log(`Updated downloadCount for ${catalog.skills.length} skill(s).`)
  } else {
    console.log("No downloadCount changes — catalog unchanged.")
  }

  if (historyChanged) {
    await fs.mkdir(path.dirname(HISTORY_PATH), { recursive: true })
    await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n", "utf-8")
    console.log(`Updated stats-history.json (${Object.keys(history).length} files tracked).`)
  } else {
    console.log("No history changes — stats-history.json unchanged.")
  }
}

main().catch((err) => {
  console.error("aggregate-stats.mjs crashed:", err)
  process.exit(2)
})
