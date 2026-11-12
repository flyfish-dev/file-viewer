# Maintained source changes

These readable ES modules are the repository-maintained DLTech21/ofd.js source, directly imported by the OFD renderer and shipped verbatim via package.files. The normal build compiles src/*.ts only. There is no generated OFD JavaScript replacement step. Retain the existing upstream copyright and Apache-2.0 headers.

## 0001: Do not inspect rejected parse errors while logging

Base: local repository commit fb9063b493d5ffab209556fc7960a4ddca525700, unchanged at 7e5e131c5340dbd421e47725c895554ecc75ff11. The upstream project is https://github.com/DLTech21/ofd.js; the exact external upstream revision is not recorded locally.

Patch: patches/0001-no-raw-error-log.patch (paths relative to repository root).

Before SHA256: 55048f9b8052a2c079b89c0f7a571e5c10deb1f9e6c903cca80ef2a0a54f4988

After SHA256: b5a05049fb3a7f9764bc3cfb7bd1dcd753b42b4e5075bd82ed0485952aa862d6

Only console.log(res) is removed from doParseOFD's failure handler. options.fail receives the exact original rejection once, in the same order. No error is converted to text, swallowed, or replaced. Browser consoles can invoke Error.toString and a user-defined message getter; diagnostic logging must not consume a getter before the owner captures the detail.

Verification: replay the unified patch against the exact base, run test/ofd-error-detail.spec.ts and normal OFD verification scripts, build normally, pack normally, then compare this source byte-for-byte with the tgz and installed package. The patch is already applied here; do not apply it twice.
