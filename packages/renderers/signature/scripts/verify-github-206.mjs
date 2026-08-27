import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { inspectSignatureContainer } from '../dist/signatureAsn1.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(here, '../test/fixtures/github-206-contributed');
const read = name => readFile(resolve(fixtures, name));
const inspect = async (name, original) => inspectSignatureContainer(await read(name), original ? { originalContent: await read(original), sourceFilename: name } : { sourceFilename: name });

const required = [
  'cms/invoice-encapsulated.pdf.p7m',
  'cms/invoice-cades-bes.pdf.p7m',
  'cms/invoice-detached.pdf.p7s',
  'cms/xml-encapsulated-but-named.p7s',
  'cms/hello-multi-signer.p7m',
  'cms/invoice-double-signed.p7m',
  'cms/invoice-encapsulated.pem.pkcs7',
  'cms/certificate-chain.p7b',
  'cms/certificate-chain-with-crl.p7c',
  'cms/certificate-only-misnamed.p7m',
  'timestamps/invoice-sha256.tsq',
  'timestamps/invoice-sha256.tsr',
  'timestamps/invoice-sha256.tst',
  'timestamps/hello-sha384-no-nonce.tsq',
  'timestamps/hello-sha384-no-nonce.tsr',
  'timestamps/hello-sha384-no-nonce.tst',
  'timestamps/invoice-embedded.tsd',
  'timestamps/invoice-external-content.tsd',
  'timestamps/rejected-bad-alg.tsr',
  'negative/truncated-signed-data.p7m',
  'negative/plain-text-with-p7s-extension.p7s',
];
for (const name of required) await read(name);

const invoice = await read('originals/invoice.pdf');
const encapsulated = await inspect('cms/invoice-encapsulated.pdf.p7m');
assert.equal(encapsulated.kind, 'cms-signed-data');
assert.deepEqual(Buffer.from(encapsulated.embeddedContent || []), invoice);
assert.equal(encapsulated.signers.length, 1);
assert.equal(encapsulated.signers[0]?.digestMatches, true);
assert.equal(encapsulated.signers[0]?.cryptographicSignatureValid, true);

const cades = await inspect('cms/invoice-cades-bes.pdf.p7m');
assert.equal(cades.signers[0]?.signingCertificateV2, true);
assert.deepEqual(Buffer.from(cades.embeddedContent || []), invoice);

const detached = await inspect('cms/invoice-detached.pdf.p7s', 'originals/invoice.pdf');
assert.equal(detached.detached, true);
assert.equal(detached.signers[0]?.digestMatches, true);
assert.equal(detached.signers[0]?.cryptographicSignatureValid, true);
const detachedBad = await inspect('cms/invoice-detached.pdf.p7s', 'originals/invoice-tampered.pdf');
assert.equal(detachedBad.signers[0]?.digestMatches, false);

const p7sEmbedded = await inspect('cms/xml-encapsulated-but-named.p7s');
assert.equal(p7sEmbedded.detached, false);
assert.ok((p7sEmbedded.embeddedContent?.byteLength || 0) > 0);

const multi = await inspect('cms/hello-multi-signer.p7m');
assert.equal(multi.signers.length, 2);
assert.equal(multi.signers.every(signer => signer.cryptographicSignatureValid === true), true);
assert.ok(multi.signers.some(signer => /RSA/i.test(signer.signatureAlgorithm || '')));
assert.ok(multi.signers.some(signer => /ECDSA/i.test(signer.signatureAlgorithm || '')));

const outer = await inspect('cms/invoice-double-signed.p7m');
assert.equal(outer.kind, 'cms-signed-data');
assert.ok(outer.embeddedContent);
const inner = await inspectSignatureContainer(outer.embeddedContent);
assert.equal(inner.kind, 'cms-signed-data');
assert.deepEqual(Buffer.from(inner.embeddedContent || []), invoice);

const pem = await inspect('cms/invoice-encapsulated.pem.pkcs7');
assert.equal(pem.kind, 'cms-signed-data');
assert.equal(pem.signers.length, 1);

const p7b = await inspect('cms/certificate-chain.p7b');
assert.equal(p7b.kind, 'cms-certificates');
assert.equal(p7b.certificates.length, 4);
assert.equal(p7b.crlCount, 0);
const p7c = await inspect('cms/certificate-chain-with-crl.p7c');
assert.equal(p7c.kind, 'cms-certificates');
assert.equal(p7c.certificates.length, 4);
assert.equal(p7c.crlCount, 1);
const misnamed = await inspect('cms/certificate-only-misnamed.p7m');
assert.equal(misnamed.kind, 'cms-certificates');
assert.equal(misnamed.signers.length, 0);

