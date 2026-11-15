#!/bin/sh
# 새 글 파일을 만든다.  사용: scripts/new-post.sh <영문-주소> "<제목>"
set -e
[ $# -ge 2 ] || { echo '사용: scripts/new-post.sh <영문-주소> "<제목>"'; exit 1; }
cd "$(dirname "$0")/.."
f="_posts/$(date +%Y-%m-%d)-$1.md"
[ -e "$f" ] && { echo "이미 있음: $f"; exit 1; }
mkdir -p "img/$1"
cat > "$f" <<EOF
---
layout: post
title: $2
summary: 목록과 글 머리에 보일 한두 문장.
---

## 첫 소제목

본문.
EOF
echo "만듦: $f  (그림은 img/$1/ 에)"
