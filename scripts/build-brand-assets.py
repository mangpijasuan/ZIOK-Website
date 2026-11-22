"""Regenerates the social sharing image and favicons from ziok-logo.png.

Run from the repository root:  python3 scripts/build-brand-assets.py
Requires Pillow. The generated files are committed; this is only needed when the logo changes.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
logo = Image.open(ROOT / 'ziok-logo.png').convert('RGBA')
SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SANS = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
SANS_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

# Favicons. Google asks for a square icon whose side is a multiple of 48px.
for size, name in ((48, 'favicon-48.png'), (192, 'favicon-192.png'), (180, 'apple-touch-icon.png')):
    logo.resize((size, size), Image.LANCZOS).save(ROOT / name, optimize=True)
logo.resize((48, 48), Image.LANCZOS).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

# 1200x630 sharing image (Facebook, messaging apps, search previews).
W, H = 1200, 630
image = Image.new('RGB', (W, H))
draw = ImageDraw.Draw(image)
start, end = (9, 26, 49), (37, 77, 114)
for x in range(W):
    t = x / (W - 1)
    draw.line([(x, 0), (x, H)], fill=tuple(round(a + (b - a) * t) for a, b in zip(start, end)))
seal = logo.resize((470, 470), Image.LANCZOS)
image.paste(seal, (70, 80), seal)
left = 600
def fit(text, path, size, limit):
    while ImageFont.truetype(path, size).getlength(text) > limit: size -= 2
    return ImageFont.truetype(path, size)
draw.text((left, 150), 'OFFICIAL COMMUNITY WEBSITE', font=ImageFont.truetype(SANS_BOLD, 22), fill=(255, 209, 209))
for index, line in enumerate(('Zomi Innkuan', 'Oklahoma')):
    draw.text((left, 195 + index * 88), line, font=fit(line, SERIF, 78, 560), fill='white')
draw.text((left, 395), 'Zomi Community Oklahoma, Inc.', font=fit('Zomi Community Oklahoma, Inc.', SANS, 32, 560), fill=(220, 229, 238))
draw.text((left, 445), 'Tulsa, Oklahoma  ·  ziok.org', font=ImageFont.truetype(SANS, 28), fill=(185, 204, 221))
# Brand stripe matching the website.
red, white, blue = (204, 53, 68), (255, 255, 255), (23, 57, 88)
stripe = [(0, .32, red), (.32, .34, white), (.34, .66, blue), (.66, .68, white), (.68, 1, red)]
for a, b, color in stripe:
    draw.rectangle([round(W * a), H - 18, round(W * b), H], fill=color)
image.save(ROOT / 'ziok-social.jpg', quality=88, optimize=True, progressive=True)
