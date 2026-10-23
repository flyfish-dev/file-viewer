---
description: "Translate File Viewer documentation and interface text while preserving API examples, language fallbacks and accessibility."
---

# Translation Contributions

[简体中文](../zh/guide/translations.md)

Documentation currently has English and Simplified Chinese routes. The Demo and shared viewer
also have Japanese and German dictionaries. This does not mean that every documentation page
has a Japanese or German translation. See [collaboration](collaboration.md) for language and review etiquette.

## Where text lives

| Surface | Maintained source |
| --- | --- |
| English / Chinese docs | `docs/guide/` and `docs/zh/guide/` |
| Demo interface | `apps/viewer-demo/src/composables/useDemoCopy.ts`, `useDemoCopy.ja.ts`, `useDemoCopy.de.ts` |
| Demo welcome | `apps/viewer-demo/src/composables/useDemoWelcome.ts` |
| Shared viewer messages | `packages/core/src/i18n/messages.ts`, `messages.ja.ts`, `messages.de.ts` |
| Website | `apps/official-site/src/App.vue` and its static HTML metadata |
| Package docs | English `README.md`, Chinese `README.zh-CN.md`; `README.en.md` is a compatibility copy |

Do not edit generated `apps/docs-site/content/` or build outputs. Wrapper README sections between
`FILE_VIEWER_GENERATED` markers come from the maintainer generator; edit the maintained source
rather than patching generated sections independently. Run `pnpm docs:packages:sync` to align the
English compatibility copy and language links, then `pnpm docs:packages:check` to verify them.
The canonical maintainer workspace also regenerates the marked sections during synchronization.
Public contributors may propose wording in a PR and identify any section needing regeneration.

## Translate meaning and behavior

Keep API names, import paths, commands, version numbers, URL parameters, code syntax, placeholders,
interpolation tokens and literal error messages unchanged. Translate descriptions and accessibility
labels as well as visible button text. Preserve stable link targets and add the matching language
link when adding a document. Keep format-support limits, experimental status, privacy and security
statements equivalent; do not turn “preview” into a conversion or full-editing promise.

Use native language names in language selectors. Avoid flag icons as language identifiers. Dates
and examples should be unambiguous across regions. Mark machine-assisted translations and request
review where wording is uncertain. New languages need complete key coverage, an explicit fallback,
selector wiring and review of both shared viewer and Demo text; adding one dictionary alone is insufficient.

## Verify the user experience

Run the relevant docs build or package type check, then `pnpm test:i18n` for Japanese / German Demo
changes. Open the translated page in a real browser. Check navigation, search, code-copy actions,
keyboard focus, screen-reader labels, dark mode, 200% text scaling, long words and narrow screens.
Keep a screenshot for visible changes and state the languages and browsers actually checked.
