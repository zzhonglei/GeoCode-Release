#!/usr/bin/env node
// ONE-TIME baseline correction (run via the correct-baseline workflow_dispatch).
//
// Why: a few skills carry SO MANY package files (docx ~60 Office schemas, xlsx
// ~53) that, on the legacy single-branch @release, those files saturate jsdelivr's
// top-100 stats window and push the skills' own SKILL.md out of it ENTIRELY. The
// harvester only counts SKILL.md, so these skills were stuck at a hand-pinned
// floor (docx 10 / xlsx 7 / pdf 2) that badly under-counts their real installs.
//
// The two-branch design already fixes this for NEW clients (@catalog has no schema
// files, so SKILL.md is always visible). This script repairs the BASELINE the new
// scheme inherits: re-derive each target skill's TRUE install total from its
// most-hit sibling file on @release — every install fetches the whole package, so
// any file's hit count ≈ install count — and re-pin the ledger seed to it.
//
// Safe (no double-count): these skills' SKILL.md is STRUCTURALLY invisible on
// @release, so the ongoing harvest contributes 0 for them; the corrected seed just
// sits as a frozen baseline that @catalog installs accrue on top of. Skills whose
// SKILL.md is (even intermittently) visible are NOT targeted here — pinning them
// could double-count on the days they do rank. See docs/stats-two-branch-design.md.
//
// CI order: correct-baseline.mjs (fix ledger seeds) -> aggregate-stats.mjs (rebuild
// downloadCount from the corrected ledger).

import { promises as fs } from "node:fs"
import path from "node:path"

const REPO = "zzhonglei/GeoCode-Release"
const CATALOG_PATH = process.env.CATALOG_PATH
  ? path.resolve(process.env.CATALOG_PATH)
  : path.resolve("./store/catalog.json")
const HISTORY_PATH = path.join(path.dirname(CATALOG_PATH), "stats-history.json")
const SENTINEL = "seed" // synthetic date key; real harvests only ever emit YYYY-MM-DD
const SKILL_RE = /^\/core\/([^/]+)\/SKILL\.[a-f0-9]+\.md$/

// Only skills whose SKILL.md is structurally invisible on @release (their own files
// saturate the top-100). Re-pinning these can never double-count.
const TARGET = new Set(["docx-reader", "xlsx", "pdf"])

async function harvestMaxPerFile() {
  // file name -> hits, max over day+year (each install fetches every file once, so
  // the most-hit file's count is the best estimate of that skill's install total).
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

const bsum = (b) => Object.values(b || {}).reduce((a, v) => a + (Number(v) || 0), 0)

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"))
  const ledger = JSON.parse(await fs.readFile(HISTORY_PATH, "utf-8"))
  if (!ledger || typeof ledger !== "object" || !ledger.release) {
    throw new Error("ledger.release missing/invalid — refusing to correct.")
  }

  const merged = await harvestMaxPerFile()

  console.log("=== 基线修正(仅结构性不可见的饱和 skill)===")
  console.log("skill".padEnd(16), "原 seed".padStart(8), "修正为".padStart(8), "  最高命中文件")
  let changed = false
  for (const s of catalog.skills) {
    if (!TARGET.has(s.id)) continue
    const skillFile = s.packageFiles.find((f) => f.dest === "SKILL.md")
    if (!skillFile) {
      console.log(s.id.padEnd(16), "  (无 SKILL.md packageFile,跳过)")
      continue
    }
    const skillPath = "/" + skillFile.source

    // True install estimate = max hits over ALL of this skill's current files.
    let truth = 0
    let bestName = ""
    for (const f of s.packageFiles) {
      const h = merged["/" + f.source] || 0
      if (h > truth) {
        truth = h
        bestName = "/" + f.source
      }
    }

    // Old total (any hash) for the review line.
    let old = 0
    for (const [k, v] of Object.entries(ledger.release)) {
      const m = k.match(SKILL_RE)
      if (m && m[1] === s.id) old += bsum(v)
    }

    if (truth <= 0) {
      console.log(s.id.padEnd(16), String(old).padStart(8), "  (无信号,跳过)")
      continue
    }
    // Never let the correction LOWER an existing baseline (harvest lag etc.).
    if (truth < old) {
      console.log(s.id.padEnd(16), String(old).padStart(8), `  (反推 ${truth} < 现值,保留现值)`)
      continue
    }

    // Drop ALL existing SKILL.md entries for this skill (any stale hash) so the
    // corrected seed under the CURRENT hash can't double up with an old one.
    for (const k of Object.keys(ledger.release)) {
      const m = k.match(SKILL_RE)
      if (m && m[1] === s.id) delete ledger.release[k]
    }
    ledger.release[skillPath] = { [SENTINEL]: truth }
    changed = true
    console.log(s.id.padEnd(16), String(old).padStart(8), String(truth).padStart(8), "  " + bestName)
  }

  if (!changed) {
    console.log("\n没有需要修正的条目 — 账本未改动。")
    return
  }
  await fs.writeFile(HISTORY_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf-8")
  console.log("\n已写回修正后的账本:", HISTORY_PATH)
}

main().catch((e) => {
  console.error("correct-baseline.mjs crashed:", e)
  process.exit(2)
})
