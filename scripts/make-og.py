#!/usr/bin/env python3
"""링크 미리보기(OG) 카드 이미지를 만든다. 1200x630 PNG.

사용:
  python3 scripts/make-og.py --out img/og/sqlc-guide-ko.png \
      --title "sqlc 사용법 — SQL 은 그대로 두고 Go 코드만 받아 쓰기" \
      --kicker "개발 · 2026.11.26"

글을 새로 쓰면 이 스크립트로 그 글만의 카드를 만들고,
글 머리(frontmatter)에 image: /img/og/<이름>.png 로 걸어 주면 된다.
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = "#eef0f8"
INK = "#1b1e3c"
MUTED = "#5b6080"
LINE = "#d3d7e8"
SUN = "#ffc93c"
PAD = 96

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
DISPLAY = os.path.join(FONT_DIR, "BagelFatOne-Regular.ttf")
BODY_SEMI = os.path.join(FONT_DIR, "Pretendard-SemiBold.otf")
BODY_BOLD = os.path.join(FONT_DIR, "Pretendard-Bold.otf")

BRAND = {
    "ko": "Joonha 의 개발과 일상 기록",
    "en": "Development and everyday notes by Joonha",
}


def wrap(draw, text, font, maxw):
    """공백 기준으로 줄을 나누고, 한 단어가 폭을 넘으면 글자 단위로 자른다."""
    lines = []
    for word in text.split():
        if not lines:
            lines.append(word)
            continue
        cand = lines[-1] + " " + word
        if draw.textlength(cand, font=font) <= maxw:
            lines[-1] = cand
        else:
            lines.append(word)
    out = []
    for line in lines:
        if draw.textlength(line, font=font) <= maxw:
            out.append(line)
            continue
        chunk = ""
        for ch in line:
            if draw.textlength(chunk + ch, font=font) <= maxw:
                chunk += ch
            else:
                if chunk:
                    out.append(chunk)
                chunk = ch
        if chunk:
            out.append(chunk)
    return out


def fit(draw, text, maxw, max_lines=3):
    """넘치는 줄 수에 맞춰 제목 크기를 줄여 가며 줄을 잡는다."""
    for size in (92, 86, 80, 74, 68, 62, 56, 50, 44, 40):
        font = ImageFont.truetype(DISPLAY, size)
        lines = wrap(draw, text, font, maxw)
        if len(lines) <= max_lines:
            return font, lines, size
    return font, lines, size


def make(title, kicker="", brand=None, out="og.png"):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # 왼쪽 위 워드마크
    mark = ImageFont.truetype(DISPLAY, 56)
    d.text((PAD - 6, 62), "iinow", font=mark, fill=INK, anchor="lt")

    # 오른쪽 위 분류·날짜
    if kicker:
        kf = ImageFont.truetype(BODY_BOLD, 25)
        d.text((W - PAD, 84), kicker, font=kf, fill=MUTED, anchor="rt")

    # 제목
    maxw = W - PAD * 2
    font, lines, size = fit(d, title, maxw, 3)
    line_h = round(size * 1.18)
    block_h = line_h * len(lines)
    top = 336 - block_h // 2
    for i, line in enumerate(lines):
        d.text((PAD - 4, top + i * line_h), line, font=font, fill=INK, anchor="lt")

    # 아래 구분선과 브랜드 한 줄
    d.line([(PAD, 524), (W - PAD, 524)], fill=LINE, width=2)
    bf = ImageFont.truetype(BODY_SEMI, 26)
    d.text((PAD, 552), brand, font=bf, fill=MUTED, anchor="lt")

    # 오른쪽 아래 노란 배지
    bx, by, bs, off = W - PAD - 48, 548, 48, 7
    d.rounded_rectangle([bx + off, by + off, bx + bs + off, by + bs + off], radius=16, fill=INK)
    d.rounded_rectangle([bx, by, bx + bs, by + bs], radius=16, fill=SUN)

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"{out}  {W}x{H}  ({size}pt, {len(lines)}줄)")


def main():
    ap = argparse.ArgumentParser(description="OG 카드 이미지 생성")
    ap.add_argument("--out", required=True, help="저장할 경로 (예: img/og/post-name-ko.png)")
    ap.add_argument("--title", required=True, help="카드에 크게 넣을 제목")
    ap.add_argument("--kicker", default="", help="오른쪽 위 작은 글씨 (예: 개발 · 2026.11.26)")
    ap.add_argument("--lang", default="ko", choices=["ko", "en"], help="아래 브랜드 문구 언어")
    ap.add_argument("--brand", default=None, help="아래 브랜드 문구 직접 지정")
    a = ap.parse_args()
    make(a.title, a.kicker, a.brand or BRAND[a.lang], a.out)


if __name__ == "__main__":
    main()
