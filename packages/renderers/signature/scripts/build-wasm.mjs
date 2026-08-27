import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rustDir = resolve(packageDir, 'rust');
const targetDir = resolve(rustDir, 'target/wasm32-unknown-unknown/release');
const outDir = resolve(packageDir, 'dist/rpgp-wasm');
const wasmInput = resolve(targetDir, 'file_viewer_rpgp_wrapper.wasm');

const run = (command, args, options = {}) => {
  try {
    execFileSync(command, args, { cwd: rustDir, stdio: 'inherit', ...options });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${command} is required to build the optional rPGP WASM backend.`);
    }
    throw error;
  }
};

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
try {
  await access(resolve(rustDir, 'Cargo.lock'));
} catch {
  console.warn('[renderer-signature] Cargo.lock is missing; generating it before the locked build.');
  run('cargo', ['generate-lockfile']);
}
run('cargo', ['build', '--release', '--locked', '--target', 'wasm32-unknown-unknown']);
run('wasm-bindgen', [wasmInput, '--target', 'web', '--out-dir', outDir, '--out-name', 'rpgp_wrapper']);

const wasmOutput = resolve(outDir, 'rpgp_wrapper_bg.wasm');
try {
  execFileSync('wasm-opt', ['-Oz', wasmOutput, '-o', wasmOutput], { stdio: 'inherit' });
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  console.warn('[renderer-signature] wasm-opt not found; keeping the release wasm-bindgen output.');
}

const raw = await readFile(wasmOutput);
const brotli = brotliCompressSync(raw, {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
});
console.log(`[renderer-signature] rPGP WASM: ${raw.byteLength} bytes raw, ${brotli.byteLength} bytes Brotli.`);
