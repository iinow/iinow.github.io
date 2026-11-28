#!/usr/bin/env python3
"""링크 미리보기(OG) 카드 이미지를 만든다. 1200x630 PNG.

사용:
  python3 scripts/make-og.py --out img/og/sqlc-guide-ko.png \
      --title "sqlc 사용법 — SQL 은 그대로 두고 Go 코드만 받아 쓰기" \
      --kicker "개발 · 2026.11.26"

  python3 scripts/make-og.py --out img/og/sqlc-guide-ja.png --lang ja \
      --title "sqlc の使い方 — SQL はそのまま、Go コードだけ受け取る" \
      --kicker "開発 · 2026.11.26"

글을 새로 쓰면 이 스크립트로 그 글만의 카드를 만들고,
글 머리(frontmatter)에 image: /img/og/<이름>.png 로 걸어 주면 된다.

글꼴
----
- ko / en : Bagel Fat One (제목), Pretendard (본문)
- ja      : NotoSansJP-Bold-subset.ttf
- zh      : NotoSansSC-Bold-subset.ttf (간체)
  두 동아시아 글꼴은 사이트에 실린 일본어·중국어 글과 화면 문구에 나온 글자만
  담은 부분집합이다(각 300~400KB). 새 글 제목에 없는 글자가 나오면 이 스크립트가
  글리프를 확인해 시스템 Noto Sans CJK 로 넘어가고, 그래도 없으면 경고를 찍는다.
  부분집합을 넓히려면 fontTools 로 다시 만들면 된다:
    pyftsubset NotoSansJP[wght].ttf --text-file=<글자 모음> --output-file=...
"""
import argparse
import os
import re
import sys
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
BAGEL = os.path.join(FONT_DIR, "BagelFatOne-Regular.ttf")
BODY_SEMI = os.path.join(FONT_DIR, "Pretendard-SemiBold.otf")
BODY_BOLD = os.path.join(FONT_DIR, "Pretendard-Bold.otf")
JP = os.path.join(FONT_DIR, "NotoSansJP-Bold-subset.ttf")
SC = os.path.join(FONT_DIR, "NotoSansSC-Bold-subset.ttf")

# 글리프가 모자랄 때 넘어갈 시스템 글꼴 (설치되어 있으면)
SYSTEM_CJK = [
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf",
    "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Bold.otf",
    "/usr/share/fonts/pickle-hwp/NotoSansCJKkr-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansJP-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansSC-Bold.ttf",
]

DISPLAY = {
    "ko": [BAGEL],
    "en": [BAGEL],
    "ja": [JP] + SYSTEM_CJK,
    "zh": [SC] + SYSTEM_CJK,
}
BODY = {
    "ko": [BODY_BOLD],
    "en": [BODY_BOLD],
    "ja": [JP] + SYSTEM_CJK,
    "zh": [SC] + SYSTEM_CJK,
}

BRAND = {
    "ko": "Joonha 의 개발과 일상 기록",
    "en": "Development and everyday notes by Joonha",
    "ja": "Joonha の開発と日常の記録",
    "zh": "Joonha 的开发与日常记录",
}


def cmap_of(path):
    """글꼴이 가진 코드포인트 집합. fontTools 가 없으면 None(확인하지 않음)."""
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return None
    try:
        return set(TTFont(path, lazy=True).getBestCmap().keys())
    except Exception:
        return None


def missing(path, text):
    cmap = cmap_of(path)
    if cmap is None:
        return set()
    return {ch for ch in text if not ch.isspace() and ord(ch) not in cmap}


def pick(paths, text, what):
    """text 를 모두 그릴 수 있는 첫 글꼴. 없으면 마지막 후보로 그리고 경고."""
    for path in paths:
        if not os.path.exists(path):
            continue
        lack = missing(path, text)
        if not lack:
            return path
        if path == paths[-1]:
            print(
                f"경고: {what} 글꼴에 없는 글자 {''.join(sorted(lack))} — "
                f"{os.path.basename(path)} 로 그립니다(두부로 보일 수 있음).",
                file=sys.stderr,
            )
    for path in paths:
        if os.path.exists(path):
            return path
    raise SystemExit(f"글꼴을 찾지 못했습니다: {paths}")


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


# 행머리로 나가면 안 되는 글자(일본어·중국어 금칙)
NO_START = "、。，．・·：；！？）」』】〕｝”’…‥ー～〜"


# 가타카나 연속·라틴 문자 연속은 단어처럼 통째로 둔다 (ムアンボーラン 이 두 줄로 찢기지 않게)
# '・'(U+30FB)는 가타카나 범위에 있지만 단어 경계라 따로 떼어 낸다.
_CJK_TOKEN = re.compile(r"[ァ-ヺーヽヾ]+")
_LATIN_TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9.+#_/-]*")


