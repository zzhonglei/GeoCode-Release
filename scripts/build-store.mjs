#!/usr/bin/env node
// Walk contributions/, content-hash every file in skill/, lay it out under
// dist/core/<id>/, copy manifest/ files to dist/store/<id>/, and emit
// dist/store/catalog.json. Run by .github/workflows/publish.yml on push to main.
//
// First-version simplifications (left for follow-up if needed):
//   - version is read straight from manifest/meta.json (defaulting to 0.1.0).
//     Auto-bump from commit message labels can be layered on later.
//   - downloadCount is initialized to 0; aggregate-stats.mjs is the cron that
//     keeps it fresh.
//   - updatedAt = build time. Per-skill mtime would be preferable but git
//     checkout flattens mtimes, so we stick with the build timestamp.

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

// Release layout (kept intentionally minimal — clients only ever fetch
// catalog.json + the SKILL package files; manifest/README.md and meta.json
// stay on the main branch for contributors and GitHub web rendering).
//   dist/store/catalog.json
//   dist/core/<id>/SKILL.<hash>.<ext>  (and any other files under skill/)
const DIST_DIR = path.join(REPO_ROOT, "dist")
const DIST_CORE = path.join(DIST_DIR, "core")
const DIST_STORE = path.join(DIST_DIR, "store")
const SCHEMA_VERSION = 1
const HASH_LEN = 8

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function sha256Short(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, HASH_LEN)
}

/** "scripts/run.py" + "abc12345" → "scripts/run.abc12345.py" */
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

  // 1. Read manifest
  const meta = await readJson(path.join(manifestDir, "meta.json"))
  const skillMdAbs = path.join(skillDir, "SKILL.md")
  const skillMd = await fs.readFile(skillMdAbs, "utf-8")
  const fm = parseFrontmatter(skillMd)
  if (!fm) throw new Error(`[${id}] SKILL.md missing frontmatter`)
  const frontmatterName = String(fm.data.name ?? "").trim()
  if (!frontmatterName) throw new Error(`[${id}] frontmatter.name is required`)
  // UI display name. SKILL.md frontmatter.name serves a double role:
  //   - LLM trigger label (often verbose for matching accuracy)
  //   - UI card title (needs to be short)
  // When both readers want different strings, contributors can set
  // meta.displayName to override the catalog name for UI purposes while
  // leaving frontmatter.name untouched for LLM matching. When absent we
  // fall back to frontmatter.name so existing skills don't need to change.
  const metaDisplayName = typeof meta.displayName === "string" ? meta.displayName.trim() : ""
  const displayName = metaDisplayName || frontmatterName

  // 2. Walk skill/ and lay out hashed copies under dist/core/<id>/
  const skillFiles = await walkFiles(skillDir)
  if (!skillFiles.includes("SKILL.md")) throw new Error(`[${id}] skill/SKILL.md missing`)

  const packageFiles = []
  let totalBytes = 0
  for (const rel of skillFiles) {
    const srcAbs = path.join(skillDir, rel)
    const buf = await fs.readFile(srcAbs)
    const hashed = injectHash(rel, sha256Short(buf))
    const destAbs = path.join(DIST_CORE, id, hashed)
    await copyFile(srcAbs, destAbs)
    packageFiles.push({ source: hashed.replaceAll("\\", "/"), dest: rel.replaceAll("\\", "/") })
    totalBytes += buf.byteLength
  }

  // 3. Build the catalog row (manifest/* stays on main only — the catalog
  //    already carries every field a client needs)
  return {
    id,
    name: displayName,
    version: typeof meta.version === "string" && meta.version.trim() ? meta.version.trim() : "0.1.0",
    description: meta.description,
    tags: meta.tags,
    author: meta.author,
    minClientVersion: meta.minClientVersion,
    license: meta.license,
    deprecated: meta.deprecated === true ? true : false,
    size: totalBytes,
    fileCount: skillFiles.length,
    updatedAt: generatedAt,
    downloadCount: 0,
    packageBaseUrl: `/core/${id}/`,
    packageFiles,
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
  await fs.mkdir(DIST_CORE, { recursive: true })
  await fs.mkdir(DIST_STORE, { recursive: true })

  const generatedAt = new Date().toISOString()
  const ids = await listContributionIds()
  ids.sort()

  const skills = []
  for (const id of ids) {
    console.log(`Building ${id}...`)
    skills.push(await buildSkill(id, generatedAt))
  }

  await writeJson(path.join(DIST_STORE, "catalog.json"), {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    skills,
  })

  console.log(`OK: built ${skills.length} skill(s) into dist/`)
}

main().catch((err) => {
  console.error("build-store.mjs crashed:", err)
  process.exit(2)
})
