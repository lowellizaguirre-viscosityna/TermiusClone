#!/usr/bin/env python3
"""Render the TermiusClone app icon to build/icons/ at the usual sizes.

Original artwork -- a dark squircle with a terminal prompt glyph. Drawn at 4x
and downsampled, which is cheaper than fighting PIL for antialiased curves.

    python3 assets/make-icon.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

MASTER = 1024
SS = 4                      # supersampling factor
S = MASTER * SS

OUT = Path(__file__).resolve().parent.parent / "build" / "icons"
SIZES = (16, 24, 32, 48, 64, 128, 256, 512, 1024)

BG_TOP = (31, 42, 68)       # indigo-navy
BG_BOTTOM = (12, 15, 20)    # near-black, matches the app's --bg-sunken
ACCENT = (76, 141, 255)     # --accent
ACCENT_SOFT = (120, 173, 255)
RADIUS = 0.223              # fraction of the side, iOS-ish squircle


def vertical_gradient(size, top, bottom):
    strip = Image.new("RGB", (1, size))
    px = strip.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        px[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    return strip.resize((size, size), Image.BILINEAR)


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def build():
    base = vertical_gradient(S, BG_TOP, BG_BOTTOM).convert("RGBA")

    # A soft highlight across the top so the square does not read as flat.
    sheen = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sheen).ellipse((-S * 0.35, -S * 0.95, S * 1.35, S * 0.40), fill=38)
    white = Image.new("L", (S, S), 255)
    base.alpha_composite(Image.merge("RGBA", (white, white, white,
                                              sheen.filter(ImageFilter.GaussianBlur(S * 0.02)))))

    # Prompt chevron ">" plus the cursor underscore, sharing a baseline.
    stroke = int(S * 0.080)
    cx, cy = S * 0.385, S * 0.455
    arm = S * 0.150
    chevron = [(cx - arm, cy - arm), (cx + arm * 0.55, cy), (cx - arm, cy + arm)]

    baseline = cy + arm
    bar = (cx + arm * 1.15, baseline - stroke / 2, cx + arm * 3.05, baseline + stroke / 2)

    def paint(target, colour_a, colour_b, width):
        d = ImageDraw.Draw(target)
        d.line(chevron, fill=colour_a, width=width, joint="curve")
        for point in chevron:
            d.ellipse((point[0] - width / 2, point[1] - width / 2,
                       point[0] + width / 2, point[1] + width / 2), fill=colour_a)
        d.rounded_rectangle(bar, radius=width / 2, fill=colour_b)

    # Glow underneath, then the crisp glyph over the top of it.
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    paint(glow, ACCENT + (165,), ACCENT_SOFT + (165,), stroke)
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * 0.030)))
    paint(base, ACCENT, ACCENT_SOFT, stroke)

    # Hairline inner border: just enough to separate the tile from a dark dock.
    inset = stroke * 0.20
    ImageDraw.Draw(base).rounded_rectangle(
        (inset, inset, S - 1 - inset, S - 1 - inset),
        radius=int(S * RADIUS - inset), outline=(255, 255, 255, 16), width=int(stroke * 0.20))

    base.putalpha(rounded_mask(S, int(S * RADIUS)))
    master = base.resize((MASTER, MASTER), Image.LANCZOS)

    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        img = master if size == MASTER else master.resize((size, size), Image.LANCZOS)
        img.save(OUT / f"icon-{size}.png")
    master.save(OUT / "icon.png")
    master.resize((256, 256), Image.LANCZOS).save(
        OUT / "icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"wrote {len(SIZES) + 2} files to {OUT}")


if __name__ == "__main__":
    build()
