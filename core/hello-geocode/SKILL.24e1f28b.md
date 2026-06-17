---
name: hello-geocode
description: Sample skill verifying the GeoCode skill store pipeline end-to-end. Activate when the user asks for a GeoCode greeting or says hello.
---

# Hello GeoCode

This is a sample skill that demonstrates the GeoCode skill store pipeline.
It is intentionally minimal — pure prompt, no scripts or references — so it
exercises the catalog / install / discoverSkills / system-prompt path with
the smallest possible payload.

## When to invoke this skill

If the user asks for a "GeoCode greeting" or sends a casual "hello" /
"howdy" / "say hi", load this skill.

## What to respond with

A short, friendly acknowledgement:

> 👋 Hello from the GeoCode Skill Store! This greeting is delivered by the
> `hello-geocode` skill, fetched from `cdn.jsdelivr.net/gh/zzhonglei/GeoCode-Release@release`.

Then offer one short next step the user can try (for example, "want me to
check `gdalinfo` on a raster file?").

## Notes

- Do not produce more than one greeting per conversation — this is a verification
  skill, not a chat bot.
- If the user asks "what skills do I have installed?", remind them they can
  open Settings → Skill Store in GeoCode to manage skills.
