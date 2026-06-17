#!/usr/bin/env node
// ONE-TIME migration (run once at P1, then review the printed baselines): build
// the corrected initial date-bucket ledger for the `catalog` branch so every
// skill starts P1 from its TRUE baseline instead of 0. See design §4.6.
//
// Corrected baseline = three sources, all stored under ledger.release:
//   (a) REAL harvest of @release (day+year)   -> visible skills' true per-day history
//   (b) existing @release stats-history.json  -> aged-out SKILL.md hashes the live
//        window no longer shows (e.g. an old version's hash)
//   (c) sibling-file derivation               -> skills whose SKILL.md was NEVER
//        visible (docx/pdf): estimate installs from their most-hit non-SKILL file
//        (every install fetches the whole package, so any file ≈ install count)
//
// (b) and (c) are written under a "seed" sentinel date that a real harvest can
// never produce, so future @release/@catalog harvests max-merge on top WITHOUT
// double-counting. Visible skills (a) carry real dates only — no seed, or the
// ongoing harvest would double them.
//
// Output: dist/catalog/store/stats-history.json (becomes the catalog branch's
// initial ledger). Requires `node build-store.mjs` first (reads its v2 catalog
// to learn each skill's current SKILL.md + sibling paths).

import { promises as fs } from "node:fs"
import path from "node:path"

const REPO = "zzhonglei/GeoCode-Release"
const CATALOG_PATH = process.env.CATALOG_PATH
  ? path.resolve(process.env.CATALOG_PATH)
  : path.resolve("dist/catalog/store/catalog.json")
const HISTORY_OUT = path.join(path.dirname(CATALOG_PATH), "stats-history.json")
const OLD_HISTORY_URL = `https://raw.githubusercontent.com/${REPO}/release/store/stats-history.json`
const SKILL_RE = /^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/
const SENTINEL = "seed" // synthetic date key; real harvests only ever emit YYYY-MM-DD

// Hand-pinned baselines for skills whose SKILL.md was never visible on @release
// (saturated). Their sibling-file estimate fluctuates run-to-run (siblings hit
// the same top-100 cap), so we pin a stable, conservative floor here instead.
// This only sets the ONE-TIME initial display; once the catalog branch serves
// new clients, real per-install counts accrue on top and overtake the floor.
const MANUAL_SEED = {
  "docx-reader": 10,
  pdf: 2,
}

async function harvestAll(ref) {
  // path -> { date: hits }, max-merged across day+year, ALL files (not just SKILL.md)
  const out = {}
  for (const period of ["day", "year"]) {
    const res = await fetch(
      `https://data.jsdelivr.com/v1/stats/packages/gh/${REPO}@${ref}/files?period=${period}&limit=100`,
      { headers: { Accept: "application/json" } },
    )
    if (res.status === 404) continue
    if (!res.ok) throw new Error(`harvest ${ref}/${period}: ${res.status} ${res.statusText}`)
    const body = await res.json()
    if (!Array.isArray(body)) throw new Error(`harvest ${ref}/${period}: unexpected shape`)
    for (const f of body) {
      if (typeof f?.name !== "string") continue
      const dates = f?.hits?.dates
      if (!dates || typeof dates !== "object") continue
      const b = (out[f.name] ??= {})
      for (const [d, raw] of Object.entries(dates)) {
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) continue
        if (n > (b[d] ?? 0)) b[d] = n
      }
    }
  }
  return out
}

