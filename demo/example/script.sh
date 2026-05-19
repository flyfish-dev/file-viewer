#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
EXAMPLE_DIR="$ROOT_DIR/public/example"

count_files() {
  find "$EXAMPLE_DIR" -type f | wc -l | tr -d ' '
}

print_section() {
  printf '\n== %s ==\n' "$1"
}

print_section "Flyfish Viewer sample audit"
printf 'root: %s\n' "$ROOT_DIR"
printf 'examples: %s files\n' "$(count_files)"

print_section "code samples"
find "$EXAMPLE_DIR" \
  \( -name '*.js' -o -name '*.ts' -o -name '*.vue' -o -name '*.sql' \) \
  -maxdepth 1 \
  -type f \
  -print | sort
