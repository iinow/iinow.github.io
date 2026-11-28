#!/usr/bin/env python3
"""PWA 아이콘을 만든다. favicon.svg 와 같은 도형(남색 바탕 + 노란 배지 + i)을 그린다.

    python3 scripts/make-icons.py

img/icon-192x192.png, img/icon-512x512.png        (purpose any)
img/icon-maskable-192x192.png, ...-512x512.png    (purpose maskable, 안전 영역 안에 그림)
"""
from PIL import Image, ImageDraw

INK = (27, 30, 60, 255)    # #1B1E3C
SUN = (255, 201, 60, 255)  # #FFC93C
SS = 4                     # 슈퍼샘플링 배수 (가장자리를 부드럽게)


def rounded(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_icon(size, maskable=False):
    W = size * SS
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # maskable: 바탕은 화면 끝까지 채우고, 그림은 중앙 80% 원(안전 영역) 안에 둔다.
        d.rectangle((0, 0, W, W), fill=INK)
        side = W * 0.58
        left = (W - side) / 2
        top = (W - side) / 2
        badge_r = side * 0.30
    else:
        # any: favicon.svg 좌표계(64x64)를 그대로 옮긴다.
        u = W / 64.0
        rounded(d, (3.0 * u, 2.0 * u, 61.0 * u, 62.0 * u), 14.5 * u, INK)
        left, top, side = 6.9 * u, 5.9 * u, 50.2 * u
        badge_r = 10.6 * u

    rounded(d, (left, top, left + side, top + side), badge_r, SUN)

    # i: 점 + 기둥 (favicon.svg 비율을 배지 크기에 맞춰 옮긴다)
    h = side
    cx = left + side / 2
    dot_cy = top + h * 0.216
    dot_r = side * 0.0956
    d.ellipse((cx - dot_r, dot_cy - dot_r, cx + dot_r, dot_cy + dot_r), fill=INK)

    stem_w = side * 0.219
    stem_top = top + h * (28.95 - 5.9) / 49.8
    stem_h = h * 20.7 / 49.8
    stem_r = side * (4.0 / 50.2)
    rounded(d, (cx - stem_w / 2, stem_top, cx + stem_w / 2, stem_top + stem_h), stem_r, INK)

    return img.resize((size, size), Image.LANCZOS)


def save(img, path):
    # 아이콘은 불투명 PNG 로 저장한다(iOS 홈 화면이 투명 부분을 검게 칠한다).
    flat = Image.new('RGB', img.size, INK[:3])
    flat.paste(img, mask=img.split()[3])
    flat.save(path, 'PNG', optimize=True)
    print(path, flat.size)


if __name__ == '__main__':
    for size in (192, 512):
        save(draw_icon(size), f'img/icon-{size}x{size}.png')
        save(draw_icon(size, maskable=True), f'img/icon-maskable-{size}x{size}.png')
