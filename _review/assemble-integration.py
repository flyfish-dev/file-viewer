from pathlib import Path
import json, shutil

payload = Path(__file__).resolve().parent
root = Path.cwd()
def edit(path, changes):
    p = root / path
    s = p.read_text()
    for old, new in changes:
        assert s.count(old) == 1, (path, old[:100], s.count(old))
        s = s.replace(old, new)
    p.write_text(s)
def write(path, text):
    p = root / path
    assert not p.exists(), path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

shutil.copyfile(payload/'ifc-advanced-settings.ts', root/'packages/renderers/3d/src/ifcSettings.ts')
edit('packages/renderers/3d/src/ifc.ts', [('export interface IfcViewerOptions {', '''/** Advanced runtime objects are adapter-owned; return cleanup only for host resources. */
export type IfcRuntimeContext = Pick<IfcExtensionContext, "components" | "fragments" | "world" | "signal">;
export interface IfcThatOpenOptions {
  /** Public IfcImporter data fields; no executable methods, WASM or Worker overrides. */
  importer?: Readonly<Record<string, unknown>>;
  /** Public FragmentsModels.settings fields, not constructor/Worker ownership. */
  fragments?: { settings?: Readonly<Record<string, unknown>> };
}
export interface IfcViewerOptions {
  /** Optional pre-import data settings; defaults are unchanged when omitted. */
  thatOpen?: IfcThatOpenOptions;
  /** Runs after runtime creation, before model loading. Return host-resource cleanup. */
  configureRuntime?: (context: IfcRuntimeContext) => void | (() => void) | Promise<void | (() => void)>;''')])
edit('packages/renderers/3d/src/ifc-import.worker.ts', [
    ('import { IfcImporter }', 'import { applyIfcSettings, copyIfcImporterSettings } from "./ifcSettings.js";\nimport { IfcImporter }'),
    ('wasmPath: string', 'wasmPath: string; importerSettings?: Record<string, unknown>'),
    ('importer.includeRelationNames = true;', 'importer.includeRelationNames = true;\n    applyIfcSettings(importer, copyIfcImporterSettings(data.importerSettings));')])
edit('packages/renderers/3d/src/ifcRuntime.ts', [
    ('import * as THREE', 'import { applyIfcSettings, copyIfcImporterSettings, copyIfcSettings } from "./ifcSettings.js";\nimport * as THREE'),
    ('  const header = new TextDecoder()', '''  const importerSettings = copyIfcImporterSettings(options.thatOpen?.importer);
  const fragmentsSettings = copyIfcSettings(options.thatOpen?.fragments?.settings, "IFC Fragments settings");
  const header = new TextDecoder()'''),
    ('let extensionCleanup: void | (() => void);', 'const extensionCleanups: Array<() => void> = [];'),
    ('    const cleanup = extensionCleanup;\n    extensionCleanup = undefined;', '    const cleanups = extensionCleanups.splice(0).reverse();'),
    ('        cleanup?.();', '''        const errors: unknown[] = [];
        for (const cleanup of cleanups) { try { cleanup(); } catch (error) { errors.push(error); } }
        if (errors.length) throw new AggregateError(errors, "IFC extension cleanup failed");'''),
    ('bytes: copy, wasmPath: assetBase.href', 'bytes: copy, wasmPath: assetBase.href, importerSettings'),
    ('    model = await withCancellation(fragments.load(bytes, { modelId: id }));', '''    applyIfcSettings(fragments.settings, fragmentsSettings);
    if (options.configureRuntime) {
      await configureExtension(() => options.configureRuntime!({ components: components!, fragments: fragments!, world: world!, signal: controller.signal }));
    }
    model = await withCancellation(fragments.load(bytes, { modelId: id }));'''),
    ('  fitButton.addEventListener(', '''  const configureExtension = async (hook: () => void | (() => void) | Promise<void | (() => void)>) => {
    ensureLive();
    const pending = Promise.resolve().then(() => { ensureLive(); return hook(); }).then(cleanup => {
      if (cleanup !== undefined && typeof cleanup !== "function") throw new TypeError("IFC extension hook must return a cleanup function or undefined");
      if (disposed) cleanup?.();
      else if (cleanup) extensionCleanups.push(cleanup);
    });
    await withCancellation(pending);
    ensureLive();
  };
  fitButton.addEventListener(''')])
