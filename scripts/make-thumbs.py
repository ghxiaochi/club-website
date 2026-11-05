#!/usr/bin/env python3
"""给图集原图生成网格用的缩略图。

    python3 scripts/make-thumbs.py

images/gallery/*.webp  ->  images/gallery/thumb/*.webp（长边 560px，q=72）

为什么要缩略图：原图都是 900–1280 宽，网格里一列只有 290px 左右，
手机上更窄。直接拿原图铺网格，首屏要多下几百 KB，一倍屏根本看不出差别。
点开灯箱仍然用原图，所以只影响列表页。
"""

from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    raise SystemExit("需要 Pillow：pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "gallery"
OUT = SRC / "thumb"
LONG_EDGE = 560
QUALITY = 72


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"找不到 {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)

    originals = sorted(p for p in SRC.glob("*.webp") if p.parent == SRC)
    if not originals:
        raise SystemExit("images/gallery 里没有 .webp")

    before = after = 0
    for path in originals:
        image = Image.open(path)
        before += path.stat().st_size

        width, height = image.size
        if max(width, height) > LONG_EDGE:
            if width >= height:
                size = (LONG_EDGE, round(height * LONG_EDGE / width))
            else:
                size = (round(width * LONG_EDGE / height), LONG_EDGE)
            image = image.resize(size, Image.LANCZOS)

        dest = OUT / path.name
        image.save(dest, "WEBP", quality=QUALITY, method=6)
        after += dest.stat().st_size

        saved = path.stat().st_size - dest.stat().st_size
        print(f"{path.name:16s} {path.stat().st_size // 1024:4d}KB -> {dest.stat().st_size // 1024:3d}KB  (-{saved // 1024}KB)")

    print(f"\n共 {len(originals)} 张：{before // 1024}KB -> {after // 1024}KB"
          f"（{after / before * 100:.0f}%）")


if __name__ == "__main__":
    main()
