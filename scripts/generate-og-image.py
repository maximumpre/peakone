#!/usr/bin/env python3
"""Build the Peak1 Administration social preview card (public/og-image.png).

The bare logo is only 150x80, so upscaling it alone would produce a blurry,
low-information card. This composites a proper brand card instead: the real logo on
the brand's own background colour, the canonical brand name, and the value
proposition. Open Graph consumers render this at 1200x630.

Usage:
    pip install pillow
    python3 scripts/generate-og-image.py

Outputs:
    public/og-image.png
    public/og-image.meta.json

See Steins Gate `BRAND_ICONS.md` — never use a favicon for `og:image`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OG_WIDTH = 1200
OG_HEIGHT = 630

# Matches `themeColor` in app/layout.tsx.
BRAND_BG = (37, 70, 80, 255)  # #254650
BRAND_ACCENT = (154, 134, 80, 255)  # #9a8650 — the .btn-signin fill
TEXT_PRIMARY = (255, 255, 255, 255)
TEXT_MUTED = (206, 216, 218, 255)

FONT_CANDIDATES = [
    ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"),
]

BRAND_NAME = "Peak1 Administration"
TAGLINE = "Employee Benefits Sign In"
SUBLINE = "HSA  ·  FSA  ·  HRA  ·  COBRA  ·  Dependent Care  ·  Commuter"


def pick_font_paths() -> tuple[str, str]:
    for bold, regular in FONT_CANDIDATES:
        if Path(bold).exists() and Path(regular).exists():
            return bold, regular
    raise SystemExit(
        "No usable TrueType fonts found. Install DejaVu or run on macOS/Windows."
    )


def load_logo(public_dir: Path) -> Image.Image:
    source = public_dir / "PeakOne-Logo-1.jpg"
    if not source.exists():
        raise SystemExit(f"Logo not found: {source}")
    return Image.open(source).convert("RGBA")


def knock_out_white_bg(img: Image.Image, threshold: int = 48) -> Image.Image:
    """Flood-fill the near-white backdrop to transparent.

    The source is a JPEG, so the logo ships with an opaque white plate baked in.
    A plain white-on-white composite would leave a visible rectangle on the dark
    brand card, so the background is removed by flooding inward from the edges —
    which stops at the mountain mark and the wordmark instead of eating the art.
    """
    rgb = img.convert("RGB")
    width, height = rgb.size
    filled = rgb.copy()
    for seed in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        ImageDraw.floodfill(filled, seed, (255, 0, 0), thresh=threshold)

    backdrop = Image.new("L", (width, height), 0)
    src_px, mask_px = filled.load(), backdrop.load()
    for y in range(height):
        for x in range(width):
            r, g, b = src_px[x, y]
            if r > 250 and g < 6 and b < 6:
                mask_px[x, y] = 255
    # One-pixel feather so antialiased glyph edges are not left with a dark halo.
    mask_px = backdrop.filter(ImageFilter.GaussianBlur(0.6))

    out = img.copy()
    out.putalpha(Image.eval(mask_px, lambda v: 255 - v))
    return out


def trim_near_white(img: Image.Image, threshold: int = 244) -> Image.Image:
    """Crop uniform padding so the logo is centred and scaled on its own bounds."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8 or (r >= threshold and g >= threshold and b >= threshold):
                continue
            min_x, min_y = min(min_x, x), min(min_y, y)
            max_x, max_y = max(max_x, x), max(max_y, y)
    if max_x < min_x or max_y < min_y:
        return rgba
    return rgba.crop((min_x, min_y, max_x + 1, max_y + 1))


def fit(logo: Image.Image, max_w: int, max_h: int) -> Image.Image:
    scale = min(max_w / logo.width, max_h / logo.height)
    return logo.resize(
        (max(1, int(round(logo.width * scale))), max(1, int(round(logo.height * scale)))),
        Image.Resampling.LANCZOS,
    )


def centered(draw: ImageDraw.ImageDraw, y: int, text: str, font: ImageFont.FreeTypeFont, fill, width: int) -> None:
    left, _, right, _ = draw.textbbox((0, 0), text, font=font)
    draw.text(((width - (right - left)) / 2 - left, y), text, font=font, fill=fill)


def main() -> None:
    public_dir = Path.cwd() / "public"
    public_dir.mkdir(parents=True, exist_ok=True)

    bold_path, regular_path = pick_font_paths()
    brand_font = ImageFont.truetype(bold_path, 62)
    tag_font = ImageFont.truetype(regular_path, 34)
    sub_font = ImageFont.truetype(regular_path, 24)

    canvas = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), BRAND_BG)
    draw = ImageDraw.Draw(canvas)

    # Accent rule under the lockup — mirrors the 1px #bec5c2 border + brand glow
    # in the Wealthcare button chrome.
    draw.rectangle([(0, 0), (OG_WIDTH, 8)], fill=BRAND_ACCENT)

    logo = knock_out_white_bg(trim_near_white(load_logo(public_dir)))
    # The source JPEG is low resolution; cap the upscale so it stays sharp-ish
    # rather than turning to mush. 420px wide from a 150px source.
    logo = fit(logo, 340, 200)
    logo_x = (OG_WIDTH - logo.width) // 2
    logo_y = 128
    canvas.paste(logo, (logo_x, logo_y), logo)

    centered(draw, logo_y + logo.height + 54, BRAND_NAME, brand_font, TEXT_PRIMARY, OG_WIDTH)
    centered(draw, logo_y + logo.height + 132, TAGLINE, tag_font, TEXT_MUTED, OG_WIDTH)

    sub_left, _, sub_right, _ = draw.textbbox((0, 0), SUBLINE, font=sub_font)
    sub_y = logo_y + logo.height + 196
    sub_x = (OG_WIDTH - (sub_right - sub_left)) // 2 - sub_left
    draw.text((sub_x, sub_y), SUBLINE, font=sub_font, fill=TEXT_MUTED)
    draw.line(
        [(sub_x - 40, sub_y + 20), (sub_x + (sub_right - sub_left) + 40, sub_y + 20)],
        fill=BRAND_ACCENT,
        width=2,
    )

    out = public_dir / "og-image.png"
    canvas.convert("RGB").save(out, format="PNG", optimize=True)

    meta = {
        "mode": "brand-card",
        "width": OG_WIDTH,
        "height": OG_HEIGHT,
        "source": "PeakOne-Logo-1.jpg",
        "logoBox": {"width": logo.width, "height": logo.height},
        "brand": BRAND_NAME,
        "tagline": TAGLINE,
    }
    (public_dir / "og-image.meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    kb = out.stat().st_size / 1024
    print(f"Generated public/og-image.png {OG_WIDTH}x{OG_HEIGHT} ({kb:.1f} KB) — logo {logo.width}x{logo.height}px")


if __name__ == "__main__":
    sys.exit(main())
