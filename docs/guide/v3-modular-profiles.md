---
description: Choose standard, preset, custom, or Full installation boundaries, preserve every existing Full package contract, and keep specialist capabilities explicitly opt-in.
---

# Modular Profiles and Full Compatibility

<div class="doc-kicker">Choose An Install Boundary Without Changing Existing Users</div>

<p class="doc-lead">
File Viewer keeps lightweight, preset, custom, and Full integration paths side by side. The `standard` profile is the recommended common-format baseline for new projects; it is not a renamed Full package and does not replace the behavior already published by Full packages.
</p>

## Profiles are explicit install contracts

| Profile | Contract | Use it when |
| --- | --- | --- |
| `standard` | Common document, PDF/OFD, modern PPTX, spreadsheet, archive, email, text, image, and media capabilities with selective assets | A new application needs broad everyday coverage without specialist engines |
| `lite` | Text, Markdown/code, image, audio, and video | Attachments are mostly lightweight web formats |
| `office` | The established Office preset and its compatibility formats | An Office-focused integration relies on that exact preset |
| `engineering` | The established engineering preset | The product needs CAD, 3D, EDA, Geo, or related engineering formats |
| `all` | The published `@file-viewer/preset-all` compatibility matrix | A modular application already depends on `preset-all` |
| `full` | The matching historical `@file-viewer/*-full` package plus later explicit opt-ins known by the CLI | Install size is acceptable and the product deliberately wants every catalog capability |
| `custom` | Only the capabilities selected in project config | Dependency ownership must be exact |

The profile controls package installation and renderer registration. Runtime loading remains format-driven: a selected heavy renderer is fetched only when a matching file is opened.

## Frozen standard baseline

`@file-viewer/preset-standard` includes these package-level groups:

- Word, DOCX, DOC, RTF, and OpenDocument text;
- PDF and OFD;
- modern OpenXML PowerPoint through `@file-viewer/renderer-pptx`;
- Excel, CSV/TSV, OpenDocument Spreadsheet, and DBF;
- archives and email;
- text, code, Markdown, images, audio, and video.

Specialist capabilities such as iWork, DICOM, digital-signature containers, CAD, 3D, EDA, Geo, Typst, drawing, WordPerfect, Hangul, and legacy binary PPT stay explicit. This keeps additions to the global format catalog from silently growing every standard install.

The PPT split is also an install boundary. Modern `.pptx` uses `@file-viewer/renderer-pptx`. Legacy `.ppt` uses `@file-viewer/renderer-ppt` and its separately licensed runtime. The compatibility aggregate `@file-viewer/renderer-presentation` continues to provide both for existing users.

## Existing Full packages do not change

The eight published `@file-viewer/*-full` packages keep their existing:

- `preset-all` capability matrix;
- public API and default integration behavior;
- runtime asset paths and copy-assets behavior;
- formats that were part of the package when released.

They will not be silently switched to `standard`. Installing one of those packages directly also does not promise that every specialist renderer introduced in a later release will become a new transitive dependency. That rule prevents an unchanged application from accumulating unbounded downloads as the catalog grows.

The CLI's `--profile full` is an explicit convenience contract. It preserves the matching compatibility Full package, then adds the later opt-in capabilities in the installed CLI catalog. The CLI shows package weight and license information before it asks for confirmation.

```bash
npx file-viewer-cli plan --framework vue3 --profile full
npx file-viewer-cli create my-viewer --framework vue3 --profile full --yes
```

The current later opt-ins are DICOM and digital-signature containers. The DICOM renderer covers one local Part 10 file, including multi-frame navigation; it does not provide series assembly, PACS/DICOMweb, MPR, segmentation, diagnostic interpretation, or an embedded OHIF application. The signature renderer performs bounded local inspection of CMS/CAdES, timestamps, ASiC, evidence records, JWS, and public OpenPGP material. It keeps cryptographic results separate from trust, policy, qualified-signer identity, and legal validity; it accepts no private key and never follows remote key URLs automatically.

## Add specialist formats only when needed

Select file extensions or capability ids on top of `standard`:

```bash
npx file-viewer-cli create viewer \
  --framework react \
  --profile standard \
  --formats dwg,typst \
  --yes
```

Or evolve a configured project:

```bash
npx file-viewer-cli config add dwg --write
npx file-viewer-cli config add dicom --write
npx file-viewer-cli config add p7m --write
npx file-viewer-cli plan
npx file-viewer-cli install --yes
npx file-viewer-cli verify --json
```

The generated integration module imports only the fixed profile and selected additions. `plan` reports the exact packages, asset owners, heavy capabilities, and license notices. Use its current catalog output instead of copying historical package-size numbers into deployment policy.

## Capability contract

Renderer packages can publish `file-viewer.capability.json` through `package.json#fileViewer.capabilityManifest`. The schema records:

- owned formats and renderer ids;
- public-asset renderer ids;
- SPDX license and distribution policy;
- `light`, `standard`, or `heavy` install weight;
- preset/profile membership.

The CLI catalog is generated from those declarations plus `ecosystem/format-catalog.json`. Repository gates reject format drift, unknown asset ids, a heavy capability entering `standard`, or a profile/package dependency mismatch.

## Recommended migration

1. Leave existing Full and `preset-all` applications on their current packages unless there is a product reason to change them.
2. Use `standard` for new common-format applications and add specialist capabilities explicitly.
3. Run `file-viewer plan` before installation and commit `file-viewer.config.json` as the selection record.
4. Deploy only the selected runtime assets, or retain the complete compatibility copy-assets workflow where an existing Full installation requires it.
5. Run `file-viewer doctor` and `file-viewer verify` in CI so package, generated-module, receipt, and asset drift fails before deployment.

See the [complete CLI guide](/guide/cli) for scaffold creation, existing-project detection, asset compatibility, private registries, and offline tgz preparation.
