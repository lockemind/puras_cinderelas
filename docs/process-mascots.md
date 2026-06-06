# Processing Mascot Images

Removes the Gemini watermark (◆ sparkle, bottom-right corner) and exports
two WebP sizes ready for the web.

## Requirements

```bash
pip3 install Pillow
```

`cwebp` is not needed — Pillow handles WebP export directly.

## Source images

- Format: PNG, 2048×2048, RGBA, solid black background
- Place originals in `assets/`
- Filename convention: lowercase Portuguese name, no accents, spaces allowed
  - e.g. `paises baixos.png` → slug becomes `paises-baixos.webp`

## Output

| Folder | Size | Quality | Use |
|---|---|---|---|
| `public/mascots/` | 480×480 | 82 | Cards, feature images |
| `public/mascots/icons/` | 72×72 | 85 | Inline icons, avatars |

## Script

Run from the project root:

```bash
python3 - <<'EOF'
from PIL import Image, ImageDraw
import os, re

SRC      = "assets"
DST_WEB  = "public/mascots"
DST_ICON = "public/mascots/icons"

# Gemini watermark location in a 2048×2048 source image.
# Covers the bottom-right 178×178 px (1870–2048).
# Increase WM_SIZE if a new batch has a larger watermark area.
WM_X, WM_Y, WM_SIZE = 1870, 1870, 178

WEB_SIZE  = 480
ICON_SIZE = 72

os.makedirs(DST_WEB,  exist_ok=True)
os.makedirs(DST_ICON, exist_ok=True)

def slug(name):
    return re.sub(r'\s+', '-', name.lower())

for fname in sorted(os.listdir(SRC)):
    if not fname.endswith(".png"):
        continue

    img = Image.open(os.path.join(SRC, fname)).convert("RGBA")

    # Paint over watermark with solid black
    draw = ImageDraw.Draw(img)
    draw.rectangle([WM_X, WM_Y, 2048, 2048], fill=(0, 0, 0, 255))

    base = slug(os.path.splitext(fname)[0])

    web = img.resize((WEB_SIZE, WEB_SIZE), Image.LANCZOS)
    web.save(os.path.join(DST_WEB, f"{base}.webp"), "WEBP", quality=82, method=6)

    icon = img.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
    icon.save(os.path.join(DST_ICON, f"{base}.webp"), "WEBP", quality=85, method=6)

    web_kb  = os.path.getsize(os.path.join(DST_WEB,  f"{base}.webp")) // 1024
    icon_kb = os.path.getsize(os.path.join(DST_ICON, f"{base}.webp")) // 1024
    print(f"{base:25s}  web={web_kb:3d}KB  icon={icon_kb}KB")

print("Done.")
EOF
```

## If the watermark moves

New Gemini batches may place the watermark in a slightly different spot.
Run this snippet on one of the new images to find the bounding box:

```bash
python3 - <<'EOF'
from PIL import Image
img = Image.open("assets/YOURFILE.png").convert("RGBA")
w, h = img.size
pixels = img.load()
hits = []
for y in range(h - 250, h):
    for x in range(w - 250, w):
        r, g, b, a = pixels[x, y]
        if a > 10 and (r > 20 or g > 20 or b > 20):
            hits.append((x, y))
if hits:
    xs = [p[0] for p in hits]; ys = [p[1] for p in hits]
    print(f"Watermark bounding box: x={min(xs)}–{max(xs)}, y={min(ys)}–{max(ys)}")
    print(f"New WM_X/WM_Y should be ~{min(xs)-10}, ~{min(ys)-10}")
else:
    print("No watermark found in bottom-right 250×250")
EOF
```

Then update `WM_X`, `WM_Y` in the main script accordingly.

## Notes

- **Brasil** has a football pitch that extends into the bottom-right corner.
  The black fill clips a few grass pixels there, which is imperceptible at
  display sizes.
- If the source resolution changes from 2048×2048, scale `WM_X/WM_Y/WM_SIZE`
  proportionally (e.g. for 1024×1024 sources, halve all three values).
- The script is idempotent — re-running it overwrites existing outputs.
