# Viewer Demo Architecture

`HelloWorld.vue` is the demo composition root. It coordinates page-level
accessibility, responsive panel handoff and the active `<file-viewer>`, but it
must not become the owner of every feature.

## Responsibility map

| Area | Owner | Notes |
| --- | --- | --- |
| Static sample catalog | `data/demoSamples.ts` | Data only; no Vue state or browser access. |
| Sample URL identity | `composables/useDemoSamples.ts` | Locale selection, legacy URL normalization and upload accept list. |
| Locale/theme/density | `composables/useDemoPreferences.ts` | Query parameters, local storage and system-theme subscription. |
| Viewer options | `composables/useDemoViewerOptions.ts` | The single precedence boundary for defaults, integration options and demo settings. |
| Search/zoom/print | `composables/useDemoViewerOperations.ts` | Adapter around the public File Viewer API, including stale async-result protection. |
| Settings lifecycle | `composables/useDemoViewerSettings.ts` | Draft/apply state, renderer remount decisions and view-state restoration. |
| Floating panels | `composables/useDemoFloatingPanels.ts` | Anchoring and responsive placement. |
| Recent files | `composables/useDemoRecentFiles.ts` | Serializable history; live local `File` objects remain in memory. |
| File capsule motion | `composables/useDemoFileCapsuleMotion.ts` | Animation state machine; DOM geometry is supplied by the page. |
| Visual regions | `components/demo/*` | Independently styled UI with explicit props/events. |

## Change rules

1. Add or rename samples in `data/demoSamples.ts`, not in the page component.
2. Add renderer options only in `useDemoViewerOptions.ts`; preserve the
   distinction between product mode and explicit URL/immersive mode.
3. Add imperative viewer actions to `useDemoViewerOperations.ts`.
4. Keep renderer-specific parsing and behavior in core/renderers, never in the
   demo shell.
5. Keep comments focused on invariants, compatibility reasons and ownership.
   Avoid comments that merely repeat the next line.
6. Treat the official Demo as the complete capability experience: every
   published optional renderer must be registered here, keep its heavy
   implementation lazy, and have a license-tracked fixture covering each
   public capability and critical behavior boundary through the real
   sample-click gate.
   Every public entry in `ecosystem/format-catalog.json` maps to a visible
   fixture and click pipeline; `verify:specialist-renderer-boundary` rejects
   an unmapped catalog entry or pipeline before release.

## Comment coverage

Major flows should remain discoverable directly from source comments:

- product shell versus explicit URL/embed immersive entry;
- desktop anchored popovers versus mobile bottom sheets;
- remote URL, local File, sample and recent-history transitions;
- settings draft/apply, renderer remount and view-state restoration;
- runtime options versus product-demo option precedence;
- search, zoom, fit, print and stale async provider protection;
- theme, locale, storage fallback and operating-system theme changes;
- focus return, outside click, Escape and responsive breakpoint migration;
- file-capsule merge motion and reduced-motion behavior.

When changing one of these flows, update its nearby rationale comment together
with the implementation and regression test.

The architecture regression test enforces these boundaries and caps the script
implementation (comments are excluded from the budget), so future format
additions cannot silently rebuild the original monolith.
