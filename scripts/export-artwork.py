#!/usr/bin/env python3
"""Export the original PNG artwork to WebP using ImageMagick's convert command."""

from pathlib import Path
import shutil
import subprocess


ROOT = Path(__file__).resolve().parent.parent
# Preserve aspect ratios and allow roughly 3x the displayed dimensions.
EXPORTS = [
    ("assets/heroes/*.png", 1000),
    ("assets/heroes/profile/*.png", 128),
    ("assets/seasons/*.png", 222),
    ("assets/skills/*.png", 96),
    ("assets/buffs/*.png", 960),
    ("assets/ui/hero-crest.png", 630),
]


def main():
    convert = shutil.which("magick") or shutil.which("convert")
    if not convert:
        raise SystemExit("Install ImageMagick with WebP support to export artwork.")

    original_bytes = exported_bytes = count = 0
    for pattern, size in EXPORTS:
        for source in sorted(ROOT.glob(pattern)):
            destination = source.with_suffix(".webp")
            subprocess.run([
                convert, "-limit", "thread", "2", str(source),
                "-filter", "Lanczos", "-resize", f"{size}x{size}>",
                "-strip", "-quality", "90", "-define", "webp:alpha-quality=100",
                "-define", "webp:method=6", str(destination),
            ], check=True)
            original_bytes += source.stat().st_size
            exported_bytes += destination.stat().st_size
            count += 1
    print(f"{count} images: {original_bytes:,} → {exported_bytes:,} bytes "
          f"({1 - exported_bytes / original_bytes:.1%} smaller)")


if __name__ == "__main__":
    main()
