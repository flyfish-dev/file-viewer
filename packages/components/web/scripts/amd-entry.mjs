import { readFile, writeFile } from 'node:fs/promises'

// Bundled vendor UMD branches must not register anonymous AMD modules while a
// lazy renderer is loaded by a script tag. Never mutate the host's define.
export const isolateAmd = {
  banner: '(function (define) {',
  footer: '}).call(globalThis, undefined);'
}

export function createAmdEntry(iife, globalName) {
  if (!/^[A-Za-z_$][\w$]*$/.test(globalName)) throw new Error('Invalid browser global name')
  return `${iife}\n;(function (api) {
  if (typeof define === 'function' && define.amd) {
    define([], function () { return api; });
  }
})(globalThis.${globalName});\n`
}

export async function writeAmdEntry(iifePath, globalName) {
  const output = iifePath.replace(/\.iife\.js$/, '.amd.js')
  if (output === iifePath) throw new Error('Expected an .iife.js input')
  await writeFile(output, createAmdEntry(await readFile(iifePath, 'utf8'), globalName))
}
