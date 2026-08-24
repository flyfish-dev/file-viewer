import assert from 'node:assert/strict';
import {
  detectOpenPgpArmorType,
  hasPlausibleOpenPgpPacketHeader,
  isProbablyOpenPgp,
} from '../dist/openpgp/formatDetection.js';

const enc = new TextEncoder();
const cases = [
  ['-----BEGIN PGP MESSAGE-----\n', 'message'],
  ['-----BEGIN PGP SIGNATURE-----\n', 'signature'],
  ['-----BEGIN PGP SIGNED MESSAGE-----\n', 'cleartext-signed-message'],
  ['-----BEGIN PGP PUBLIC KEY BLOCK-----\n', 'public-key'],
  ['-----BEGIN PGP PRIVATE KEY BLOCK-----\n', 'private-key'],
];
for (const [source, armorType] of cases) {
  const bytes = enc.encode(source);
  assert.equal(detectOpenPgpArmorType(bytes), armorType);
  assert.equal(isProbablyOpenPgp(bytes), true);
}

assert.equal(isProbablyOpenPgp(enc.encode('plain text'), 'document.sig'), true, 'Known OpenPGP extensions are routing hints.');
assert.equal(isProbablyOpenPgp(enc.encode('plain text'), 'document.txt'), false, 'Unrelated plain text must not be classified as OpenPGP.');
assert.equal(hasPlausibleOpenPgpPacketHeader(Uint8Array.from([0xc8, 0x00])), true, 'Plausible binary packet header must be recognized.');
console.log('OpenPGP format-detection verification passed.');
