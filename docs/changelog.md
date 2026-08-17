# Changelog

<div class="doc-kicker">Release history</div>

<p class="doc-lead">
  The notable user-facing changes shipped from the current File Viewer mainline. GitHub Releases remains the source for downloadable artifacts and immutable release notes.
</p>

## v2.2.9 — PPTX and Markdown rendering security

Released August 13, 2026.

- Sanitized PPTX Worker HTML, SVG, inline styles, URLs, event attributes, scripts, and unsafe global CSS before they enter the preview DOM.
- Sanitized Marked output with DOMPurify and hardened links opened in a new window with `noopener noreferrer`.
- Added browser gates for malicious Markdown, synthetic PPTX Worker output, and real malicious PPTX files across normal and virtualized rendering paths.
- Kept the published capability matrix at 54 npm targets, 208 extensions, and 25 preview pipelines.

## v2.2.8 — Large spreadsheets, OFD first paint, and PPT watermark polish

Released August 11, 2026.

- Bounded spreadsheet auto-width sampling so large workbooks no longer require a complete row scan during every fit operation.
- Disabled OFD transform transitions until initial layout stabilizes, removing the first-frame jump while preserving reduced-motion behavior.
- Reduced the open-source binary PPT watermark to a single bottom-right mark while preserving the engine's mandatory licensing boundary.
- Hardened release automation around npm timeouts, uncertain registry state, and interrupted uploads.

## v2.2.7 — PDF zoom anchoring and legacy Word tolerance

Released August 11, 2026.

- Kept PDF zoom anchored to the current visible area instead of allowing the document to drift behind navigation.
- Improved tolerance for HTML-in-WordDocument legacy DOC files.
- Shipped the fixes consistently across npm, GitHub Releases, component repositories, the demo, documentation, website, and Docker images.

## Complete history

- [Browse all GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases)
- [Read the complete Chinese changelog](/zh/changelog)
- [Verify the current format matrix](/guide/formats)