p = root/'packages/renderers/3d/src/ifcRuntime.ts'
s = p.read_text(); start=s.index('    if (options.configure) {'); end=s.index('    clearTimeout(timeout);',start)
s=s[:start]+'''    if (options.configure) {
      await configureExtension(() => options.configure!({ components: components!, fragments: fragments!, world: world!, model: model!, signal: controller.signal, select }));
    }
'''+s[end:]; p.write_text(s)
p = root/'packages/renderers/3d/package.json'; data=json.loads(p.read_text())
data['scripts']['verify:ifc']='node scripts/verify-ifc-entry.mjs && node --test scripts/ifc-settings.test.mjs'
p.write_text(json.dumps(data,indent=2)+'\n')

write('packages/renderers/3d/scripts/ifc-settings.test.mjs', '''import assert from "node:assert/strict";
import { test } from "node:test";
import { IfcImporter } from "@thatopen/fragments";
import { applyIfcSettings, copyIfcImporterSettings, copyIfcSettings } from "../dist/ifcSettings.js";

test("data settings are independent snapshots with native Sets/Maps", () => {
  const source={webIfcSettings:{COORDINATE_TO_ORIGIN:false,CIRCLE_SEGMENTS:24},attributesToExclude:new Set(["Name"]),relations:new Map([[1,{forRelating:"a",forRelated:"b"}]])};
  const copy=copyIfcImporterSettings(source);
  source.attributesToExclude.add("GlobalId"); source.webIfcSettings.CIRCLE_SEGMENTS=32;
  assert.deepEqual([...copy.attributesToExclude],["Name"]);
  assert.equal(copy.webIfcSettings.CIRCLE_SEGMENTS,24);
  assert.ok(copy.relations instanceof Map);
  assert.deepEqual(copyIfcSettings(undefined),{});
});
test("accessors, functions, classes, cycles and oversized inputs fail closed", () => {
  const cyclic={}; cyclic.self=cyclic; let called=false;
  const accessor={get webIfcSettings(){called=true;return {};}};
  for(const value of [accessor,cyclic,{fn(){}},{date:new Date()},{value:Infinity},{value:undefined},{text:"x".repeat(65537)},{values:new Set(Array.from({length:2049},(_,i)=>i))},{values:new Array(2049)}]) assert.throws(()=>copyIfcSettings(value));
  assert.equal(called,false);
  let depth={};for(let i=0;i<10;i++)depth={inner:depth};
  assert.throws(()=>copyIfcSettings(depth),/limits/);
});
test("prototype/private keys and resource/method overrides are rejected",()=>{
  for(const key of ["__proto__","constructor","prototype","_builder","wasm","webIfc","workerUrl","process","dispose"]) assert.throws(()=>copyIfcImporterSettings(JSON.parse(`{"${key}":{}}`)));
  assert.throws(()=>copyIfcSettings(JSON.parse('{"webIfcSettings":{"__proto__":{"polluted":true}}}')));
  assert.equal({}.polluted,undefined);
});
test("real importer overrides preserve library-owned collections and unrelated defaults",()=>{
  const importer=new IfcImporter();const excluded=importer.attributesToExclude,classes=importer.classes.elements,wasm=importer.wasm,process=importer.process;
  applyIfcSettings(importer,copyIfcImporterSettings({webIfcSettings:{COORDINATE_TO_ORIGIN:false,CIRCLE_SEGMENTS:24},geometryProcessSettings:{threshold:1000},attributesToExclude:new Set(["Name"]),classes:{elements:new Set([123])},includeUniqueAttributes:false,includeMaterialProperties:true}));
  assert.equal(importer.webIfcSettings.COORDINATE_TO_ORIGIN,false);assert.equal(importer.webIfcSettings.CIRCLE_SEGMENTS,24);
  assert.equal(importer.geometryProcessSettings.threshold,1000);assert.equal(importer.geometryProcessSettings.precision,1e6);
  assert.equal(importer.attributesToExclude,excluded);assert.deepEqual([...excluded],["Name"]);
  assert.equal(importer.classes.elements,classes);assert.deepEqual([...classes],[123]);
  assert.equal(importer.wasm,wasm);assert.equal(importer.process,process);assert.equal(importer.includeMaterialProperties,true);
  assert.throws(()=>applyIfcSettings(importer,{typoOption:true}),/Unknown/);
  assert.throws(()=>applyIfcSettings(importer,{includeUniqueAttributes:"false"}),/Incompatible/);
  assert.throws(()=>applyIfcSettings(importer,{attributesToExclude:["Name"]}),/requires a Set/);
});
test("Fragments configuration only assigns own writable data fields",()=>{
  const settings={maxUpdateRate:100,graphicsQuality:0};applyIfcSettings(settings,copyIfcSettings({maxUpdateRate:80}));assert.equal(settings.maxUpdateRate,80);
  assert.throws(()=>applyIfcSettings(settings,{dispose:false}),/Unknown/);
  let called=false;Object.defineProperty(settings,"accessor",{get(){called=true;}});
  assert.throws(()=>applyIfcSettings(settings,{accessor:1}),/non-data/);assert.equal(called,false);
});
test("native collection accessors are rejected without executing application code",()=>{
  let called=false;const collection=new Set([1]);Object.defineProperty(collection,"size",{get(){called=true;return 1;}});
  assert.throws(()=>copyIfcSettings({collection}),/custom properties/);assert.equal(called,false);
});
''')

