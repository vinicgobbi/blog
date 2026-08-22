#!/usr/bin/env bash
#
# Sync each post's `last_modified_at` front matter field to the file's
# actual filesystem last-modified time.
#
# Note: this reflects mtime, which resets on a fresh `git clone` — so run
# this locally, right before committing, not from CI/build. The build
# itself already sets `last_modified_at` from git history at build time
# (see _plugins/posts-lastmod-hook.rb); this script keeps the raw .md
# file's front matter in sync too, so it's accurate before you commit.
#
# Usage: See help information

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POSTS_DIR="_posts"

help() {
  echo "Atualiza 'last_modified_at' nos posts para a data de modificação real do arquivo."
  echo
  echo "Usage:"
  echo
  echo "   bash tools/update-lastmod.sh [file ...]"
  echo
  echo "Sem argumentos, atualiza todos os posts em $POSTS_DIR."
  echo
  echo "Options:"
  echo "     -h, --help    Print this help information."
}

files=()

while (($#)); do
  opt="$1"
  case $opt in
  -h | --help)
    help
    exit 0
    ;;
  *)
    files+=("$opt")
    shift
    ;;
  esac
done

if [[ ${#files[@]} -eq 0 ]]; then
  while IFS= read -r -d '' f; do
    files+=("$f")
  done < <(find "$POSTS_DIR" -maxdepth 1 -name '*.md' -print0 | sort -z)
fi

for f in "${files[@]}"; do
  if [[ ! -f $f ]]; then
    echo "> Arquivo não encontrado, pulando: $f"
    continue
  fi

  mtime="$(date -d "@$(stat -c %Y "$f")" +"%Y-%m-%d %H:%M")"
  ruby "$SCRIPT_DIR/update_lastmod.rb" "$f" "$mtime"
done