const bsum = (buckets) => Object.values(buckets || {}).reduce((a, b) => a + (Number(b) || 0), 0)

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))

  // skill id -> { skillPath (jsdelivr-style), siblingPaths[] } from the v2 catalog
  const info = {}
  for (const s of catalog.skills) {
    const skillFile = s.packageFiles.find((f) => f.dest === "SKILL.md")
    info[s.id] = {
      skillPath: "/" + skillFile.source,
      siblingPaths: s.packageFiles.filter((f) => f.dest !== "SKILL.md").map((f) => "/" + f.source),
    }
  }
  const currentIds = new Set(Object.keys(info))

  const release = {} // ledger.release: path -> { date: hits }
  const prov = {} // id -> { harvest, seed } for the review table
  for (const id of currentIds) prov[id] = { harvest: 0, seed: 0, note: "实测收割" }

  // (a) real harvest of @release — keep only SKILL.md paths of current skills
  const harvest = await harvestAll("release")
  for (const [p, buckets] of Object.entries(harvest)) {
    const m = p.match(SKILL_RE)
    if (!m || !currentIds.has(m[1])) continue
    release[p] = { ...buckets }
    prov[m[1]].harvest += bsum(buckets)
  }

  // (b) aged-out SKILL.md hashes from the existing scalar history (paths the
  //     live harvest didn't return -> add as a sentinel bucket).
  // The old release history is the ONLY source for aged-out hashes (e.g. xlsx,
  // an old update-test version). A transient failure must abort the one-time
  // seed rather than silently baking an incomplete baseline. Only a genuine 404
  // (release never had a history file) is tolerated; any other status or a
  // network error throws -> aborts (caught by main().catch -> exit 2).
  let oldHist = {}
  const r = await fetch(OLD_HISTORY_URL)
  if (r.status === 404) {
    console.warn("Old release history not found (404) — proceeding without aged-out backfill.")
  } else if (!r.ok) {
    throw new Error(`old history fetch failed: ${r.status} ${r.statusText} — aborting seed`)
  } else {
    oldHist = await r.json()
  }
  for (const [p, scalar] of Object.entries(oldHist)) {
    const m = p.match(SKILL_RE)
    if (!m || !currentIds.has(m[1])) continue // skip non-current / removed skills
    if (release[p]) continue // already harvested with real dates
    const n = Number(scalar)
    if (!Number.isFinite(n) || n <= 0) continue
    release[p] = { [SENTINEL]: n }
    prov[m[1]].seed += n
    if (prov[m[1]].harvest === 0) prov[m[1]].note = "老 history(已老化)"
  }

  // (c) skills still at 0 (SKILL.md never recorded anywhere: docx/pdf) -> derive
  //     install estimate from the most-hit sibling file in the harvest.
  for (const id of currentIds) {
    if (prov[id].harvest + prov[id].seed > 0) continue
    // Prefer a hand-pinned stable floor over the fluctuating sibling estimate.
    if (MANUAL_SEED[id] != null) {
      release[info[id].skillPath] = { [SENTINEL]: MANUAL_SEED[id] }
      prov[id].seed += MANUAL_SEED[id]
      prov[id].note = "手钉固定值"
      continue
    }
    let best = 0
    for (const sp of info[id].siblingPaths) {
      const s = bsum(harvest[sp])
      if (s > best) best = s
    }
    if (best > 0) {
      release[info[id].skillPath] = { [SENTINEL]: best }
      prov[id].seed += best
      prov[id].note = "兄弟文件反推(无手钉值)"
    } else {
      prov[id].note = "无数据(真 0)"
    }
  }

  const ledger = { release, catalog: {} }

  // ---- review table --------------------------------------------------------
  console.log("=== 修正后初始基线(catalog 分支 P1 起跑值)===")
  console.log("skill".padEnd(22), "收割".padStart(6), "seed".padStart(6), "合计".padStart(6), "  来源")
  let grand = 0
  for (const s of catalog.skills) {
    const pr = prov[s.id]
    const total = pr.harvest + pr.seed
    grand += total
    console.log(
      s.id.padEnd(22),
      String(pr.harvest).padStart(6),
      String(pr.seed).padStart(6),
      String(total).padStart(6),
      "  " + pr.note,
    )
  }
  console.log("-".repeat(54))
  console.log("合计".padEnd(22), "", "", String(grand).padStart(20))

  await fs.mkdir(path.dirname(HISTORY_OUT), { recursive: true })
  await fs.writeFile(HISTORY_OUT, JSON.stringify(ledger, null, 2) + "\n", "utf-8")
  console.log("\n初始账本已写入:", HISTORY_OUT)
}

main().catch((err) => {
  console.error("seed-ledger.mjs crashed:", err)
  process.exit(2)
})
