#!/bin/sh
# 새 글 파일을 만든다.  사용: scripts/new-post.sh <영문-주소> "<제목>" [ko|en|ja|zh]
# 링크 미리보기(OG) 카드도 함께 만든다. 카드 문구는 나중에 직접 고쳐도 된다.
set -e
[ $# -ge 2 ] || { echo '사용: scripts/new-post.sh <영문-주소> "<제목>" [ko|en|ja|zh]'; exit 1; }
cd "$(dirname "$0")/.."
slug="$1"
title="$2"
lang="${3:-ko}"
case "$lang" in
  ko|en|ja|zh) ;;
  *) echo "언어는 ko / en / ja / zh 중 하나여야 합니다: $lang"; exit 1 ;;
esac
today="$(date +%Y-%m-%d)"
f="_posts/$today-$slug.md"
img="img/og/$slug.png"
if [ "$lang" != "ko" ]; then
  f="_posts/$today-$slug-$lang.md"
  img="img/og/$slug-$lang.png"
fi
[ -e "$f" ] && { echo "이미 있음: $f"; exit 1; }
mkdir -p "img/$slug" img/og
# 글 머리(YAML) 값에 ': ' 나 '#' 가 들어가면 따옴표로 감싸야 Jekyll 이 제대로 읽는다. 제목은 늘 따옴표로 넣는다.
title="$(printf '%s' "$title" | tr -d '"')"
cat > "$f" <<EOF
---
layout: post
title: "$title"
summary: 목록과 글 머리에 보일 한두 문장. 링크 미리보기 설명으로도 쓰인다.
image: /$img
image_alt: "$title"
category:
lang: $lang
ref: $slug
EOF
# 한국어가 아닌 글은 주소가 /<lang>/posts/<주소>/ 가 되도록 permalink 를 넣는다.
# 없으면 /posts/<주소>-<lang>/ 으로 올라간다.
if [ "$lang" != "ko" ]; then
  echo "permalink: /$lang/posts/$slug/" >> "$f"
fi
cat >> "$f" <<'EOF'
---

## 첫 소제목

본문.
EOF
if command -v python3 >/dev/null 2>&1 && python3 -c 'import PIL' >/dev/null 2>&1; then
  python3 scripts/make-og.py --out "$img" --title "$title" --kicker "$(date +%Y.%m.%d)" --lang "$lang" || true
else
  echo "안내: Pillow 가 없어 OG 카드를 만들지 못했습니다.  pip install pillow 후"
  echo "      python3 scripts/make-og.py --out $img --title \"$title\" --kicker \"$(date +%Y.%m.%d)\" --lang $lang"
fi
echo "만듦: $f  (그림은 img/$slug/ 에)"
