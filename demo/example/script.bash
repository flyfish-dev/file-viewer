#!/usr/bin/env bash
set -euo pipefail

declare -A RENDERERS=(
  [pdf]="pdfjs-dist"
  [ofd]="DLTech21/ofd.js"
  [dxf]="@cadview/core"
  [ts]="highlight.js"
  [json]="highlight.js"
)

extension_of() {
  local filename=$1
  printf '%s\n' "${filename##*.}" | tr '[:upper:]' '[:lower:]'
}

preview_plan() {
  local filename=$1
  local ext
  ext=$(extension_of "$filename")
  local renderer=${RENDERERS[$ext]:-fallback}
  printf '%-18s -> %-18s async=%s\n' "$filename" "$renderer" "$([[ $renderer != fallback ]] && echo yes || echo no)"
}

main() {
  local files=(contract.pdf invoice.ofd drawing.dxf code.ts archive.bin)
  for file in "${files[@]}"; do
    preview_plan "$file"
  done
}

main "$@"
