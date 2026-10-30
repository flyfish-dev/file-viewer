import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const book = JSON.parse(readFileSync(new URL('../packages/renderers/design/LICENSES/Introspect_NATIVE_THIRD_PARTY_LICENSES.json', import.meta.url), 'utf8'));
const original = '468262044817a2b8bef1540b67759bf979e577af';
const migrated = '116e5df5dab8bd5b7677c1155a79cb0ed3048a4a';

describe('IDML official corresponding-source migration', () => {
  it('preserves the installed Cargo identity while naming the complete immutable migrated source', () => {
    const archive = book.licenseReview.correspondingSourceArchives.find((item: { originalCommit?: string }) => item.originalCommit === original);
    expect(archive).toMatchObject({
      url: `https://api.github.com/repos/paged-media/paged/tarball/${migrated}`,
      sha256: 'e9f01936ff17fd5184da3a958821acd122eaa07ec011162e4de6d95312661448',
      commit: migrated, originalCommit: original, subdirectory: 'modules/publish',
      migration: {
        mapCommit: 'a86a8867d8cdc78b8f737ad18ef7bd0e48f0b0d6',
        mapPath: 'tooling/import/commit-maps/plugin-publish.tsv',
        sourceTree: 'e2e5af9b5a8a170d0c918dd1293d6bdd7db49e7a', sourceFiles: 231,
        includesAllOriginalFiles: true,
      },
    });
    for (const name of ['idml-import', 'idml-export']) {
      const dependency = book.packages.find((item: { name: string }) => item.name === name);
      expect(dependency.sourceCommit).toBe(original);
      expect(dependency.cargoLockSource).toContain(`rev=${original}#${original}`);
      expect(dependency.correspondingSource).toEqual(archive);
      expect(dependency.selectedLicense).toBe('MPL-2.0');
    }
  });

  it('retains every original native material byte and the original dual-license choices', () => {
    for (const material of Object.values(book.materials) as { text: string; sha256: string }[]) {
      expect(createHash('sha256').update(material.text).digest('hex')).toBe(material.sha256);
    }
    for (const dependency of book.packages.filter((item: { name: string }) => ['idml-import', 'idml-export'].includes(item.name))) {
      expect(dependency.declaredLicense).toBe('MPL-2.0 OR LicenseRef-PMEL');
      expect(dependency.legalFiles.map((item: { sha256: string }) => item.sha256)).toEqual([
        '3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04',
        '6d1bbe49d3f70127dbf8c4c5c77a923c9354d6adff6154e9cd78a0d8125e8daa',
      ]);
    }
  });
});
