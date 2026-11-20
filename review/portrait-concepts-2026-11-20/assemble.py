from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent
brief = json.loads((root / "prompts.json").read_text(encoding="utf-8"))
font_path = "C:/Windows/Fonts/msyh.ttc"
heading = ImageFont.truetype(font_path, 34)
label = ImageFont.truetype(font_path, 26)
small = ImageFont.truetype(font_path, 19)
sheet = Image.new("RGB", (1200, 1960), "#eee9df")
draw = ImageDraw.Draw(sheet)
draw.text((32, 24), "RYE / 人物风格探索", font=heading, fill="#183d82")
draw.text((34, 77), "A 漫画主角    B 街头潮流    C 复古像素    D 白蛇时装", font=small, fill="#555555")
metadata = []
for index, concept in enumerate(brief["concepts"]):
    image_path = root / "images" / (concept["id"] + ".png")
    with Image.open(image_path) as source:
        source.load()
        metadata.append({"id": concept["id"], "size": list(source.size), "mode": source.mode, "bytes": image_path.stat().st_size})
        thumb = ImageOps.contain(source.convert("RGB"), (550, 825), Image.Resampling.LANCZOS)
    x = 34 + (index % 2) * 590
    y = 130 + (index // 2) * 906
    sheet.paste(thumb, (x + (550 - thumb.width) // 2, y))
    draw.text((x, y + 839), chr(65 + index) + "  " + concept["title"], font=label, fill="#183d82")
sheet.save(root / "comparison.jpg", quality=93, subsampling=0)
(root / "image-checks.json").write_text(json.dumps({"model": brief["model"], "images": metadata}, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(metadata, ensure_ascii=False))
