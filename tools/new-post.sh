#!/usr/bin/env bash
#
# Scaffold a new post under _posts/ with the standard front matter.
#
# Usage: See help information

set -eu

POSTS_DIR="_posts"

help() {
  echo "Cria um novo post em $POSTS_DIR com o front matter padrão."
  echo
  echo "Usage:"
  echo
  echo '   bash tools/new-post.sh "Título do post" [options]'
  echo
  echo "Options:"
  echo "     -a, --author [AUTHOR]   Autor do post (padrão: vinicius)."
  echo "     -o, --open              Abre o arquivo no \$EDITOR depois de criar."
  echo "     -h, --help              Print this help information."
}

author="vinicius"
open_after=false
title=""

while (($#)); do
  opt="$1"
  case $opt in
  -a | --author)
    author="$2"
    shift 2
    ;;
  -o | --open)
    open_after=true
    shift
    ;;
  -h | --help)
    help
    exit 0
    ;;
  *)
    if [[ -n $title ]]; then
      echo -e "> Argumento inesperado: '$opt'\n"
      help
      exit 1
    fi
    title="$opt"
    shift
    ;;
  esac
done

if [[ -z $title ]]; then
  echo -e "> O título do post é obrigatório.\n"
  help
  exit 1
fi

slug="$(python3 -c '
import re, sys, unicodedata

title = sys.argv[1]
norm = unicodedata.normalize("NFKD", title)
ascii_title = norm.encode("ascii", "ignore").decode("ascii")
slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_title).strip("-").lower()
print(slug)
' "$title")"

if [[ -z $slug ]]; then
  echo "> Não foi possível gerar um slug a partir do título '$title'."
  exit 1
fi

date_stamp="$(date +"%Y-%m-%d")"
datetime_stamp="$(date +"%Y-%m-%d %H:%M")"
filename="${POSTS_DIR}/${date_stamp}-${slug}.md"

if [[ -e $filename ]]; then
  echo "> Já existe um post em '$filename'."
  exit 1
fi

escaped_title="${title//\"/\\\"}"

cat >"$filename" <<EOF
---
title: "${escaped_title}"
date: ${datetime_stamp}
author: ${author}
tags: []
categories: []
---

EOF

echo "> Post criado em: $filename"

if $open_after; then
  "${EDITOR:-vi}" "$filename"
fi
