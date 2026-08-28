#!/usr/bin/env bash
set -euo pipefail

# Use the MIT-licensed upstream CLI directly so the security gate does not
# depend on a marketplace subscription or an unpinned container/action tag.
readonly GITLEAKS_VERSION="8.30.1"

case "$(uname -s):$(uname -m)" in
  Darwin:arm64)
    readonly GITLEAKS_PLATFORM="darwin_arm64"
    readonly GITLEAKS_SHA256="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"
    ;;
  Darwin:x86_64)
    readonly GITLEAKS_PLATFORM="darwin_x64"
    readonly GITLEAKS_SHA256="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709"
    ;;
  Linux:aarch64 | Linux:arm64)
    readonly GITLEAKS_PLATFORM="linux_arm64"
    readonly GITLEAKS_SHA256="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080"
    ;;
  Linux:x86_64)
    readonly GITLEAKS_PLATFORM="linux_x64"
    readonly GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
    ;;
  *)
    printf 'Unsupported Gitleaks host: %s:%s\n' "$(uname -s)" "$(uname -m)" >&2
    exit 1
    ;;
esac

readonly GITLEAKS_ARCHIVE="gitleaks_${GITLEAKS_VERSION}_${GITLEAKS_PLATFORM}.tar.gz"
readonly GITLEAKS_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ARCHIVE}"

scan_tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "${scan_tmp_dir}"' EXIT

curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location \
  --output "${scan_tmp_dir}/${GITLEAKS_ARCHIVE}" \
  "${GITLEAKS_URL}"

if command -v sha256sum >/dev/null 2>&1; then
  actual_sha256="$(sha256sum "${scan_tmp_dir}/${GITLEAKS_ARCHIVE}" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  actual_sha256="$(shasum -a 256 "${scan_tmp_dir}/${GITLEAKS_ARCHIVE}" | awk '{print $1}')"
else
  printf 'Neither sha256sum nor shasum is available.\n' >&2
  exit 1
fi

if [[ "${actual_sha256}" != "${GITLEAKS_SHA256}" ]]; then
  printf 'Gitleaks archive checksum mismatch for %s.\n' "${GITLEAKS_ARCHIVE}" >&2
  exit 1
fi

tar -xzf "${scan_tmp_dir}/${GITLEAKS_ARCHIVE}" -C "${scan_tmp_dir}" gitleaks

"${scan_tmp_dir}/gitleaks" git \
  --no-banner \
  --redact \
  --exit-code 1 \
  --timeout 1500 \
  --config .gitleaks.toml \
  .
