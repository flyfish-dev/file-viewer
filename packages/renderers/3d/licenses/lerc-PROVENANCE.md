# Lerc 3.0.0 license provenance

The raster decoder bundles `lerc@3.0.0`, a transitive dependency of the reviewed
GeoTIFF implementation. Its package declares `Apache-2.0`, but the npm package
root used by the frozen install does not contain the full license. The upstream
JavaScript package lives under `OtherLanguages/js`; the legal files are at the
repository root, outside that published package directory.

Reviewed upstream source: <https://github.com/Esri/lerc/tree/v3.0>.
The package at `OtherLanguages/js/package.json` declares version `3.0.0`, license
`Apache-2.0`, and a files list containing the two decoder JavaScript files.

The following files are shipped byte-for-byte, including the upstream line
endings, trailing spaces, and final-newline choices. Before verification, the
build restores upstream line endings (LF for LICENSE, CRLF for NOTICE) if Git
converted them during checkout. The checkout files themselves are not modified:

| Local file | Upstream file | Git blob identity |
| --- | --- | --- |
| `lerc-LICENSE` | <https://github.com/Esri/lerc/blob/v3.0/LICENSE> | `863d15091ebca6473a211f9d99a0051502f63d8b` |
| `lerc-NOTICE` | <https://github.com/Esri/lerc/blob/v3.0/NOTICE> | `826163b3f97fc3c5c417ae72440e263927e99163` |

The fallback applies only when a root license is absent and the installed package
is exactly `lerc@3.0.0` with the declared license `Apache-2.0`. The build verifies
both retained files against these upstream Git blob identities before copying
anything from the fallback. Other missing licenses and altered retained files
remain fatal build errors. This is not a general replacement for package licenses.

The decoder output carries both the full license and the upstream NOTICE under
`dist/geo3d-workers/raster-licenses/`. Their SHA-256 digests are recorded in the
raster package manifest alongside those of the other collected legal files. The
asset copier deploys the listed files with the Workers; installed consumers use
the built output and do not download legal files or regenerate adapters.

No dependency version, lockfile, Worker policy, source review hash, or fixture is
changed by this packaging fix. A future package version requires review rather
than widening this fallback silently.
