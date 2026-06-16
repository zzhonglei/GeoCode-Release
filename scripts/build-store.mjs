#!/usr/bin/env node
// Walk contributions/, content-hash every file under skill/, and lay out THREE
// publish trees under dist/ for the two-branch stats architecture.
// See docs/stats-two-branch-design.md.
//
//   dist/catalog/   -> deployed to the `catalog` branch (stats surface + index)
//     store/catalog.json             schemaVersion 2: refs + per-file `ref`
//     core/<id>/SKILL.<hash>.md       ONLY SKILL.md — keeps the stats ranking unsaturated
//   dist/assets/    -> deployed to the `assets` branch (everything else; never stats-queried)
//     core/<id>/<all non-SKILL.md files, hashed>
//   dist/release/   -> legacy single-branch layout for OLD clients (transition only;
//     store/catalog.json             schemaVersion 1, packageBaseUrl (current format)
//     core/<id>/<all files, hashed>   flip EMIT_RELEASE=false after release is retired)
//
// downloadCount is emitted as 0 here; aggregate-stats.mjs fills it from the
// date-bucket ledger (stats-history.json), which lives on the `catalog` branch.

import { promises as fs } from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import {
  CONTRIBUTIONS_DIR,
  REPO_ROOT,
  exists,
  listContributionIds,
  parseFrontmatter,
  readJson,
  walkFiles,
} from "./util.mjs"

// ----------------------------------------------------------------------------
// Config — branch names are the contract identifier (catalog refs, workflow
// deploy targets, stats query URLs all derive from these). Change here only.
// ----------------------------------------------------------------------------
const REPO = "zzhonglei/GeoCode-Release"
const CATALOG_BRANCH = "catalog" // stats surface + catalog index (only SKILL.md)
const ASSETS_BRANCH = "assets" // bulk skill files (everything except SKILL.md)
const EMIT_RELEASE = true // transition: also emit legacy release tree. Flip false after retirement.

const SCHEMA_VERSION = 2
const HASH_LEN = 8

const DIST_DIR = path.join(REPO_ROOT, "dist")
const DIST_CATALOG = path.join(DIST_DIR, "catalog")
const DIST_ASSETS = path.join(DIST_DIR, "assets")
const DIST_RELEASE = path.join(DIST_DIR, "release")

// Full download bases written into the v2 catalog so the client resolves a
// file as `refs[file.ref] + "/" + file.source` (jsdelivr) with a per-file
// fallback to `fallbackRefs[file.ref] + "/" + file.source` (GitHub raw).
const REFS = {
  catalog: `https://cdn.jsdelivr.net/gh/${REPO}@${CATALOG_BRANCH}`,
  assets: `https://cdn.jsdelivr.net/gh/${REPO}@${ASSETS_BRANCH}`,
}
const FALLBACK_REFS = {
  catalog: `https://raw.githubusercontent.com/${REPO}/${CATALOG_BRANCH}`,
  assets: `https://raw.githubusercontent.com/${REPO}/${ASSETS_BRANCH}`,
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function sha256Short(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, HASH_LEN)
}

/** "scripts/run.py" + "abc12345" -> "scripts/run.abc12345.py" */
function injectHash(relPath, hash) {
  const ext = path.extname(relPath)
  const dir = path.dirname(relPath)
  const base = path.basename(relPath, ext)
  const hashed = `${base}.${hash}${ext}`
  return dir === "." ? hashed : path.join(dir, hashed)
}

async function copyFile(srcAbs, destAbs) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true })
  await fs.copyFile(srcAbs, destAbs)
}

