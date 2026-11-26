#!/usr/bin/env python3
"""iinow 파비콘·앱 아이콘을 만든다.

디자인: 노란 둥근 사각형(#FFC93C) 위에 남색(#1B1E3C) 테두리와 아래쪽 3D 그림자,
안에 굵은 남색 i. 작은 크기에서도 읽히도록 i는 글꼴 대신 도형으로 그린다.

  python3 scripts/make-favicon.py        (저장소 루트 기준)

만드는 파일:
  favicon.svg
  favicon.ico                (16x16, 32x32)
  img/favicon-48x48.png
  img/apple-touch-icon.png   (180x180, 배경 불투명)
"""
import os
from PIL import Image, ImageDraw

NAVY = (0x1B, 0x1E, 0x3C, 255)
SUN = (0xFF, 0xC9, 0x3C, 255)
PAPER = (0xEE, 0xF0, 0xF8, 255)

# 64 단위 좌표계 (SVG와 같은 값)
U = 64.0
BADGE = dict(x0=3.0, y0=2.0, x1=61.0, y1=62.0, r=14.5)
BORDER = 3.9      # 위·옆으로 보이는 남색 테두리 (16px에서도 또렷하게)
BOTTOM = 6.3      # 아래쪽 3D 그림자 두께
FACE = dict(
    x0=BADGE["x0"] + BORDER,
    y0=BADGE["y0"] + BORDER,
    x1=BADGE["x1"] - BORDER,
    y1=BADGE["y1"] - BOTTOM,
    r=BADGE["r"] - BORDER,
)
DOT = dict(cx=32.0, cy=16.65, r=4.8)
STEM = dict(x0=26.5, y0=28.95, x1=37.5, y1=49.65, r=4.0)


def _rr(d, box, r, fill):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill)


def render(size, ss=8):
    """size 픽셀 정사각 RGBA. ss배로 그린 뒤 줄여 가장자리를 부드럽게 한다."""
    S = size * ss
    k = S / U
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def B(box):
        return tuple(v * k for v in box)

    _rr(d, B((BADGE["x0"], BADGE["y0"], BADGE["x1"], BADGE["y1"])),
        BADGE["r"] * k, NAVY)
    _rr(d, B((FACE["x0"], FACE["y0"], FACE["x1"], FACE["y1"])),
        FACE["r"] * k, SUN)
    # i의 점
    d.ellipse(B((DOT["cx"] - DOT["r"], DOT["cy"] - DOT["r"],
                DOT["cx"] + DOT["r"], DOT["cy"] + DOT["r"])), fill=NAVY)
    # i의 기둥
    _rr(d, B((STEM["x0"], STEM["y0"], STEM["x1"], STEM["y1"])),
        STEM["r"] * k, NAVY)
    # 미리 곱한 알파(RGBa)로 줄여야 투명 가장자리에 검은 테가 끼지 않는다.
    return img.convert("RGBa").resize((size, size), Image.BOX).convert("RGBA")


def apple_touch(size=180, bg=PAPER, ratio=0.84):
    img = Image.new("RGBA", (size, size), bg)
    box = int(size * ratio)
    badge = render(box)
    img.alpha_composite(badge, ((size - box) // 2, (size - box) // 2))
    return img.convert("RGB")


def _n(v):
    return round(v, 2)


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="iinow">
  <rect x="{bx0}" y="{by0}" width="{bw}" height="{bh}" rx="{br}" fill="#1B1E3C"/>
  <rect x="{fx0}" y="{fy0}" width="{fw}" height="{fh}" rx="{fr}" fill="#FFC93C"/>
  <circle cx="{dcx}" cy="{dcy}" r="{dr}" fill="#1B1E3C"/>
  <rect x="{sx0}" y="{sy0}" width="{sw}" height="{sh}" rx="{sr}" fill="#1B1E3C"/>
</svg>
""".format(
    bx0=_n(BADGE["x0"]), by0=_n(BADGE["y0"]),
    bw=_n(BADGE["x1"] - BADGE["x0"]), bh=_n(BADGE["y1"] - BADGE["y0"]),
    br=_n(BADGE["r"]),
    fx0=_n(FACE["x0"]), fy0=_n(FACE["y0"]),
    fw=_n(FACE["x1"] - FACE["x0"]), fh=_n(FACE["y1"] - FACE["y0"]),
    fr=_n(FACE["r"]),
    dcx=_n(DOT["cx"]), dcy=_n(DOT["cy"]), dr=_n(DOT["r"]),
    sx0=_n(STEM["x0"]), sy0=_n(STEM["y0"]),
    sw=_n(STEM["x1"] - STEM["x0"]), sh=_n(STEM["y1"] - STEM["y0"]),
    sr=_n(STEM["r"]),
)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)

    with open("favicon.svg", "w", encoding="utf-8") as f:
        f.write(SVG)

    os.makedirs("img", exist_ok=True)
    render(48).save("img/favicon-48x48.png")
    apple_touch(180).save("img/apple-touch-icon.png")

    i32, i16 = render(32), render(16)
    i32.save("favicon.ico", format="ICO", sizes=[(32, 32), (16, 16)],
             append_images=[i16])

    # 확인용 미리보기 (저장소 밖)
    prev = Image.new("RGBA", (620, 420), (255, 255, 255, 255))
    x = 24
    for s in (16, 32, 48):
        prev.alpha_composite(render(s), (x, 40))
        x += s + 20
    prev.alpha_composite(apple_touch(180).convert("RGBA"), (x + 16, 20))
    for i, (s, m) in enumerate(((16, 8), (32, 4), (48, 3))):
        big = render(s).resize((s * m, s * m), Image.NEAREST)
        prev.alpha_composite(big, (24 + i * 200, 240))
    prev.save("../downloads/favicon-preview.png")
    print("ok", os.getcwd())


if __name__ == "__main__":
    main()