const tsq256 = await inspect('timestamps/invoice-sha256.tsq', 'originals/invoice.pdf');
assert.equal(tsq256.kind, 'timestamp-request');
assert.equal(tsq256.timestamp?.messageImprintAlgorithm, 'SHA-256');
assert.equal(tsq256.timestamp?.messageImprintMatchesOriginal, true);
assert.ok(tsq256.timestamp?.nonce);
assert.equal(tsq256.timestamp?.certReq, true);

const tsr256 = await inspect('timestamps/invoice-sha256.tsr', 'originals/invoice.pdf');
assert.equal(tsr256.kind, 'timestamp-response');
assert.equal(tsr256.timestampResponse?.statusLabel, 'granted');
assert.equal(tsr256.timestamp?.messageImprintMatchesOriginal, true);
const tst256 = await inspect('timestamps/invoice-sha256.tst', 'originals/invoice.pdf');
assert.equal(tst256.kind, 'timestamp-token');
assert.equal(tst256.timestamp?.messageImprintMatchesOriginal, true);

const tsq384 = await inspect('timestamps/hello-sha384-no-nonce.tsq', 'originals/hello.txt');
assert.equal(tsq384.timestamp?.messageImprintAlgorithm, 'SHA-384');
assert.equal(tsq384.timestamp?.nonce, undefined);
assert.equal(tsq384.timestamp?.certReq, true);
const tsr384 = await inspect('timestamps/hello-sha384-no-nonce.tsr', 'originals/hello.txt');
assert.equal(tsr384.timestamp?.messageImprintAlgorithm, 'SHA-384');
assert.equal(tsr384.timestamp?.messageImprintMatchesOriginal, true);
const tst384 = await inspect('timestamps/hello-sha384-no-nonce.tst', 'originals/hello.txt');
assert.equal(tst384.timestamp?.messageImprintAlgorithm, 'SHA-384');
assert.equal(tst384.timestamp?.messageImprintMatchesOriginal, true);

const rejected = await inspect('timestamps/rejected-bad-alg.tsr');
assert.equal(rejected.kind, 'timestamp-response');
assert.equal(rejected.timestampResponse?.statusLabel, 'rejection');
assert.match(rejected.timestampResponse?.failureInfo || '', /badAlg/);

const tsdEmbedded = await inspect('timestamps/invoice-embedded.tsd');
assert.equal(tsdEmbedded.kind, 'timestamped-data');
assert.deepEqual(Buffer.from(tsdEmbedded.embeddedContent || []), invoice);
assert.equal(tsdEmbedded.timestampedData?.filename, 'invoice.pdf');
assert.equal(tsdEmbedded.timestampedData?.mediaType, 'application/pdf');
assert.equal(tsdEmbedded.timestamp?.messageImprintMatchesOriginal, true);
const tsdExternal = await inspect('timestamps/invoice-external-content.tsd', 'originals/invoice.pdf');
assert.equal(tsdExternal.kind, 'timestamped-data');
assert.equal(tsdExternal.embeddedContent, undefined);
assert.match(tsdExternal.timestampedData?.dataUri || '', /^https:\/\/example\.invalid\//);
assert.equal(tsdExternal.timestamp?.messageImprintMatchesOriginal, true);

await assert.rejects(() => inspect('negative/truncated-signed-data.p7m'));
await assert.rejects(() => inspect('negative/plain-text-with-p7s-extension.p7s'));

const packageJson = JSON.parse(await readFile(resolve(here, '../package.json'), 'utf8'));
const dependencyNames = Object.keys({ ...packageJson.dependencies, ...packageJson.optionalDependencies, ...packageJson.peerDependencies });
assert.equal(dependencyNames.some(name => /openpgp|gnupg|gpg/i.test(name)), false, 'Phase one must not introduce OpenPGP dependencies.');

const allFiles = async dir => {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) result.push(...await allFiles(path));
    else result.push(path);
  }
  return result;
};
for (const path of await allFiles(fixtures)) {
  const data = await readFile(path);
  assert.equal(/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(data.toString('utf8')), false, `Private key marker found in ${path}`);
}

console.log('GitHub issue #206 contributed CMS/RFC 3161/RFC 5544 fixture verification passed.');
