#!/usr/bin/env node
// Validate every skill under contributions/. Run by .github/workflows/validate.yml
// on PRs. Exits non-zero with a clear error list when any skill fails.
//
// Per-skill rules:
//   1. Directory id matches [a-z][a-z0-9-]*[a-z0-9] (URL-safe slug).
//   2. manifest/README.md exists and is non-empty.
//   3. manifest/meta.json exists, is valid JSON, and passes the meta schema.
//   4. skill/SKILL.md exists.
//   5. skill/SKILL.md frontmatter has non-empty `name` + `description`.

import { promises as fs } from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import {
  CONTRIBUTIONS_DIR,
  ID_REGEX,
  exists,
  listContributionIds,
  parseFrontmatter,
  readJson,
} from "./util.mjs"

// ----------------------------------------------------------------------------
// Semver helpers (hand-rolled — keep this script dependency-free)
// ----------------------------------------------------------------------------

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)$/

/** Parse "1.2.3" → [1, 2, 3]. Returns null on malformed input. */
function parseSemver(v) {
  if (typeof v !== "string") return null
  const m = v.trim().match(SEMVER_REGEX)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Strict-greater compare. Returns true iff a > b. */
function semverGt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

// ----------------------------------------------------------------------------
// Catalog-branch snapshot (for monotonic version check)
// ----------------------------------------------------------------------------

/**
 * Detect which contributions/<id>/ directories were modified in this PR.
 *
 * On GitHub Actions PRs, GITHUB_BASE_REF points at the target branch (e.g.
 * "main"); we diff against origin/<base> to get the change set. Outside CI
 * (manual run, push events, local debugging) we have no reliable base, so we
 * return null — the caller treats null as "skip the changed-only filter and
 * only flag downgrades", which is conservative without being annoying.
 *
 * Requires the workflow to checkout with fetch-depth: 0 so the diff base is
 * actually present in the local repo.
 */
function getChangedSkillIds() {
  const baseRef = process.env.GITHUB_BASE_REF
  if (!baseRef) return null
  let out
  try {
    out = execFileSync(
      "git",
      ["diff", "--name-only", `origin/${baseRef}...HEAD`, "--", "contributions/"],
      { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" },
    )
  } catch (err) {
    console.warn(`Warning: git diff against origin/${baseRef} failed (${err.message}); skipping changed-only filter.`)
    return null
  }
  const ids = new Set()
  for (const line of out.split("\n")) {
    const m = line.match(/^contributions\/([^/]+)\//)
    if (m) ids.add(m[1])
  }
  return ids
}

/**
 * Read store/catalog.json from the catalog branch via `git show`. Returns a
 * Map<id, version-string> for skills already published. Returns an empty Map
 * when the branch / file isn't available (first publish, shallow clone, etc.).
 *
 * The version baseline lives on the `catalog` branch (v2 catalog). The retired
 * `release` branch is no longer consulted — see docs/stats-two-branch-design.md §6.5.
 */
function loadCatalogVersions() {
  let blob
  try {
    blob = execFileSync("git", ["show", "origin/catalog:store/catalog.json"], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    })
  } catch {
    // No catalog branch yet, or no catalog at that path — treat all PR skills
    // as brand new. The monotonic check then only enforces semver shape.
    return new Map()
  }
  let parsed
  try {
    parsed = JSON.parse(blob)
  } catch (err) {
    console.warn(`Warning: catalog.json is not valid JSON (${err.message}); skipping monotonic check.`)
    return new Map()
  }
  const out = new Map()
  for (const s of parsed?.skills ?? []) {
    if (typeof s?.id === "string" && typeof s?.version === "string") {
      out.set(s.id, s.version)
    }
  }
  return out
}

// ----------------------------------------------------------------------------
// meta.json schema validation (hand-rolled, no npm deps)
// ----------------------------------------------------------------------------

function validateMeta(meta, errors, prefix) {
  const requireString = (key, opts = {}) => {
    const v = meta[key]
    if (v === undefined || v === null) {
      if (opts.optional) return
      errors.push(`${prefix} missing required field: ${key}`)
      return
    }
    if (typeof v !== "string") {
      errors.push(`${prefix} field ${key} must be a string`)
      return
    }
    if (!opts.allowEmpty && v.trim() === "") {
      errors.push(`${prefix} field ${key} must not be empty`)
    }
  }

  requireString("description")
  requireString("author")
  requireString("minClientVersion")
  requireString("license")
  // version is required and must be MAJOR.MINOR.PATCH. Monotonic check below
  // (validateVersionMonotonic) compares it against the catalog branch.
  requireString("version")
  if (typeof meta.version === "string" && meta.version.trim() !== "" && !parseSemver(meta.version)) {
    errors.push(`${prefix} field version must be MAJOR.MINOR.PATCH (e.g. "0.1.0")`)
  }

  if (!Array.isArray(meta.tags)) {
    errors.push(`${prefix} field tags must be an array`)
  } else if (meta.tags.length === 0) {
    errors.push(`${prefix} field tags must not be empty`)
  } else if (meta.tags.some((t) => typeof t !== "string" || t.trim() === "")) {
    errors.push(`${prefix} field tags must contain only non-empty strings`)
  }

  if (meta.deprecated !== undefined && typeof meta.deprecated !== "boolean") {
    errors.push(`${prefix} field deprecated must be a boolean if present`)
  }

  // displayName is OPTIONAL. When present, build-store.mjs uses it as the
  // catalog's UI-facing name in place of SKILL.md frontmatter.name. This
  // lets the LLM trigger label (frontmatter.name, often verbose) and the
  // UI card title (short, scannable) diverge when needed.
  if (meta.displayName !== undefined) {
    if (typeof meta.displayName !== "string") {
      errors.push(`${prefix} field displayName must be a string when present`)
    } else if (meta.displayName.trim() === "") {
      errors.push(`${prefix} field displayName must not be empty when present`)
    }
    // Length is enforced cross-field in validateSkill below — the effective
    // display name (displayName ?? frontmatter.name) is what actually ships
    // to the UI, so the check belongs there.
  }

  // sourceUrl is OPTIONAL. When present it must be an http(s) URL. The client's
  // "view details" link points here (e.g. an upstream repo) instead of a local
  // README — this is how a redistributed skill links to its canonical source.
  // A skill may omit README.md when it supplies a sourceUrl (enforced in
  // validateSkill below).
  if (meta.sourceUrl !== undefined) {
    if (typeof meta.sourceUrl !== "string") {
      errors.push(`${prefix} field sourceUrl must be a string when present`)
    } else if (!/^https?:\/\/\S+$/.test(meta.sourceUrl.trim())) {
      errors.push(`${prefix} field sourceUrl must be an http(s) URL when present`)
    }
  }
}

// ----------------------------------------------------------------------------
// Per-skill validation
// ----------------------------------------------------------------------------

async function validateSkill(id, errors) {
  const skillRoot = path.join(CONTRIBUTIONS_DIR, id)
  const prefix = `[${id}]`

  if (!ID_REGEX.test(id)) {
    errors.push(`${prefix} directory name must match ${ID_REGEX} (lowercase, hyphen-separated, URL-safe)`)
  }

  const manifestDir = path.join(skillRoot, "manifest")
  const skillDir = path.join(skillRoot, "skill")

  if (!(await exists(manifestDir))) {
    errors.push(`${prefix} missing manifest/ directory`)
    return
  }
  if (!(await exists(skillDir))) {
    errors.push(`${prefix} missing skill/ directory`)
    return
  }

  // 1. meta.json (parsed first so the README check can consult sourceUrl;
  //    hoisted out of try so step 4 can cross-check displayName)
  let meta
  const metaPath = path.join(manifestDir, "meta.json")
  if (!(await exists(metaPath))) {
    errors.push(`${prefix} missing manifest/meta.json`)
  } else {
    try {
      meta = await readJson(metaPath)
      validateMeta(meta, errors, prefix)
    } catch (err) {
      errors.push(`${prefix} ${err.message}`)
    }
  }

  // 2. README.md — required UNLESS meta.json supplies a sourceUrl. Every skill
  //    must have at least one human-facing info destination: a local README or
  //    a sourceUrl the client's "view details" link can point to.
  const hasSourceUrl = typeof meta?.sourceUrl === "string" && meta.sourceUrl.trim() !== ""
  const readmePath = path.join(manifestDir, "README.md")
  const readme = await fs.readFile(readmePath, "utf-8").catch(() => undefined)
  const readmeMissingOrEmpty = readme === undefined || readme.trim() === ""
  if (readmeMissingOrEmpty && !hasSourceUrl) {
    errors.push(`${prefix} must provide a non-empty manifest/README.md or a sourceUrl in meta.json`)
  }

  // 3. SKILL.md
  const skillMdPath = path.join(skillDir, "SKILL.md")
  const skillMd = await fs.readFile(skillMdPath, "utf-8").catch(() => undefined)
  if (skillMd === undefined) {
    errors.push(`${prefix} missing skill/SKILL.md`)
    return
  }
  const fm = parseFrontmatter(skillMd)
  if (!fm) {
    errors.push(`${prefix} skill/SKILL.md missing YAML frontmatter (--- ... ---)`)
    return
  }
  if (typeof fm.data.name !== "string" || fm.data.name.trim() === "") {
    errors.push(`${prefix} skill/SKILL.md frontmatter.name must be a non-empty string`)
  }
  if (typeof fm.data.description !== "string" || fm.data.description.trim() === "") {
    errors.push(`${prefix} skill/SKILL.md frontmatter.description must be a non-empty string`)
  }

  // 4. Cross-field: effective display name (what actually ships to catalog
  //    and renders in UI cards) must stay short enough to display cleanly.
  //    Mirror the resolution rule in build-store.mjs: meta.displayName wins
  //    when present, otherwise SKILL.md frontmatter.name.
  const DISPLAY_NAME_MAX = 30
  const metaDisplayName = typeof meta?.displayName === "string" ? meta.displayName.trim() : ""
  const frontmatterName = typeof fm.data.name === "string" ? fm.data.name.trim() : ""
  const effectiveDisplayName = metaDisplayName || frontmatterName
  if (effectiveDisplayName.length > DISPLAY_NAME_MAX) {
    const source = metaDisplayName ? "manifest/meta.json displayName" : "SKILL.md frontmatter.name"
    errors.push(
      `${prefix} effective display name too long (${effectiveDisplayName.length} chars > ${DISPLAY_NAME_MAX}). ` +
        `Shorten ${source}, or — if frontmatter.name needs to stay verbose for LLM matching — add a short "displayName" in manifest/meta.json.`,
    )
  }
}

// ----------------------------------------------------------------------------
// Cross-cutting: monotonic version check
// ----------------------------------------------------------------------------

/**
 * For every PR-modified skill that already exists on the catalog branch,
 * require its meta.json version to be strictly greater than the published
 * version. Brand-new skills (no entry on catalog) are exempt — only their
 * semver shape was already enforced by validateMeta.
 *
 * Skills that are not part of this PR are not checked, so an unrelated PR
 * cannot fail just because some other skill happens to share its current
 * version with the catalog branch.
 *
 * Downgrades are forbidden (===, < both fail). To pull a bad release, ship a
 * higher-numbered patch with the rollback.
 *
 * Outside a PR context (no GITHUB_BASE_REF), we still flag any id that has
 * a numerically lower version than the catalog — that catches accidental
 * downgrades during ad-hoc/manual runs without scaring off contributors who
 * touch unrelated skills.
 */
async function validateVersionMonotonic(ids, errors) {
  const released = loadCatalogVersions()
  if (released.size === 0) return // first publish — nothing to compare against

  const changed = getChangedSkillIds() // Set<string> | null

  for (const id of ids) {
    const oldStr = released.get(id)
    if (!oldStr) continue // brand-new skill

    const metaPath = path.join(CONTRIBUTIONS_DIR, id, "manifest", "meta.json")
    let meta
    try {
      meta = await readJson(metaPath)
    } catch {
      continue // validateSkill already surfaces this
    }
    const newStr = meta?.version
    const oldVer = parseSemver(oldStr)
    const newVer = parseSemver(newStr)
    if (!oldVer) continue // released version itself is malformed; don't double-report
    if (!newVer) continue // shape error already reported by validateMeta

    // Two enforcement modes:
    //   - PR context (changed != null): if this skill was edited, demand strict
    //     bump; if it wasn't edited, skip entirely (== is fine).
    //   - Non-PR context (changed == null): only forbid downgrade (< old). Equal
    //     is allowed because we cannot prove anything was modified.
    if (changed !== null) {
      if (!changed.has(id)) continue
      if (!semverGt(newVer, oldVer)) {
        errors.push(
          `[${id}] version must be strictly greater than the released version (${oldStr}); got ${newStr}. ` +
            `Bump patch/minor/major — downgrades and unchanged versions are not allowed when files change.`,
        )
      }
    } else {
      if (semverGt(oldVer, newVer)) {
        errors.push(
          `[${id}] version downgrade detected (released ${oldStr}, got ${newStr}). Downgrades are not allowed.`,
        )
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  const ids = await listContributionIds()
  if (ids.length === 0) {
    console.log("No contributions/ directories found — nothing to validate.")
    return
  }

  const errors = []
  for (const id of ids) {
    await validateSkill(id, errors)
  }
  await validateVersionMonotonic(ids, errors)

  if (errors.length > 0) {
    console.error(`Validation failed for ${errors.length} issue(s):\n`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`OK: ${ids.length} skill(s) passed validation.`)
}

main().catch((err) => {
  console.error("validate-skill.mjs crashed:", err)
  process.exit(2)
})
