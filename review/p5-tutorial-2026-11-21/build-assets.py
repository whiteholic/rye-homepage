from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import numpy as np

root = Path(__file__).resolve().parent
portrait = Image.open(root / 'current-document.png').convert('RGBA')
pixels = np.asarray(portrait)
scale = 0.64
offset = (200, 30)

# A diagonal screen-tone highlight constrained to existing black hair pixels.
dots = Image.new('L', portrait.size, 0)
draw = ImageDraw.Draw(dots)
for y in range(120, 440, 22):
    for x in range(360, 1100, 22):
        draw.ellipse((x-6, y-6, x+6, y+6), fill=255)
band = Image.new('L', portrait.size, 0)
ImageDraw.Draw(band).polygon([(405, 155), (972, 238), (1040, 365), (415, 275)], fill=255)
dark = Image.fromarray(np.uint8((pixels[:, :, :3].mean(axis=2) < 90) * 255))
dot_alpha = ImageChops.multiply(ImageChops.multiply(dots, band), dark)
dot_alpha = ImageChops.multiply(dot_alpha, portrait.getchannel('A'))
dot_image = Image.new('RGBA', portrait.size, 'white')
dot_image.putalpha(dot_alpha)
dot_image.save(root / 'hair-screentone.png')

canvas = Image.new('RGBA', (1200, 1200))
draw = ImageDraw.Draw(canvas)
draw.polygon([(90,370),(1025,300),(1125,1050),(235,1140)], fill='#080808')
draw.polygon([(125,401),(994,335),(1086,1018),(264,1098)], fill='white')
draw.polygon([(155,429),(966,370),(1045,981),(292,1059)], fill='#43d925')
crop = Image.new('L', canvas.size, 0)
ImageDraw.Draw(crop).polygon([(0,0),(1200,0),(1200,1007),(264,1098),(0,1124)], fill=255)
for asset in [portrait, dot_image]:
    layer = Image.new('RGBA', canvas.size)
    layer.alpha_composite(asset.resize((819,1092), Image.Resampling.BICUBIC), offset)
    layer.putalpha(ImageChops.multiply(layer.getchannel('A'), crop))
    canvas.alpha_composite(layer)
canvas.save(root / 'composition-draft.png')
preview = Image.new('RGBA', canvas.size, '#e8e8e8')
preview.alpha_composite(canvas)
preview.thumbnail((800,800))
preview.convert('RGB').save(root / 'composition-draft-preview.jpg', quality=95)
