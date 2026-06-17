#!/usr/bin/env node
// Fill downloadCount in store/catalog.json from a date-bucket ledger built off
// jsdelivr's free stats API. See docs/stats-two-branch-design.md §4.
//
// Ledger (stats-history.json) — the source of truth — keyed ref -> path -> {date: hits}:
//   { "catalog": { "/core/pdf/SKILL.f2.md": { "2026-06-20": 2, ... } },
//     "release": { "/core/gee.../SKILL.d9.md": { "2026-05-04": 9, ... } } }
//
//   downloadCount(skill) = Σ_ref Σ_{paths of that skill's SKILL.md} Σ_date  ledger[ref][path][date]
//
// Why a date-bucket ledger (not "max of the year-window total"):
//   - True all-time cumulative: each calendar day is counted once and kept
//     forever -> immune to jsdelivr's 1-year window aging.
//   - Cross-version: each skill version is a new SKILL.<hash> path; their day
//     buckets simply sum.
//   - Cross-population during transition: @release (old clients) and @catalog
//     (new clients) are DISTINCT request populations -> keyed per ref and SUMMED
//     (NOT max-merged across refs).
//
// Capture queries BOTH period=day and period=year per ref:
//   - day  -> guarantees a freshly published SKILL.<hash> is recorded the day it
//             is installed. The `catalog` branch has no schema files crowding the
//             per-day top-100, so frequent updates never lose counts.
//   - year -> backfill / catch-up if the cron missed ticks.
//   Both max-merge into the same ledger.
//
// Bucket merge rule: ledger[ref][path][date] = max(stored, fetched). NEVER +=.
//   jsdelivr lags ~2 days, so recent buckets keep rising across harvests; max
//   converges to the final value while += would double-count the same day.

import { promises as fs } from "node:fs"
import path from "node:path"

const REPO = "zzhonglei/GeoCode-Release"
// Refs whose SKILL.md hits we COUNT. `assets` is never queried (we don't count
// asset files). Drop "release" from this list once the release branch is retired.
const QUERY_REFS = ["catalog", "release"]
const PERIODS = ["day", "year"]

// publish.yml points CATALOG_PATH at dist/catalog/store/catalog.json (built but
// not yet deployed); refresh-stats.yml runs against the catalog branch's
// ./store/catalog.json. The ledger lives next to the catalog.
const CATALOG_PATH = process.env.CATALOG_PATH
  ? path.resolve(process.env.CATALOG_PATH)
  : path.resolve("./store/catalog.json")
const HISTORY_PATH = path.join(path.dirname(CATALOG_PATH), "stats-history.json")

// Only SKILL.md counts as the per-install proxy (one fetch per install).
const SKILL_PATH_REGEX = /^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/

function statsUrl(ref, period) {
  return `https://data.jsdelivr.com/v1/stats/packages/gh/${REPO}@${ref}/files?period=${period}&limit=100`
}

/**
 * Fetch one (ref, period). Returns [{ name, dates: {date: hits} }].
 * 404 -> [] (branch not served yet / no data). Throws on real errors so the
 * caller can skip just this (ref, period) and keep the rest.
 */
async function fetchFiles(ref, period) {
  const res = await fetch(statsUrl(ref, period), { headers: { Accept: "application/json" } })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`stats ${ref}/${period}: ${res.status} ${res.statusText}`)
  const body = await res.json()
  if (!Array.isArray(body)) throw new Error(`stats ${ref}/${period}: unexpected body shape`)
  const out = []
  for (const f of body) {
    if (typeof f?.name !== "string") continue
    const dates = f?.hits?.dates && typeof f.hits.dates === "object" ? f.hits.dates : null
    if (!dates) continue
    out.push({ name: f.name, dates })
  }
  return out
}

/** Max-merge one ref's harvested SKILL.md day buckets into the ledger. */
function mergeIntoLedger(ledger, ref, files) {
  let changed = false
  const refLedger = (ledger[ref] ??= {})
  for (const { name, dates } of files) {
    if (!SKILL_PATH_REGEX.test(name)) continue
    const bucket = (refLedger[name] ??= {})
    for (const [date, raw] of Object.entries(dates)) {
      const hits = Number(raw)
      if (!Number.isFinite(hits) || hits < 0) continue
      if (hits > (bucket[date] ?? 0)) {
        bucket[date] = hits // replace/max — never accumulate (jsdelivr lag, see header)
        changed = true
      }
    }
  }
  return changed
}

