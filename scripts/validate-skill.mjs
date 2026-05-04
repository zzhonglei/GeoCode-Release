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
import {
  CONTRIBUTIONS_DIR,
  ID_REGEX,
  exists,
  listContributionIds,
  parseFrontmatter,
  readJson,
} from "./util.mjs"

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
  requireString("version", { optional: true }) // CI auto-bumps if absent

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

  // 1. README.md
  const readmePath = path.join(manifestDir, "README.md")
  const readme = await fs.readFile(readmePath, "utf-8").catch(() => undefined)
  if (readme === undefined) {
    errors.push(`${prefix} missing manifest/README.md`)
  } else if (readme.trim() === "") {
    errors.push(`${prefix} manifest/README.md is empty`)
  }

  // 2. meta.json
  const metaPath = path.join(manifestDir, "meta.json")
  if (!(await exists(metaPath))) {
    errors.push(`${prefix} missing manifest/meta.json`)
  } else {
    try {
      const meta = await readJson(metaPath)
      validateMeta(meta, errors, prefix)
    } catch (err) {
      errors.push(`${prefix} ${err.message}`)
    }
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
