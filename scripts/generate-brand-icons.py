#!/usr/bin/env python3
"""Generate the SERP / social brand icons from the project's favicon.

Emits the icon sizes Google, Bing and Apple expect at `/`:

    public/icon-16x16.png    favicon in-tab
    public/icon-32x32.png    favicon + Google favicon
    public/icon-48x48.png    Bing tile (paired with msapplication-TileImage)
    public/apple-touch-icon.png  iOS home screen (180x180, opaque background)

Usage:
    pip install pillow
    python3 scripts/generate-brand-icons.py

See Steins Gate `BRAND_ICONS.md`.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

SIZES = {
    "icon-16x16.png": (16, 16),
    "icon-32x32.png": (32, 32),
    "icon-48x48.png": (48, 48),
    "apple-touch-icon.png": (180, 180),
}

# Apple composites transparent app icons onto black; force the brand plate instead.
APPLE_BACKDROP = (255, 255, 255, 255)


def load_source(public_dir: Path) -> Image.Image:
    for name in ("favicon.ico", "favicon-32x32.png"):
        candidate = public_dir / name
        if candidate.exists():
            return Image.open(candidate).convert("RGBA")
    raise SystemExit("No favicon.ico or favicon-32x32.png in public/")


def main() -> None:
    public_dir = Path.cwd() / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    source = load_source(public_dir)

    for name, (width, height) in SIZES.items():
        out = source.resize((width, height), Image.Resampling.LANCZOS)

        if name == "apple-touch-icon.png":
            plate = Image.new("RGBA", (width, height), APPLE_BACKDROP)
            plate.paste(out, ((width - out.width) // 2, (height - out.height) // 2), out)
            out = plate

        out.save(public_dir / name, format="PNG", optimize=True)
        print(f"Wrote public/{name} ({width}x{height}, {out.width * out.height}px source scaled)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
