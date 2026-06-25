#!/usr/bin/env node
// ONE-TIME migration: fold the `release` population's lifetime contribution INTO the
// `catalog` ledger namespace as a frozen seed, then drop ledger.release entirely.
// After this the catalog branch's stats reference `release` NOWHERE — so the release
// branch can later be deleted with zero impact on downloadCount, and the new scheme
// works fully on its own. See docs/stats-two-branch-design.md.
//
// Pairs with aggregate-stats.mjs QUERY_REFS = ["catalog"] (release no longer harvested)
// and the retirement of correct-baseline (which targeted ledger.release).
//
// For each skill:
//   newRel = max( Σ ledger.release[this skill's SKILL.md paths] ,
//                 most-hit sibling-file estimate from a live @release harvest )
//     - monotonic: a saturated/failed estimate (pdf, update-test -> 0) KEEPS the
//       existing baseline; an under-counted one (docx / xlsx / thematic-map) is LIFTED
//       to the true install total. Every install fetches the whole package, so any
//       file's hit count approximates that skill's install count.
//   ledger.catalog[<current SKILL.md path>]["seed"] = max(existing, newRel)
//     - written under the synthetic "seed" date (real harvests only emit YYYY-MM-DD),
//       so future @catalog harvests max-merge on top WITHOUT double-counting.
// Then: delete ledger.release.
//
// Idempotent: if ledger.release is absent/empty, this is a NO-OP (already folded) —
// it will not re-harvest release or touch the catalog seeds again.
//
// CI: run on the catalog branch; aggregate-stats.mjs then rebuilds downloadCount from
// the folded ledger. Retire this script (with correct-baseline) afterwards.

import { promises as fs } from "node:fs"
import path from "node:path"

const REPO = "zzhonglei/GeoCode-Release"
const CATALOG_PATH = process.env.CATALOG_PATH
  ? path.resolve(process.env.CATALOG_PATH)
  : path.resolve("./store/catalog.json")
const HISTORY_PATH = path.join(path.dirname(CATALOG_PATH), "stats-history.json")
const SENTINEL = "seed" // synthetic date key; real harvests only ever emit YYYY-MM-DD
const SKILL_RE = /^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/
const idOfAny = (n) => {
  const m = String(n).match(/^\/core\/([^/]+)\//)
  return m ? m[1] : null
}
const bsum = (b) => Object.values(b || {}).reduce((a, v) => a + (Number(v) || 0), 0)

// file name -> hits, max over day+year. The most-hit file ≈ this skill's install total.
async function harvestMaxPerFile() {
  const merged = {}
  for (const period of ["day", "year"]) {
    const res = await fetch(
      `https://data.jsdelivr.com/v1/stats/packages/gh/${REPO}@release/files?period=${period}&limit=100`,
      { headers: { Accept: "application/json" } },
    )
    if (res.status === 404) continue
    if (!res.ok) throw new Error(`harvest ${period}: ${res.status} ${res.statusText}`)
    const body = await res.json()
    if (!Array.isArray(body)) throw new Error(`harvest ${period}: unexpected shape`)
    for (const f of body) {
      if (typeof f?.name !== "string") continue
      let s = 0
      for (const v of Object.values(f?.hits?.dates || {})) s += Number(v) || 0
      if (s > (merged[f.name] ?? 0)) merged[f.name] = s
    }
  }
  return merged
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))
  const ledger = JSON.parse(await fs.readFile(HISTORY_PATH, "utf-8"))
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
    throw new Error("ledger root is not an object — refusing to fold.")
  }

  // Idempotency guard: already folded -> do nothing (never re-harvest / re-seed).
  if (!ledger.release || Object.keys(ledger.release).length === 0) {
    console.log("ledger.release 不存在或为空 — 已折叠过,无需处理(no-op)。")
    return
  }

  // Sibling-file install estimate per skill from a live @release harvest.
  const merged = await harvestMaxPerFile()
  const reb = {}
  for (const [name, hits] of Object.entries(merged)) {
    const id = idOfAny(name)
    if (!id) continue
    if (hits > (reb[id] ?? 0)) reb[id] = hits
  }

  // Current ledger.release lifetime total per skill (sum over all of its hashes).
  const relTot = {}
  for (const [p, buckets] of Object.entries(ledger.release)) {
    const m = p.match(SKILL_RE)
    if (!m) continue
    relTot[m[1]] = (relTot[m[1]] ?? 0) + bsum(buckets)
  }

  ledger.catalog ??= {}
  console.log("=== 折叠 release -> catalog seed(单调取高)===")
  console.log("skill".padEnd(20), "rel合".padStart(6), "反推".padStart(6), "newRel".padStart(7), "  来源")
  let grand = 0
  for (const s of catalog.skills) {
    const skillFile = s.packageFiles.find((f) => f.dest === "SKILL.md")
    if (!skillFile) {
      console.log(s.id.padEnd(20), "  (无 SKILL.md packageFile,跳过)")
      continue
    }
    const skillPath = "/" + skillFile.source
    const rt = relTot[s.id] ?? 0
    const rb = reb[s.id] ?? 0
    const newRel = Math.max(rt, rb)
    const note = rb > rt ? `兄弟反推提升 ${rt}->${rb}` : rb === 0 ? "反推失效,保留账本" : "账本更准,保留"
    if (newRel <= 0) {
      console.log(s.id.padEnd(20), String(rt).padStart(6), String(rb).padStart(6), String(0).padStart(7), "  (无信号,跳过)")
      continue
    }
    const bucket = (ledger.catalog[skillPath] ??= {})
    bucket[SENTINEL] = Math.max(bucket[SENTINEL] ?? 0, newRel)
    grand += newRel
    console.log(s.id.padEnd(20), String(rt).padStart(6), String(rb).padStart(6), String(newRel).padStart(7), "  " + note)
  }
  console.log("-".repeat(54))
  console.log("release 基线合计折入 catalog seed:", grand)

  // Sever the link: drop the entire release namespace. The catalog ledger is now
  // self-contained — deleting the release branch later cannot affect downloadCount.
  delete ledger.release

  await fs.writeFile(HISTORY_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf-8")
  console.log("\n已删除 ledger.release。账本现在只含 catalog 命名空间(自包含)。")
  console.log("写回:", HISTORY_PATH)
}

main().catch((err) => {
  console.error("fold-release-into-catalog.mjs crashed:", err)
  process.exit(2)
})
