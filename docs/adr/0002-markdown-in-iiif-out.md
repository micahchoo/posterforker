---
status: accepted
date: 2026-10-04
---

# The Maker edits Markdown; IIIF is only build output

Each Scene is one Markdown file: the region in front matter, the words in the body.
The build Action turns these into a IIIF Presentation 3 manifest with W3C annotations.
The repository never holds hand-edited IIIF.

This reverses an earlier choice of IIIF as the source format. Makers edit in GitHub's
web editor, where IIIF JSON is hostile to read and easy to break. Publishing IIIF keeps
the result readable by other IIIF tools.