edit('packages/renderers/3d/scripts/verify-ifc-browser.mjs', [
    ('onSelectionChange:value=>window.selections.push(value),configure:context=>{window.extension=context;return()=>{window.cleanupCount++}}', 'onSelectionChange:value=>window.selections.push(value),configure:async context=>{window.extension=context;const cleanup=await options.configure?.(context);return()=>{try{cleanup?.()}finally{window.cleanupCount++}}}'),
    ('  // Input limit is enforced before another worker or transferable copy is allocated.', '''  // Prove non-default importer settings cross the real Worker boundary.
  const advanced=await page.evaluate(async()=>{
    window.hookOrder=[];let runtimeHadModels;
    const loaded=await openIfc("ifc4.ifc",{
      thatOpen:{importer:{attributesToExclude:new Set(["Representation","ObjectPlacement","CompositionType","OwnerHistory","Name"]),webIfcSettings:{COORDINATE_TO_ORIGIN:true,CIRCLE_SEGMENTS:24}},fragments:{settings:{maxUpdateRate:80}}},
      configureRuntime({fragments,signal}){runtimeHadModels=fragments.models.list.size;if(signal.aborted)throw new Error("Unexpected aborted runtime hook");return()=>hookOrder.push("runtime");},
      configure(){return()=>hookOrder.push("model");}
    });
    const selected=await instance.select(loaded.first),rate=extension.fragments.settings.maxUpdateRate;
    await instance.unmount();await instance.unmount();
    return{count:loaded.count,name:selected.name,rate,runtimeHadModels,order:hookOrder,cleanupCount};
  });
  assert.equal(advanced.count,13);assert.equal(advanced.name,"","Importer exclusion did not affect the real parsed model");assert.equal(advanced.rate,80);assert.equal(advanced.runtimeHadModels,0);
  assert.deepEqual(advanced.order,["model","runtime"]);assert.equal(advanced.cleanupCount,1);
  await page.waitForFunction(()=>workerCounts.active===0);report.advanced=advanced;
  const invalidSettings=await page.evaluate(async()=>{
    const created=workerCounts.created;
    for(const importer of [{wasm:{path:"https://invalid.invalid/"}},{callback(){}},JSON.parse('{"__proto__":{}}')]){
      try{await openIfc("ifc4.ifc",{thatOpen:{importer}});return false;}catch{}
      if(workerCounts.created!==created)return false;
    }return true;
  });
  assert.ok(invalidSettings,"Invalid settings must fail before Worker allocation");
  const unknown=await page.evaluate(async()=>{
    try{await openIfc("ifc4.ifc",{thatOpen:{importer:{typoOption:true}}});return false;}
    catch(error){return /Unknown or non-data/.test(error.message);}
  });
  assert.ok(unknown);await page.waitForFunction(()=>workerCounts.active===0);
  const late=await page.evaluate(async()=>{
    window.runtimeEntered=false;window.lateCleanup=0;
    const pending=openIfc("ifc4.ifc",{configureRuntime(){runtimeEntered=true;return new Promise(resolve=>{window.finishRuntime=resolve;});}}).then(()=>false,error=>error.name==="AbortError");
    while(!runtimeEntered)await new Promise(resolve=>setTimeout(resolve,1));
    controller.abort();const aborted=await pending;
    finishRuntime(()=>{lateCleanup++;});await new Promise(resolve=>setTimeout(resolve,20));
    return{aborted,cleanups:lateCleanup};
  });
  assert.deepEqual(late,{aborted:true,cleanups:1});await page.waitForFunction(()=>workerCounts.active===0);
  assert.equal(await page.locator("canvas").count(),0);
  report.invalidSettings=invalidSettings;report.unknownSettings=unknown;report.lateRuntimeCleanup=late;
  // Input limit is enforced before another worker or transferable copy is allocated.''')])

