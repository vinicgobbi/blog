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
# Without file args, only posts with pending git changes are touched —
# mtime alone isn't a reliable signal (it also changes on git clone,
# checkout, etc.), so scoping to git-dirty files avoids re-stamping every
# post on every run. Pass -a/--all to force every post regardless.
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
  echo "Sem argumentos, atualiza apenas os posts com alterações pendentes no git"
  echo "(staged, unstaged ou untracked) dentro de $POSTS_DIR."
  echo
  echo "Options:"
  echo "     -a, --all     Atualiza todos os posts em $POSTS_DIR, mesmo sem"
  echo "                   alterações pendentes."
  echo "     -h, --help    Print this help information."
}

files=()
all=0

while (($#)); do
  opt="$1"
  case $opt in
  -h | --help)
    help
    exit 0
    ;;
  -a | --all)
    all=1
    shift
    ;;
  *)
    files+=("$opt")
    shift
    ;;
  esac
done

if [[ ${#files[@]} -eq 0 ]]; then
  if [[ $all -eq 1 ]]; then
    while IFS= read -r -d '' f; do
      files+=("$f")
    done < <(find "$POSTS_DIR" -maxdepth 1 -name '*.md' -print0 | sort -z)
  else
    # Só posts com alterações pendentes (staged, unstaged ou untracked),
    # já que o mtime do arquivo sozinho não indica edição real de conteúdo.
    while IFS= read -r -d '' f; do
      files+=("$f")
    done < <(git status --porcelain -z -- "$POSTS_DIR" \
      | sed -z -E 's/^.{3}//' \
      | grep -zE '\.md$')

    if [[ ${#files[@]} -eq 0 ]]; then
      echo "Nenhum post com alterações pendentes em $POSTS_DIR. Use -a/--all para forçar todos."
      exit 0
    fi
  fi
fi

for f in "${files[@]}"; do
  if [[ ! -f $f ]]; then
    echo "> Arquivo não encontrado, pulando: $f"
    continue
  fi

  mtime="$(date -d "@$(stat -c %Y "$f")" +"%Y-%m-%d %H:%M")"
  ruby "$SCRIPT_DIR/update_lastmod.rb" "$f" "$mtime"
done
