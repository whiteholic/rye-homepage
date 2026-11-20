from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent
brief = json.loads((root / "requests.json").read_text(encoding="utf-8"))
font_path = "C:/Windows/Fonts/msyh.ttc"
title_font = ImageFont.truetype(font_path, 32)
label_font = ImageFont.truetype(font_path, 25)
note_font = ImageFont.truetype(font_path, 18)
board = Image.new("RGB", (1584, 842), "#f2f0e9")
draw = ImageDraw.Draw(board)
draw.text((28, 18), "原照片 / 艺术化重绘", font=title_font, fill="#18345b")
draw.text((30, 66), "同一张照片参考：本人特征、原有衣服与眼镜", font=note_font, fill="#535b65")
source_path = Path(sys.argv[2]).expanduser().resolve() if len(sys.argv) > 2 else root / brief["source"]
items = [("原照片", source_path)] + [(variant["title"], root / (variant["id"] + ".png")) for variant in brief["variants"]]
metadata = []
for index, (label, path) in enumerate(items):
    x = 28 + 520 * index
    draw.text((x, 112), label, font=label_font, fill="#18345b")
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.load()
        metadata.append({"label": label, "size": list(image.size), "mode": source.mode, "bytes": path.stat().st_size})
        resampling = Image.Resampling.NEAREST if index == 2 else Image.Resampling.LANCZOS
        thumbnail = ImageOps.contain(image, (488, 650), resampling)
    board.paste(thumbnail, (x + (488 - thumbnail.width) // 2, 158 + (650 - thumbnail.height) // 2))
board.save(root / "comparison.jpg", quality=95, subsampling=0)
(root / "checks.json").write_text(json.dumps({"model": brief["model"], "images": metadata}, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(metadata, ensure_ascii=False))