edit('packages/renderers/3d/IFC.md', [('The adapter owns and disposes these objects.', '''### Pre-import settings and pre-model runtime hook

This data-only bridge incorporates the advanced configuration direction proposed
by @p4535992 in PR #275, on the owned-Worker architecture from PR #276. It does not
add the draft's duplicate runtime or separate capability/assets packages.

```ts
createIfcRenderer({
  thatOpen: {
    importer: {
      webIfcSettings: { COORDINATE_TO_ORIGIN: true, CIRCLE_SEGMENTS: 24 },
      geometryProcessSettings: { threshold: 3000 },
      includeMaterialProperties: true
    },
    fragments: { settings: { maxUpdateRate: 80 } }
  },
  configureRuntime({ components, fragments, world, signal }) {
    // Actual adapter-owned objects, before fragments.load() creates the model.
    // Configure Components/camera/scene here, not through private-field assignment.
    const handler = () => { /* application-specific integration */ }
    window.addEventListener('bim-settings', handler, { signal })
    return () => window.removeEventListener('bim-settings', handler)
  },
  configure({ model }) {
    // Existing post-load hook remains available.
  }
})
```

`thatOpen.importer` accepts existing public data fields on the installed
`IfcImporter`; `thatOpen.fragments.settings` accepts public writable fields on
`FragmentsModels.settings`. These are advanced, upstream-version-coupled APIs,
not a normalization of every That Open release. Omitted fields preserve defaults.
Nested Loader/geometry bags are merged; native Sets/Maps replace contents while
retaining library-owned collection instances. Use native `Set` for
`attributesToExclude` and native `Map` for `relations`.

Settings are copied before Worker allocation or copying file bytes. Only plain
data, finite numbers, arrays and native Sets/Maps are accepted, limited to 2,048
nodes, eight nesting levels and 65,536 cumulative string/key characters. Functions,
accessors, class instances, cycles, prototype/private keys and custom collection
properties are rejected. WASM locations, executable methods and Worker ownership
remain adapter-controlled. Unknown top-level fields fail rather than being ignored.
The Worker validates settings again before parsing. These shape/size guards do
not replace upstream documentation for valid option values; configuration is
trusted application code, never document-supplied executable metadata.

Both hooks may be asynchronous and return synchronous cleanup. Cleanup runs once
in reverse registration order, including late completion after cancellation. A
failing cleanup does not prevent other hooks or Workers/WebGL from being disposed.
Never dispose adapter-owned objects or replace their Worker/lifecycle methods.

The adapter owns and disposes these objects.''')])

