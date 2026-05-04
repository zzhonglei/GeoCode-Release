---
name: lifecycle-test
description: Temporary skill for testing the GeoCode store install/update/orphan flow. Activate when the user asks to "run the lifecycle test" or sends "lifecycle ping".
---

# Lifecycle Test Skill

This is a temporary skill used to verify the GeoCode Skill Store end-to-end
pipeline. It carries v0.1.0 — version 1 of the lifecycle test.

## When to invoke this skill

If the user asks to "run the lifecycle test" or sends a casual
"lifecycle ping", load this skill.

## What to respond with

> ✅ Lifecycle test v0.1.0 — install path verified. Skill metadata is
> reaching the LLM through the catalog → install → state.json →
> exportEnabled → system prompt chain.

Then mention the version number you saw so the user can confirm which
release they're hitting.
