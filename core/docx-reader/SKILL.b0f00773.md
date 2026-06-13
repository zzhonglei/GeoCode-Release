---
name: docx-reader
description: "Use when a task needs to read, summarize, or answer questions about a .docx / Word document. Read-only: extracts text, tables, comments, and notes with python-docx; embedded images are pulled out on demand for vision-capable models."
---

# DOCX Reader

This skill reads Word/`.docx` documents by extracting their content directly,
with no rendering and no system dependencies. Follow it strictly.

## Contract

- This skill is READ-ONLY. It never edits, creates, or reformats documents.
- Dependency: `python-docx` only (pure Python, cross-platform). If it is
  missing, install it with `pip install python-docx`. No LibreOffice, no
  Poppler, no system tools are required.
- Read the FULL extracted content before answering. Never infer a document's
  contents from its filename or a partial read.

## Reading a document's content  →  text mode

Run the bundled reader to get the document as a single linear stream in
reading order — headings, paragraphs, tables, comments, footnotes/endnotes,
headers/footers, and image placeholders:

    python scripts/reader.py <file.docx>

What the markers mean in the output:

- `[Heading 1] ...` / `[Heading 2] ...` — heading text and its level.
- `[TABLE]` followed by indented `cell | cell` rows — a table's contents.
- `[HEADER: ...]` / `[FOOTER: ...]` — page header/footer text, surfaced once at
  the top. These often carry classification markings ("Confidential"), author,
  or version info that appears nowhere in the body.
- `[COMMENT by <author>: ...]` — a reviewer comment, shown at its anchor point.
- `[FOOTNOTE: ...]` / `[ENDNOTE: ...]` — note text, shown at its reference point.
- `[IMAGE #N | alt: ... | extract to view]` — an embedded image, with its alt
  text. A non-vision model can rely on the alt text + surrounding text without
  ever opening the image.

## Viewing a specific figure  →  image mode (only if needed)

Only when the task genuinely needs the visual content of a figure AND the model
can see images, extract that one image by its number:

    python scripts/reader.py <file.docx> --image N --outdir <dir>

Then view the written file. Do not bulk-extract every image by default.

## Limitations (state these if they bite)

- Page numbers in headers/footers are field codes, not literal text, so they
  extract as empty. Report a header/footer's text, not a live page number.
- Vector images (`.emf` / `.wmf`, common in older Word files) cannot be viewed
  by vision models. Report that such a figure exists rather than guessing.
- This skill reads content and structure, not pixel-accurate layout. It does
  not detect visual defects like clipping, overlap, or pagination.