edit('.github/dependabot.yml', [('  - package-ecosystem: github-actions', '''  # The cold consumer is outside the workspace. Framework and compiler peers
  # must move together rather than producing individually incompatible PRs.
  - package-ecosystem: npm
    directory: /apps/component-demo/test/angular-pptx
    schedule:
      interval: weekly
      day: monday
      time: '03:10'
      timezone: Asia/Shanghai
    open-pull-requests-limit: 3
    groups:
      angular-version-cohort:
        applies-to: version-updates
        patterns:
          - '@angular/*'
      angular-security-cohort:
        applies-to: security-updates
        patterns:
          - '@angular/*'
    commit-message:
      prefix: chore(deps)
    ignore:
      - dependency-name: '@angular/*'
        update-types:
          - version-update:semver-major

  - package-ecosystem: github-actions''')])
write('.github/scripts/dependency-cohort.test.mjs', r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
function angularCohort(manifest) {
  const dependencies = {...manifest.dependencies,...manifest.devDependencies}
  for (const name of ['common','compiler','core','platform-browser','build','cli','compiler-cli']) assert.ok(dependencies[`@angular/${name}`],`Missing Angular cohort member: ${name}`)
  const versions=Object.entries(dependencies).filter(([name])=>name.startsWith('@angular/')).map(([,version])=>version)
  assert.equal(new Set(versions).size,1,'Angular framework and tooling must use one exact cohort')
  assert.match(versions[0],/^\d+\.\d+\.\d+$/,'Angular fixture must pin stable exact versions')
}
const fixture=JSON.parse(read('apps/component-demo/test/angular-pptx/package.json'))
test('cold Angular consumer pins a complete aligned cohort',()=>angularCohort(fixture))
test('a single-package Angular bump fails before installation',()=>{const changed=structuredClone(fixture);changed.dependencies['@angular/core']='0.0.0';assert.throws(()=>angularCohort(changed),/one exact cohort/)})
test('thumbnail manifest agrees with workspace Vitest security override',()=>{
  const thumbnail=JSON.parse(read('packages/thumbnail/package.json'))
  const override=read('pnpm-workspace.yaml').match(/^  vitest: (\S+)$/m)?.[1]
  assert.ok(override);assert.equal(thumbnail.devDependencies.vitest,override)
})
test('Dependabot groups version and security Angular updates in the nested fixture',()=>{
  const entry=read('.github/dependabot.yml').split('  - package-ecosystem: npm').find(part=>part.includes('directory: /apps/component-demo/test/angular-pptx'))
  assert.ok(entry)
  assert.match(entry,/angular-version-cohort:\s+applies-to: version-updates\s+patterns:\s+- '@angular\/\*'/)
  assert.match(entry,/angular-security-cohort:\s+applies-to: security-updates\s+patterns:\s+- '@angular\/\*'/)
})
''')
write('docs/maintenance/pr-issue-review-20260912.md', '''# PR and issue review — 2026-09-12

Scope: all six open PRs and seven open issues in `flyfish-dev/file-viewer`, plus
related DOCX/CAD/spreadsheet upstreams. Source maintenance only: no npm release,
version bump, release tag or automatic issue closure.

## PR disposition

| PR | Decision |
| --- | --- |
| #276 | Merged as `db73a732e4978f2e4d0d573cd0ed7333690fe461`. Exact-head Public CI `34625940086`, Security `34625940222` and corrected PR evidence gate `34679546125` passed. No governance rules were weakened. |
| #275 | Incorporate @p4535992's advanced-configuration direction (comment `5638194837`) on #276's stronger owned-Worker foundation. This change adds data-only importer/Fragments settings and a pre-model runtime hook. Do not merge the separate draft capability/assets packages or duplicate runtime. |
| #270 / #271 / #274 | Combine upgrade intent into the complete **Angular 22.1.6** framework/tooling cohort: common, compiler, core, platform-browser, build, CLI and compiler-cli. Registry metadata confirms matching published versions and exact framework peers. Individual 22.1.0/22.1.1 PRs are superseded by this coordinated change. |
| #261 | Synchronize the thumbnail manifest to **Vitest 4.1.11**, already selected by the workspace security override. Real thumbnail tests verify the result; the runtime was not actually on Vitest 3 before this manifest correction. |

Qualification `34679652404` passed real lock generation, frozen installation,
core/thumbnail builds, thumbnail tests, governance and public-release facts. A
clean Angular consumer passed npm installation, peer-tree validation and `ng build`.
The lockfile required no byte change because Vitest was already overridden and the
Angular fixture is outside the workspace. The full consolidated CI additionally
runs packed Angular browser consumers and all existing rendering/framework gates.

Prevent recurrence: group nested `@angular/*` version and security updates;
deterministic tests reject split framework/tooling versions and thumbnail pin drift.
The IFC gate verifies actual Worker settings effects, original IFC4/IFC4.3 geometry,
picking, reverse-order cleanup and cancellation, rather than only checking types.

## Issue follow-up

All seven issue bodies and available comments were re-read. The table distinguishes
source inclusion, publication and original-report acceptance. No missing sample is
silently replaced by a synthetic fixture, and issues stay open pending acceptance.

| Issue | Evidence / next acceptance condition |
| --- | --- |
| #227 — XLS undefined name | Original sensitive XLS remains unavailable in the thread. WPS re-saving is a workaround, not root-cause proof. Require a sanitized failing file or dated private receipt; MiniFAT fixtures alone do not prove this report fixed. |
| #248 — Vue CLI DOCX/XLS | Latest comment supplies an XLS screenshot, not a project/file. Existing cold Vue CLI tests do not prove the reporter's exact integration. Require lockfile, minimal project, original bytes and failing console/Worker requests. |
| #266 — Word/OFD fidelity | Original-sample repairs are in #273/#276 and upstream docxjs#10. Diagonal source is merged, but npm `@file-viewer/docx` was still **0.3.31** at review. Pending upstream publication and downstream dependency/Worker/lock synchronization. |
| #267 — IFC | Optional viewer foundation is merged; this change incorporates the advanced configuration request. Scope is local visualization/inspection, not full BIM authoring or a promise of arbitrary large-model performance. Preserve self-hosted assets and license notices. |
| #268 — PPTX charts/tables | Reporter supplied `default.pptx` in comment `5628266590`; original-file repairs/evidence are in merged #272. Pending delivery of a new File Viewer package and reporter confirmation, not a claim that the public package is already updated. |
| #269 — CAD Chinese text | Thread still lacks original CAD file, font resources and usable environment/version details. Need original DWG/DXF, SHX/TTF mapping and failing font/network requests. Screenshot alone cannot distinguish encoding from missing fonts. |
| #277 — binary inspector | Separately scoped optional read-only feature proposal, not implemented in this release. Acceptance should require virtual hex/ASCII, bounded terminable parsing, allowlisted build-time templates with per-template license review, and explicit routing that cannot steal dedicated renderers. Editing/arbitrary executable templates are out of initial scope. |

Related upstreams: `flyfish-dev/docxjs` had no open PRs/issues; #10 is merged as
`6dbe15e347459f3707116d531fc9064f2d4c2a95`. The live CAD and styled-exceljs upstream
snapshots likewise had no open items.

## Release handoff

After the maintainer publishes the reviewed upstream DOCX version, run:

```sh
pnpm release:prepare-docx <exact-published-version>
pnpm release:verify
git diff --check
```

Review and commit synchronized dependency, runtime/Worker and lockfile metadata.
The actual-installed-engine behavioral gate must pass before File Viewer release.
Do not publish with the old DOCX dependency simply because source CI is green.
''')
print('Applied reviewed IFC bridge, dependency grouping and triage documentation')