/** Σ_ref Σ_{paths of skill id} Σ_date -> { id: total }. */
function aggregate(ledger) {
  const counts = {}
  for (const refLedger of Object.values(ledger)) {
    for (const [p, buckets] of Object.entries(refLedger)) {
      const m = p.match(SKILL_PATH_REGEX)
      if (!m) continue
      let sum = 0
      for (const v of Object.values(buckets)) sum += Number(v) || 0
      counts[m[1]] = (counts[m[1]] ?? 0) + sum
    }
  }
  return counts
}

function totalPaths(ledger) {
  let n = 0
  for (const refLedger of Object.values(ledger)) n += Object.keys(refLedger).length
  return n
}

async function writeJson(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

async function main() {
  // Catalog: missing = nothing to do (branch not built yet). Present-but-corrupt
  // = throw (don't silently skip a real catalog).
  let catalog
  try {
    catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`No catalog at ${CATALOG_PATH} — nothing to refresh.`)
      process.exit(0)
    }
    throw err
  }

  // Ledger: absent = cold start (OK). Present-but-corrupt = ABORT — never fall
  // back to {} or the write below would wipe every accumulated count.
  let ledger = {}
  try {
    const text = await fs.readFile(HISTORY_PATH, "utf-8")
    ledger = JSON.parse(text)
    if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
      throw new Error("ledger root is not an object")
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      ledger = {} // first run on this branch
    } else {
      console.error(`stats-history.json present but unreadable (${err.message}). Refusing to overwrite — aborting.`)
      process.exit(2)
    }
  }

  // Best-effort harvest: each (ref, period) independently. jsdelivr being down for
  // some/all queries is tolerated — we still rebuild from the existing ledger.
  let ledgerChanged = false
  for (const ref of QUERY_REFS) {
    for (const period of PERIODS) {
      try {
        const files = await fetchFiles(ref, period)
        if (mergeIntoLedger(ledger, ref, files)) ledgerChanged = true
      } catch (err) {
        console.warn(`Stats fetch failed (non-fatal): ${err.message}. Continuing.`)
      }
    }
  }

  // Refuse to zero out: no ledger data at all (cold start AND every fetch failed)
  // -> exit non-zero so publish aborts rather than deploying downloadCount=0.
  if (totalPaths(ledger) === 0) {
    console.error("No stats data and no history — refusing to write zeroed downloadCount.")
    process.exit(1)
  }

  // Rebuild downloadCount from the FULL ledger (the source of truth), not from
  // this tick's API response.
  const counts = aggregate(ledger)
  let catalogChanged = false
  for (const skill of catalog.skills) {
    const next = counts[skill.id] ?? 0
    if (skill.downloadCount !== next) {
      skill.downloadCount = next
      catalogChanged = true
    }
  }

  // Observability guardrail (design §12): on the tiny `catalog` branch every
  // catalog skill should resolve to a ledger entry. A miss is an early warning
  // (saturation, or a skill whose SKILL.md was never captured).
  const missing = catalog.skills.filter((s) => counts[s.id] === undefined).map((s) => s.id)
  console.log(
    `Stats: ${catalog.skills.length} skill(s), ${catalog.skills.length - missing.length} located` +
      (missing.length ? ` — MISSING: ${missing.join(", ")}` : ""),
  )

  if (catalogChanged) {
    catalog.lastStatsAt = new Date().toISOString()
    await writeJson(CATALOG_PATH, catalog)
    console.log(`Updated downloadCount for ${catalog.skills.length} skill(s).`)
  } else {
    console.log("No downloadCount changes — catalog unchanged.")
  }

  if (ledgerChanged) {
    await writeJson(HISTORY_PATH, ledger)
    console.log(`Updated ledger (${totalPaths(ledger)} path(s) tracked).`)
  } else {
    console.log("No ledger changes — stats-history.json unchanged.")
  }
}

main().catch((err) => {
  console.error("aggregate-stats.mjs crashed:", err)
  process.exit(2)
})
