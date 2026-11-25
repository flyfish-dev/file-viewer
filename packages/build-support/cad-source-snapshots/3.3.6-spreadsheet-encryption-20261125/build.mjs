import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { build } from 'vite'
import { isolateAmd } from './packages/components/web/scripts/amd-entry.mjs'
import { sanitizeOfflineViewerAssetTree } from './packages/components/web-full/scripts/offline-asset-sanitize.mjs'

const root = dirname(fileURLToPath(import.meta.url))
for (const name of ['core', 'renderers/cad']) {
  const directory = join(root, 'packages', name)
  const path = join(directory, 'tsconfig.json')
  const config = ts.readConfigFile(path, ts.sys.readFile)
  assert.ok(!config.error)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, directory, undefined, path)
  const options = {...parsed.options, removeComments:true, sourceMap:false, declarationMap:false, noEmitOnError:true}
  const program = ts.createProgram({rootNames:parsed.fileNames,options})
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{
    getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'
  }))
  assert.equal(program.emit().emitSkipped,false)
  const fix = spawnSync(process.execPath,[join(directory,'scripts/fix-core-esm-extensions.mjs')],{cwd:root,stdio:'inherit'})
  assert.equal(fix.status,0)
}
const generated = join(root,'.generated/cad.ts')
await mkdir(dirname(generated),{recursive:true})
await writeFile(generated, `

import { cadRenderer as renderer } from '@file-viewer/renderer-cad'

const host = globalThis
const bucket = host.FlyfishFileViewerWebFullRenderers || (host.FlyfishFileViewerWebFullRenderers = {})
bucket['cad'] = renderer
bucket[renderer.id] = renderer
`)
await build({base:'./',configFile:false,publicDir:false,logLevel:'warn',
  define:{'process.env.NODE_ENV':JSON.stringify('production'),'process.env':JSON.stringify({NODE_ENV:'production'}),'import.meta.url':'document.currentScript?.src || location.href'},
  resolve:{alias:{'@file-viewer/renderer-cad':join(root,'packages/renderers/cad/dist/index.js')},dedupe:['@file-viewer/core']},
  build:{emptyOutDir:false,minify:'esbuild',outDir:join(root,'dist'),sourcemap:false,target:'es2020',
    lib:{entry:generated,name:'FlyfishFileViewerWebFullRendererCad',formats:['iife'],fileName:()=> 'cad.iife.js'},
    rollupOptions:{output:{...isolateAmd,exports:'none',extend:true}}}})
await sanitizeOfflineViewerAssetTree(join(root,'dist'))
console.log('Rebuilt the isolated CAD runtime from corresponding preferred sources.')
