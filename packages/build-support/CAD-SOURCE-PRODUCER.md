# CAD preferred-source producer

Run from the private source owner. Read-only planning:

```sh
node packages/build-support/generate-cad-source-snapshot.mjs --version <new-version>
```

`--source-root <path>` selects another source worktree. The default mode reads source, the retained reviewed ZIP, Git identity and the installed toolchain; it does not create files, install dependencies or build. The plan lists source digests, manifest transformations, exact output paths and write blockers. A plan is not a runtime proof.

After source/version preparation and review are complete, invoke the same CLI with `--write` using actual Node 24.20.0 and its sibling npm 11.19.0. The worktree must be clean and committed; root, core and CAD manifests must match the requested version, which must be newer than the retained source archive. Toolchain mismatches stop generation. The producer does not replace PATH/HOME or report another tool version.

Changed preferred inputs for the same unreleased package version require an explicit `--source-revision <label>`, such as `ci-recovery-20261114`. The producer writes a new `<version>-<label>` snapshot and output directory. It rejects unchanged preferred inputs, older versions and unsafe labels; every clean-HEAD, complete-source, toolchain, grant, double-build and exclusive-output check still applies. The prior version directory and normal ZIP are preserved. Pass the same optional `source_revision` when dispatching the public source verification workflow. A source revision never changes npm package versions.

Clean status is not sufficient. Preferred inputs, the root version/lock, retained ZIP and controller inputs must match HEAD's actual blob bytes and Git executable mode. The producer reads Git objects and hashes real working files without relying on index stat flags, so `assume-unchanged`, `skip-worktree` and staged-versus-HEAD differences cannot hide changed inputs. It repeats these checks before writing output. Executing controller hashes are recorded separately and must match the committed source owner. A normal checkout with byte-changing EOL filters must use the exact committed source bytes for formal generation.

The producer captures every current preferred input through the same enumeration/JSON digest rules as the verifier. It uses the hash-verified retained archive only for the standalone recipe, pinned external lock and original grants/notices. It replaces the complete preferred-source membership, including additions and removals. Standalone package manifests omit scripts/development dependencies and convert the internal core workspace reference to its exact version. The lock updates local workspace identity only. An external dependency or package grant change stops generation for separate review. Original input digests, adapted-byte digests, transformations and all emitted member digests remain in `SOURCE_MANIFEST.json`.

Write mode creates two new temporary build roots. Each runs the sibling npm CLI with `ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/`, then invokes the retained `build.mjs` directly. No lifecycle or browser installation is run. These are trusted-host builds, not an operating-system sandbox. Ordinary npm cache/registry access remains available; lockfile integrity and installed build versions are checked. The second build uses only extracted ZIP members and must reproduce the first runtime byte for byte. Archived input mutation, source/commit changes during generation, or failed install/build/replay prevents a measured result from being published. Failure logs remain in the printed temporary evidence directory.

The ZIP uses sorted entries, a fixed 1980 timestamp, regular-file mode 0644, and DEFLATE level 9. It contains no installed dependencies, generated runtime, timestamps or private source paths. Generation receipts bind actual source commit, Node/npm binary fingerprints, installed build versions and measured runtime/archive hashes.

Successful output is limited to:

- `packages/build-support/cad-source-snapshots/<new-version>/`: complete standalone source tree.
- `.release/cad-source/<new-version>/CORRESPONDING_SOURCE.zip`: deterministic ZIP.
- `.release/cad-source/<new-version>/generation-receipt.json`: local generation/replay evidence.

Existing destinations must match every file, mode and byte; otherwise generation refuses to overwrite them. An interrupted final exclusive copy may leave an incomplete destination; inspect that evidence before deciding how to recover. The producer never resets or deletes an existing version directory. It never edits the old snapshot, normal `packages/renderers/cad/CORRESPONDING_SOURCE.zip`, source-offer constants, CURRENT, versions, lockfile, Git index, commits or remotes.

For a revised source offer, first publish the new reviewed snapshot on the existing preparation PR branch and read its immutable commit through HTTPS with the normal public cold-build workflow. Only after that succeeds may the active normal ZIP/source-offer bindings be promoted. A locally generated snapshot or a planned commit URL is not evidence of public availability.

Write mode owns `.release/cad-source/producer-<snapshot-id>.lock` exclusively, where the snapshot id is the version or explicit version-revision, and rechecks its inode/device identity before output and cleanup. A lost or replaced lock stops generation and is retained for inspection; do not remove another run's lock to retry.

The receipt explicitly keeps `publicSourceVerified`, `actualFullVerified` and `releaseReady` false. Root release preparation must still review/promote the ZIP, bind the new source offer, publish and read back immutable public source through the existing Oracle workflow, and run normal `verify-cad-corresponding-source.mjs --rebuild --remote` against the actual Full owner runtime. The producer never fills those gates with local pass states. Do not execute it for 3.3.4 until the source owner explicitly starts the final generation.