async function writeJson(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

async function rmrf(p) {
  await fs.rm(p, { recursive: true, force: true })
}

// ----------------------------------------------------------------------------
// Per-skill build
// ----------------------------------------------------------------------------

async function buildSkill(id, generatedAt) {
  const root = path.join(CONTRIBUTIONS_DIR, id)
  const manifestDir = path.join(root, "manifest")
  const skillDir = path.join(root, "skill")

  const meta = await readJson(path.join(manifestDir, "meta.json"))
  const skillMd = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf-8")
  const fm = parseFrontmatter(skillMd)
  if (!fm) throw new Error(`[${id}] SKILL.md missing frontmatter`)
  const frontmatterName = String(fm.data.name ?? "").trim()
  if (!frontmatterName) throw new Error(`[${id}] frontmatter.name is required`)
  // meta.displayName overrides the UI card title; frontmatter.name (often
  // verbose, for LLM matching) is the fallback. Same rule as validate-skill.mjs.
  const metaDisplayName = typeof meta.displayName === "string" ? meta.displayName.trim() : ""
  const displayName = metaDisplayName || frontmatterName

  const skillFiles = await walkFiles(skillDir)
  if (!skillFiles.includes("SKILL.md")) throw new Error(`[${id}] skill/SKILL.md missing`)

  const v2Files = [] // catalog v2 packageFiles: { source (full path), dest, ref }
  const v1Files = [] // legacy release packageFiles: { source (relative), dest }
  let totalBytes = 0

  for (const rel of skillFiles) {
    const srcAbs = path.join(skillDir, rel)
    const buf = await fs.readFile(srcAbs)
    const hashedRel = injectHash(rel, sha256Short(buf)).replaceAll("\\", "/")
    const destRel = rel.replaceAll("\\", "/")
    const isSkillMd = destRel === "SKILL.md"
    const ref = isSkillMd ? "catalog" : "assets"

    // v2: SKILL.md -> catalog branch, everything else -> assets branch.
    v2Files.push({ source: `core/${id}/${hashedRel}`, dest: destRel, ref })
    const branchDist = isSkillMd ? DIST_CATALOG : DIST_ASSETS
    await copyFile(srcAbs, path.join(branchDist, "core", id, hashedRel))

    // Legacy release tree: all files together, relative source under packageBaseUrl.
    if (EMIT_RELEASE) {
      v1Files.push({ source: hashedRel, dest: destRel })
      await copyFile(srcAbs, path.join(DIST_RELEASE, "core", id, hashedRel))
    }

    totalBytes += buf.byteLength
  }

  // Shared catalog row fields (both v1 and v2 carry these).
  const common = {
    id,
    name: displayName,
    displayName,
    version: typeof meta.version === "string" && meta.version.trim() ? meta.version.trim() : "0.1.0",
    description: meta.description,
    tags: meta.tags,
    author: meta.author,
    minClientVersion: meta.minClientVersion,
    license: meta.license,
    deprecated: meta.deprecated === true ? true : false,
    ...(typeof meta.sourceUrl === "string" && meta.sourceUrl.trim()
      ? { sourceUrl: meta.sourceUrl.trim() }
      : {}),
    size: totalBytes,
    fileCount: skillFiles.length,
    updatedAt: generatedAt,
    downloadCount: 0,
  }

  return {
    v2: { ...common, packageFiles: v2Files },
    v1: { ...common, packageBaseUrl: `/core/${id}/`, packageFiles: v1Files },
  }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  if (!(await exists(CONTRIBUTIONS_DIR))) {
    console.error("contributions/ does not exist — nothing to build.")
    process.exit(1)
  }

  await rmrf(DIST_DIR)

  const generatedAt = new Date().toISOString()
  const ids = (await listContributionIds()).sort()

  const v2Rows = []
  const v1Rows = []
  for (const id of ids) {
    console.log(`Building ${id}...`)
    const r = await buildSkill(id, generatedAt)
    v2Rows.push(r.v2)
    v1Rows.push(r.v1)
  }

  // catalog branch: v2 catalog (refs + per-file ref). The stats surface.
  await writeJson(path.join(DIST_CATALOG, "store", "catalog.json"), {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    refs: REFS,
    fallbackRefs: FALLBACK_REFS,
    skills: v2Rows,
  })

  // release branch (transition only): legacy v1 catalog for old clients.
  if (EMIT_RELEASE) {
    await writeJson(path.join(DIST_RELEASE, "store", "catalog.json"), {
      schemaVersion: 1,
      generatedAt,
      skills: v1Rows,
    })
  }

  console.log(
    `OK: built ${v2Rows.length} skill(s) into dist/catalog + dist/assets${EMIT_RELEASE ? " + dist/release" : ""}`,
  )
}

main().catch((err) => {
  console.error("build-store.mjs crashed:", err)
  process.exit(2)
})