def cjk_tokens(text):
    out = []
    i = 0
    while i < len(text):
        for pat in (_CJK_TOKEN, _LATIN_TOKEN):
            m = pat.match(text, i)
            if m:
                out.append(m.group(0))
                i = m.end()
                break
        else:
            if text[i] != " ":
                out.append(text[i])
            i += 1
    return out


def wrap_cjk(draw, text, font, maxw):
    """일본어·중국어: 띄어쓰기가 아니라 단어(토큰) 단위로 끊는다.

    '・', '、', 'ー' 같은 금칙 글자는 앞 토큰에 붙여 두어 행머리로 나가지 않게 한다.
    """
    toks = cjk_tokens(text.strip())
    merged = []
    for tok in toks:
        if tok in NO_START and merged:
            merged[-1] += tok
        else:
            merged.append(tok)

    lines = []
    cur = []
    for tok in merged:
        if draw.textlength("".join(cur) + tok, font=font) <= maxw:
            cur.append(tok)
            continue
        if cur:
            lines.append("".join(cur))
            cur = []
        if draw.textlength(tok, font=font) <= maxw:
            cur = [tok]
            continue
        # 토큰 하나가 폭을 넘으면 글자 단위로 쪼갠다
        for ch in tok:
            if draw.textlength("".join(cur) + ch, font=font) <= maxw:
                cur.append(ch)
            else:
                lines.append("".join(cur))
                cur = [ch]
    if cur:
        lines.append("".join(cur))
    return [line.strip() for line in lines]


def fit(draw, text, font_path, maxw, max_lines=3, cjk=False):
    """넘치는 줄 수에 맞춰 제목 크기를 줄여 가며 줄을 잡는다.

    일본어·중국어는 마지막 줄이 너무 짧으면(한두 글자만 남으면) 보기 나쁘므로
    한 단계 작은 크기로 다시 시도한다.
    """
    best = None
    for size in (92, 86, 80, 74, 68, 62, 56, 50, 44, 40):
        font = ImageFont.truetype(font_path, size)
        lines = wrap_cjk(draw, text, font, maxw) if cjk else wrap(draw, text, font, maxw)
        best = (font, lines, size)
        if len(lines) > max_lines:
            continue
        if cjk and len(lines) > 1:
            last = draw.textlength(lines[-1], font=font)
            if last < maxw * 0.3 and size > 40:
                continue
            # 중간 줄에 한두 글자만 남는 것도 피한다
            if any(draw.textlength(line, font=font) < maxw * 0.3 for line in lines[:-1]):
                continue
        return best
    return best


def make(title, kicker="", brand=None, out="og.png", lang="ko"):
    display = pick(DISPLAY[lang], title + kicker, "제목")
    body = pick(BODY[lang], brand or BRAND[lang], "본문")
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # 왼쪽 위 워드마크
    mark = ImageFont.truetype(BAGEL, 56)
    d.text((PAD - 6, 62), "iinow", font=mark, fill=INK, anchor="lt")

    # 오른쪽 위 분류·날짜
    if kicker:
        kf = ImageFont.truetype(body, 25)
        d.text((W - PAD, 84), kicker, font=kf, fill=MUTED, anchor="rt")

    # 제목
    maxw = W - PAD * 2
    font, lines, size = fit(d, title, display, maxw, 3, cjk=lang in ("ja", "zh"))
    line_h = round(size * 1.18)
    block_h = line_h * len(lines)
    top = 336 - block_h // 2
    for i, line in enumerate(lines):
        d.text((PAD - 4, top + i * line_h), line, font=font, fill=INK, anchor="lt")

    # 아래 구분선과 브랜드 한 줄
    d.line([(PAD, 524), (W - PAD, 524)], fill=LINE, width=2)
    bf = ImageFont.truetype(body, 26)
    d.text((PAD, 552), brand or BRAND[lang], font=bf, fill=MUTED, anchor="lt")

    # 오른쪽 아래 노란 배지
    bx, by, bs, off = W - PAD - 48, 548, 48, 7
    d.rounded_rectangle([bx + off, by + off, bx + bs + off, by + bs + off], radius=16, fill=INK)
    d.rounded_rectangle([bx, by, bx + bs, by + bs], radius=16, fill=SUN)

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"{out}  {W}x{H}  ({size}pt, {len(lines)}줄, {os.path.basename(display)})")


def main():
    ap = argparse.ArgumentParser(description="OG 카드 이미지 생성")
    ap.add_argument("--out", required=True, help="저장할 경로 (예: img/og/post-name-ko.png)")
    ap.add_argument("--title", required=True, help="카드에 크게 넣을 제목")
    ap.add_argument("--kicker", default="", help="오른쪽 위 작은 글씨 (예: 개발 · 2026.11.26)")
    ap.add_argument("--lang", default="ko", choices=["ko", "en", "ja", "zh"], help="글꼴과 아래 브랜드 문구 언어")
    ap.add_argument("--brand", default=None, help="아래 브랜드 문구 직접 지정")
    a = ap.parse_args()
    make(a.title, a.kicker, a.brand, a.out, a.lang)


if __name__ == "__main__":
    main()
