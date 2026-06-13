# DOCX Reader

Read and extract content from Word/`.docx` documents — **read-only**, no editing.

The agent reads a document by extracting its content directly, with a single
pure-Python dependency (`python-docx`) and **no rendering** — no LibreOffice, no
Poppler, no system tools. It works the same on macOS and Windows.

## What it extracts

In one linear, reading-order stream:

- Headings, paragraphs, and tables
- Page **headers / footers** (classification markings, author, version)
- Reviewer **comments**, shown at their anchor point
- **Footnotes / endnotes**, shown at their reference point
- Embedded **images** — listed inline with their alt text, and extractable
  on demand (by number) only when a vision-capable model needs to see one

## How it works

- **Text mode** — `python scripts/reader.py <file.docx>` returns the full
  content. Image placeholders carry alt text, so a non-vision model still
  understands what each figure is without opening it.
- **Image mode** — `python scripts/reader.py <file.docx> --image N` extracts a
  single figure for visual inspection. Images are never bulk-extracted by
  default.

## Scope

This skill reads content and structure, not pixel-accurate layout. It does not
edit documents and does not detect visual defects (clipping, overlap,
pagination). Page numbers in headers/footers are field codes and extract as
empty.

---

Inspired by OpenAI Codex's *documents* skill; implemented independently for
GeoCode.
