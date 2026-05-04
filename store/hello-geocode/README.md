# Hello GeoCode

A minimal sample skill that demonstrates the **GeoCode Skill Store**
end-to-end pipeline.

## What it does

When the user asks for a "GeoCode greeting" or sends a casual "hello",
this skill instructs the LLM to respond with a short acknowledgement
confirming the skill store is working.

## Why install it

This is a **verification skill**. Install it once to confirm the GeoCode
skill store pipeline is wired up correctly:

1. `jsdelivr → catalog.json` — store catalog reachable
2. `Install` — package files downloaded into `~/.local/share/geocode/skills/packages/hello-geocode/`
3. `discoverSkills → exportEnabled` — GeoCode store injects the skill into OpenCode's view
4. `system prompt` — LLM sees `hello-geocode` in its `<available_skills>` block

After you confirm everything works, you can disable or uninstall it.

## Author

GeoCode Core team.
