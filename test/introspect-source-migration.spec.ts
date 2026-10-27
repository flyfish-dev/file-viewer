import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const book = JSON.parse(readFileSync(new URL('../packages/renderers/design/LICENSES/Introspect_NATIVE_THIRD_PARTY_LICENSES.json', import.meta.url), 'utf8'));
const original = '47ab9d90c8004c32b7d410cc8f2a554b6493a260';
const migrated = '0a6ad98729b759f4c698f9e829f5b75d9ae431b9';

describe('IDML official corresponding-source migration', () => {
  it('preserves the installed Cargo identity while naming the complete immutable migrated source', () => {
    const archive = book.licenseReview.correspondingSourceArchives.find((item: { originalCommit?: string }) => item.originalCommit === original);
    expect(archive).toMatchObject({
      url: `https://codeload.github.com/paged-media/paged/tar.gz/${migrated}`,
      sha256: 'b12e8384271b88cd27ef4efdd08785a63f6c50e706c4cbae3e75e09b639eca45',
      commit: migrated, originalCommit: original, subdirectory: 'modules/publish',
      migration: {
        mapCommit: 'a86a8867d8cdc78b8f737ad18ef7bd0e48f0b0d6',
        mapPath: 'tooling/import/commit-maps/plugin-publish.tsv',
        sourceTree: 'f271f202b6d764e7af4146f6fb12240c8df9a66c', sourceFiles: 154,
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
