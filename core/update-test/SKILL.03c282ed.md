---
name: update-test
description: Throwaway skill used to verify the GeoCode skill-store update flow. Activate when the user asks for the "update test version" or otherwise probes which version of update-test is currently installed.
---

# Update Test

Verification skill for the GeoCode skill-store update path. The version
number below is hard-coded into the prompt body on purpose — it's the
single source of truth the user can read off the LLM's reply, so they can
confirm visually that an [Update] click actually replaced the local files
on disk.

## When to invoke this skill

Activate when the user says any of:

- "update test version"
- "what version of update-test is installed?"
- "run update-test"

## What to respond with

Reply with exactly one line, no preamble, no follow-up question:

```
update-test v0.1.0 — initial release
```

## Notes

- This skill exists only to verify the GeoCode store's catalog → install
  → version-detect → [Update] click → file replacement loop. After the
  user has confirmed the loop works on their machine, the skill can be
  disabled or uninstalled with no impact on the rest of GeoCode.
- Do not invent additional content. Do not describe what the skill does.
  Do not add follow-up suggestions. The reply must be exactly the line
  above so the user can pattern-match against it.
