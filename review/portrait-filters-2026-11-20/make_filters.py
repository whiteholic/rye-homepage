from pathlib import Path
import hashlib
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    raise SystemExit("Usage: python make_filters.py SOURCE_PHOTO")
SOURCE = Path(sys.argv[1]).expanduser().resolve()
ROOT.mkdir(parents=True, exist_ok=True)
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
photo = ImageOps.exif_transpose(Image.open(SOURCE)).convert("RGB")
width, height = photo.size


def edge_preserving_color(image):
    # Smooth color locally while retaining the source photograph's boundaries.
    small = image.resize((640, round(height * 640 / width)), Image.Resampling.LANCZOS)
    data = np.asarray(small, dtype=np.float32) / 255
    radius = 3
    padded = np.pad(data, ((radius, radius), (radius, radius), (0, 0)), mode="edge")
    weighted = np.zeros_like(data)
    total = np.zeros(data.shape[:2], dtype=np.float32)
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            neighbor = padded[radius + dy:radius + dy + data.shape[0], radius + dx:radius + dx + data.shape[1]]
            distance = np.sum((neighbor - data) ** 2, axis=2)
            weight = np.exp(-distance / (2 * 0.12 ** 2) - (dx * dx + dy * dy) / 12)
            weighted += neighbor * weight[..., None]
            total += weight
    result = Image.fromarray(np.uint8(np.clip(weighted / total[..., None], 0, 1) * 255))
    return result.resize(image.size, Image.Resampling.LANCZOS)


smooth = edge_preserving_color(photo)
color = np.asarray(smooth, dtype=np.float32) / 255
luminance = color @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
levels = 16
stepped = np.floor(luminance * levels + 0.5) / levels
target = 0.40 * stepped + 0.60 * luminance
color *= ((target + 0.035) / (luminance + 0.035))[..., None]
comic = Image.fromarray(np.uint8(np.clip(color, 0, 1) * 255))
comic = ImageEnhance.Color(comic).enhance(1.12)
comic = ImageEnhance.Contrast(comic).enhance(1.08)
gray = np.asarray(smooth.convert("L"), dtype=np.float32) / 255
gy, gx = np.gradient(gray)
edge = np.clip((np.hypot(gx, gy) - 0.022) * 5, 0, 0.18)
comic_data = np.asarray(comic, dtype=np.float32) * (1 - edge[..., None])
comic = Image.fromarray(np.uint8(np.clip(comic_data, 0, 255)))
comic = Image.blend(comic, photo, 0.12)
comic.save(ROOT / "01-comic-color.png")

# Screenprint uses the original luminance and contours, with a graphic palette.
gray_print = ImageOps.autocontrast(photo.convert("L"), cutoff=0.6)
gray_data = np.asarray(gray_print, dtype=np.float32) / 255
stops = np.array([0, 0.27, 0.52, 0.73, 1])
palette = np.array([[16, 25, 51], [29, 57, 117], [72, 115, 165], [226, 187, 99], [255, 245, 218]])
channels = [np.interp(gray_data, stops, palette[:, channel]) for channel in range(3)]
print_image = Image.fromarray(np.uint8(np.stack(channels, axis=2)))
# Discrete dots add print texture without covering the face with a solid pattern.
dot_layer = Image.new("RGB", photo.size, "white")
dots = ImageDraw.Draw(dot_layer)
spacing = 9
for y in range(spacing // 2, height, spacing):
    for x in range(spacing // 2, width, spacing):
        tone = gray_data[y, x]
        radius = 0.4 + 1.5 * (1 - tone)
        dots.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(24, 38, 65))
print_data = np.asarray(print_image, dtype=np.float32)
dot_data = np.asarray(dot_layer, dtype=np.float32) / 255
print_image = Image.fromarray(np.uint8(np.clip(print_data * (0.86 + 0.14 * dot_data), 0, 255)))
print_image.save(ROOT / "02-blue-gold-print.png")

# Pixel filtering deliberately retains the photographed pose and clothing.
pixel_width = 256
pixel_small = photo.resize((pixel_width, round(height * pixel_width / width)), Image.Resampling.BOX)
pixel_small = ImageEnhance.Color(pixel_small).enhance(1.09)
pixel_small = ImageEnhance.Contrast(pixel_small).enhance(1.08)
pixel_small = pixel_small.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
pixel = pixel_small.resize(photo.size, Image.Resampling.NEAREST)
pixel.save(ROOT / "03-pixel-photo.png")

font_path = "C:/Windows/Fonts/msyh.ttc"
title_font = ImageFont.truetype(font_path, 34)
label_font = ImageFont.truetype(font_path, 25)
note_font = ImageFont.truetype(font_path, 19)
board = Image.new("RGB", (1280, 1900), "#f2f0e9")
draw = ImageDraw.Draw(board)
draw.text((32, 22), "原照片 / 滤镜对比", font=title_font, fill="#18345b")
draw.text((34, 73), "保留原照片的五官、发型、衣服和姿势", font=note_font, fill="#555b63")
panels = [("原图", photo), ("A  漫画色块", comic), ("B  蓝金印刷", print_image), ("C  像素滤镜", pixel)]
for index, (label, image) in enumerate(panels):
    x = 32 + (index % 2) * 632
    y = 120 + (index // 2) * 884
    draw.text((x, y), label, font=label_font, fill="#18345b")
    thumb = ImageOps.contain(image, (584, 800), Image.Resampling.LANCZOS if index != 3 else Image.Resampling.NEAREST)
    board.paste(thumb, (x + (584 - thumb.width) // 2, y + 48))
board.save(ROOT / "comparison.jpg", quality=94, subsampling=0)

# Keep a closer comparison so glasses and facial boundaries can be assessed.
face_box = (550, 380, 1080, 1050)
closeups = Image.new("RGB", (1200, 1640), "#f2f0e9")
close_draw = ImageDraw.Draw(closeups)
for index, (label, image) in enumerate(panels):
    x, y = (index % 2) * 600, (index // 2) * 820
    close_draw.text((x + 20, y + 14), label, font=label_font, fill="#18345b")
    face = ImageOps.contain(image.crop(face_box), (560, 750), Image.Resampling.LANCZOS if index != 3 else Image.Resampling.NEAREST)
    closeups.paste(face, (x + (600 - face.width) // 2, y + 58))
closeups.save(ROOT / "face-comparison.jpg", quality=94, subsampling=0)

assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash
for file in ROOT.glob("*.png"):
    with Image.open(file) as check:
        check.load()
        assert check.size == photo.size
report = {"source_hash_omitted": True, "source_size": list(photo.size), "source_unchanged": True, "method": "Local photo filters only: no generative editing or geometric warping", "files": [file.name for file in ROOT.glob("*.png")]}
(ROOT / "checks.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
