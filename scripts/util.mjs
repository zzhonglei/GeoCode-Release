// Shared helpers for the GeoCode-Release CI scripts. Kept dependency-free
// (pure Node 20) so workflows don't need an npm install step.

import { promises as fs } from "node:fs"
import path from "node:path"

export const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname)
export const CONTRIBUTIONS_DIR = path.join(REPO_ROOT, "contributions")
export const ID_REGEX = /^[a-z][a-z0-9-]*[a-z0-9]$/

/**
 * Minimal YAML frontmatter parser. Handles the only shape OpenCode skills
 * use in practice: a flat `key: value` block delimited by `---` lines.
 * Quoted values (single or double) are unwrapped.
 *
 * Returns null if no frontmatter is found.
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const [, head, body] = match
  const data = {}
  for (const rawLine of head.split(/\r?\n/)) {
    const line = rawLine.replace(/^﻿/, "")
    if (!line.trim() || line.trim().startsWith("#")) continue
    const colon = line.indexOf(":")
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    const quoted = value.match(/^(["'])(.*)\1$/)
    if (quoted) value = quoted[2]
    data[key] = value
  }
  return { data, body }
}

/** Read JSON file with a clean error message on parse failure. */
export async function readJson(p) {
  const text = await fs.readFile(p, "utf-8")
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${p}: ${err.message}`)
  }
}

/** True if path exists. */
export async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/** Read file as utf-8, returning undefined if missing. */
export async function readTextOptional(p) {
  try {
    return await fs.readFile(p, "utf-8")
  } catch {
    return undefined
  }
}

/**
 * List all skill IDs (one per top-level directory under contributions/).
 * Returns an empty array if contributions/ doesn't exist.
 */
export async function listContributionIds() {
  if (!(await exists(CONTRIBUTIONS_DIR))) return []
  const entries = await fs.readdir(CONTRIBUTIONS_DIR, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name)
}

/** Recursively walk a directory and return file paths relative to root. */
export async function walkFiles(root) {
  const out = []
  async function visit(dir, prefix) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await visit(full, rel)
      } else if (entry.isFile()) {
        out.push(rel)
      }
    }
  }
  if (await exists(root)) await visit(root, "")
  return out
}
